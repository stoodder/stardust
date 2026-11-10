// Stillness's aim preview (T531; core-loop.md § 3.2): aiming the companion's Stillness shows the
// circle it would freeze, in its own look, not the Orbital Strike's marching reticle (a strike is
// damage after a delay; Stillness is instant Stasis, no zone). It is the same pale `blue.4` the
// cast leaves on the ground (MindView's StasisArea disc, mindLook.ts), drawn as an aim: the ring
// (ink under-stroke, so it reads on light ground) at the aim alpha over a faint disc, held still
// on the hovered tile's centre at the ability's real radius (`abilityStats`, 2.5 tiles). It lies
// in the `decal` layer under the actors it would freeze. Allocation-free per frame: two images,
// re-textured only when the radius changes.
import type * as Phaser from 'phaser';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { discTexture, effectRingTexture } from '../vfx/overlayTextures.ts';
import { STILLNESS_COLOR } from './mindLook.ts';
import type { ViewContext } from './ViewContext.ts';

/** The aim's ring alpha (Scanner Sweep's aim's) and its disc's (fainter than the cast's 0.3). */
export const STILL_AIM_ALPHA = 0.8;
export const STILL_AIM_FILL_ALPHA = 0.2;

/** Scratch for the screen position. */
const pos: Vec2 = { x: 0, y: 0 };

export class StillnessAimView {
  readonly #ctx: ViewContext;
  readonly #ring: Phaser.GameObjects.Image;
  readonly #fill: Phaser.GameObjects.Image;
  /** The radius the images were textured for (−1: never). */
  #radius = -1;

  constructor(ctx: ViewContext) {
    this.#ctx = ctx;
    this.#fill = ctx.scene.make.image({}, false).setVisible(false);
    this.#ring = ctx.scene.make.image({}, false).setVisible(false).setAlpha(STILL_AIM_ALPHA);
    ctx.layers.decal.add([this.#fill, this.#ring]);
  }

  /** Shows the aim on tile (col, row) at `radiusTiles`; col < 0 or no radius hides it. */
  setAim(col: number, row: number, radiusTiles: number): void {
    if (col < 0 || radiusTiles <= 0) {
      if (this.#ring.visible) {
        this.#ring.setVisible(false);
        this.#fill.setVisible(false);
      }
      return;
    }
    if (radiusTiles !== this.#radius) {
      this.#radius = radiusTiles;
      const scene = this.#ctx.scene;
      const ring = effectRingTexture(scene, radiusTiles, STILLNESS_COLOR, 'ink.0');
      this.#ring.setTexture(ring.key).setDisplayOrigin(ring.ox, ring.oy);
      const fill = discTexture(scene, radiusTiles, STILLNESS_COLOR, STILL_AIM_FILL_ALPHA);
      this.#fill.setTexture(fill.key).setDisplayOrigin(fill.ox, fill.oy);
    }
    gridToScreen(col + 0.5, row + 0.5, this.#ctx.origin, pos);
    this.#ring.setPosition(pos.x, pos.y).setVisible(true);
    this.#fill.setPosition(pos.x, pos.y).setVisible(true);
  }

  /** Whether the aim shows (the smoke hooks' view of it). */
  get aiming(): boolean {
    return this.#ring.visible;
  }

  reset(): void {
    this.setAim(-1, 0, 0);
  }

  destroy(): void {
    this.#ring.destroy();
    this.#fill.destroy();
  }
}
