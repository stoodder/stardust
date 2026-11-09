// Zapcoil's chain arcs (art-direction §7 Energy and §6 Zapcoil; D076; T312a): the sim emits one
// `ProjectileFired` (`kind: 'chain'`) and then one `ProjectileHit` per enemy struck, in order, so
// render draws the arc tower → first → each jump. Each hop is a jagged polyline (the pure
// `vfx/arcPixels.ts`), a white-hot core between `blue.4` edges, regenerated every 2 frames with
// cosmetic RNG while it lives (about a tenth of a second), fading in stepped alpha. Each segment is
// the 1×3 stroke texture stretched and turned along it (Phaser's WebGL Graphics drops 1 px lines,
// so the arc is sprites). Pooled: a full pool reuses the oldest hop, so a chain allocates nothing.
import type * as Phaser from 'phaser';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import { ARC_SEGMENTS, arcStrokeImage, jaggedArc } from '../vfx/arcPixels.ts';
import { fadeAlpha } from '../vfx/fxTiming.ts';
import type { ViewContext } from './ViewContext.ts';

/** How long one hop's arc shows (ms): long enough to read, short enough to crackle. */
export const CHAIN_MS = 140;
/** Hops drawn at once (a Conductive chain is 6 hops; several Zapcoils fire together). */
const MAX_HOPS = 40;
/** Regenerate the jagged line every this many rendered frames (art-direction §7). */
const REGEN_FRAMES = 2;
const STROKE_KEY = 'fx.arc.stroke';

const pos: Vec2 = { x: 0, y: 0 };

interface Hop {
  active: boolean;
  ms: number;
  frames: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  readonly segs: Phaser.GameObjects.Image[];
}

export class ChainFx {
  readonly #ctx: ViewContext;
  readonly #hops: Hop[] = [];
  readonly #pts: number[] = [];
  #next = 0;
  #seed = 0x5a17;
  /** Where the next hop starts (screen px): the tower's emitter, then the last enemy struck. */
  #cx = 0;
  #cy = 0;

  constructor(ctx: ViewContext) {
    this.#ctx = ctx;
    const { scene, layers } = ctx;
    if (!scene.textures.exists(STROKE_KEY)) {
      scene.textures.addCanvas(STROKE_KEY, imageToCanvas(arcStrokeImage()));
    }
    for (let i = 0; i < MAX_HOPS; i++) {
      const segs: Phaser.GameObjects.Image[] = [];
      for (let k = 0; k < ARC_SEGMENTS; k++) {
        const img = scene.make.image({}, false).setTexture(STROKE_KEY).setOrigin(0, 0.5);
        img.setVisible(false);
        layers.vfx.add(img);
        segs.push(img);
      }
      this.#hops.push({ active: false, ms: 0, frames: 0, x0: 0, y0: 0, x1: 0, y1: 0, segs });
    }
    for (let i = 0; i <= ARC_SEGMENTS; i++) this.#pts.push(0, 0);
  }

  /** A chain fires from grid (x, y), `liftPx` up (the emitter): the next hop starts there. */
  begin(x: number, y: number, liftPx: number): void {
    gridToScreen(x, y, this.#ctx.origin, pos);
    this.#cx = Math.round(pos.x);
    this.#cy = Math.round(pos.y - liftPx);
  }

  /**
   * The arc strikes the enemy at grid (x, y), `liftPx` up (its body): a hop from the last point,
   * which moves there.
   */
  hop(x: number, y: number, liftPx: number): void {
    gridToScreen(x, y, this.#ctx.origin, pos);
    const sx = pos.x;
    const sy = pos.y - liftPx;
    const h = this.#hops[this.#next]!; // index < MAX_HOPS
    this.#next = (this.#next + 1) % MAX_HOPS;
    h.x0 = this.#cx;
    h.y0 = this.#cy;
    h.x1 = Math.round(sx);
    h.y1 = Math.round(sy);
    h.ms = 0;
    h.frames = 0;
    h.active = true;
    this.#cx = h.x1;
    this.#cy = h.y1;
    this.#draw(h);
  }

  /** Advances every live hop by a frame of `dt` ms. */
  update(dt: number): void {
    for (const h of this.#hops) {
      if (!h.active) continue;
      h.ms += dt;
      h.frames++;
      if (h.ms >= CHAIN_MS) {
        h.active = false;
        for (const s of h.segs) s.setVisible(false);
        continue;
      }
      if (h.frames % REGEN_FRAMES === 0) this.#draw(h);
      const a = fadeAlpha(h.ms / CHAIN_MS);
      for (const s of h.segs) s.setAlpha(a);
    }
  }

  /** Hides every hop (the scene is shutting down). */
  reset(): void {
    for (const h of this.#hops) {
      h.active = false;
      for (const s of h.segs) s.setVisible(false);
    }
  }

  /** Lays a fresh jagged line along hop `h`. */
  #draw(h: Hop): void {
    const p = this.#pts;
    this.#seed = jaggedArc(h.x0, h.y0, h.x1, h.y1, this.#seed, p);
    for (let k = 0; k < ARC_SEGMENTS; k++) {
      const x0 = p[2 * k]!; // < 2 × (ARC_SEGMENTS + 1)
      const y0 = p[2 * k + 1]!;
      const dx = p[2 * k + 2]! - x0;
      const dy = p[2 * k + 3]! - y0;
      const len = Math.max(1, Math.round(Math.hypot(dx, dy)));
      h.segs[k]! // k < ARC_SEGMENTS
        .setPosition(x0, y0)
        .setRotation(Math.atan2(dy, dx))
        .setScale(len + 1, 1)
        .setAlpha(fadeAlpha(h.ms / CHAIN_MS))
        .setVisible(true);
    }
  }
}
