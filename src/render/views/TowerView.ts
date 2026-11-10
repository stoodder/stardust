// A pooled tower: the tier's base frame (a specialized tower's `spec_a`/`spec_b`), the head on the
// base's mount (aimed by facing, with the `_t2` head from tier 2 and the spec's own head at tier 4,
// or an idle anim), and their additive @glow halos in the `vfx` layer (art-direction §7, glow tier
// 2). Selection swaps both to the baked `+selected` variant (white outline). A new build drops in a
// few px (D026), and an upgrade flashes both white for 2 frames. A tower on high ground stands on
// the raised block's top face, `liftPx` up, but sorts by its tile (tech-spec § Depth sorting). A
// tower holding fire (core-loop §2.7) dims to `steel.3` and wears a pause plate above its head in
// the `overlay` layer (holdMarker.ts), so it reads by shape as well as by tone. An aiming head
// plays its fire anim on every shot (T221: `fire_<facing>` with its tier-2 `_t2` or spec suffix;
// a Rivet Storm's spins through its `_spin` frame), seen as its reload restarting, then settles
// back on its facing's still frame.
import * as Phaser from 'phaser';
import type { SpriteId } from '../../content/sprites/index.ts';
import type { SpriteSource } from '../sprites/SpriteSource.ts';
import { worldDepth } from '../depth.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { DEFAULT_VARIANT } from '../sprites/bake.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import { BUILD_DROP_PX, BUILD_DROP_STEP_FRAMES, UPGRADE_FLASH_FRAMES } from '../vfx/fxTiming.ts';
import {
  baseFrame,
  headStyle,
  headSuffix,
  spriteId,
  type Facing,
  type HeadStyle,
  type SpecLetter,
} from './spriteInfo.ts';
import { HOLD_TINT_COLOR, holdMarkerImage, tintOf } from './holdMarker.ts';
import { variantName, type ViewContext } from './ViewContext.ts';
import { hasAnim } from './spriteInfo.ts';
import type { PooledView } from './ViewPool.ts';

/** The tower fields a view reads (a live sim Tower satisfies it). */
export interface TowerLike {
  readonly uid: number;
  readonly x: number;
  readonly y: number;
  readonly tier: number;
  /** Holding fire (a sim Tower's `holdFire`): dimmed, with the pause plate. */
  readonly holdFire?: boolean;
  /** Ticks until it may fire again (a sim Tower's): a jump up means it just fired. */
  readonly cooldownTicks?: number;
}

/** Sprite ids of a tower definition (`CompiledTowerDef.sprites`). */
export interface TowerSprites {
  readonly base: string;
  readonly head: string | null;
}

const pos: Vec2 = { x: 0, y: 0 };
/** Scratch for the art's top-center (the pause plate). */
const artAt: Vec2 = { x: 0, y: 0 };
/** The naming contract's glow-frame suffix (tech-spec § Naming contract). */
const GLOW_SUFFIX = '@glow';
/** The head draws just in front of its own base, below the next uid's tie-break step. */
const HEAD_DEPTH_EPS = 0.00005;
/** `white.1`: the upgrade flash's fill tint. */
const FLASH_COLOR = 0xffffff;
/** A holding tower's multiply tint. */
const HOLD_TINT = tintOf(HOLD_TINT_COLOR);
/** The pause plate's texture key (registered once per game). */
const HOLD_MARKER_KEY = 'overlay.hold_fire';
/** Clear pixels between the tower's top and the pause plate. */
const HOLD_MARKER_GAP = 1;

const FACINGS: readonly Facing[] = ['se', 'sw', 'ne', 'nw'];
const FACING_INDEX: Readonly<Record<Facing, number>> = { se: 0, sw: 1, ne: 2, nw: 3 };

/** Each frame's first opaque row (px from its top), by texture and frame: read once per frame. */
const opaqueTops = new Map<string, number>();

/**
 * The first row of `f` with any opaque pixel, so the pause plate sits on the art and not on the
 * frame's empty headroom. Read from the frame's source once and cached; 0 if it can't be read.
 */
function opaqueTop(f: Phaser.Textures.Frame): number {
  const key = `${f.texture.key}|${f.name}`;
  const hit = opaqueTops.get(key);
  if (hit !== undefined) return hit;
  let top = 0;
  const w = f.cutWidth;
  const h = f.cutHeight;
  const src = f.source.image;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, w);
  canvas.height = Math.max(1, h);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (ctx !== null && w > 0 && h > 0 && src !== null && !(src instanceof WebGLTexture)) {
    ctx.drawImage(src, f.cutX, f.cutY, w, h, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    let row = 0;
    find: for (; row < h; row++) {
      for (let x = 0; x < w; x++) if ((data[(row * w + x) * 4 + 3] ?? 0) > 0) break find;
    }
    top = row < h ? row : 0;
  }
  opaqueTops.set(key, top);
  return top;
}

