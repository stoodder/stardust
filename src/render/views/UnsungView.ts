// The Unsung's marks on the field (T808's view, T830's look; design/enemies.md § 6, *How the
// Unsung runs*; the rules are unsungLook.ts). Its body is EnemyView's, in its phase's form sprite
// (`unsungBody`), and its rest is SongView's; this view draws what the body can't:
// - **The dig toward the choir:** while it is dug in, a `violet.3` ring (2 px) on the ground where
//   it will come up (`digTarget`), closing from a wide ring to a tight one as it travels
//   (`digRingTiles`); through the surfacing tell (`surfaceTelling`) the singers' ground churns: the
//   ring blinks `violet.4` ↔ `white.1` (steady `violet.4` under reduced motion) and `grime.3` clods
//   hop on it (`clodAt`; at rest under reduced motion).
// - **Surfacing** (`BossSurfaced`): a `violet.4` burst rings out where it comes up
//   (`surfaceBurstAt`), the light pouring up out of the mound as its `surface` anim plays.
// - **The Song's call** (`addsCalling`): a `violet.4` ring at its road's spawn, where the
//   Silencers walk in, through the call's 1.5 s tell.
// The rest progress under the boss bar is the HUD's (T832: the finale clock's countdown, its gold
// bar the song's rest; ui/hud/FinaleClock.tsx).
// One Graphics, redrawn each frame only while a mark shows. Allocation-free per frame.
import type * as Phaser from 'phaser';
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import type { IdSpace } from '../../content/types.ts';
import type { Bus } from '../../shared/bus.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import {
  addsCalling,
  digTarget,
  surfaceTelling,
  type Enemy,
  type SimEvent,
} from '../../sim/index.ts';
import { gridToScreen, HALF_H, HALF_W, type Vec2 } from '../iso.ts';
import {
  CHURN_CLODS,
  clodAt,
  digRingTiles,
  SURFACE_BURST_MS,
  surfaceBurstAt,
} from './unsungLook.ts';
import type { ViewContext } from './ViewContext.ts';

const BLINK_MS = 120;
/** Surfacing bursts at once (two digs a fight; room to spare). */
const MAX_BURSTS = 4;

function hex(name: ColorName): number {
  const c = rgbOf(name);
  return (c.r << 16) | (c.g << 8) | c.b;
}
const C = {
  dig: hex('violet.3'),
  tell: hex('violet.4'),
  flash: hex('white.1'),
  frame: hex('ink.0'),
  clod: hex('grime.3'),
};

interface Burst {
  ms: number;
  x: number;
  y: number;
}

/** The enemy pool as this view reads it. */
export interface UnsungState {
  readonly enemies: { readonly used: number; readonly items: readonly DeepReadonly<Enemy>[] };
}

const p: Vec2 = { x: 0, y: 0 };
const s: Vec2 = { x: 0, y: 0 };
const clod = { dx: 0, dy: 0 };
const burst = { tiles: 0, alpha: 0 };

export class UnsungView {
  readonly #ctx: ViewContext;
  readonly #still: () => boolean;
  readonly #g: Phaser.GameObjects.Graphics;
  #drew = false;
  readonly #bursts: Burst[] = [];
  #nextBurst = 0;
  #burstsShown = 0;
  /** Marks shown this frame (the render-state hook). */
  #digs = 0;
  #tells = 0;
  #calls = 0;
  /** Surfacings and rises this battle (the smoke flow's checks). */
  surfacesSeen = 0;
  dugOutSeen = 0;
  risesSeen = 0;

