// The Stasis Bloom on the field (T608, polished by T630a; bloomLook.ts holds the rules): round each
// live Bloom, a faint ground disc at its field's reach with a dashed ring at its edge (whole while
// the pulse is ready, a step dimmer while it recharges), the disc brightening as it pulses and the
// Bloom's own six-petalled burst ring growing out to the reach (battleEvents.ts leaves Flash
// Freeze's ice ring off a Bloom's PulseBurst). In `decal`, under the units, centred on the tower's
// tile; it reads sim state only, so it holds while paused. A Gravity Well's pull (`PulledBack`)
// leaves a fading `violet.4` streak from where the unit stood to where it was set, in `vfx` on
// real time. The Bloom itself is TowerView's (its sprites, T640b, and its head's `fire` on each
// pulse); Stasis's ice tint is EnemyView's. Allocation-free per frame: discs, rings, bursts, and
// streaks are pooled; each texture (colour, snapped radius, alpha) is registered once.
import type * as Phaser from 'phaser';
import type { ColorName } from '../../content/palettes/master.ts';
import type { IdSpace } from '../../content/types.ts';
import type { Bus } from '../../shared/bus.ts';
import { rgbOf } from '../../content/palettes/master.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import type { SimEvent, Tower } from '../../sim/index.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import { discImage, ringImage, snapRingRadius } from '../vfx/overlayPixels.ts';
import {
  bloomColors,
  bloomReach,
  DISC_ALPHA,
  DISC_FLASH_ALPHA,
  pulseFlash,
  pulseRing,
  pulseRingImage,
  ringAlpha,
  STREAK_MS,
  streakAlpha,
} from './bloomLook.ts';
import { BODY_LIFT_PX } from './TransientFx.ts';
import type { ViewContext } from './ViewContext.ts';

/** The pool as this view reads it. */
export interface BloomPools {
  readonly towers: { readonly used: number; readonly items: readonly DeepReadonly<Tower>[] };
}

const MAX_BLOOMS = 12;
const MAX_STREAKS = 12;
const RING_UNDER: ColorName = 'ink.0';
const STREAK = hex('violet.4');
const STREAK_HEAD = hex('white.1');
const INK = hex('ink.0');

function hex(name: ColorName): number {
  const c = rgbOf(name);
  return (c.r << 16) | (c.g << 8) | c.b;
}

interface Streak {
  active: boolean;
  ms: number;
  /** Screen px: from where the unit stood to where it was set (its body's height). */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface Shape {
  readonly img: Phaser.GameObjects.Image;
  /** What its texture shows now (snapped radius, colour, flash), so a frame rebuilds no key. */
  radius: number;
  color: ColorName | null;
  flash: boolean;
}

const pos: Vec2 = { x: 0, y: 0 };

export class BloomView {
  readonly #ctx: ViewContext;
  readonly #reducedMotion: () => boolean;
  readonly #discs: Shape[] = [];
  readonly #rings: Shape[] = [];
  readonly #bursts: Shape[] = [];
  readonly #frames = new Map<string, { ox: number; oy: number }>();
  readonly #streaks: Streak[] = [];
  readonly #streakGfx: Phaser.GameObjects.Graphics;
  #nextStreak = 0;
  #shown = 0;
  #flashing = 0;
  #bursting = 0;
  /** Pull streaks drawn since the battle began (the smoke flow's check). */
  streaksPlayed = 0;

