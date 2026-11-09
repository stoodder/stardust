// A pooled tower: the tier's base frame, the head on the base's mount (aimed by facing, or an
// idle anim), and their additive @glow halos in the `vfx` layer (art-direction §7, glow tier 2).
// Selection swaps both to the baked `+selected` variant (white outline). A new build drops in a few
// px (D026), and an upgrade flashes both white for 2 frames.
import * as Phaser from 'phaser';
import type { SpriteId } from '../../content/sprites/index.ts';
import type { SpriteSource } from '../sprites/SpriteSource.ts';
import { worldDepth } from '../depth.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { DEFAULT_VARIANT } from '../sprites/bake.ts';
import { BUILD_DROP_PX, BUILD_DROP_STEP_FRAMES, UPGRADE_FLASH_FRAMES } from '../vfx/fxTiming.ts';
import { headStyle, spriteId, type Facing, type HeadStyle } from './spriteInfo.ts';
import { variantName, type ViewContext } from './ViewContext.ts';
import type { PooledView } from './ViewPool.ts';

/** The tower fields a view reads (a live sim Tower satisfies it). */
export interface TowerLike {
  readonly uid: number;
  readonly x: number;
  readonly y: number;
  readonly tier: number;
}

/** Sprite ids of a tower definition (`CompiledTowerDef.sprites`). */
export interface TowerSprites {
  readonly base: string;
  readonly head: string | null;
}

const pos: Vec2 = { x: 0, y: 0 };
/** The naming contract's glow-frame suffix (tech-spec § Naming contract). */
const GLOW_SUFFIX = '@glow';
/** The head draws just in front of its own base, below the next uid's tie-break step. */
const HEAD_DEPTH_EPS = 0.00005;
/** `white.1`: the upgrade flash's fill tint. */
const FLASH_COLOR = 0xffffff;

export class TowerView implements PooledView {
  stamp = 0;
  readonly #ctx: ViewContext;
  readonly #base: Phaser.GameObjects.Image;
  readonly #head: Phaser.GameObjects.Sprite;
  readonly #baseGlow: Phaser.GameObjects.Image;
  readonly #headGlow: Phaser.GameObjects.Image;
  #baseId: SpriteId | null = null;
  #headId: SpriteId | null = null;
  #headStyle: HeadStyle = { kind: 'aim' };
  #tier = 0;
  #facing: Facing = 'se';
  #selected = false;
  #uid = 0;
  #x = Number.NaN;
  #y = Number.NaN;
  /** Frames left in the build drop-in (0 when standing). */
  #dropFrames = 0;
  /** Frames left in the upgrade flash. */
  #flashFrames = 0;

