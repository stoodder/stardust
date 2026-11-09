// The core's feedback (D026), drawn over GroundView's static core prop: a leak flashes the core
// white for 2 frames, and at low integrity its glow halo is drawn over it in `red.3` and throbs at 1 Hz (steady under
// reduced motion). The leak's ring, shake, and "−N" are FxView's; the HUD meter has its own flash.
import * as Phaser from 'phaser';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { DEFAULT_VARIANT } from '../sprites/bake.ts';
import type { ViewContext } from './ViewContext.ts';

/** Integrity at or below this turns the core's glow red (art-direction §9: red at 5). */
export const LOW_INTEGRITY = 5;
/** Leak flash: this many rendered frames of white fill. */
const LEAK_FLASH_FRAMES = 2;
const CORE = 'prop.core';
const FRAME = 'idle_0';
/** `white.1` and `red.3` (master palette) as tints. */
const WHITE = 0xffffff;
const RED = 0xf0384a;

/** A map's grid as CoreView reads it. */
export interface CoreGrid {
  readonly cols: number;
  readonly tiles: readonly string[];
}

const pos: Vec2 = { x: 0, y: 0 };

export class CoreView {
  readonly #reducedMotion: () => boolean;
  /** Tile centers (grid units) of every core on the map. */
  readonly #cores: { x: number; y: number }[] = [];
  readonly #flash: Phaser.GameObjects.Image[] = [];
  readonly #glow: Phaser.GameObjects.Image[] = [];
  #flashFrames = 0;
  #ms = 0;

  constructor(ctx: ViewContext, grid: CoreGrid, reducedMotion: () => boolean) {
    this.#reducedMotion = reducedMotion;
    const { scene, sprites, layers, origin } = ctx;
    const f = sprites.frame(CORE, FRAME, DEFAULT_VARIANT);
    const a = sprites.frameAnchor(CORE, FRAME);
    const glow = sprites.glowFrame(CORE, FRAME);
    const ga = glow === null ? null : sprites.frameAnchor(CORE, `${FRAME}@glow`);
    grid.tiles.forEach((t, i) => {
      if (t !== 'C') return;
      const col = i % grid.cols;
      const row = (i - col) / grid.cols;
      this.#cores.push({ x: col + 0.5, y: row + 0.5 });
      gridToScreen(col + 0.5, row + 0.5, origin, pos);
      const flash = scene.make
        .image({}, false)
        .setTexture(f.texture, f.frame)
        .setDisplayOrigin(a.x, a.y)
        .setPosition(pos.x, pos.y)
        .setTint(WHITE)
        .setTintMode(Phaser.TintModes.FILL)
        .setVisible(false);
      layers.vfx.add(flash);
      this.#flash.push(flash);
      if (glow !== null && ga !== null) {
        const g = scene.make
          .image({}, false)
          .setTexture(glow.texture, glow.frame)
          .setDisplayOrigin(ga.x, ga.y)
          .setPosition(pos.x, pos.y)
          .setTint(RED)
          .setTintMode(Phaser.TintModes.FILL)
          .setVisible(false);
        layers.vfx.add(g);
        this.#glow.push(g);
      }
    });
  }

  /** The core nearest grid point (x, y), for where a leak's effects play; null with no core. */
  nearest(x: number, y: number): { readonly x: number; readonly y: number } | null {
    let best: { x: number; y: number } | null = null;
    let bestD = Infinity;
    for (const c of this.#cores) {
      const d = Number.isNaN(x) ? 0 : (c.x - x) ** 2 + (c.y - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    return best;
  }

  /** A leak: the core flashes white. */
  leak(): void {
    this.#flashFrames = LEAK_FLASH_FRAMES;
    for (const f of this.#flash) f.setVisible(true);
  }

  /** Once per rendered frame: ends the flash, and shows the red glow at low integrity. */
  update(deltaMs: number, integrity: number): void {
    if (this.#flashFrames > 0 && --this.#flashFrames === 0) {
      for (const f of this.#flash) f.setVisible(false);
    }
    const low = integrity <= LOW_INTEGRITY;
    this.#ms = low ? this.#ms + (Number.isFinite(deltaMs) ? Math.max(0, deltaMs) : 0) : 0;
    // 1 Hz: full for half a second, the 60% step for the other half (stepped alpha).
    const alpha = this.#reducedMotion() || this.#ms % 1000 < 500 ? 1 : 0.6;
    for (const g of this.#glow) g.setVisible(low).setAlpha(alpha);
  }
}
