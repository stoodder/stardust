// A pooled tower: the tier's base frame (a specialized tower's `spec_a`/`spec_b`), the head on the
// base's mount (aimed by facing, with the `_t2` head from tier 2 and the spec's own head at tier 4,
// or an idle anim, the spec's own `<idle>_spec_<a|b>` once specialized), and their additive @glow halos in the `vfx` layer (art-direction §7, glow tier
// 2). Selection swaps both to the baked `+selected` variant (white outline). A new build drops in a
// few px (D026), and an upgrade flashes both white for 2 frames. A tower on high ground stands on
// the raised block's top face, `liftPx` up, but sorts by its tile (tech-spec § Depth sorting). A
// tower holding fire (core-loop §2.7) dims to `steel.3` and wears a pause plate above its head in
// the `overlay` layer (holdMarker.ts), so it reads by shape as well as by tone. An aiming head
// plays its fire anim on every shot (T221: `fire_<facing>` with its tier-2 `_t2` or spec suffix;
// a Rivet Storm's spins through its `_spin` frame), seen as its reload restarting, then settles
// back on its facing's still frame.
// T630a (towerLook.ts): a head sings in its view's voice where its sprite authors one (every Choir
// sings Thrum's ring, `hum_thrum`, once the save holds `spared_quiet_wave`); an idle head with a
// `fire` anim (the Stasis Bloom) plays it once on each pulse (its reload jumping), then idles
// again; and a revoked tower powers down under its stamp (`powerDown`, RevokedView): dark, glows
// out, its anim held, then folding into its base and the ground (a stepped fade under reduced
// motion).
// T740b: a class the save holds jailbroken (towers.md § 9) draws its base's `_jb` twin (the logo
// plate scratched out) and its base and head in `everglow.jailbroken` (towerLook.ts `jailbreakLook`).
// T730a: a Jammed tower (`jamTicks` > 0) draws in its baked `+jammed` steel variant, glows out and
// an idle head held (towerLook.ts `towerVariant`); a Sproing Pad's head bounces as each leaper
// boings out and shows its empty pad while they're all away (`setPad`, towerLook.ts `padEmpty`).
import * as Phaser from 'phaser';
import type { SpriteId } from '../../content/sprites/index.ts';
import type { SpriteSource } from '../sprites/SpriteSource.ts';
import { worldDepth } from '../depth.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { DEFAULT_VARIANT } from '../sprites/bake.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import { BUILD_DROP_PX, BUILD_DROP_STEP_FRAMES, UPGRADE_FLASH_FRAMES } from '../vfx/fxTiming.ts';
import type { Rect } from '../vfx/xrayPixels.ts';
import type { XrayPart } from './xrayWatch.ts';
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
import type { ViewContext } from './ViewContext.ts';
import { hasAnim } from './spriteInfo.ts';
import {
  foldSinkPx,
  idleFire,
  jailbreakLook,
  padEmpty,
  POWER_DOWN_COLOR,
  powerDownLook,
  towerVariant,
  voicedIdle,
  type TowerPalette,
} from './towerLook.ts';
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
  /** Ticks left Jammed (a sim Tower's; T730a): drawn in its `+jammed` variant while > 0. */
  readonly jamTicks?: number;
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
/** A holding tower's multiply tint, and a powered-down one's. */
const HOLD_TINT = tintOf(HOLD_TINT_COLOR);
const POWER_TINT = tintOf(POWER_DOWN_COLOR);
/** The pause plate's texture key (registered once per game). */
const HOLD_MARKER_KEY = 'overlay.hold_fire';
/** Clear pixels between the tower's top and the pause plate. */
const HOLD_MARKER_GAP = 1;

const FACINGS: readonly Facing[] = ['se', 'sw', 'ne', 'nw'];
/** No class drawn jailbroken (a battle without a save). */
const NONE_JAILBROKEN: ReadonlySet<string> = new Set();
/** The plain look (default palette, no base-frame suffix). */
const PLAIN_LOOK: TowerPalette = {
  base: DEFAULT_VARIANT,
  head: DEFAULT_VARIANT,
  frameSuffix: '',
};
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

