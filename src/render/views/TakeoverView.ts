// "Shareholder Value" (T707's minimal view, polished by T730a; takeoverLook.ts has the rules; T730b
// the crash site's landing): the hazard frame and launch gauge on the hangar door (where the
// sprite's `tell` opens it, by the boss's drawn facing: UnitAnchors) before each launch, Hostile
// Takeover's laser from the dish's lens to each tower it picked with brackets closing on it, the
// jettison's burst, and its plates lying on their opened `crash_*` tiles. The door and the laser
// redraw each frame into one Graphics on the vfx layer; the plates into one on the decal layer,
// only when a tile opens. Allocation-free per frame: the scratch points are module-level.
import type * as Phaser from 'phaser';
import type { CompiledBossPhase } from '../../content/compiled.ts';
import { BOSS_ABILITY_TELL_SEC } from '../../content/rules.ts';
import type { GridPos, IdSpace } from '../../content/types.ts';
import type { Bus } from '../../shared/bus.ts';
import { secToTicks } from '../../shared/time.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import {
  hangarTelling,
  takeoverTelling,
  type Enemy,
  type SimEvent,
  type Tower,
} from '../../sim/index.ts';
import { gridToScreen, HALF_H, HALF_W, type Vec2 } from '../iso.ts';
import { TELL_STEP_TICKS } from '../vfx/fxTiming.ts';
import { hexOf } from './jamLook.ts';
import {
  DOOR_COLOR,
  DOOR_FRAME_PX,
  DOOR_PX,
  doorOffset,
  doorShare,
  JETTISON_RING_TILES,
  LASER_COLOR,
  LASER_CORE,
  LASER_GLOW,
  laserHot,
  laserWidth,
  lensOffset,
  RING_COLOR,
  PLATE_EDGE,
  PLATE_FILL,
  plateSkew,
  reticlePx,
  tellProgress,
  UNDER,
} from './takeoverLook.ts';
import type { TransientFx } from './TransientFx.ts';
import { blankBox, NO_ANCHORS, type UnitAnchors } from './unitAnchor.ts';
import type { ViewContext } from './ViewContext.ts';

interface Pool<T> {
  readonly used: number;
  readonly items: readonly DeepReadonly<T>[];
}

/** The state the view reads. */
export interface TakeoverState {
  readonly enemies: Pool<Enemy>;
  readonly towers: Pool<Tower>;
  readonly tilesOpened: readonly string[];
  readonly tick?: number;
}

const LASER = hexOf(LASER_COLOR);
const CORE = hexOf(LASER_CORE);
const INK = hexOf(UNDER);
const DOOR = hexOf(DOOR_COLOR);
const GLOW = hexOf(LASER_GLOW);
const WHITE = hexOf('white.1');
const FILL = hexOf(PLATE_FILL);
const EDGE = hexOf(PLATE_EDGE);
const DOOR_TELL_TICKS = secToTicks(BOSS_ABILITY_TELL_SEC);
/** Without a drawn body: the lens this far above the platform's ground point; a tower's hit here. */
const PLATFORM_PX = 39;
const TOWER_PX = 8;
/** The jettison's burst sits this far up the hull (px). */
const HULL_PX = 18;

const a: Vec2 = { x: 0, y: 0 };
const b: Vec2 = { x: 0, y: 0 };
const off = { dx: 0, dy: 0 };
const body = blankBox();

/** No enemies (a view bound without them: no jettison burst). */
const NO_ENEMIES = (): Pool<Enemy> => ({ used: 0, items: [] });

function findEnemy(enemies: Pool<Enemy>, uid: number): DeepReadonly<Enemy> | null {
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (e.alive && e.uid === uid) return e;
  }
  return null;
}

function findTower(towers: Pool<Tower>, uid: number): DeepReadonly<Tower> | null {
  for (let i = 0; i < towers.used; i++) {
    const t = towers.items[i]!; // i < used ≤ items.length
    if (t.alive && t.uid === uid) return t;
  }
  return null;
}

/** The boss's current phase, or null. */
function phaseOf(e: DeepReadonly<Enemy>): DeepReadonly<CompiledBossPhase> | null {
  const boss = e.def?.boss ?? null;
  return boss === null || e.bossPhase === 0 ? null : (boss.phases[e.bossPhase - 1] ?? null);
}

