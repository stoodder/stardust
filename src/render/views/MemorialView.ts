// The memorial wreck's name (finale.md § FIN, *Layout*: "the wrecked variant of `memorialTower`,
// tooltip showing the `{name}` plate"; art-direction §6 *The memorial wreck*; T831): GroundView
// stands `prop.memorial_wreck` on its marker (the save's tagged class, T842); while the pointer is
// on its tile or over its art, or the keyboard cursor is on its tile, its plate's name shows over it
// in Bricks's own plate (vfx/nameTagPixels.ts, as NameTagView draws the tag on a living turret),
// in `overlay`, so nothing hides it. The plate's foot sits on the top of the wreck's art, measured
// from its frame's pixels (T871: each class's stump stands a different height). The app resolves the name (app/memorial.ts: A3M3's tag text,
// as the dialogue resolves it); with none, nothing shows. One texture, made once; nothing allocates
// per frame.
import * as Phaser from 'phaser';
import { imageToCanvas } from '../sprites/canvas.ts';
import { nameTagImage, nameTagText } from '../vfx/nameTagPixels.ts';
import { firstOpaqueRow, PLATE_DROP_PX } from './memorialPlate.ts';
import { isScenery, sceneryGround } from './scenery.ts';
import type { ViewContext } from './ViewContext.ts';
import type { Vec2 } from '../iso.ts';

/** The marker the wreck stands on (T842). */
export const MEMORIAL_MARKER = 'memorial_wreck';
/** How far the top of a sprite's art stands below its frame's top (PLATE_DROP_PX if unreadable). */
function artDrop(frame: Phaser.Textures.Frame): number {
  const src: unknown = frame.source.image;
  if (typeof HTMLCanvasElement === 'undefined' || !(src instanceof HTMLCanvasElement)) {
    return PLATE_DROP_PX;
  }
  const c = src.getContext('2d');
  if (c === null) return PLATE_DROP_PX;
  const img = c.getImageData(frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight);
  const top = firstOpaqueRow(img.data, frame.cutWidth);
  return top >= frame.cutHeight ? PLATE_DROP_PX : top;
}

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
      if (!isScenery(obj) || !(obj instanceof Phaser.GameObjects.Sprite)) continue;
      const g = sceneryGround(obj);
      if (g === null || g.x !== at[0] + 0.5 || g.y !== at[1] + 0.5) continue;
      wreck = obj;
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
      .setPosition(Math.round((b.left + b.right) / 2), Math.round(b.top) + artDrop(wreck.frame))
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
      pointer !== null &&
      pointer.x >= b.l &&
      pointer.x < b.r &&
      pointer.y >= b.t &&
      pointer.y < b.b;
    const show = tile === this.#tile || over;
    if (plate.visible !== show) plate.setVisible(show);
  }

  reset(): void {
    this.#plate?.setVisible(false);
  }
}
