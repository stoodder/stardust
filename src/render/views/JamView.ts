// The jams' view (T702's minimal one, polished by T730a; jamLook.ts has the rules): each
// Silencer's creeping tendril toward the tower it picked, and on each Jammed tower T740a's
// `fx.jam_static` crackling over it (the tower itself draws in its steel `+jammed` variant:
// TowerView) and its countdown ring round its base; and System Reboot's pops: each tower it freed
// flashes white (`flashTower`, TowerView's upgrade flash) under a teal power-on column and ring,
// every tower it covered a smaller white ring (TransientFx). The tendrils, rings, and columns
// redraw each frame into one Graphics on the vfx layer, the static in pooled sprites over it.
// Allocation-free per frame: the scratch points are module-level, the Graphics redraws in place,
// the static and column slots are reused (the static pool grows the first time more towers are
// Jammed at once than it holds).
import type * as Phaser from 'phaser';
import type { IdSpace } from '../../content/types.ts';
import type { Bus } from '../../shared/bus.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import type { Enemy, SimEvent, Tower } from '../../sim/index.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import {
  ARC_COLOR,
  hexOf,
  jamArc,
  REBOOT_COLOR,
  REBOOT_COLUMN_W,
  rebootColumn,
  RING_SEGMENTS,
  ringPoint,
  STATIC_ANIM,
  STATIC_SPRITE,
  STATIC_STILL_FRAME,
  TENDRIL_CORE,
  TENDRIL_TIP,
  TENDRIL_UNDER,
  tendrilBeadPx,
  tendrilReach,
} from './jamLook.ts';
import { BODY_LIFT_PX, type TransientFx } from './TransientFx.ts';
import type { ViewContext } from './ViewContext.ts';

interface Pool<T> {
  readonly used: number;
  readonly items: readonly DeepReadonly<T>[];
}

/** The state the jam view reads. */
export interface JamState {
  readonly tick: number;
  readonly enemies: Pool<Enemy>;
  readonly towers: Pool<Tower>;
}

const UNDER = hexOf(TENDRIL_UNDER);
const CORE = hexOf(TENDRIL_CORE);
const TIP = hexOf(TENDRIL_TIP);
const ARC = hexOf(ARC_COLOR);
const TEAL = hexOf(REBOOT_COLOR);
const WHITE = hexOf('white.1');
const STEPS = 8;
const WAVE_PX = 1.5;
/** The tendril reaches the tower's body, this high above its tile's centre. */
const TOWER_BODY_PX = 8;
/** Static sprites made up front (more are made as needed). */
const STATIC_SLOTS = 8;
/** Reboot columns at once (the oldest is reused). */
const MAX_COLUMNS = 24;
const STATIC = STATIC_SPRITE;

const a: Vec2 = { x: 0, y: 0 };
const b: Vec2 = { x: 0, y: 0 };
const p0 = { x: 0, y: 0 };
const p1 = { x: 0, y: 0 };

interface StaticSlot {
  readonly sprite: Phaser.GameObjects.Sprite;
  /** The tower it crackles on (0: free), and whether it shows the still frame. */
  uid: number;
  still: boolean;
}

interface Column {
  active: boolean;
  uid: number;
  ms: number;
}

function findTower(towers: Pool<Tower>, uid: number): DeepReadonly<Tower> | null {
  for (let i = 0; i < towers.used; i++) {
    const t = towers.items[i]!; // i < used ≤ items.length
    if (t.alive && t.uid === uid) return t;
  }
  return null;
}

export class JamView {
  readonly #ctx: ViewContext;
  readonly #fx: TransientFx;
  readonly #reducedMotion: () => boolean;
  readonly #liftPx: (col: number, row: number) => number;
  readonly #flashTower: (uid: number) => void;
  readonly #g: Phaser.GameObjects.Graphics;
  readonly #statics: StaticSlot[] = [];
  readonly #columns: Column[] = [];
  #nextColumn = 0;
  #tells = 0;
  #jammed = 0;
  #columnsShown = 0;
  /** Tendril tells and jams seen since the view was made, and Reboots played (smoke's checks). */
  tellsSeen = 0;
  jamsSeen = 0;
  reboots = 0;

