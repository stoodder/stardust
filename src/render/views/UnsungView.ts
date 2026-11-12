// The Unsung's minimal view (T808; design/enemies.md § 6, *How the Unsung runs*): what its sim
// state says, drawn plainly until T830/T832 replace it with the real looks and the HUD's bar.
// - **The dig toward the choir:** while it is dug in, a `violet.3` ring (2 px) on the ground where
//   it will come up (`digTarget`), closing from a wide ring to a tight one as it travels; through
//   the surfacing tell (`surfaceTelling`) the ring blinks `violet.4` ↔ `white.1` (steady
//   `violet.4` under reduced motion): the singers' ground churning.
// - **The Song's call** (`addsCalling`): a `violet.4` ring at its road's spawn, where the
//   Silencers walk in, through the call's 1.5 s tell.
// - **The rest progress on the boss bar** (`bossRestProgress`): while a `layToRest` boss or one of
//   its parts is on the map, a 2 px `gold.3` strip (a lit `gold.4` top row) under the boss bar,
//   the countdown's progress across its 160 px, in `overlay` and fixed to the screen.
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
import { VIEW_W } from '../scale.ts';
import { BOSS_BAR_H, BOSS_BAR_W, BOSS_BAR_Y } from '../vfx/bossBar.ts';
import type { ViewContext } from './ViewContext.ts';

/** The rest strip: under the boss bar's frame, 1 px clear of it. */
export const REST_STRIP_Y = BOSS_BAR_Y + BOSS_BAR_H + 2;
export const REST_STRIP_H = 2;
/** The dig mark's ring: from this many tiles across as it digs in to the tight one as it comes up. */
const RING_WIDE = 1.6;
const RING_TIGHT = 0.6;
const BLINK_MS = 120;

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
};

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

export class UnsungView {
  readonly #ctx: ViewContext;
  readonly #still: () => boolean;
  readonly #g: Phaser.GameObjects.Graphics;
  readonly #strip: Phaser.GameObjects.Graphics;
  #restPx = -1;
  #drew = false;
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
  }

  bind(bus: Bus<SimEvent<IdSpace>>): () => void {
    const offs = [
      bus.on('BossSurfaced', (e) => {
        this.surfacesSeen++;
        if (e.dugOut) this.dugOutSeen++;
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
  get shown(): { digs: number; surfaceTells: number; calls: number; restPx: number } {
    return { digs: this.#digs, surfaceTells: this.#tells, calls: this.#calls, restPx: this.#restPx };
  }

  update(state: UnsungState): void {
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
        const k = telling ? 0 : Math.min(1, e.abilityTicks / dig); // wide as it digs, tight under them
        this.#ring(p.x, p.y, RING_TIGHT + (RING_WIDE - RING_TIGHT) * k, telling ? this.#blink() : C.dig);
        this.#digs++;
        if (telling) this.#tells++;
      }
      if (addsCalling(e) && e.route !== null) {
        this.#ring(e.route.xs[0]!, e.route.ys[0]!, 1, C.tell); // a route has points
        this.#calls++;
      }
    }
    this.#drawStrip(rest < 0 ? -1 : restStripPx(rest));
  }

  reset(): void {
    this.#g.clear();
    this.#drew = false;
    this.#restPx = -1;
    this.#strip.clear().setVisible(false);
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