  constructor(ctx: ViewContext, reducedMotion: () => boolean) {
    this.#ctx = ctx;
    this.#still = reducedMotion;
    this.#g = ctx.scene.make.graphics({}, false);
    ctx.layers.vfx.add(this.#g);
    for (let i = 0; i < MAX_BURSTS; i++) this.#bursts.push({ ms: -1, x: 0, y: 0 });
  }

  bind(
    bus: Bus<SimEvent<IdSpace>>,
    pool: () => UnsungState['enemies'] | null = () => null,
  ): () => void {
    const offs = [
      bus.on('BossSurfaced', (e) => {
        this.surfacesSeen++;
        if (e.dugOut) this.dugOutSeen++;
        // T830: the light pours up where it comes up.
        const en = pool();
        if (en === null) return;
        for (let i = 0; i < en.used; i++) {
          const u = en.items[i]!; // i < used ≤ items.length
          if (u.uid !== e.uid) continue;
          const b = this.#bursts[this.#nextBurst]!; // index < MAX_BURSTS
          this.#nextBurst = (this.#nextBurst + 1) % MAX_BURSTS;
          b.ms = 0;
          b.x = u.x;
          b.y = u.y;
          break;
        }
      }),
      bus.on('BossRisen', () => {
        this.risesSeen++;
      }),
    ];
    return () => {
      for (const off of offs) off();
    };
  }

  /** What shows now: dig marks, surfacing tells, and calls. */
  get shown(): {
    digs: number;
    surfaceTells: number;
    calls: number;
    bursts: number;
  } {
    return {
      digs: this.#digs,
      surfaceTells: this.#tells,
      calls: this.#calls,
      bursts: this.#burstsShown,
    };
  }

  update(state: UnsungState, deltaMs = 0): void {
    const items = state.enemies.items;
    this.#digs = 0;
    this.#tells = 0;
    this.#calls = 0;
    const g = this.#g;
    if (this.#drew) g.clear();
    this.#drew = false;
    for (let i = 0; i < state.enemies.used; i++) {
      const e = items[i]!; // i < used ≤ items.length
      if (!e.alive || e.def === null || e.def.boss === null) continue;
      if (digTarget(e, p)) {
        const telling = surfaceTelling(e);
        const dig = e.def.boss.phases[e.bossPhase - 1]?.burrow?.durationTicks ?? 1;
        // Wide as it digs in, tight under the singers (abilityTicks counts down the dig).
        const travel = 1 - Math.min(1, e.abilityTicks / dig);
        const tiles = digRingTiles(travel, telling);
        this.#ring(p.x, p.y, tiles, telling ? this.#blink() : C.dig);
        if (telling) this.#churn(p.x, p.y, tiles);
        this.#digs++;
        if (telling) this.#tells++;
      }
      if (addsCalling(e) && e.route !== null) {
        this.#ring(e.route.xs[0]!, e.route.ys[0]!, 1, C.tell); // a route has points
        this.#calls++;
      }
    }
    this.#drawBursts(Number.isFinite(deltaMs) && deltaMs > 0 ? deltaMs : 0);
  }

  /** The singers' ground churning through the surfacing tell: clods hopping on the ring. */
  #churn(gx: number, gy: number, tiles: number): void {
    gridToScreen(gx, gy, this.#ctx.origin, s);
    const still = this.#still();
    const now = performance.now();
    const g = this.#g;
    for (let i = 0; i < CHURN_CLODS; i++) {
      clodAt(i, now, tiles * HALF_W * 2, tiles * HALF_H * 2, still, clod);
      const x = Math.round(s.x) + clod.dx;
      const y = Math.round(s.y) + clod.dy;
      g.fillStyle(C.frame, 1).fillRect(x - 1, y - 1, 4, 3);
      g.fillStyle(C.clod, 1).fillRect(x, y - 1, 2, 2);
    }
  }

  #drawBursts(dt: number): void {
    this.#burstsShown = 0;
    const still = this.#still();
    for (const b of this.#bursts) {
      if (b.ms < 0) continue;
      surfaceBurstAt(b.ms, still, burst);
      b.ms += dt;
      if (burst.alpha <= 0 || b.ms > SURFACE_BURST_MS) {
        b.ms = -1;
        continue;
      }
      gridToScreen(b.x, b.y, this.#ctx.origin, s);
      const w = burst.tiles * HALF_W * 2;
      const h = burst.tiles * HALF_H * 2;
      this.#g.lineStyle(3, C.frame, burst.alpha * 0.6).strokeEllipse(s.x, s.y, w, h);
      this.#g.lineStyle(2, C.tell, burst.alpha).strokeEllipse(s.x, s.y, w, h);
      this.#g.lineStyle(1, C.flash, burst.alpha).strokeEllipse(s.x, s.y, w * 0.6, h * 0.6);
      this.#drew = true;
      this.#burstsShown++;
    }
  }

  reset(): void {
    this.#g.clear();
    this.#drew = false;
    for (const b of this.#bursts) b.ms = -1;
  }

  #blink(): number {
    if (this.#still()) return C.tell;
    return Math.floor(performance.now() / BLINK_MS) % 2 === 0 ? C.tell : C.flash;
  }

  /** A ground ring `tiles` across at grid point (gx, gy): an iso ellipse. */
  #ring(gx: number, gy: number, tiles: number, color: number): void {
    gridToScreen(gx, gy, this.#ctx.origin, s);
    const w = tiles * HALF_W * 2;
    const h = tiles * HALF_H * 2;
    this.#g.lineStyle(2, color, 1).strokeEllipse(s.x, s.y, w, h);
    this.#drew = true;
  }
}
