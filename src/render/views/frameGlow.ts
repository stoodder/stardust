// A glow that follows its sprite's frame (T630b): the additive `@glow` halo of whatever frame the
// sprite shows now, anim or not, for the Act III props whose frame changes as the story moves
// (the shuttle and its pad, the blast doors, the rift cracks; vfx/nightGlow.ts `OWN_GLOW`), where
// WorldGlowView's glows are baked once per battle. It re-points only when the sprite's frame
// changes (no allocation on a frame that holds). Glow frames are padded by their radius and carry
// their own anchor (tech-spec § What the baker produces: `<frame>@glow`).
import * as Phaser from 'phaser';
import type { SpriteId } from '../../content/sprites/index.ts';
import type { SpriteSource } from '../sprites/SpriteSource.ts';

/** Just in front of its sprite at the same footing (WorldGlowView's step). */
const GLOW_DEPTH = 0.00005;

export class FrameGlow {
  readonly #sprites: SpriteSource;
  readonly #id: SpriteId;
  readonly #variant: string;
  readonly #body: Phaser.GameObjects.Sprite;
  readonly img: Phaser.GameObjects.Image;
  /** The body's frame the glow shows (its texture frame's name), or '' for none yet. */
  #shown = '';
  /** The shown frame has no glow. */
  #none = true;
  /** The glow's strength (0–1), times the body's own alpha. */
  #strength = 1;

  /** Adds the glow to `layer`, right after (or, sorted, just in front of) `body`. */
  constructor(
    sprites: SpriteSource,
    id: SpriteId,
    variant: string,
    body: Phaser.GameObjects.Sprite,
    layer: Phaser.GameObjects.Layer,
  ) {
    this.#sprites = sprites;
    this.#id = id;
    this.#variant = variant;
    this.#body = body;
    this.img = body.scene.make.image({}, false).setBlendMode(Phaser.BlendModes.ADD);
    this.img.setVisible(false);
    layer.add(this.img);
  }

  /** How strong it shines (0 hides it). */
  setStrength(strength: number): this {
    this.#strength = strength;
    return this;
  }

  /** Once a frame: follows the body's frame, place, depth, alpha, and visibility. */
  update(): void {
    const body = this.#body;
    const img = this.img;
    const name = body.frame.name;
    if (name !== this.#shown) {
      this.#shown = name;
      const frame = name.slice(name.lastIndexOf(':') + 1);
      const ref = this.#sprites.glowFrame(this.#id, frame, this.#variant);
      this.#none = ref === null;
      if (ref !== null) {
        const a = this.#sprites.frameAnchor(this.#id, `${frame}@glow`);
        img.setTexture(ref.texture, ref.frame).setDisplayOrigin(a.x, a.y);
      }
    }
    const alpha = this.#strength * body.alpha;
    const on = body.visible && alpha > 0 && !this.#none;
    if (img.visible !== on) img.setVisible(on);
    if (!on) return;
    if (img.x !== body.x || img.y !== body.y) img.setPosition(body.x, body.y);
    if (img.alpha !== alpha) img.setAlpha(alpha);
    const depth = body.depth + GLOW_DEPTH;
    if (img.depth !== depth) img.setDepth(depth);
  }

  destroy(): void {
    this.img.destroy();
  }
}
