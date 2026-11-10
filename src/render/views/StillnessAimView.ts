// Stillness's aim preview (T531; core-loop.md § 3.2): aiming the companion's Stillness shows the
// circle it would freeze, in its own look, not the Orbital Strike's marching reticle (a strike is
// damage after a delay; Stillness is instant Stasis, no zone). It is the same pale `blue.4` the
// cast leaves on the ground (MindView's StasisArea disc, mindLook.ts) as a faint disc, under a
// dashed `teal.3` rim with an `ink.0` under-stroke at the aim alpha (review U14: the pale ring
// alone washed out on A2M4's gold), held still on the hovered tile's centre at the ability's real
// radius (`abilityStats`, 2.5 tiles). It lies in the `decal` layer under the actors it would
// freeze. Allocation-free per frame: two images, re-textured only when the radius changes.
import type * as Phaser from 'phaser';
import type { ColorName } from '../../content/palettes/master.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import { ringImage, snapRingRadius } from '../vfx/overlayPixels.ts';
import { discTexture } from '../vfx/overlayTextures.ts';
import { STILLNESS_COLOR } from './mindLook.ts';
import type { ViewContext } from './ViewContext.ts';

/** The aim's ring alpha (Scanner Sweep's aim's) and its disc's (fainter than the cast's 0.3). */
export const STILL_AIM_ALPHA = 0.8;
export const STILL_AIM_FILL_ALPHA = 0.2;
/** The aim's rim: dashed `teal.3` over an `ink.0` under-stroke (review U14). */
export const STILL_AIM_RIM: ColorName = 'teal.3';
export const STILL_AIM_UNDER: ColorName = 'ink.0';

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
      const r = snapRingRadius(radiusTiles);
      const ring = ringImage(r, STILL_AIM_RIM, true, STILL_AIM_UNDER);
      const key = `fx.still_aim.${r}`;
      if (!scene.textures.exists(key)) scene.textures.addCanvas(key, imageToCanvas(ring.image));
      this.#ring.setTexture(key).setDisplayOrigin(ring.cx, ring.cy);
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