  constructor(ctx: ViewContext, reducedMotion: () => boolean = () => false) {
    this.#ctx = ctx;
    this.#reducedMotion = reducedMotion;
    const scene = ctx.scene;
    // Discs first, so every ring draws over every disc where two fields overlap.
    for (let i = 0; i < MAX_BLOOMS; i++) {
      const img = scene.make.image({}, false).setVisible(false);
      ctx.layers.decal.add(img);
      this.#discs.push({ img, radius: 0, color: null, flash: false });
    }
    for (let i = 0; i < MAX_BLOOMS; i++) {
      const img = scene.make.image({}, false).setVisible(false);
      ctx.layers.decal.add(img);
      this.#rings.push({ img, radius: 0, color: null, flash: false });
    }
    for (let i = 0; i < MAX_BLOOMS; i++) {
      const img = scene.make.image({}, false).setVisible(false);
      ctx.layers.decal.add(img);
      this.#bursts.push({ img, radius: 0, color: null, flash: false });
    }
    this.#streakGfx = scene.make.graphics({}, false);
    ctx.layers.vfx.add(this.#streakGfx);
    for (let i = 0; i < MAX_STREAKS; i++) {
      this.#streaks.push({ active: false, ms: 0, x0: 0, y0: 0, x1: 0, y1: 0 });
    }
  }

  /** Draws a streak for each Gravity Well pull (`PulledBack`). */
  bind(bus: Bus<SimEvent<IdSpace>>): () => void {
    return bus.on('PulledBack', (e) => this.pulled(e.fromX, e.fromY, e.x, e.y));
  }

  /** A unit was pulled from grid (x0, y0) back to (x1, y1): its streak. */
  pulled(x0: number, y0: number, x1: number, y1: number): void {
    const st = this.#streaks[this.#nextStreak]!; // #nextStreak < MAX_STREAKS
    this.#nextStreak = (this.#nextStreak + 1) % MAX_STREAKS;
    gridToScreen(x0, y0, this.#ctx.origin, pos);
    st.x0 = Math.round(pos.x);
    st.y0 = Math.round(pos.y) - BODY_LIFT_PX;
    gridToScreen(x1, y1, this.#ctx.origin, pos);
    st.x1 = Math.round(pos.x);
    st.y1 = Math.round(pos.y) - BODY_LIFT_PX;
    st.ms = 0;
    st.active = true;
    this.streaksPlayed++;
  }

  /** Burst rings growing now (the smoke flow's check). */
  get bursting(): number {
    return this.#bursting;
  }

  /** Fields drawn now (the smoke flow's check). */
  get fields(): number {
    return this.#shown;
  }

  /** Fields drawn flashing for a pulse now. */
  get flashing(): number {
    return this.#flashing;
  }

  update(pools: BloomPools, dtMs = 0): void {
    const reduced = this.#reducedMotion();
    let n = 0;
    let flashing = 0;
    let bursting = 0;
    const towers = pools.towers;
    for (let i = 0; i < towers.used && n < MAX_BLOOMS; i++) {
      const t = towers.items[i]!; // i < used ≤ items.length
      const reach = bloomReach(t);
      if (reach <= 0) continue;
      gridToScreen(t.x, t.y, this.#ctx.origin, pos);
      const x = Math.round(pos.x);
      const y = Math.round(pos.y);
      const colors = bloomColors(t);
      const flash = pulseFlash(t);
      if (flash) flashing++;
      const radius = snapRingRadius(reach);
      const disc = this.#discs[n]!; // n < MAX_BLOOMS
      this.#show(disc, radius, flash ? colors.flash : colors.disc, flash, true, x, y);
      const ring = this.#rings[n]!; // n < MAX_BLOOMS
      this.#show(ring, radius, colors.ring, false, false, x, y);
      ring.img.setAlpha(ringAlpha(t));
      const burst = this.#bursts[n]!; // n < MAX_BLOOMS
      const b = pulseRing(t, reach, reduced);
      if (b.alpha > 0) {
        bursting++;
        this.#showBurst(burst, b.tiles, colors.ring, x, y);
        burst.img.setAlpha(b.alpha);
      } else if (burst.img.visible) {
        burst.img.setVisible(false);
      }
      n++;
    }
    this.#shown = n;
    this.#flashing = flashing;
    this.#bursting = bursting;
    for (let k = n; k < MAX_BLOOMS; k++) {
      const d = this.#discs[k]!; // k < MAX_BLOOMS
      const r = this.#rings[k]!; // k < MAX_BLOOMS
      const b = this.#bursts[k]!; // k < MAX_BLOOMS
      if (d.img.visible) d.img.setVisible(false);
      if (r.img.visible) r.img.setVisible(false);
      if (b.img.visible) b.img.setVisible(false);
    }
    this.#drawStreaks(Number.isFinite(dtMs) && dtMs > 0 ? dtMs : 0);
  }

  /** Advances and draws the pull streaks. */
  #drawStreaks(dt: number): void {
    const g = this.#streakGfx;
    g.clear();
    for (const st of this.#streaks) {
      if (!st.active) continue;
      st.ms += dt;
      if (st.ms >= STREAK_MS) {
        st.active = false;
        continue;
      }
      const a = streakAlpha(st.ms);
      g.lineStyle(3, INK, 0.6 * a).lineBetween(st.x0, st.y0 + 1, st.x1, st.y1 + 1);
      g.lineStyle(1, STREAK, a).lineBetween(st.x0, st.y0, st.x1, st.y1);
      g.fillStyle(STREAK_HEAD, a).fillRect(st.x1 - 1, st.y1 - 1, 2, 2);
    }
  }

  /** Shows a burst ring of `radius` tiles in `petal` at screen (x, y), baking its texture once. */
  #showBurst(shape: Shape, radius: number, petal: ColorName, x: number, y: number): void {
    if (shape.radius !== radius || shape.color !== petal) {
      const key = `fx.bloom_burst.${petal}.${radius}`;
      let f = this.#frames.get(key);
      if (f === undefined) {
        const baked = pulseRingImage(radius, petal);
        if (!this.#ctx.scene.textures.exists(key)) {
          this.#ctx.scene.textures.addCanvas(key, imageToCanvas(baked.image));
        }
        f = { ox: baked.cx, oy: baked.cy };
        this.#frames.set(key, f);
      }
      shape.img.setTexture(key).setDisplayOrigin(f.ox, f.oy);
      shape.radius = radius;
      shape.color = petal;
    }
    shape.img.setPosition(x, y).setVisible(true);
  }

  reset(): void {
    for (const s of this.#discs) s.img.setVisible(false);
    for (const s of this.#rings) s.img.setVisible(false);
    for (const s of this.#bursts) s.img.setVisible(false);
    for (const st of this.#streaks) st.active = false;
    this.#streakGfx.clear();
    this.#bursting = 0;
    this.#shown = 0;
    this.#flashing = 0;
  }

  /**
   * Shows `shape` at screen (x, y): a disc (`isDisc`: dithered edge, the flash's alpha when
   * `flash`) or a dashed ring, of `radius` (snapped) in `color`, baking its texture once.
   */
  #show(
    shape: Shape,
    radius: number,
    color: ColorName,
    flash: boolean,
    isDisc: boolean,
    x: number,
    y: number,
  ): void {
    if (shape.radius !== radius || shape.color !== color || shape.flash !== flash) {
      const key = isDisc
        ? `fx.bloom_disc.${color}.${radius}.${flash ? 1 : 0}`
        : `fx.bloom_ring.${color}.${radius}`;
      let f = this.#frames.get(key);
      if (f === undefined) {
        const baked = isDisc
          ? discImage(radius, color, flash ? DISC_FLASH_ALPHA : DISC_ALPHA, true)
          : ringImage(radius, color, true, RING_UNDER);
        if (!this.#ctx.scene.textures.exists(key)) {
          this.#ctx.scene.textures.addCanvas(key, imageToCanvas(baked.image));
        }
        f = { ox: baked.cx, oy: baked.cy };
        this.#frames.set(key, f);
      }
      shape.img.setTexture(key).setDisplayOrigin(f.ox, f.oy);
      shape.radius = radius;
      shape.color = color;
      shape.flash = flash;
    }
    shape.img.setPosition(x, y).setVisible(true);
  }
}
