// What render dresses an enemy's body in beyond its sprite (T430a; art-direction §8 trait and status
// tells): EnemyView decides each frame what shows, and this places it on the body. Every piece is
// made on first use and reused (a view in the pool keeps its pieces), so a frame allocates nothing.
// - **The rim** (OUTLINE_LOOK): four copies of the body's current frame, filled one colour and
//   shoved 1 px up, down, left, and right, just behind it, so a 1 px rim of that colour hugs the
//   sprite's own outline: Heavy's second pale pixel (swollen), the Hollow unit's acid flicker in
//   its hush tell, Stasis's crystal, the blink tell's violet, and a shield pulser's blue while it
//   tells. (A rim needs an opaque body over it: a cloak's faint body would show the copies through
//   it, so a cloak wears its white `selected` outline instead, EnemyView.)
// - **The ghost rim** (a Phased unit's; phaseLook.ts `ghostRimImage`, review U10): one image, a
//   1 px `white.1` line just outside the silhouette of the body's current frame (read from the
//   frame's plain variant, so the ghost's dither holes never rim), at PHASED_RIM_ALPHA, just
//   behind the body. Each frame's rim is baked once, on first use.
// - **The shield bubble** (markPixels.ts), just in front of the body.
// - **The hush ring** (a held runner's), on its ground point, in `overlay`.
// - **The target bracket** (a Revealed unit's), round the body, in `overlay`.
import * as Phaser from 'phaser';
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import { BUBBLE_PAD_X, BUBBLE_PAD_Y, BRACKET_PAD } from '../vfx/markPixels.ts';
import { bracketTexture, bubbleTexture, effectRingTexture } from '../vfx/overlayTextures.ts';
import { DEFAULT_VARIANT } from '../sprites/bake.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import { ghostRimImage } from './phaseLook.ts';
import { spriteId } from './spriteInfo.ts';
import type { ViewContext } from './ViewContext.ts';

/** Each body frame's ghost-rim texture key (null: none can be read), baked on first use. */
const ghostRims = new WeakMap<Phaser.Textures.Frame, string | null>();

/** A frame's pixels, read back from its atlas page (a canvas; CodeSpriteSource keeps them). */
function framePixels(frame: Phaser.Textures.Frame): ImageData | null {
  const src: unknown = frame.source.image;
  if (!(src instanceof HTMLCanvasElement)) return null;
  const c = src.getContext('2d');
  return c === null
    ? null
    : c.getImageData(frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight);
}

/** The rim's looks, by what it marks. */
export type RimMode = 'none' | 'heavy' | 'hush' | 'crystal' | 'blink' | 'pulse';

export const RIM_COLORS: Readonly<Record<Exclude<RimMode, 'none'>, ColorName>> = {
  heavy: 'hollow.4',
  hush: 'acid.3',
  crystal: 'white.1',
  blink: 'violet.4',
  pulse: 'blue.4',
};

/** The four copies' shoves (px): left, right, up, down. */
const SHOVES: readonly (readonly [number, number])[] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];
/** Depth nudges: the rim just behind the body, the bubble just in front (same layer). */
const BEHIND = 2e-5;
const IN_FRONT = 2e-5;

function hex(name: ColorName): number {
  const c = rgbOf(name);
  return (c.r << 16) | (c.g << 8) | c.b;
}

const RIM_TINTS: Readonly<Record<Exclude<RimMode, 'none'>, number>> = {
  heavy: hex(RIM_COLORS.heavy),
  hush: hex(RIM_COLORS.hush),
  crystal: hex(RIM_COLORS.crystal),
  blink: hex(RIM_COLORS.blink),
  pulse: hex(RIM_COLORS.pulse),
};

export class EnemyDress {
  readonly #ctx: ViewContext;
  #rim: Phaser.GameObjects.Image[] | null = null;
  #rimMode: RimMode = 'none';
  /** The body frame the rim copies show (re-set only when the body's frame changes). */
  #rimFrame: Phaser.Textures.Frame | null = null;
  #bubble: Phaser.GameObjects.Image | null = null;
  #bubbleKey = '';
  #ring: Phaser.GameObjects.Image | null = null;
  #ringRadius = 0;
  #bracket: Phaser.GameObjects.Image | null = null;
  #bracketKey = '';
  #ghost: Phaser.GameObjects.Image | null = null;
  #ghostFrame: Phaser.Textures.Frame | null = null;
  /** The layer the body is in (the rim and bubble join it). */
  #layer: Phaser.GameObjects.Layer | null = null;