/** The pause plate's texture, registering it on first use. */
function holdMarkerTexture(scene: Phaser.Scene): string {
  if (!scene.textures.exists(HOLD_MARKER_KEY)) {
    scene.textures.addCanvas(HOLD_MARKER_KEY, imageToCanvas(holdMarkerImage()));
  }
  return HOLD_MARKER_KEY;
}

export class TowerView implements PooledView {
  stamp = 0;
  readonly #ctx: ViewContext;
  readonly #base: Phaser.GameObjects.Image;
  readonly #head: Phaser.GameObjects.Sprite;
  readonly #baseGlow: Phaser.GameObjects.Image;
  readonly #headGlow: Phaser.GameObjects.Image;
  /** The pause plate while holding fire (in `overlay`). */
  readonly #hold: Phaser.GameObjects.Image;
  #holding = false;
  #baseId: SpriteId | null = null;
  #headId: SpriteId | null = null;
  #headStyle: HeadStyle = { kind: 'aim' };
  #tier = 0;
  #spec: SpecLetter | null = null;
  /** How far up its tile's ground point the tower stands (px): ELEV_H on high ground. */
  #liftPx = 0;
  #facing: Facing = 'se';
  #selected = false;
  #uid = 0;
  #x = Number.NaN;
  #y = Number.NaN;
  /** Frames left in the build drop-in (0 when standing). */
  #dropFrames = 0;
  /** Frames left in the upgrade flash. */
  #flashFrames = 0;
  /** The reload last synced: a jump up is a shot (the fire anim plays). */
  #lastCooldown = 0;
  /** The head's fire anim key per facing (FACING_INDEX), or '' where it has none. */
  readonly #fireAnims: string[] = ['', '', '', ''];
  /** What `#fireAnims` were looked up for (the head suffix and variant). */
  #fireAnimsKey = '';
  /** The aiming head's still frame for its facing (a shot settles back on it). */
  #still: { readonly texture: string; readonly frame: string } | null = null;