  constructor(ctx: ViewContext) {
    this.#ctx = ctx;
    const { scene, layers } = ctx;
    this.#base = scene.make.image({}, false);
    this.#head = scene.make.sprite({}, false);
    this.#baseGlow = scene.make.image({}, false).setBlendMode(Phaser.BlendModes.ADD);
    this.#headGlow = scene.make.image({}, false).setBlendMode(Phaser.BlendModes.ADD);
    layers.world.add([this.#base, this.#head]);
    layers.vfx.add([this.#baseGlow, this.#headGlow]);
    this.release();
  }

  /** The last synced position, in grid units (NaN before the first sync). */
  get x(): number {
    return this.#x;
  }

  get y(): number {
    return this.#y;
  }

  /** Shows the view for a newly seen tower; `dropIn` for one just built (it drops into place). */
  show(uid: number, sprites: TowerSprites, tier: number, dropIn = false): void {
    this.#dropFrames = dropIn ? BUILD_DROP_PX * BUILD_DROP_STEP_FRAMES : 0;
    this.#endFlash();
    this.#uid = uid;
    this.#baseId = spriteId(sprites.base);
    this.#headId = sprites.head === null ? null : spriteId(sprites.head);
    this.#headStyle = this.#headId === null ? { kind: 'aim' } : headStyle(this.#headId);
    this.#tier = tier;
    this.#facing = 'se';
    this.#selected = false;
    this.#x = Number.NaN;
    this.#y = Number.NaN;
    this.#base.setVisible(true);
    this.#baseGlow.setVisible(true);
    const hasHead = this.#headId !== null;
    this.#head.setVisible(hasHead);
    this.#headGlow.setVisible(hasHead && this.#headStyle.kind === 'aim');
    this.#refreshFrames(true);
  }

  setTier(tier: number): void {
    if (tier === this.#tier) return;
    this.#tier = tier;
    this.#refreshFrames(false);
  }

  /** The upgrade flash: base and head fill white for a couple of frames. */
  flash(): void {
    this.#flashFrames = UPGRADE_FLASH_FRAMES;
    this.#base.setTint(FLASH_COLOR).setTintMode(Phaser.TintModes.FILL);
    this.#head.setTint(FLASH_COLOR).setTintMode(Phaser.TintModes.FILL);
  }

  setSelected(selected: boolean): void {
    if (selected === this.#selected) return;
    this.#selected = selected;
    this.#refreshFrames(true);
  }

  /** Turns the head to a facing (aiming heads only). */
  setFacing(facing: Facing): void {
    if (facing === this.#facing) return;
    this.#facing = facing;
    if (this.#headStyle.kind === 'aim') this.#refreshFrames(false);
  }

  /** Positions the tower at its sim position (a tile center). Called every frame; cheap if still. */
  sync(t: TowerLike): void {
    if (this.#flashFrames > 0 && --this.#flashFrames === 0) this.#endFlash();
    const dropping = this.#dropFrames > 0;
    if (dropping) this.#dropFrames--;
    if (t.x === this.#x && t.y === this.#y && !dropping) return;
    this.#x = t.x;
    this.#y = t.y;
    gridToScreen(t.x, t.y, this.#ctx.origin, pos);
    // Sorted by its tile, wherever the drop has it drawn.
    const depth = worldDepth(pos.y, 'tower', this.#uid);
    const lift = Math.ceil(this.#dropFrames / BUILD_DROP_STEP_FRAMES);
    this.#base.setPosition(pos.x, pos.y - lift).setDepth(depth);
    this.#baseGlow.setPosition(pos.x, pos.y - lift);
    this.#placeHead(depth);
  }

  #endFlash(): void {
    this.#flashFrames = 0;
    this.#base.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    this.#head.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
  }

  release(): void {
    this.#endFlash();
    this.#dropFrames = 0;
    this.#uid = 0;
    this.#baseId = null;
    this.#headId = null;
    this.#head.stop();
    this.#base.setVisible(false);
    this.#head.setVisible(false);
    this.#baseGlow.setVisible(false);
    this.#headGlow.setVisible(false);
  }

  #refreshFrames(restartIdle: boolean): void {
    const { sprites } = this.#ctx;
    if (this.#baseId === null) return;
    const variant = variantName(DEFAULT_VARIANT, this.#selected);
    const tierFrame = `t${this.#tier}`;
    const b = sprites.frame(this.#baseId, tierFrame, variant);
    const ba = sprites.frameAnchor(this.#baseId, tierFrame);
    this.#base.setTexture(b.texture, b.frame).setDisplayOrigin(ba.x, ba.y);
    setGlow(this.#baseGlow, sprites, this.#baseId, tierFrame);
    if (this.#headId !== null) {
      if (this.#headStyle.kind === 'aim') {
        const h = sprites.frame(this.#headId, this.#facing, variant);
        const ha = sprites.frameAnchor(this.#headId, this.#facing);
        this.#head.setTexture(h.texture, h.frame).setDisplayOrigin(ha.x, ha.y);
        setGlow(this.#headGlow, sprites, this.#headId, this.#facing);
      } else if (restartIdle) {
        const anim = sprites.anim(this.#headId, this.#headStyle.anim, variant);
        this.#head.play(anim);
        // Idle heads don't mirror, so every frame shares the sprite's anchor.
        const a = sprites.meta(this.#headId).anchor;
        this.#head.setDisplayOrigin(a.x, a.y);
      }
    }
    if (!Number.isNaN(this.#x)) this.#placeHead(this.#base.depth);
  }

  #placeHead(baseDepth: number): void {
    if (this.#baseId === null || this.#headId === null) return;
    const mount = this.#ctx.sprites.mount(this.#baseId);
    // The head's anchor goes on the base's mount: base top-left + mount.
    const hx = this.#base.x - this.#base.displayOriginX + (mount?.x ?? this.#base.displayOriginX);
    const hy = this.#base.y - this.#base.displayOriginY + (mount?.y ?? 0);
    this.#head.setPosition(hx, hy).setDepth(baseDepth + HEAD_DEPTH_EPS);
    this.#headGlow.setPosition(hx, hy);
  }
}

/**
 * Points a glow image at a frame's @glow halo (default variant: selection doesn't change the glow).
 * Glow frames are padded by their radius and carry their own anchor (tech-spec § What the baker
 * produces), looked up through the naming contract's `<frame>@glow`.
 */
function setGlow(
  glow: Phaser.GameObjects.Image,
  sprites: SpriteSource,
  id: SpriteId,
  frame: string,
): void {
  const ref = sprites.glowFrame(id, frame);
  if (ref === null) {
    glow.setVisible(false);
    return;
  }
  const a = sprites.frameAnchor(id, `${frame}${GLOW_SUFFIX}`);
  glow.setTexture(ref.texture, ref.frame).setDisplayOrigin(a.x, a.y);
}
