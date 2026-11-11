// The Grapple Harpoon's and Salvage Crane's minimal view (T408; design/towers.md § 7, enemies.md
// § 2.4 Pinned): enough to read the mechanics in play until the polish pass.
// - **Pinned**, from sim state each frame (`Enemy.pinnedTicks`): a taut rope from the unit's body
//   to a stake driven into the ground beside it. A pinned flyer's rope runs from its body (at
//   flying height) straight down to a stake at its ground point, so "grounded" reads as pulled
//   down. A 2 px rope in `gold.2` (Vrell hemp) over an `ink.0` under-stroke; the stake a 2×5 px
//   `steel.4` post rimmed in `ink.0`. A flyer a Sproing Pad's leaper grounded (LeaperView's
//   `grounded`) wears no rope: its dizzy stars and ring are its look (T730a).
// - **Skewer's line** (`ProjectileFired`, kind `line`): the harpoon's line from the muzzle to the
//   line's far end at body height, a 2 px `steel.4` shaft over an `ink.0` rim that fades out over
//   SKEWER_MS (held whole under reduced motion until it ends). The shot itself is the tracer
//   streak (battleEvents.ts), so the line reads as what it skewered.
// - The Crane's income floats from battleEvents.ts (`TowerIncome`).
// One Graphics in `vfx` (over the units, so a rope reads on a body), redrawn each frame;
// allocation-free per frame (a fixed ring of skewer lines).
import type * as Phaser from 'phaser';
import { rgbOf } from '../../content/palettes/master.ts';
import type { IdSpace } from '../../content/types.ts';
import type { Bus } from '../../shared/bus.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import type { Enemy, SimEvent } from '../../sim/index.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { AIR_LIFT_PX, BODY_LIFT_PX } from './TransientFx.ts';
import type { ViewContext } from './ViewContext.ts';

/** The enemy pool as the view reads it. */
export interface PinPool {
  readonly used: number;
  readonly items: readonly DeepReadonly<Enemy>[];
}

/** How long a Skewer's line stays, fading (ms). */
export const SKEWER_MS = 220;
const MAX_SKEWERS = 8;
/** Where a ground unit's stake stands, from its feet (screen px): behind it, to its right. */
const STAKE_DX = 5;
const STAKE_DY = 2;
const STAKE_W = 2;
const STAKE_H = 5;
/** The muzzle's height over the harpoon's tile (screen px). */
const MUZZLE_PX = 10;

function hex(name: 'gold.2' | 'steel.4' | 'ink.0'): number {
  const c = rgbOf(name);
  return (c.r << 16) | (c.g << 8) | c.b;
}
const ROPE = hex('gold.2');
const STAKE = hex('steel.4');
const SHAFT = hex('steel.4');
const INK = hex('ink.0');

/** Whether `e` shows the Pin's rope and stake: alive and pinned. */
export function showsPin(e: DeepReadonly<Enemy>): boolean {
  return e.alive && e.pinnedTicks > 0;
}

/** A Skewer line's alpha `ms` into its SKEWER_MS: 1 → 0 in three steps (1 throughout, reduced). */
export function skewerAlpha(ms: number, reducedMotion: boolean): number {
  if (ms >= SKEWER_MS) return 0;
  if (reducedMotion) return 1;
  const step = Math.floor((ms / SKEWER_MS) * 3);
  return step === 0 ? 1 : step === 1 ? 0.66 : 0.33;
}

interface Skewer {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  ms: number;
  active: boolean;
}

/** No Pin passed by (no leapers). */
const NONE: ReadonlySet<number> = new Set();

const a: Vec2 = { x: 0, y: 0 };
const b: Vec2 = { x: 0, y: 0 };

export class HarpoonView {
  readonly #ctx: ViewContext;
  readonly #reducedMotion: () => boolean;
  readonly #gfx: Phaser.GameObjects.Graphics;
  readonly #skewers: Skewer[] = [];
  #next = 0;
  /** Pinned units drawn last frame, and Skewer lines started so far (smoke's checks). */
  pins = 0;
  skewered = 0;

  constructor(ctx: ViewContext, reducedMotion: () => boolean) {
    this.#ctx = ctx;
    this.#reducedMotion = reducedMotion;
    this.#gfx = ctx.scene.make.graphics({}, false);
    ctx.layers.vfx.add(this.#gfx);
    for (let i = 0; i < MAX_SKEWERS; i++) {
      this.#skewers.push({ x0: 0, y0: 0, x1: 0, y1: 0, ms: 0, active: false });
    }
  }

  /** Subscribes to Skewer's shots; `lift` is a tower's height (high ground). Returns the off. */
  bind(bus: Bus<SimEvent<IdSpace>>, lift: (towerUid: number) => number): () => void {
    return bus.on('ProjectileFired', (e) => {
      if (e.kind !== 'line') return;
      const s = this.#skewers[this.#next]!; // index < MAX_SKEWERS
      this.#next = (this.#next + 1) % MAX_SKEWERS;
      gridToScreen(e.x, e.y, this.#ctx.origin, a);
      gridToScreen(e.targetX, e.targetY, this.#ctx.origin, b);
      s.x0 = a.x;
      s.y0 = a.y - MUZZLE_PX - lift(e.towerUid);
      s.x1 = b.x;
      s.y1 = b.y - BODY_LIFT_PX;
      s.ms = 0;
      s.active = true;
      this.skewered++;
    });
  }

  /** Each frame: the Skewer lines, then a rope on every Pinned unit but those in `notMine`. */
  update(dt: number, enemies: PinPool, notMine: ReadonlySet<number> = NONE): void {
    const g = this.#gfx;
    g.clear();
    const reduced = this.#reducedMotion();
    for (const s of this.#skewers) {
      if (!s.active) continue;
      s.ms += dt;
      const alpha = skewerAlpha(s.ms, reduced);
      if (alpha <= 0) {
        s.active = false;
        continue;
      }
      g.lineStyle(4, INK, alpha * 0.8).lineBetween(s.x0, s.y0, s.x1, s.y1);
      g.lineStyle(2, SHAFT, alpha).lineBetween(s.x0, s.y0, s.x1, s.y1);
    }
    let pins = 0;
    for (let i = 0; i < enemies.used; i++) {
      const e = enemies.items[i]!; // i < used ≤ items.length
      if (!showsPin(e) || notMine.has(e.uid)) continue;
      pins++;
      gridToScreen(e.x, e.y, this.#ctx.origin, a);
      const flyer = e.def?.layer === 'air';
      const bodyY = a.y - BODY_LIFT_PX - (flyer ? AIR_LIFT_PX : 0);
      // A flyer is pulled straight down to its ground point; a walker staked beside its feet.
      const sx = flyer ? a.x : a.x + STAKE_DX;
      const sy = flyer ? a.y : a.y + STAKE_DY;
      g.lineStyle(4, INK, 0.7).lineBetween(a.x, bodyY, sx, sy - STAKE_H + 1);
      g.lineStyle(2, ROPE, 1).lineBetween(a.x, bodyY, sx, sy - STAKE_H + 1);
      g.fillStyle(INK, 1).fillRect(sx - 2, sy - STAKE_H - 1, STAKE_W + 2, STAKE_H + 2);
      g.fillStyle(STAKE, 1).fillRect(sx - 1, sy - STAKE_H, STAKE_W, STAKE_H);
    }
    this.pins = pins;
  }

  reset(): void {
    this.#gfx.clear();
    for (const s of this.#skewers) s.active = false;
    this.pins = 0;
  }
}
