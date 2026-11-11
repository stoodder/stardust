// Underfoot's aim (core-loop.md § 3.2; T631): while Bramble's Underfoot is aimed, a ghost of the
// snare (trapLook.ts's moss ring and jaws, the trap's own look) lies at 80% on the hovered ground
// path tile, the one tile the trap would hold, so the aim reads as the trap and not as Suppressing
// Fire's warm stretch. Off the road the hover's red tile (input/intents.ts) says no instead, and
// nothing shows. Held still (no breath), so it never reads as a live trap. One image, set up once.
import type * as Phaser from 'phaser';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import { trapImage } from './trapLook.ts';
import type { ViewContext } from './ViewContext.ts';

/**
 * The ghost's alpha (art-direction §7, stepped alpha): 80%, as Stillness's aim rim, since the
 * thin moss ring at the placement ghost's 60% sank into Act III's dark road (T631).
 */
export const TRAP_AIM_ALPHA = 0.8;
const AIM_KEY = 'fx.underfoot_snare_aim';

const pos: Vec2 = { x: 0, y: 0 };

export class TrapAimView {
  readonly #ctx: ViewContext;
  readonly #ghost: Phaser.GameObjects.Image;
  #col = -1;
  #row = -1;

  constructor(ctx: ViewContext) {
    this.#ctx = ctx;
    const snare = trapImage();
    if (!ctx.scene.textures.exists(AIM_KEY)) {
      ctx.scene.textures.addCanvas(AIM_KEY, imageToCanvas(snare.image));
    }
    this.#ghost = ctx.scene.make.image({}, false).setVisible(false);
    this.#ghost.setTexture(AIM_KEY).setDisplayOrigin(snare.cx, snare.cy).setAlpha(TRAP_AIM_ALPHA);
    ctx.layers.decal.add(this.#ghost);
  }

  /** The tile the ghost lies on (column −1: none), for the smoke flow's checks. */
  get at(): { readonly col: number; readonly row: number } {
    return { col: this.#col, row: this.#row };
  }

  /** Lays the ghost on tile (col, row), or takes it away (col −1). Cheap while nothing moved. */
  setAim(col: number, row: number): void {
    if (col === this.#col && row === this.#row) return;
    this.#col = col;
    this.#row = col < 0 ? -1 : row;
    if (col < 0) {
      this.#ghost.setVisible(false);
      return;
    }
    gridToScreen(col + 0.5, row + 0.5, this.#ctx.origin, pos);
    this.#ghost.setPosition(Math.round(pos.x), Math.round(pos.y)).setVisible(true);
  }

  reset(): void {
    this.setAim(-1, 0);
  }
}
