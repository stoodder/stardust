// Bricks's name tag on a turret (T431; design/towers.md § Bricks's name tags; art-direction.md
// § Dialogue presentation): one plate, centered just above the tagged tower's art in the `overlay`
// layer, so no tower or unit hides it. Above the pause plate when that tower holds fire. The app
// says which tower carries it and the name (`tagStep`'s effects, app/dialogue.ts); this view only
// follows that tower's art. It hides while it would cover a spot kept clear (D134 K2: an armed
// clickable or Pebble's lift, vfx/keepClear.ts) and comes back when the spot clears. Floating
// numbers and callouts start above it rather than over the name (TransientFx's FloatObstacle;
// T803b). A texture per name, registered once; nothing allocates per frame.
import type * as Phaser from 'phaser';
import type { Vec2 } from '../iso.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import type { KeepClear } from '../vfx/keepClear.ts';
import { nameTagImage, nameTagText } from '../vfx/nameTagPixels.ts';
import type { ViewContext } from './ViewContext.ts';

/** Clear pixels between the tower's art (or its pause plate) and the name plate. */
export const NAME_TAG_GAP_PX = 1;
/** The pause plate's height (holdMarker.ts: 9 px) and its gap, when the tower holds fire. */
const HOLD_PLATE_PX = 9 + 1;

/** What the plate needs from the tagged tower's view (TowerView). */
export interface TaggedArt {
  /** The art's top-center in screen px, into `out`; false before the tower's first sync. */
  artTop(out: Vec2): boolean;
  /** Whether it wears the pause plate (holding fire). */
  readonly holding: boolean;
}

/** Scratch for the art's top. */
const top: Vec2 = { x: 0, y: 0 };

export class NameTagView {
  readonly #scene: Phaser.Scene;
  readonly #plate: Phaser.GameObjects.Image;
  #uid = 0;
  #text = '';
  #x = Number.NaN;
  #y = Number.NaN;
  #keepClear: KeepClear | null = null;

  constructor(ctx: ViewContext) {
    this.#scene = ctx.scene;
    this.#plate = ctx.scene.make.image({}, false).setOrigin(0.5, 1).setVisible(false);
    ctx.layers.overlay.add(this.#plate);
  }

  /** The spots the plate keeps clear of (the scene refills it each frame). */
  setKeepClear(keepClear: KeepClear): void {
    this.#keepClear = keepClear;
  }

  /** The tower carrying the tag (0: none). */
  get uid(): number {
    return this.#uid;
  }

  /** The plate's text as drawn ('' while none shows). */
  get text(): string {
    return this.#plate.visible ? this.#text : '';
  }

  /** The plate's top edge on screen (px; NaN while none shows): floaters start above it. */
  get top(): number {
    return this.#plate.visible ? this.#y - this.#plate.height : Number.NaN;
  }

  /**
   * Whether the plate, as drawn now, overlaps the screen box (left, top)–(right, bottom): a floater
   * that would cover the tag starts above it instead (TransientFx's FloatObstacle; T803b).
   */
  overlaps(left: number, top: number, right: number, bottom: number): boolean {
    if (!this.#plate.visible) return false;
    const half = this.#plate.width / 2;
    return (
      left < this.#x + half &&
      this.#x - half < right &&
      top < this.#y &&
      this.#y - this.#plate.height < bottom
    );
  }

  /** The plate's height in px (0 while none shows): what a pointer over the tower clears. */
  get height(): number {
    return this.#plate.visible ? this.#plate.height : 0;
  }

  /**
   * Puts the plate reading `name` on tower `uid` (whose view is `art`), or takes it off (uid 0,
   * or a tower with no view yet). Called every frame: cheap while nothing moved.
   */
  sync(uid: number, name: string, art: TaggedArt | undefined): void {
    if (uid === 0 || art === undefined || !art.artTop(top)) {
      this.reset();
      return;
    }
    const text = nameTagText(name);
    if (uid !== this.#uid || text !== this.#text) {
      this.#uid = uid;
      this.#text = text;
      this.#plate.setTexture(this.#texture(text));
    }
    const x = Math.round(top.x);
    const y = Math.round(top.y) - NAME_TAG_GAP_PX - (art.holding ? HOLD_PLATE_PX : 0);
    const k = this.#keepClear;
    const half = this.#plate.width / 2;
    if (k !== null && k.size > 0 && k.covers(x - half, y - this.#plate.height, x + half, y)) {
      // Kept clear: hidden (the tag stays on its tower and shows again once the spot clears).
      this.#x = Number.NaN;
      this.#plate.setVisible(false);
      return;
    }
    if (x !== this.#x || y !== this.#y || !this.#plate.visible) {
      this.#x = x;
      this.#y = y;
      this.#plate.setPosition(x, y).setVisible(true);
    }
  }

  reset(): void {
    this.#uid = 0;
    this.#text = '';
    this.#x = Number.NaN;
    this.#plate.setVisible(false);
  }

  #texture(text: string): string {
    const key = `overlay.name_tag.${text}`;
    if (!this.#scene.textures.exists(key)) {
      this.#scene.textures.addCanvas(key, imageToCanvas(nameTagImage(text)));
    }
    return key;
  }
}
