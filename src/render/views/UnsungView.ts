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
// - **The rest progress on the boss bar** (`bossRestProgress`): while a `layToRest` boss or one of
//   its parts is on the map, a 2 px `gold.3` strip (a lit `gold.4` top row) under the boss bar,
//   the countdown's progress across its 160 px, in `overlay` and fixed to the screen (T808's
//   placeholder; the HUD's rest strip is T832's).
// Two Graphics; the world one redraws each frame only while a mark shows, the strip only when its
// fill changes. Allocation-free per frame.
import type * as Phaser from 'phaser';
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import type { IdSpace } from '../../content/types.ts';
import type { Bus } from '../../shared/bus.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import {
  addsCalling,
  bossRestProgress,
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
import { VIEW_W } from '../scale.ts';
import { BOSS_BAR_H, BOSS_BAR_W, BOSS_BAR_Y } from '../vfx/bossBar.ts';
import type { ViewContext } from './ViewContext.ts';

/** The rest strip: under the boss bar's frame, 1 px clear of it. */
export const REST_STRIP_Y = BOSS_BAR_Y + BOSS_BAR_H + 2;
export const REST_STRIP_H = 2;
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
  track: hex('ink.2'),
  rest: hex('gold.3'),
  lit: hex('gold.4'),
  clod: hex('grime.3'),
};

interface Burst {
  ms: number;
  x: number;
  y: number;
}

/** The rest strip's fill (px) for progress `p` (0–1): rounded down, full only at 1. */
export function restStripPx(p: number): number {
  if (!(p > 0)) return 0;
  return Math.min(BOSS_BAR_W, Math.floor(p * BOSS_BAR_W + 1e-9));
}

/** The enemy pool and rest as this view reads them. */
export interface UnsungState {
  readonly enemies: { readonly used: number; readonly items: readonly DeepReadonly<Enemy>[] };
  readonly restPoints: number;
  readonly restTarget: number;
}

const p: Vec2 = { x: 0, y: 0 };
const s: Vec2 = { x: 0, y: 0 };
const clod = { dx: 0, dy: 0 };
const burst = { tiles: 0, alpha: 0 };

export class UnsungView {
  readonly #ctx: ViewContext;
  readonly #still: () => boolean;
  readonly #g: Phaser.GameObjects.Graphics;
  readonly #strip: Phaser.GameObjects.Graphics;
  #restPx = -1;
  #drew = false;
  readonly #bursts: Burst[] = [];
  #nextBurst = 0;
  #burstsShown = 0;
  #pool: UnsungState['enemies'] | null = null;
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
    this.#strip = ctx.scene.make.graphics({}, false).setScrollFactor(0).setVisible(false);
    ctx.layers.overlay.add(this.#strip);
    for (let i = 0; i < MAX_BURSTS; i++) this.#bursts.push({ ms: -1, x: 0, y: 0 });
  }

  bind(bus: Bus<SimEvent<IdSpace>>, pool: () => UnsungState['enemies'] | null = () => null): () => void {
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

  /** What shows now: dig marks, surfacing tells, calls, and the rest strip's fill (−1: none). */
  get shown(): {
    digs: number;
    surfaceTells: number;
    calls: number;
    restPx: number;
    bursts: number;
  } {
    return {
      digs: this.#digs,
      surfaceTells: this.#tells,
      calls: this.#calls,
      restPx: this.#restPx,
      bursts: this.#burstsShown,
    };
  }

  update(state: UnsungState, deltaMs = 0): void {
    const items = state.enemies.items;
    let rest = -1;
    this.#digs = 0;
    this.#tells = 0;
    this.#calls = 0;
    const g = this.#g;
    if (this.#drew) g.clear();
    this.#drew = false;
    for (let i = 0; i < state.enemies.used; i++) {
      const e = items[i]!; // i < used ≤ items.length
      if (!e.alive || e.def === null || e.def.boss === null) continue;
      const r = bossRestProgress(state, e);
      if (r >= 0 && rest < 0) rest = r;
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
    this.#drawStrip(rest < 0 ? -1 : restStripPx(rest));
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
    this.#restPx = -1;
    this.#strip.clear().setVisible(false);
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

  #drawStrip(px: number): void {
    if (px === this.#restPx) return;
    this.#restPx = px;
    const g = this.#strip.clear();
    if (px < 0) {
      g.setVisible(false);
      return;
    }
    const x = Math.round((VIEW_W - BOSS_BAR_W) / 2);
    const y = REST_STRIP_Y;
    g.fillStyle(C.frame).fillRect(x - 1, y - 1, BOSS_BAR_W + 2, REST_STRIP_H + 2);
    g.fillStyle(C.track).fillRect(x, y, BOSS_BAR_W, REST_STRIP_H);
    if (px > 0) {
      g.fillStyle(C.rest).fillRect(x, y, px, REST_STRIP_H);
      g.fillStyle(C.lit).fillRect(x, y, px, 1);
    }
    g.setVisible(true);
  }
}
