// "Shareholder Value", minimal (T707; takeoverLook.ts has the rules; T730a polishes the laser and
// the door, T730b the crash site's landing): the hangar door opening over the platform before each
// launch, Hostile Takeover's laser from the platform to each tower it picked with a reticle closing
// on it, and the jettison's plates lying on their opened `crash_*` tiles. The door and the laser
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
import { hexOf } from './jamLook.ts';
import {
  DOOR_COLOR,
  DOOR_PX,
  doorShare,
  LASER_COLOR,
  LASER_CORE,
  laserWidth,
  PLATE_EDGE,
  PLATE_FILL,
  plateSkew,
  reticlePx,
  tellProgress,
  UNDER,
} from './takeoverLook.ts';
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
}

const LASER = hexOf(LASER_COLOR);
const CORE = hexOf(LASER_CORE);
const INK = hexOf(UNDER);
const DOOR = hexOf(DOOR_COLOR);
const FILL = hexOf(PLATE_FILL);
const EDGE = hexOf(PLATE_EDGE);
const DOOR_TELL_TICKS = secToTicks(BOSS_ABILITY_TELL_SEC);
/** The laser leaves the platform's top, this far above its ground point; it hits the tower here. */
const PLATFORM_PX = 14;
const TOWER_PX = 8;

const a: Vec2 = { x: 0, y: 0 };
const b: Vec2 = { x: 0, y: 0 };

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

export class TakeoverView {
  readonly #ctx: ViewContext;
  readonly #markers: Readonly<Record<string, GridPos>>;
  readonly #liftPx: (col: number, row: number) => number;
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
  ) {
    this.#ctx = ctx;
    this.#markers = markers;
    this.#liftPx = liftPx;
    this.#plates = ctx.scene.make.graphics({}, false);
    ctx.layers.decal.add(this.#plates);
    this.#g = ctx.scene.make.graphics({}, false);
    ctx.layers.vfx.add(this.#g);
  }

  /** Counts the lasers and the jettison. Returns the off. */
  bind(bus: Bus<SimEvent<IdSpace>>): () => void {
    const offs = [
      bus.on('TakeoverTell', () => {
        this.lasersSeen++;
      }),
      bus.on('Jettisoned', () => {
        this.jettisons++;
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
      if (hangarTelling(e, p.hangar)) {
        doors++;
        this.#drawDoor(g, e, doorShare(e.abilityTicks, DOOR_TELL_TICKS));
      }
      if (p.takeover !== null && takeoverTelling(e)) {
        const progress = tellProgress(e.jamTellTicks, p.takeover.tellTicks);
        for (let k = 0; k < e.takeoverTowers.length; k++) {
          const t = findTower(state.towers, e.takeoverTowers[k]!); // k < length
          if (t === null) continue;
          lasers++;
          this.#drawLaser(g, e, t, progress);
        }
      }
    }
    this.#lasers = lasers;
    this.#doors = doors;
    if (state.tilesOpened.length !== this.#platesDrawn) this.#drawPlates(state.tilesOpened);
  }

  #drawDoor(g: Phaser.GameObjects.Graphics, e: DeepReadonly<Enemy>, share: number): void {
    gridToScreen(e.x, e.y, this.#ctx.origin, a);
    const w = Math.max(2, Math.round(DOOR_PX * share));
    const x = Math.round(a.x - w / 2);
    const y = Math.round(a.y - PLATFORM_PX - 6);
    g.fillStyle(INK, 0.8).fillRect(x - 1, y - 1, w + 2, 5);
    g.fillStyle(DOOR, 1).fillRect(x, y, w, 3);
  }

  #drawLaser(
    g: Phaser.GameObjects.Graphics,
    e: DeepReadonly<Enemy>,
    t: DeepReadonly<Tower>,
    progress: number,
  ): void {
    gridToScreen(e.x, e.y, this.#ctx.origin, a);
    gridToScreen(t.x, t.y, this.#ctx.origin, b);
    a.y -= PLATFORM_PX;
    b.y -= this.#liftPx(t.col, t.row) + TOWER_PX;
    const w = laserWidth(progress);
    g.lineStyle(w + 2, INK, 0.7).lineBetween(a.x, a.y, b.x, b.y);
    g.lineStyle(w, LASER, 0.9).lineBetween(a.x, a.y, b.x, b.y);
    g.lineStyle(1, CORE, 1).lineBetween(a.x, a.y, b.x, b.y);
    const r = reticlePx(progress);
    const x = Math.round(b.x);
    const y = Math.round(b.y);
    g.lineStyle(3, INK, 0.7).strokeRect(x - r, y - r, r * 2, r * 2);
    g.lineStyle(1, LASER, 1).strokeRect(x - r, y - r, r * 2, r * 2);
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
      const pts = [
        { x: a.x - hw, y: a.y + skew },
        { x: a.x + skew, y: a.y - hh },
        { x: a.x + hw, y: a.y - skew },
        { x: a.x - skew, y: a.y + hh },
      ];
      g.fillStyle(INK, 0.9).fillPoints(pts.map((p) => ({ x: p.x, y: p.y + 2 })), true);
      g.fillStyle(FILL, 1).fillPoints(pts, true);
      g.lineStyle(1, EDGE, 1).strokePoints(pts, true);
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