/** Writes a shown image's frame and screen top-left into `out[at]` (its slot reused); 1, or 0 hidden. */
function partOf(img: Phaser.GameObjects.Image, out: XrayPart[], at: number): number {
  if (!img.visible) return 0;
  const p = (out[at] ??= { texture: '', frame: '', x: 0, y: 0 });
  p.texture = img.texture.key;
  p.frame = img.frame.name;
  p.x = Math.round(img.x - img.displayOriginX);
  p.y = Math.round(img.y - img.displayOriginY);
  return 1;
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
  /** The idle anim an idle head plays (its spec's own once specialized; T430b). */
  #idleName = '';
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
  /** The voice its idle head sings in (towerLook.ts `voicedIdle`), or null. */
  readonly #voice: string | null;
  /** The base sprite ids of the run's jailbroken classes (towerLook.ts `jailbreakLook`; T740b). */
  readonly #jailbroken: ReadonlySet<string>;
  /** This tower's palettes and base-frame suffix (plain, or jailbroken). */
  #look: TowerPalette = PLAIN_LOOK;
  /** An idle head's shot anim key ('' none), and whether it is playing (it idles again after). */
  #idleFireAnim = '';
  #idleFiring = false;
  /** Powered down (revoked): dark, glows out, anim held; the fold's sink now (px). */
  #powered = true;
  #sinkHead = 0;
  #sinkBase = 0;
  /** Jammed now (T730a): its `+jammed` variant, glows out, an idle head held. */
  #jammed = false;
  /** A Sproing Pad's leapers away now, and whether all of them are (its empty pad shows). */
  #away = 0;
  #padAll = false;

  /**
   * `voice`: the voice an idle head sings in where its sprite has one (null: its own idle);
   * `jailbroken`: the base sprite ids drawn jailbroken (T740b; none by default).
   */
  constructor(
    ctx: ViewContext,
    voice: string | null = null,
    jailbroken: ReadonlySet<string> = NONE_JAILBROKEN,
  ) {
    this.#ctx = ctx;
    this.#voice = voice;
    this.#jailbroken = jailbroken;
    const { scene, layers } = ctx;
    this.#base = scene.make.image({}, false);
    this.#head = scene.make.sprite({}, false);
    this.#baseGlow = scene.make.image({}, false).setBlendMode(Phaser.BlendModes.ADD);
    this.#headGlow = scene.make.image({}, false).setBlendMode(Phaser.BlendModes.ADD);
    this.#hold = scene.make.image({}, false).setTexture(holdMarkerTexture(scene)).setOrigin(0.5, 1);
    layers.world.add([this.#base, this.#head]);
    layers.vfx.add([this.#baseGlow, this.#headGlow]);
    layers.overlay.add(this.#hold);
    // A finished shot settles back on the facing's still frame; an idle head's goes back to idling.
    this.#head.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      const still = this.#still;
      if (this.#headStyle.kind === 'aim' && still !== null) {
        this.#head.setTexture(still.texture, still.frame);
      } else if (this.#idleFiring) {
        this.#idleFiring = false;
        if (this.#powered) this.#refreshFrames(true);
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

  /** Its sort depth in `world` (its base's; the head sorts a hair after it). */
  get depth(): number {
    return this.#base.depth;
  }

  /**
   * The screen box its base and head frames cover now, into `out` (w 0 while hidden): what the
   * x-ray reads to see whether it stands in front of Bricks (vfx/xrayPixels.ts `occludes`).
   */
  bounds(out: Rect): Rect {
    const b = this.#base;
    if (!b.visible) {
      out.x = out.y = out.w = out.h = 0;
      return out;
    }
    let x0 = b.x - b.displayOriginX;
    let y0 = b.y - b.displayOriginY;
    let x1 = x0 + b.width;
    let y1 = y0 + b.height;
    const h = this.#head;
    if (h.visible) {
      const hx = h.x - h.displayOriginX;
      const hy = h.y - h.displayOriginY;
      x0 = Math.min(x0, hx);
      y0 = Math.min(y0, hy);
      x1 = Math.max(x1, hx + h.width);
      y1 = Math.max(y1, hy + h.height);
    }
    out.x = x0;
    out.y = y0;
    out.w = x1 - x0;
    out.h = y1 - y0;
    return out;
  }

  /**
   * The frames it draws now (base, then head when shown), with their screen top-left, into `out`
   * (its slots reused); returns how many: the pixels Bricks's x-ray shows through (R2-S3).
   */
  xrayParts(out: XrayPart[], from: number): number {
    let n = partOf(this.#base, out, from);
    n += partOf(this.#head, out, from + n);
    return n;
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
    this.#look = jailbreakLook(this.#baseId, this.#headId, this.#jailbroken);
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
    if (!this.#powered) return;
    this.setHolding(t.holdFire === true);
    this.#setJammed((t.jamTicks ?? 0) > 0);
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

  /**
   * A shot: an aiming head plays its fire anim for its facing once (none authored: no anim); an
   * idle head with a shot plays it once, then idles again.
   */
  #fire(): void {
    if (this.#headId === null || !this.#powered) return;
    if (this.#headStyle.kind === 'idle') {
      if (this.#idleFireAnim === '') return;
      this.#idleFiring = true;
      this.#head.play(this.#idleFireAnim);
      return;
    }
    const anim = this.#fireAnims[FACING_INDEX[this.#facing]] ?? '';
    if (anim !== '') this.#head.play(anim);
  }

  /** Jammed or freed (T730a): redraws in the `+jammed` variant (or back), glows and idle with it. */
  #setJammed(jammed: boolean): void {
    if (jammed === this.#jammed) return;
    this.#jammed = jammed;
    if (jammed) this.#idleFiring = false;
    this.#refreshFrames(true);
  }

  /** Whether it draws Jammed now (the render-state hook's check). */
  get jammed(): boolean {
    return this.#jammed;
  }

  /**
   * A Sproing Pad's leapers (T730a): `away` of its `total` out of the pad now. One more away than
   * last frame is a launch (the head's bounce plays once); all away shows its empty pad, and its
   * idle comes back as one lands home. A head without those anims ignores it.
   */
  setPad(away: number, total: number): void {
    const launched = away > this.#away;
    this.#away = away;
    const all = total > 0 && away >= total;
    if (launched && this.#powered && !this.#jammed && this.#idleFireAnim !== '') {
      this.#idleFiring = true;
      this.#head.play(this.#idleFireAnim);
    }
    if (all !== this.#padAll) {
      this.#padAll = all;
      if (!this.#idleFiring && this.#powered) this.#refreshFrames(false);
    }
  }

  #endFlash(): void {
    this.#flashFrames = 0;
    this.#applyTint();
  }

  /** The resting tint: none, the hold dim, or powered down. */
  #applyTint(): void {
    for (const img of [this.#base, this.#head]) {
      img.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
      if (!this.#powered) img.setTint(POWER_TINT);
      else if (this.#holding) img.setTint(HOLD_TINT);
    }
  }

  /**
   * Powered down `ms` into its revocation stamp (RevokedView holds it through it; towerLook.ts
   * `powerDownLook`): dark at once, its glows out and its head's anim held, then folding away over
   * the stamp's end (a stepped fade under reduced motion).
   */
  powerDown(ms: number, reducedMotion: boolean): void {
    if (this.#powered) {
      this.#powered = false;
      this.#idleFiring = false;
      this.#hold.setVisible(false);
      this.#baseGlow.setVisible(false);
      this.#headGlow.setVisible(false);
      if (this.#head.anims.isPlaying) this.#head.anims.pause();
      this.#endFlash();
    }
    const look = powerDownLook(ms, reducedMotion);
    const sink = foldSinkPx(look.fold, this.#head.frame.height, this.#base.frame.height);
    if (this.#base.alpha !== look.alpha) {
      this.#base.setAlpha(look.alpha);
      this.#head.setAlpha(look.alpha);
    }
    if (sink.head === this.#sinkHead && sink.base === this.#sinkBase) return;
    // Each part sinks by its own px and loses that many rows off its foot: it retracts into it.
    this.#base.y += sink.base - this.#sinkBase;
    this.#head.y += sink.base - this.#sinkBase + sink.head - this.#sinkHead;
    this.#sinkHead = sink.head;
    this.#sinkBase = sink.base;
    cropFoot(this.#base, sink.base);
    cropFoot(this.#head, sink.head + sink.base);
  }

  /** Whether it draws jailbroken (its class in the save's `unlocks.jailbroken`; T740b). */
  get jailbroken(): boolean {
    return this.#look.frameSuffix !== '';
  }

  /** Whether it is powered down (revoked, under its stamp). */
  get poweredDown(): boolean {
    return !this.#powered;
  }

  release(): void {
    this.#powered = true;
    this.#idleFiring = false;
    this.#sinkHead = 0;
    this.#sinkBase = 0;
    this.#base.setCrop().setAlpha(1);
    this.#head.setCrop().setAlpha(1);
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
    this.#look = PLAIN_LOOK;
    this.#jammed = false;
    this.#away = 0;
    this.#padAll = false;
    this.#head.stop();
    this.#base.setVisible(false);
    this.#head.setVisible(false);
    this.#baseGlow.setVisible(false);
    this.#headGlow.setVisible(false);
  }

  #refreshFrames(restartIdle: boolean): void {
    const { sprites } = this.#ctx;
    if (this.#baseId === null) return;
    // A jailbroken class (T740b) draws its base's `_jb` twin, base and head in its palette.
    const pal = this.#look;
    // Jammed (T730a) draws in the steel `+jammed` variant, over selection (towerLook.ts).
    const baseVariant = towerVariant(pal.base, this.#selected, this.#jammed);
    const variant = towerVariant(pal.head, this.#selected, this.#jammed);
    const tierFrame = baseFrame(this.#baseId, this.#tier, this.#spec) + pal.frameSuffix;
    const b = sprites.frame(this.#baseId, tierFrame, baseVariant);
    const ba = sprites.frameAnchor(this.#baseId, tierFrame);
    this.#base.setTexture(b.texture, b.frame).setDisplayOrigin(ba.x, ba.y);
    setGlow(this.#baseGlow, sprites, this.#baseId, tierFrame, pal.base);
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
        setGlow(this.#headGlow, sprites, this.#headId, look, pal.head);
      } else {
        // An idle head plays its spec's own anim once specialized (T430b), in its view's voice
        // (T630a): a change restarts it. Its shot, if it has one, follows the spec.
        // A Sproing Pad with all its leapers away shows its empty pad (T730a).
        const empty = this.#padAll ? padEmpty(this.#headId, this.#spec) : '';
        const name =
          empty !== ''
            ? empty
            : voicedIdle(this.#headId, this.#headStyle.anim, this.#spec, this.#voice);
        const fire = idleFire(this.#headId, this.#spec);
        this.#idleFireAnim = fire === '' ? '' : sprites.anim(this.#headId, fire, variant);
        if (restartIdle || name !== this.#idleName) {
          this.#idleName = name;
          this.#head.play(sprites.anim(this.#headId, name, variant));
          // Idle heads don't mirror, so every frame shares the sprite's anchor.
          const a = sprites.meta(this.#headId).anchor;
          this.#head.setDisplayOrigin(a.x, a.y);
        }
        // A Jammed idle head holds its frame (the Choir stops humming).
        if (this.#jammed) this.#head.anims.pause();
      }
    }
    // A Jammed tower's lights are out.
    if (this.#jammed) {
      this.#baseGlow.setVisible(false);
      this.#headGlow.setVisible(false);
    } else if (this.#headId !== null && this.#headStyle.kind !== 'aim') {
      this.#headGlow.setVisible(false);
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
  palette: string = DEFAULT_VARIANT,
): void {
  const ref = sprites.glowFrame(id, frame, palette);
  if (ref === null) {
    glow.setVisible(false);
    return;
  }
  const a = sprites.frameAnchor(id, `${frame}${GLOW_SUFFIX}`);
  glow.setTexture(ref.texture, ref.frame).setDisplayOrigin(a.x, a.y).setVisible(true);
}

/** Crops `img`'s bottom `px` rows off (0: whole again), so it retracts into its foot as it sinks. */
function cropFoot(img: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite, px: number): void {
  if (px <= 0) {
    img.setCrop();
    return;
  }
  const f = img.frame;
  img.setCrop(0, 0, f.width, Math.max(0, f.height - px));
}