  constructor(ctx: ViewContext) {
    this.#ctx = ctx;
  }

  /** What the rim shows now (the render-state hook's view of it). */
  get rim(): RimMode {
    return this.#rimMode;
  }

  get bubbleShown(): boolean {
    return this.#bubble?.visible ?? false;
  }

  get ringShown(): boolean {
    return this.#ring?.visible ?? false;
  }

  get bracketShown(): boolean {
    return this.#bracket?.visible ?? false;
  }

  /** The body moved to `layer` (`world` or `air`): the rim and bubble follow it there. */
  setLayer(layer: Phaser.GameObjects.Layer): void {
    if (layer === this.#layer) return;
    this.#layer = layer;
    if (this.#rim !== null) for (const img of this.#rim) layer.add(img);
    if (this.#bubble !== null) layer.add(this.#bubble);
    if (this.#ghost !== null) layer.add(this.#ghost);
  }

  get ghostRimShown(): boolean {
    return this.#ghost?.visible ?? false;
  }

  /** Shows the ghost rim round `body` at `alpha`, or hides it (alpha 0). */
  ghostRimOn(body: Phaser.GameObjects.Sprite, alpha: number): void {
    if (alpha <= 0) {
      if (this.#ghost?.visible === true) this.#ghost.setVisible(false);
      return;
    }
    const frame = body.frame;
    const key = this.#ghostRimKey(frame);
    if (key === null) {
      if (this.#ghost?.visible === true) this.#ghost.setVisible(false);
      return;
    }
    let g = this.#ghost;
    if (g === null) {
      g = this.#ctx.scene.make.image({}, false);
      this.#layer?.add(g);
      this.#ghost = g;
    }
    if (frame !== this.#ghostFrame) {
      this.#ghostFrame = frame;
      g.setTexture(key).setDisplayOrigin(body.displayOriginX + 1, body.displayOriginY + 1);
    }
    g.setPosition(body.x, body.y);
    const depth = body.depth - BEHIND;
    if (g.depth !== depth) g.setDepth(depth);
    if (g.alpha !== alpha) g.setAlpha(alpha);
    if (!g.visible) g.setVisible(true);
  }

  /** The rim texture for a body frame `<sprite>#<variant>:<frame>`, from its plain variant. */
  #ghostRimKey(frame: Phaser.Textures.Frame): string | null {
    const known = ghostRims.get(frame);
    if (known !== undefined) return known;
    let key: string | null = null;
    const name = String(frame.name);
    const hash = name.indexOf('#');
    const colon = name.indexOf(':', hash + 1);
    if (hash > 0 && colon > 0) {
      const id = name.slice(0, hash);
      const anim = name.slice(colon + 1);
      key = `fx.ghost_rim.${id}.${anim}`;
      const scene = this.#ctx.scene;
      if (!scene.textures.exists(key)) {
        try {
          const ref = this.#ctx.sprites.frame(spriteId(id), anim, DEFAULT_VARIANT);
          const px = framePixels(scene.textures.getFrame(ref.texture, ref.frame));
          if (px === null) key = null;
          else
            scene.textures.addCanvas(
              key,
              imageToCanvas(ghostRimImage(px.data, px.width, px.height)),
            );
        } catch {
          key = null; // not a baked sprite frame: no rim
        }
      }
    }
    ghostRims.set(frame, key);
    return key;
  }

  /** Shows the rim `mode` round `body` at `alpha`, or hides it (`none`). */
  rimOn(body: Phaser.GameObjects.Sprite, mode: RimMode, alpha: number): void {
    if (mode === 'none') {
      this.#hideRim();
      return;
    }
    const rim = this.#rim ?? this.#makeRim();
    if (mode !== this.#rimMode) {
      const tint = RIM_TINTS[mode];
      for (const img of rim) img.setTint(tint).setTintMode(Phaser.TintModes.FILL);
      this.#rimMode = mode;
    }
    const frame = body.frame;
    const refit = frame !== this.#rimFrame;
    this.#rimFrame = frame;
    const depth = body.depth - BEHIND;
    for (let i = 0; i < rim.length; i++) {
      const img = rim[i]!; // i < 4
      const shove = SHOVES[i]!; // i < 4
      if (refit) {
        img.setTexture(frame.texture.key, frame.name);
        img.setDisplayOrigin(body.displayOriginX, body.displayOriginY);
      }
      img.setPosition(body.x + shove[0], body.y + shove[1]);
      if (img.depth !== depth) img.setDepth(depth);
      if (img.alpha !== alpha) img.setAlpha(alpha);
      if (!img.visible) img.setVisible(true);
    }
  }

  /**
   * Shows the shield bubble round `body` (`bodyW` × `bodyH`, its anchor at `ax`, `ay`) at `alpha`,
   * or hides it (alpha 0).
   */
  bubbleOn(
    body: Phaser.GameObjects.Sprite,
    bodyW: number,
    bodyH: number,
    ax: number,
    ay: number,
    alpha: number,
  ): void {
    if (alpha <= 0) {
      if (this.#bubble?.visible === true) this.#bubble.setVisible(false);
      return;
    }
    let b = this.#bubble;
    if (b === null) {
      b = this.#ctx.scene.make.image({}, false);
      this.#layer?.add(b);
      this.#bubble = b;
    }
    const key = bubbleTexture(this.#ctx.scene, bodyW, bodyH);
    if (key !== this.#bubbleKey) {
      b.setTexture(key);
      this.#bubbleKey = key;
    }
    b.setDisplayOrigin(ax + BUBBLE_PAD_X, ay + BUBBLE_PAD_Y);
    b.setPosition(body.x, body.y);
    const depth = body.depth + IN_FRONT;
    if (b.depth !== depth) b.setDepth(depth);
    if (b.alpha !== alpha) b.setAlpha(alpha);
    if (!b.visible) b.setVisible(true);
  }

  /** Shows the hush ring at radius `tiles` round screen point (sx, sy), or hides it (≤ 0). */
  ringOn(sx: number, sy: number, tiles: number): void {
    if (tiles <= 0) {
      if (this.#ring?.visible === true) this.#ring.setVisible(false);
      return;
    }
    let r = this.#ring;
    if (r === null) {
      r = this.#ctx.scene.make.image({}, false);
      this.#ctx.layers.overlay.add(r);
      this.#ring = r;
    }
    if (tiles !== this.#ringRadius) {
      const tex = effectRingTexture(this.#ctx.scene, tiles, 'hollow.4', 'ink.0');
      r.setTexture(tex.key).setDisplayOrigin(tex.ox, tex.oy);
      this.#ringRadius = tiles;
    }
    r.setPosition(Math.round(sx), Math.round(sy));
    if (!r.visible) r.setVisible(true);
  }

  /** Shows the Revealed bracket round `body` (`bodyW` × `bodyH`, anchored at `ax`, `ay`), or not. */
  bracketOn(
    show: boolean,
    body: Phaser.GameObjects.Sprite,
    bodyW: number,
    bodyH: number,
    ax: number,
    ay: number,
  ): void {
    if (!show) {
      if (this.#bracket?.visible === true) this.#bracket.setVisible(false);
      return;
    }
    let b = this.#bracket;
    if (b === null) {
      b = this.#ctx.scene.make.image({}, false);
      this.#ctx.layers.overlay.add(b);
      this.#bracket = b;
    }
    const key = bracketTexture(this.#ctx.scene, bodyW, bodyH);
    if (key !== this.#bracketKey) {
      b.setTexture(key);
      this.#bracketKey = key;
    }
    const pad = BRACKET_PAD + 2;
    b.setDisplayOrigin(ax + pad, ay + pad).setPosition(body.x, body.y);
    if (!b.visible) b.setVisible(true);
  }

  /** Hides every piece (the unit died, burrowed, or the view went back to the pool). */
  hideAll(): void {
    this.#hideRim();
    if (this.#bubble?.visible === true) this.#bubble.setVisible(false);
    if (this.#ring?.visible === true) this.#ring.setVisible(false);
    if (this.#bracket?.visible === true) this.#bracket.setVisible(false);
    if (this.#ghost?.visible === true) this.#ghost.setVisible(false);
  }

  #hideRim(): void {
    if (this.#rimMode === 'none') return;
    this.#rimMode = 'none';
    if (this.#rim !== null) for (const img of this.#rim) img.setVisible(false);
  }

  #makeRim(): Phaser.GameObjects.Image[] {
    const rim: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i < SHOVES.length; i++) {
      const img = this.#ctx.scene.make.image({}, false).setVisible(false);
      this.#layer?.add(img);
      rim.push(img);
    }
    this.#rim = rim;
    this.#rimFrame = null;
    return rim;
  }
}