  constructor(
    ctx: ViewContext,
    fx: TransientFx,
    reducedMotion: () => boolean,
    liftPx: (col: number, row: number) => number,
    flashTower: (uid: number) => void = () => {},
  ) {
    this.#ctx = ctx;
    this.#fx = fx;
    this.#reducedMotion = reducedMotion;
    this.#liftPx = liftPx;
    this.#flashTower = flashTower;
    this.#g = ctx.scene.make.graphics({}, false);
    ctx.layers.vfx.add(this.#g);
    for (let i = 0; i < STATIC_SLOTS; i++) this.#grow();
    for (let i = 0; i < MAX_COLUMNS; i++) this.#columns.push({ active: false, uid: 0, ms: 0 });
  }

  /** Counts the tells and jams, and pops System Reboot's flashes. Returns the off. */
  bind(bus: Bus<SimEvent<IdSpace>>, towers: () => Pool<Tower>): () => void {
    const offs = [
      bus.on('JamTell', () => {
        this.tellsSeen++;
      }),
      bus.on('TowerJammed', () => {
        this.jamsSeen++;
      }),
      bus.on('Rebooted', (ev) => {
        this.reboots++;
        const pool = towers();
        for (let i = 0; i < pool.used; i++) {
          const t = pool.items[i]!; // i < used ≤ items.length
          if (!t.alive) continue;
          const lift = this.#liftPx(t.col, t.row);
          const freed = ev.towers.includes(t.uid);
          this.#fx.ring(t.x, t.y, freed ? 0.8 : 0.45, freed ? REBOOT_COLOR : ARC_COLOR, 420, true, lift);
          if (!freed) continue;
          this.#flashTower(t.uid);
          const c = this.#columns[this.#nextColumn]!; // index < MAX_COLUMNS
          this.#nextColumn = (this.#nextColumn + 1) % MAX_COLUMNS;
          c.active = true;
          c.uid = t.uid;
          c.ms = 0;
        }
      }),
    ];
    return () => {
      for (const off of offs) off();
    };
  }

  /** Each frame (`dt` ms): the tendrils under way, each Jammed tower's static and ring, the columns. */
  update(state: JamState, dt = 0): void {
    const still = this.#reducedMotion();
    const g = this.#g;
    g.clear();
    let tells = 0;
    const enemies = state.enemies;
    for (let i = 0; i < enemies.used; i++) {
      const e = enemies.items[i]!; // i < used ≤ items.length
      const jam = e.def?.jam ?? null;
      if (!e.alive || jam === null || jam.kind !== 'tendril' || e.jamTarget === 0) continue;
      if (e.jamTellTicks <= 0) continue;
      const t = findTower(state.towers, e.jamTarget);
      if (t === null) continue;
      tells++;
      this.#drawTendril(g, e, t, tendrilReach(e.jamTellTicks, jam.tellTicks), still, state.tick);
    }
    let jammed = 0;
    const towers = state.towers;
    for (let i = 0; i < towers.used; i++) {
      const t = towers.items[i]!; // i < used ≤ items.length
      if (!t.alive || t.jamTicks <= 0) continue;
      if (jammed === this.#statics.length) this.#grow();
      this.#drawJammed(g, this.#statics[jammed]!, t, still); // jammed < length: grown above
      jammed++;
    }
    for (let k = jammed; k < this.#statics.length; k++) {
      const s = this.#statics[k]!; // k < length
      if (s.uid !== 0) {
        s.uid = 0;
        s.sprite.stop().setVisible(false);
      }
    }
    this.#columnsShown = this.#drawColumns(g, towers, dt, still);
    this.#tells = tells;
    this.#jammed = jammed;
  }

  #drawTendril(
    g: Phaser.GameObjects.Graphics,
    e: DeepReadonly<Enemy>,
    t: DeepReadonly<Tower>,
    reach: number,
    still: boolean,
    tick: number,
  ): void {
    gridToScreen(e.x, e.y, this.#ctx.origin, a);
    gridToScreen(t.x, t.y, this.#ctx.origin, b);
    a.y -= BODY_LIFT_PX;
    b.y -= this.#liftPx(t.col, t.row) + TOWER_BODY_PX;
    const dx = (b.x - a.x) * reach;
    const dy = (b.y - a.y) * reach;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const phase = still ? 0 : tick * 0.25;
    for (let pass = 0; pass < 3; pass++) {
      const w = pass === 0 ? 5 : pass === 1 ? 3 : 1;
      g.lineStyle(w, pass === 0 ? UNDER : pass === 1 ? CORE : TIP, pass === 0 ? 0.9 : 1);
      let px = a.x;
      let py = a.y;
      for (let k = 1; k <= STEPS; k++) {
        const f = k / STEPS;
        const wave = k < STEPS ? Math.sin(phase + k * 1.7) * WAVE_PX : 0;
        const qx = a.x + dx * f + nx * wave;
        const qy = a.y + dy * f + ny * wave;
        g.lineBetween(px, py, qx, qy);
        px = qx;
        py = qy;
      }
    }
    const bead = tendrilBeadPx(reach);
    const tx = Math.round(a.x + dx);
    const ty = Math.round(a.y + dy);
    g.fillStyle(UNDER, 1).fillRect(tx - (bead >> 1) - 1, ty - (bead >> 1) - 1, bead + 2, bead + 2);
    g.fillStyle(TIP, 1).fillRect(tx - (bead >> 1), ty - (bead >> 1), bead, bead);
    g.fillStyle(WHITE, 1).fillRect(tx - (bead >> 1) + 1, ty - (bead >> 1) + 1, 1, 1);
  }

  /** A Jammed tower: its static crackling over it and its countdown ring round its base. */
  #drawJammed(
    g: Phaser.GameObjects.Graphics,
    slot: StaticSlot,
    t: DeepReadonly<Tower>,
    still: boolean,
  ): void {
    gridToScreen(t.x, t.y, this.#ctx.origin, b);
    b.y -= this.#liftPx(t.col, t.row);
    const x = Math.round(b.x);
    const y = Math.round(b.y);
    if (slot.uid !== t.uid || slot.still !== still) {
      slot.uid = t.uid;
      slot.still = still;
      const { sprites } = this.#ctx;
      if (still) {
        const f = sprites.frame(STATIC, STATIC_STILL_FRAME);
        slot.sprite.stop().setTexture(f.texture, f.frame);
      } else {
        // Each tower's static crackles a frame apart, so two never flicker in unison.
        slot.sprite.play({ key: sprites.anim(STATIC, STATIC_ANIM), startFrame: t.uid % 4 });
      }
      const anchor = sprites.meta(STATIC).anchor;
      slot.sprite.setDisplayOrigin(anchor.x, anchor.y).setVisible(true);
    }
    slot.sprite.setPosition(x, y);
    // The countdown: a faint full track, then the share left in white over an ink under-stroke.
    const n = Math.round(jamArc(t.jamTicks) * RING_SEGMENTS);
    g.lineStyle(1, UNDER, 0.55);
    this.#ringArc(g, x, y, RING_SEGMENTS);
    if (n <= 0) return;
    g.lineStyle(4, UNDER, 0.8);
    this.#ringArc(g, x, y, n);
    g.lineStyle(2, ARC, 1);
    this.#ringArc(g, x, y, n);
  }

  /** The ring's first `n` of RING_SEGMENTS segments round (x, y), from the top, clockwise. */
  #ringArc(g: Phaser.GameObjects.Graphics, x: number, y: number, n: number): void {
    ringPoint(0, p0);
    for (let k = 1; k <= n; k++) {
      ringPoint(k / RING_SEGMENTS, p1);
      g.lineBetween(x + p0.x, y + p0.y, x + p1.x, y + p1.y);
      p0.x = p1.x;
      p0.y = p1.y;
    }
  }

  /** System Reboot's power-on columns rising through the towers it freed; returns how many show. */
  #drawColumns(g: Phaser.GameObjects.Graphics, towers: Pool<Tower>, dt: number, still: boolean): number {
    let shown = 0;
    for (const c of this.#columns) {
      if (!c.active) continue;
      c.ms += dt;
      const col = rebootColumn(c.ms, still);
      const t = col.alpha > 0 ? findTower(towers, c.uid) : null;
      if (t === null) {
        c.active = col.alpha > 0 && c.ms < 100; // its tower may show a frame late
        continue;
      }
      gridToScreen(t.x, t.y, this.#ctx.origin, b);
      const x = Math.round(b.x);
      const y = Math.round(b.y - this.#liftPx(t.col, t.row));
      const h = col.height;
      const w = REBOOT_COLUMN_W;
      g.fillStyle(TEAL, 0.45 * col.alpha).fillRect(x - w, y - h, w * 2, h);
      g.fillStyle(TEAL, col.alpha).fillRect(x - (w >> 1), y - h, w, h);
      g.fillStyle(WHITE, col.alpha).fillRect(x - 1, y - h, 2, h);
      shown++;
    }
    return shown;
  }

  /** One more pooled static sprite, hidden. */
  #grow(): void {
    const sprite = this.#ctx.scene.make.sprite({}, false).setVisible(false);
    this.#ctx.layers.vfx.add(sprite);
    this.#statics.push({ sprite, uid: 0, still: false });
  }

  /** What shows now (the smoke flow's check): tendrils, towers with static, Reboot columns. */
  get shown(): { readonly tells: number; readonly jammed: number; readonly columns: number } {
    return { tells: this.#tells, jammed: this.#jammed, columns: this.#columnsShown };
  }

  reset(): void {
    this.#g.clear();
    for (const s of this.#statics) {
      s.uid = 0;
      s.sprite.stop().setVisible(false);
    }
    for (const c of this.#columns) c.active = false;
    this.#tells = 0;
    this.#jammed = 0;
    this.#columnsShown = 0;
  }
}
