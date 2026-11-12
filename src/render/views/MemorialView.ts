// The memorial wreck's name (finale.md § FIN, *Layout*: "the wrecked variant of `memorialTower`,
// tooltip showing the `{name}` plate"; art-direction §6 *The memorial wreck*; T831): GroundView
// stands `prop.memorial_wreck` on its marker (the save's tagged class, T842); while the pointer is
// on its tile or over its art, or the keyboard cursor is on its tile, its plate's name shows over it
// in Bricks's own plate (vfx/nameTagPixels.ts, as NameTagView draws the tag on a living turret),
// in `overlay`, so nothing hides it. The app resolves the name (app/memorial.ts: A3M3's tag text,
// as the dialogue resolves it); with none, nothing shows. One texture, made once; nothing allocates
// per frame.
import type * as Phaser from 'phaser';
import { imageToCanvas } from '../sprites/canvas.ts';
import { nameTagImage, nameTagText } from '../vfx/nameTagPixels.ts';
import { isScenery, sceneryGround } from './scenery.ts';
import type { ViewContext } from './ViewContext.ts';
import type { Vec2 } from '../iso.ts';

/** The marker the wreck stands on (T842). */
export const MEMORIAL_MARKER = 'memorial_wreck';
/** Clear pixels between the wreck's top and the plate. */
const GAP_PX = 1;

export class MemorialView {
  readonly #plate: Phaser.GameObjects.Image | null = null;
  readonly #tile: number = -1;
  /** The wreck's art box on screen (left, top, right, bottom). */
  readonly #box = { l: 0, t: 0, r: 0, b: 0 };
  readonly #text: string = '';

  constructor(
    ctx: ViewContext,
    map: {
      readonly cols: number;
      readonly markers: Readonly<Record<string, readonly [number, number]>>;
    },
    name: string,
  ) {
    const at = map.markers[MEMORIAL_MARKER];
    const text = nameTagText(name);
    if (at === undefined || text === '') return;
    let wreck: Phaser.GameObjects.Sprite | null = null;
    for (const obj of ctx.layers.world.list) {
      if (!isScenery(obj)) continue;
      const g = sceneryGround(obj);
      if (g === null || g.x !== at[0] + 0.5 || g.y !== at[1] + 0.5) continue;
      wreck = obj as Phaser.GameObjects.Sprite;
    }
    if (wreck === null) return;
    this.#tile = at[1] * map.cols + at[0];
    this.#text = text;
    const b = wreck.getBounds();
    this.#box.l = b.left;
    this.#box.t = b.top;
    this.#box.r = b.right;
    this.#box.b = b.bottom;
    const key = `overlay.memorial.${text}`;
    if (!ctx.scene.textures.exists(key)) {
      ctx.scene.textures.addCanvas(key, imageToCanvas(nameTagImage(text)));
    }
    this.#plate = ctx.scene.make
      .image({}, false)
      .setTexture(key)
      .setOrigin(0.5, 1)
      .setPosition(Math.round((b.left + b.right) / 2), Math.round(b.top) - GAP_PX)
      .setVisible(false);
    ctx.layers.overlay.add(this.#plate);
  }

  /** The plate's text while it shows ('' otherwise; smoke hooks). */
  get shown(): string {
    return this.#plate?.visible === true ? this.#text : '';
  }

  /** The wreck's tile index (−1 off the finale), for hooks and the smoke flow. */
  get tile(): number {
    return this.#tile;
  }

  /**
   * Shows the plate while `tile` (the pointer's or the keyboard cursor's tile) is the wreck's, or
   * the pointer (`pointer`, null when off the canvas) is over its art.
   */
  update(tile: number, pointer: Vec2 | null): void {
    const plate = this.#plate;
    if (plate === null) return;
    const b = this.#box;
    const over =
      pointer !== null && pointer.x >= b.l && pointer.x < b.r && pointer.y >= b.t && pointer.y < b.b;
    const show = tile === this.#tile || over;
    if (plate.visible !== show) plate.setVisible(show);
  }

  reset(): void {
    this.#plate?.setVisible(false);
  }
}
