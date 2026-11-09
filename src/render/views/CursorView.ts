// The keyboard tile cursor (T126): `vfx/cursorPixels.ts`'s corner brackets on the cursor's tile, in
// the `overlay` layer so a tower standing there never hides them. The scene shows it while the
// cursor is shown (BattleInteraction `cursor`); the hover feedback follows the cursor then too.
import type * as Phaser from 'phaser';
import { tileImageTopLeft, type Vec2 } from '../iso.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import { CURSOR_MARGIN, tileCursorImage } from '../vfx/cursorPixels.ts';
import type { ViewContext } from './ViewContext.ts';

const TEXTURE_KEY = 'overlay.cursor';
const pos: Vec2 = { x: 0, y: 0 };

export class CursorView {
  readonly #ctx: ViewContext;
  readonly #img: Phaser.GameObjects.Image;
  #index = -2;

  constructor(ctx: ViewContext) {
    this.#ctx = ctx;
    const { scene, layers } = ctx;
    if (!scene.textures.exists(TEXTURE_KEY)) {
      scene.textures.addCanvas(TEXTURE_KEY, imageToCanvas(tileCursorImage()));
    }
    this.#img = scene.make
      .image({}, false)
      .setTexture(TEXTURE_KEY)
      .setOrigin(0, 0)
      .setVisible(false);
    layers.overlay.add(this.#img);
  }

  /** Shows the cursor on tile `index` of a `cols`-wide map, or hides it (−1). */
  set(index: number, cols: number): void {
    if (index === this.#index) return;
    this.#index = index;
    if (index < 0) {
      this.#img.setVisible(false);
      return;
    }
    const col = index % cols;
    tileImageTopLeft(col, (index - col) / cols, this.#ctx.origin, pos);
    this.#img.setPosition(pos.x - CURSOR_MARGIN, pos.y - CURSOR_MARGIN).setVisible(true);
  }
}