/** Traces a diamond centred at (x, y), `hw` × `hh` half-sizes, its corners pushed `skew` px. */
function quad(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  hw: number,
  hh: number,
  skew: number,
): void {
  g.beginPath();
  g.moveTo(x - hw, y + skew);
  g.lineTo(x + skew, y - hh);
  g.lineTo(x + hw, y - skew);
  g.lineTo(x - skew, y + hh);
  g.closePath();
}

export class TakeoverView {
  readonly #ctx: ViewContext;
  readonly #markers: Readonly<Record<string, GridPos>>;
  readonly #liftPx: (col: number, row: number) => number;
  readonly #anchors: UnitAnchors;
  readonly #fx: TransientFx | null;
  readonly #reducedMotion: () => boolean;
  readonly #g: Phaser.GameObjects.Graphics;
  readonly #plates: Phaser.GameObjects.Graphics;
  #platesDrawn = 0;
  #lasers = 0;
  #doors = 0;
  /** Lasers, jettisons, and plates seen since the view was made (smoke's checks). */
  lasersSeen = 0;
  jettisons = 0;

  constructor(
    ctx: ViewContext,
    markers: Readonly<Record<string, GridPos>>,
    liftPx: (col: number, row: number) => number,
    anchors: UnitAnchors = NO_ANCHORS,
    fx: TransientFx | null = null,
    reducedMotion: () => boolean = () => false,
  ) {
    this.#ctx = ctx;
    this.#markers = markers;
    this.#liftPx = liftPx;
    this.#anchors = anchors;
    this.#fx = fx;
    this.#reducedMotion = reducedMotion;
    this.#plates = ctx.scene.make.graphics({}, false);
    ctx.layers.decal.add(this.#plates);
    this.#g = ctx.scene.make.graphics({}, false);
    ctx.layers.vfx.add(this.#g);
  }

  /** Counts the lasers, and bursts the jettison (`enemies`: where its boss is). Returns the off. */
  bind(bus: Bus<SimEvent<IdSpace>>, enemies: () => Pool<Enemy> = NO_ENEMIES): () => void {
    const offs = [
      bus.on('TakeoverTell', () => {
        this.lasersSeen++;
      }),
      bus.on('Jettisoned', (ev) => {
        this.jettisons++;
        const fx = this.#fx;
        const e = fx === null ? null : findEnemy(enemies(), ev.uid);
        if (fx === null || e === null) return;
        // The plates blow off: a burst on the hull and a ring the platform's size.
        fx.burst(e.x, e.y, 0, false, HULL_PX);
        fx.ring(e.x, e.y, JETTISON_RING_TILES, RING_COLOR, 420, true);
      }),
    ];
    return () => {
      for (const off of offs) off();
    };
  }

  /** Each frame: the doors and lasers under way, and any plate newly landed. */
  update(state: TakeoverState): void {
    const g = this.#g;
    g.clear();
    let lasers = 0;
    let doors = 0;
    const enemies = state.enemies;
    for (let i = 0; i < enemies.used; i++) {
      const e = enemies.items[i]!; // i < used ≤ items.length
      const p = e.alive ? phaseOf(e) : null;
      if (p === null) continue;
      const telling = hangarTelling(e, p.hangar);
      const aiming = p.takeover !== null && takeoverTelling(e);
      if (!telling && !aiming) continue;
      // Where its body is drawn and which way it faces (its lens and door sit by facing).
      const drawn = this.#anchors.box(e.uid, body);
      if (!drawn) {
        gridToScreen(e.x, e.y, this.#ctx.origin, a);
        body.x = a.x;
        body.groundY = a.y;
        body.facing = 'se';
      }
      if (telling) {
        doors++;
        this.#drawDoor(g, doorShare(e.abilityTicks, DOOR_TELL_TICKS), state.tick ?? 0);
      }
      if (aiming) {
        const progress = tellProgress(e.jamTellTicks, p.takeover!.tellTicks); // aiming: non-null
        for (let k = 0; k < e.takeoverTowers.length; k++) {
          const t = findTower(state.towers, e.takeoverTowers[k]!); // k < length
          if (t === null) continue;
          lasers++;
          this.#drawLaser(g, t, progress);
        }
      }
    }
    this.#lasers = lasers;
    this.#doors = doors;
    if (state.tilesOpened.length !== this.#platesDrawn) this.#drawPlates(state.tilesOpened);
  }

  /** The hangar door's hazard frame (blinking on the tell step) and its launch gauge under it. */
  #drawDoor(g: Phaser.GameObjects.Graphics, share: number, tick: number): void {
    doorOffset(body.facing, off);
    const cx = Math.round(body.x + off.dx);
    const cy = Math.round(body.groundY + off.dy);
    const half = DOOR_FRAME_PX >> 1;
    const lit = this.#reducedMotion() || Math.floor(tick / TELL_STEP_TICKS) % 2 === 0;
    g.lineStyle(4, INK, 0.85).strokeRect(cx - half, cy - half, DOOR_FRAME_PX, DOOR_FRAME_PX);
    g.lineStyle(2, DOOR, lit ? 1 : 0.55).strokeRect(cx - half, cy - half, DOOR_FRAME_PX, DOOR_FRAME_PX);
    // The gauge: an ink well under the door, filling orange as the launch comes.
    const x = cx - (DOOR_PX >> 1);
    const y = cy + half + 3;
    g.fillStyle(INK, 0.9).fillRect(x - 1, y - 1, DOOR_PX + 2, 5);
    g.fillStyle(DOOR, 1).fillRect(x, y, Math.max(1, Math.round(DOOR_PX * share)), 3);
  }

  #drawLaser(g: Phaser.GameObjects.Graphics, t: DeepReadonly<Tower>, progress: number): void {
    lensOffset(body.facing, off);
    a.x = body.x + off.dx;
    a.y = body.groundY + off.dy;
    gridToScreen(t.x, t.y, this.#ctx.origin, b);
    b.y -= this.#liftPx(t.col, t.row) + TOWER_PX;
    const w = laserWidth(progress);
    g.lineStyle(w + 6, GLOW, 0.3).lineBetween(a.x, a.y, b.x, b.y);
    g.lineStyle(w + 2, INK, 0.75).lineBetween(a.x, a.y, b.x, b.y);
    g.lineStyle(w, LASER, 1).lineBetween(a.x, a.y, b.x, b.y);
    g.lineStyle(1, laserHot(progress) ? WHITE : CORE, 1).lineBetween(a.x, a.y, b.x, b.y);
    // The lens flares.
    const lx = Math.round(a.x);
    const ly = Math.round(a.y);
    g.fillStyle(INK, 0.8).fillRect(lx - 3, ly - 3, 7, 7);
    g.fillStyle(CORE, 1).fillRect(lx - 2, ly - 2, 5, 5);
    g.fillStyle(WHITE, 1).fillRect(lx - 1, ly - 1, 3, 3);
    // Four corner brackets closing on the target.
    const r = reticlePx(progress);
    const x = Math.round(b.x);
    const y = Math.round(b.y);
    for (let pass = 0; pass < 2; pass++) {
      g.lineStyle(pass === 0 ? 4 : 2, pass === 0 ? INK : LASER, pass === 0 ? 0.75 : 1);
      for (let c = 0; c < 4; c++) {
        const sx = c & 1 ? 1 : -1;
        const sy = c & 2 ? 1 : -1;
        const px = x + sx * r;
        const py = y + sy * r;
        g.lineBetween(px, py, px - sx * 4, py);
        g.lineBetween(px, py, px, py - sy * 4);
      }
    }
    g.fillStyle(CORE, 1).fillRect(x - 1, y - 1, 2, 2);
  }

  /** Redraws every opened plate (a tile opens a few times a fight at most). */
  #drawPlates(opened: readonly string[]): void {
    const g = this.#plates;
    g.clear();
    for (let i = 0; i < opened.length; i++) {
      const at = this.#markers[opened[i]!]; // i < length
      if (at === undefined) continue;
      gridToScreen(at[0] + 0.5, at[1] + 0.5, this.#ctx.origin, a);
      const skew = plateSkew(i);
      const hw = HALF_W - 6;
      const hh = HALF_H - 3;
      // A slab askew on its tile: its shadow 2 px under it, then the plate and its edge.
      for (const [drop, color, alpha] of [
        [2, INK, 0.9],
        [0, FILL, 1],
      ] as const) {
        quad(g, a.x, a.y + drop, hw, hh, skew);
        g.fillStyle(color, alpha).fillPath();
      }
      quad(g, a.x, a.y, hw, hh, skew);
      g.lineStyle(1, EDGE, 1).strokePath();
    }
    this.#platesDrawn = opened.length;
  }

  /** What shows now (the smoke flow's check). */
  get shown(): { readonly lasers: number; readonly doors: number; readonly plates: number } {
    return { lasers: this.#lasers, doors: this.#doors, plates: this.#platesDrawn };
  }

  reset(): void {
    this.#g.clear();
    this.#plates.clear();
    this.#platesDrawn = 0;
    this.#lasers = 0;
    this.#doors = 0;
  }
}
