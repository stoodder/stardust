// The jams' view, minimal (T702; jamLook.ts has the rules; T730a polishes it): each Silencer's
// creeping tendril toward the tower it picked, and on each Jammed tower its static and countdown
// arc, redrawn each frame into two Graphics on the vfx layer (the tendril under the static); and
// System Reboot's pops (TransientFx rings) on the towers it freed and every tower it covered.
// Allocation-free per frame: the scratch points are module-level, the Graphics redraw in place.
import type * as Phaser from 'phaser';
import type { IdSpace } from '../../content/types.ts';
import type { Bus } from '../../shared/bus.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import type { Enemy, SimEvent, Tower } from '../../sim/index.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import {
  ARC_COLOR,
  ARC_RADIUS_PX,
  hexOf,
  jamArc,
  REBOOT_COLOR,
  STATIC_COLORS,
  STATIC_SPARKS,
  staticSpark,
  TENDRIL_CORE,
  TENDRIL_TIP,
  TENDRIL_UNDER,
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
const STEPS = 6;
const WAVE_PX = 1.5;
/** Static rises over the tower's body: its dashes centre this high above the tile's centre. */
const TOWER_BODY_PX = 6;

const a: Vec2 = { x: 0, y: 0 };
const b: Vec2 = { x: 0, y: 0 };
const STATIC_HEX: readonly number[] = STATIC_COLORS.map(hexOf);
const spark = { dx: 0, dy: 0, color: 0 };

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
  readonly #tendrils: Phaser.GameObjects.Graphics;
  readonly #static: Phaser.GameObjects.Graphics;
  #tells = 0;
  #jammed = 0;
  /** Tendril tells and jams seen since the view was made, and Reboots played (smoke's checks). */
  tellsSeen = 0;
  jamsSeen = 0;
  reboots = 0;

  constructor(
    ctx: ViewContext,
    fx: TransientFx,
    reducedMotion: () => boolean,
    liftPx: (col: number, row: number) => number,
  ) {
    this.#ctx = ctx;
    this.#fx = fx;
    this.#reducedMotion = reducedMotion;
    this.#liftPx = liftPx;
    this.#tendrils = ctx.scene.make.graphics({}, false);
    ctx.layers.vfx.add(this.#tendrils);
    this.#static = ctx.scene.make.graphics({}, false);
    ctx.layers.vfx.add(this.#static);
  }

  /** Counts the tells and jams, and pops System Reboot's rings. Returns the off. */
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
          this.#fx.ring(
            t.x,
            t.y,
            freed ? 0.7 : 0.4,
            freed ? REBOOT_COLOR : ARC_COLOR,
            260,
            true,
            lift,
          );
        }
      }),
    ];
    return () => {
      for (const off of offs) off();
    };
  }

  /** Each frame: the tendrils under way, then each Jammed tower's static and countdown. */
  update(state: JamState): void {
    const still = this.#reducedMotion();
    const g = this.#tendrils;
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
    const s = this.#static;
    s.clear();
    let jammed = 0;
    const towers = state.towers;
    for (let i = 0; i < towers.used; i++) {
      const t = towers.items[i]!; // i < used ≤ items.length
      if (!t.alive || t.jamTicks <= 0) continue;
      jammed++;
      this.#drawJammed(s, t, still, state.tick);
    }
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
    for (let pass = 0; pass < 2; pass++) {
      g.lineStyle(pass === 0 ? 4 : 2, pass === 0 ? UNDER : CORE, pass === 0 ? 0.85 : 1);
      let px = a.x;
      let py = a.y;
      for (let k = 1; k <= STEPS; k++) {
        const f = k / STEPS;
        const w = k < STEPS ? Math.sin(phase + k * 1.7) * WAVE_PX : 0;
        const qx = a.x + dx * f + nx * w;
        const qy = a.y + dy * f + ny * w;
        g.lineBetween(px, py, qx, qy);
        px = qx;
        py = qy;
      }
    }
    g.fillStyle(UNDER, 1).fillRect(Math.round(a.x + dx) - 2, Math.round(a.y + dy) - 2, 4, 4);
    g.fillStyle(TIP, 1).fillRect(Math.round(a.x + dx) - 1, Math.round(a.y + dy) - 1, 2, 2);
  }

  #drawJammed(
    g: Phaser.GameObjects.Graphics,
    t: DeepReadonly<Tower>,
    still: boolean,
    tick: number,
  ): void {
    gridToScreen(t.x, t.y, this.#ctx.origin, b);
    b.y -= this.#liftPx(t.col, t.row);
    const share = jamArc(t.jamTicks);
    const start = -Math.PI / 2;
    g.lineStyle(3, UNDER, 0.7).beginPath();
    g.arc(b.x, b.y, ARC_RADIUS_PX, start, start + share * Math.PI * 2, false).strokePath();
    g.lineStyle(1, ARC, 1).beginPath();
    g.arc(b.x, b.y, ARC_RADIUS_PX, start, start + share * Math.PI * 2, false).strokePath();
    for (let i = 0; i < STATIC_SPARKS; i++) {
      staticSpark(tick, t.uid, i, still, spark);
      const x = Math.round(b.x + spark.dx);
      const y = Math.round(b.y - TOWER_BODY_PX + spark.dy);
      g.fillStyle(UNDER, 0.8).fillRect(x - 1, y - 1, 5, 3);
      g.fillStyle(STATIC_HEX[spark.color]!, 1).fillRect(x, y, 3, 1); // an index into it
    }
  }

  /** What shows now (the smoke flow's check): tendrils drawn, and towers showing their static. */
  get shown(): { readonly tells: number; readonly jammed: number } {
    return { tells: this.#tells, jammed: this.#jammed };
  }

  reset(): void {
    this.#tendrils.clear();
    this.#static.clear();
    this.#tells = 0;
    this.#jammed = 0;
  }
}