  constructor(ctx: ViewContext) {
    this.#ctx = ctx;
    const { scene, layers } = ctx;
    this.#base = scene.make.image({}, false);
    this.#head = scene.make.sprite({}, false);
    this.#baseGlow = scene.make.image({}, false).setBlendMode(Phaser.BlendModes.ADD);
    this.#headGlow = scene.make.image({}, false).setBlendMode(Phaser.BlendModes.ADD);
    this.#hold = scene.make.image({}, false).setTexture(holdMarkerTexture(scene)).setOrigin(0.5, 1);
    layers.world.add([this.#base, this.#head]);
    layers.vfx.add([this.#baseGlow, this.#headGlow]);
    layers.overlay.add(this.#hold);
    // A finished shot settles back on the facing's still frame.
    this.#head.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      const still = this.#still;
      if (this.#headStyle.kind === 'aim' && still !== null) {
        this.#head.setTexture(still.texture, still.frame);
      }
    });
    this.release();
  }

  /** The last synced position, in grid units (NaN before the first sync). */
  get x(): number {
    return this.#x;
  }

  get y(): number {
    return this.#y;
  }

  /**
   * Shows the view for a newly seen tower; `dropIn` for one just built (it drops into place);
   * `liftPx` for one on raised ground (it stands on the block's top face).
   */
  show(
    uid: number,
    sprites: TowerSprites,
    tier: number,
    dropIn = false,
    liftPx = 0,
    spec: SpecLetter | null = null,
  ): void {
    this.#dropFrames = dropIn ? BUILD_DROP_PX * BUILD_DROP_STEP_FRAMES : 0;
    this.#endFlash();
    this.#uid = uid;
    this.#baseId = spriteId(sprites.base);
    this.#headId = sprites.head === null ? null : spriteId(sprites.head);
    this.#headStyle = this.#headId === null ? { kind: 'aim' } : headStyle(this.#headId);
    this.#tier = tier;
    this.#spec = spec;
    this.#liftPx = liftPx;
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

  /** The tower's tier, and its specialization once it has one (tier 4). */
  setTier(tier: number, spec: SpecLetter | null = null): void {
    if (tier === this.#tier && spec === this.#spec) return;
    this.#tier = tier;
    this.#spec = spec;
    this.#refreshFrames(false);
  }

  /** Whether it wears the pause plate (holding fire): a name plate sits above it (T431). */
  get holding(): boolean {
    return this.#holding;
  }

  /** Holding fire: dims the tower and shows the pause plate (or undoes both). */
  setHolding(holding: boolean): void {
    if (holding === this.#holding) return;
    this.#holding = holding;
    this.#hold.setVisible(holding && this.#baseId !== null);
    if (this.#flashFrames === 0) this.#applyTint();
    if (!Number.isNaN(this.#x)) this.#placeHold();
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
    this.setHolding(t.holdFire === true);
    const cd = t.cooldownTicks ?? 0;
    if (cd > this.#lastCooldown) this.#fire();
    this.#lastCooldown = cd;
    if (this.#flashFrames > 0 && --this.#flashFrames === 0) this.#endFlash();
    const dropping = this.#dropFrames > 0;
    if (dropping) this.#dropFrames--;
    if (t.x === this.#x && t.y === this.#y && !dropping) return;
    this.#x = t.x;
    this.#y = t.y;
    gridToScreen(t.x, t.y, this.#ctx.origin, pos);
    // Sorted by its tile, wherever the drop has it drawn.
    const depth = worldDepth(pos.y, 'tower', this.#uid);
    const lift = Math.ceil(this.#dropFrames / BUILD_DROP_STEP_FRAMES) + this.#liftPx;
    this.#base.setPosition(pos.x, pos.y - lift).setDepth(depth);
    this.#baseGlow.setPosition(pos.x, pos.y - lift);
    this.#placeHead(depth);
    this.#placeHold();
  }

  /** A shot: an aiming head plays its fire anim for its facing once (none authored: no anim). */
  #fire(): void {
    if (this.#headStyle.kind !== 'aim' || this.#headId === null) return;
    const anim = this.#fireAnims[FACING_INDEX[this.#facing]] ?? '';
    if (anim !== '') this.#head.play(anim);
  }

  #endFlash(): void {
    this.#flashFrames = 0;
    this.#applyTint();
  }

  /** The resting tint: none, or the hold dim. */
  #applyTint(): void {
    for (const img of [this.#base, this.#head]) {
      img.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
      if (this.#holding) img.setTint(HOLD_TINT);
    }
  }

  release(): void {
    this.#holding = false;
    this.#hold.setVisible(false);
    this.#endFlash();
    this.#dropFrames = 0;
    this.#liftPx = 0;
    this.#spec = null;
    this.#uid = 0;
    this.#lastCooldown = 0;
    this.#fireAnimsKey = '';
    this.#still = null;
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
    const tierFrame = baseFrame(this.#baseId, this.#tier, this.#spec);
    const b = sprites.frame(this.#baseId, tierFrame, variant);
    const ba = sprites.frameAnchor(this.#baseId, tierFrame);
    this.#base.setTexture(b.texture, b.frame).setDisplayOrigin(ba.x, ba.y);
    setGlow(this.#baseGlow, sprites, this.#baseId, tierFrame);
    if (this.#headId !== null) {
      if (this.#headStyle.kind === 'aim') {
        const suffix = headSuffix(this.#headId, this.#tier, this.#spec);
        const look = `${this.#facing}${suffix}`;
        // The fire anims follow the tier, spec, and selection (looked up only when those change).
        const animsKey = `${suffix}|${variant}`;
        if (animsKey !== this.#fireAnimsKey) {
          this.#fireAnimsKey = animsKey;
          for (const f of FACINGS) {
            const name = `fire_${f}${suffix}`;
            this.#fireAnims[FACING_INDEX[f]] = hasAnim(this.#headId, name)
              ? sprites.anim(this.#headId, name, variant)
              : '';
          }
        }
        // A turn, tier, or selection change ends a shot in progress on the new still frame.
        this.#head.stop();
        const h = sprites.frame(this.#headId, look, variant);
        const ha = sprites.frameAnchor(this.#headId, look);
        this.#still = h;
        this.#head.setTexture(h.texture, h.frame).setDisplayOrigin(ha.x, ha.y);
        setGlow(this.#headGlow, sprites, this.#headId, look);
      } else if (restartIdle) {
        const anim = sprites.anim(this.#headId, this.#headStyle.anim, variant);
        this.#head.play(anim);
        // Idle heads don't mirror, so every frame shares the sprite's anchor.
        const a = sprites.meta(this.#headId).anchor;
        this.#head.setDisplayOrigin(a.x, a.y);
      }
    }
    if (!Number.isNaN(this.#x)) {
      this.#placeHead(this.#base.depth);
      this.#placeHold();
    }
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

  /**
   * The top-center of the tower's drawn art in screen px (its head's top, or its base's), into
   * `out`: where a marker sits to point at the turret head. False before the first sync.
   */
  artTop(out: Vec2): boolean {
    if (Number.isNaN(this.#x)) return false;
    const b = this.#base;
    let top = b.y - b.displayOriginY + opaqueTop(b.frame);
    const head = this.#head;
    if (head.visible) top = Math.min(top, head.y - head.displayOriginY + opaqueTop(head.frame));
    out.x = b.x;
    out.y = top;
    return true;
  }

  /** The pause plate sits centered just above the tower's art (its head's, or its base's). */
  #placeHold(): void {
    if (!this.#holding || !this.artTop(artAt)) return;
    this.#hold.setPosition(Math.round(artAt.x), Math.round(artAt.y) - HOLD_MARKER_GAP);
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
  glow.setTexture(ref.texture, ref.frame).setDisplayOrigin(a.x, a.y).setVisible(true);
}
