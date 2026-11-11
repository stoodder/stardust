// A pooled ally (design/maps.md § 5.4; T207b): Sgt. Bricks at his post, beside the path. He plays
// his idle anim (a slow breath) facing his last target, turns to each new one, and plays his fire
// anim on every shot (AllyAttacked), then settles back to idle. Depth-sorted in `world` with the
// towers (his ground point is his post plate's center), with the additive @glow halo of the frame
// he shows in the `vfx` layer (his visor and the glinting stone; T216), following each anim frame.
// Allies with no sprite yet (militia, M3) draw nothing.
// Lowered (`setLowered`, allyPose.ts: A1M5's Quiet Wave, T330), he idles on `lowered_<facing>`
// instead, the cannon grounded (butt on his post plate, hands resting on the muzzle), and stays so:
// a silent tell, never mentioned.
// A blocker (Bricks at the Gap, T605) braces, strains, and goes down on one knee as his health
// falls (BlockerView `blockerPose`, T640a): `<stance>_<facing>` idles and `<stance>_fire_<facing>`
// shots, where the sprite draws them. While a tower stands in front of him (BattleScene asks
// `setXray`; vfx/xrayPixels.ts `occludes`), his silhouette shows through it, x-ray style, in
// `overlay` (review R3, R2-S3): drawn over the tower's own pixels only (`xrayImage`), baked per
// (his frame, the frames in front, their offset) and following his anim and theirs; it breathes
// slowly, still under reduced motion.
import * as Phaser from 'phaser';
import { STANCE_DROP } from '../../content/sprites/allies/bricks.ts';
import type { SpriteId } from '../../content/sprites/index.ts';
import type { AllyKind } from '../../content/types.ts';
import { worldDepth } from '../depth.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { DEFAULT_VARIANT } from '../sprites/bake.ts';
import { blockerPose, type BlockerStance } from './BlockerView.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import { xrayAlpha, xrayImage, type Cover, type Rect } from '../vfx/xrayPixels.ts';
import type { Covering, XrayPart } from './xrayWatch.ts';
import { frameAlpha } from './ClickableView.ts';
import { hasAnim, type Facing } from './spriteInfo.ts';
import type { ViewContext } from './ViewContext.ts';
import type { PooledView } from './ViewPool.ts';

/** The ally fields a view reads (a live sim Ally satisfies it). */
export interface AllyLike {
  readonly x: number;
  readonly y: number;
  /** A blocker's (T605): BlockerView's `blockerPose` reads them for his stance (T640a). */
  readonly blockCapacity?: number;
  readonly health?: number;
}

/** An anim key that is a shot (`fire_<facing>`, a stance's `<stance>_fire_<facing>`). */
function isShot(key: string | undefined): boolean {
  return key !== undefined && key.includes('fire_');
}

/** Each ally kind's sprite (null: not drawn yet). */
export const ALLY_SPRITES: Readonly<Record<AllyKind, SpriteId | null>> = {
  bricks: 'ally.bricks',
  swarmling: null,
  champion: null,
  leaper: null,
  refugee: null,
  bearer: null,
  singer: null,
  thrum: null, // Old Thrum in the finale's choir (T804: ChoirWalkView draws the choir)
  echo: null, // Thrum's echo (T800a kind; T841 draws it, T830 shows it)
  militia: null,
  ward: null,
};

/**
 * Where each facing's shot leaves the cannon, from the ground point (px): the muzzle of
 * `ally.bricks` (content/sprites/allies/bricks.ts: SE (23, 12), NE (21, 9) on the 28×30 grid
 * anchored at (12, 26); the W facings mirror them).
 */
export const BRICKS_MUZZLE: Readonly<Record<Facing, { readonly dx: number; readonly dy: number }>> =
  {
    se: { dx: 11, dy: -14 },
    sw: { dx: -11, dy: -14 },
    ne: { dx: 9, dy: -17 },
    nw: { dx: -9, dy: -17 },
  };

const FACINGS: readonly Facing[] = ['se', 'sw', 'ne', 'nw'];

/** A frame's glow halo: its texture frame and its own anchor (glow frames are padded). */
interface GlowLook {
  readonly texture: string;
  readonly frame: string;
  readonly ax: number;
  readonly ay: number;
}

/** The naming contract's glow-frame suffix (tech-spec § Naming contract). */
const GLOW_SUFFIX = '@glow';
const FACING_INDEX: Readonly<Record<Facing, number>> = { se: 0, sw: 1, ne: 2, nw: 3 };
const pos: Vec2 = { x: 0, y: 0 };
/** A frame's pixels (RGBA, row-major), read from its baked atlas page. */
function frameRgba(
  scene: Phaser.Scene,
  texture: string,
  frame: string,
): { data: Uint8ClampedArray; w: number; h: number } {
  const f = scene.textures.getFrame(texture, frame);
  const w = f.cutWidth;
  const h = f.cutHeight;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, w);
  canvas.height = Math.max(1, h);
  const ctx2d = canvas.getContext('2d');
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the baked atlas pages are canvases
  const source = f.source.image as CanvasImageSource;
  if (ctx2d === null || w <= 0 || h <= 0) return { data: new Uint8ClampedArray(w * h * 4), w, h };
  ctx2d.drawImage(source, f.cutX, f.cutY, w, h, 0, 0, w, h);
  return { data: ctx2d.getImageData(0, 0, w, h).data, w, h };
}

/** Baked x-ray textures one view keeps (a tower dropping in or folding away bakes a few); past it,
 * the least recently shown one is freed (rebaked if it's needed again). */
const XRAY_CACHE_MAX = 48;

export class AllyView implements PooledView {
  stamp = 0;
  readonly #ctx: ViewContext;
  readonly #body: Phaser.GameObjects.Sprite;
  /** The shown frame's additive @glow halo (in `vfx`), hidden when the frame has none. */
  readonly #glow: Phaser.GameObjects.Image;
  /** Each baked frame key's glow and its anchor, looked up once (null: no glow). */
  readonly #glowFor = new Map<string, GlowLook | null>();
  #id: SpriteId | null = null;
  #uid = 0;
  #facing: Facing = 'se';
  #x = Number.NaN;
  #y = Number.NaN;
  /** Ground point in screen px (NaN before the first sync). */
  #sx = Number.NaN;
  #sy = Number.NaN;
  /** Anim keys by facing index: idle, fire, and lowered (empty when the sprite has none). */
  readonly #idle: string[] = [];
  readonly #fire: string[] = [];
  readonly #lowered: string[] = [];
  readonly #anchors: { x: number; y: number }[] = [];
  readonly #loweredAnchors: { x: number; y: number }[] = [];
  /** Weapon lowered: idles on `lowered_<facing>` (when the sprite has it). */
  #isLowered = false;
  /** A blocker's stance (BlockerView `blockerPose`, T640a), where the sprite draws it. */
  #stance: BlockerStance | null = null;
  /** His x-ray over a tower in front of him (review R3, R2-S3), in `overlay`. */
  readonly #xray: Phaser.GameObjects.Image;
  /** The baked x-ray texture key of each look (his frame, the frames in front, their offsets). */
  readonly #xrayFor = new Map<string, string>();
  /** Each frame's alpha mask (by `texture:frame`), read once. */
  readonly #alphaOf = new Map<string, { alpha: Uint8Array; w: number; h: number }>();
  /** The frames in front of him this frame (slots reused), and how many. */
  readonly #parts: XrayPart[] = [];
  #partCount = 0;
  /** The look last shown (flat, compared in place so an unchanged frame allocates nothing). */
  readonly #look: (string | number)[] = [];
  #lookLen = 0;
  #lookAt = 0;
  #lookChanged = false;
  #xrayOn = false;
  /** Real ms since the x-ray came on (its breath steps from it). */
  #xrayMs = 0;
  readonly #reducedMotion: () => boolean;

  constructor(ctx: ViewContext, reducedMotion: () => boolean = () => false) {
    this.#ctx = ctx;
    this.#reducedMotion = reducedMotion;
    this.#body = ctx.scene.make.sprite({}, false);
    this.#glow = ctx.scene.make.image({}, false).setBlendMode(Phaser.BlendModes.ADD);
    // Under the overheads (their band starts at OVERHEAD_DEPTH), so his bar reads over it.
    this.#xray = ctx.scene.make.image({}, false).setOrigin(0, 0).setVisible(false).setDepth(0);
    ctx.layers.world.add(this.#body);
    ctx.layers.vfx.add(this.#glow);
    ctx.layers.overlay.add(this.#xray);
    // Only the fire anims end (idles loop): a finished shot settles back to idle.
    this.#body.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.#play(false));
    // The halo and the x-ray follow every frame the body shows.
    this.#body.on(Phaser.Animations.Events.ANIMATION_UPDATE, () => this.#syncFrame());
    this.#body.on(Phaser.Animations.Events.ANIMATION_START, () => this.#syncFrame());
    this.release();
  }

  /** The kind's sprite id, or null when it isn't drawn. */
  get sprite(): SpriteId | null {
    return this.#id;
  }

  get facing(): Facing {
    return this.#facing;
  }

  /** Shows the view for an ally (its kind's sprite, if it has one) at grid (x, y). */
  show(uid: number, kind: AllyKind, x: number, y: number): void {
    this.#uid = uid;
    this.#id = ALLY_SPRITES[kind];
    this.#facing = 'se';
    this.#x = Number.NaN;
    this.#y = Number.NaN;
    this.#idle.length = 0;
    this.#fire.length = 0;
    this.#lowered.length = 0;
    this.#anchors.length = 0;
    this.#loweredAnchors.length = 0;
    this.#isLowered = false;
    this.#stance = null;
    if (this.#id === null) {
      this.#body.setVisible(false);
      return;
    }
    const { sprites } = this.#ctx;
    for (const f of FACINGS) {
      const i = FACING_INDEX[f];
      this.#idle[i] = sprites.anim(this.#id, `idle_${f}`, DEFAULT_VARIANT);
      this.#fire[i] = sprites.anim(this.#id, `fire_${f}`, DEFAULT_VARIANT);
      // Mirrored frames of an off-center sprite have their own anchor (tech-spec § Sprite anchoring).
      this.#anchors[i] = sprites.frameAnchor(this.#id, `idle_${f}_0`);
      if (hasAnim(this.#id, `lowered_${f}`)) {
        this.#lowered[i] = sprites.anim(this.#id, `lowered_${f}`, DEFAULT_VARIANT);
        this.#loweredAnchors[i] = sprites.frameAnchor(this.#id, `lowered_${f}_0`);
      }
    }
    this.#body.setVisible(true);
    this.sync({ x, y });
    this.#play(false);
  }

  /** Whether it shows its weapon lowered (the smoke flows' view of it). */
  /** Whether its @glow halo shows (the render-state hook's view of it; T216). */
  get glowShown(): boolean {
    return this.#glow.visible;
  }

  get lowered(): boolean {
    return this.#isLowered && this.#lowered.length > 0;
  }

  /** Lowers or raises the weapon (its idle swaps); a shot in progress finishes first. */
  setLowered(lowered: boolean): void {
    if (lowered === this.#isLowered) return;
    this.#isLowered = lowered;
    const current = this.#body.anims.currentAnim?.key;
    if (!this.#body.anims.isPlaying || !isShot(current)) this.#play(false);
  }

  /** Turns to a facing (idle anim); a shot in progress finishes first. */
  setFacing(facing: Facing): void {
    if (facing === this.#facing) return;
    this.#facing = facing;
    const current = this.#body.anims.currentAnim?.key;
    if (!this.#body.anims.isPlaying || !isShot(current)) this.#play(false);
  }

  /** A shot: faces `facing`, plays the fire anim once, then idles again. */
  fire(facing: Facing): void {
    this.#facing = facing;
    this.#play(true);
  }

  /** Its sort depth in `world`. */
  get depth(): number {
    return this.#body.depth;
  }

  /** Whether its x-ray shows (the render-state hook's view of it). */
  get xrayShown(): boolean {
    return this.#xray.visible;
  }

  /** The screen box its body's frame covers now, into `out` (w 0 while hidden). */
  bounds(out: Rect): Rect {
    const b = this.#body;
    if (!b.visible) {
      out.x = out.y = out.w = out.h = 0;
      return out;
    }
    out.x = b.x - b.displayOriginX;
    out.y = b.y - b.displayOriginY;
    out.w = b.width;
    out.h = b.height;
    return out;
  }

  /**
   * One frame of the x-ray (review R3, R2-S3): `on` while a tower stands in front of him
   * (BattleScene's call, views/xrayWatch.ts), `front` the towers drawn in front of him (their
   * pixels are where he shows through), `realMs` of wall time for its breath.
   */
  setXray(on: boolean, realMs: number, front: readonly Covering[] = []): void {
    let n = 0;
    if (on) for (let i = 0; i < front.length; i++) n += front[i]!.xrayParts(this.#parts, n); // i < length
    this.#partCount = n;
    if (on !== this.#xrayOn) {
      this.#xrayOn = on;
      this.#xrayMs = 0;
    } else if (on) {
      this.#xrayMs += Number.isFinite(realMs) && realMs > 0 ? realMs : 0;
    }
    this.#syncXray();
    if (this.#xray.visible) this.#xray.setAlpha(xrayAlpha(this.#xrayMs, this.#reducedMotion()));
  }

  /** Writes the muzzle's screen position (px) for the current facing into `out`. */
  muzzle(out: Vec2): Vec2 {
    const m = BRICKS_MUZZLE[this.#facing];
    out.x = this.#sx + m.dx;
    out.y = this.#sy + m.dy + (this.#stance === null ? 0 : STANCE_DROP[this.#stance]);
    return out;
  }

  /** Positions the ally at its sim position. Cheap when it hasn't moved (a post never does). */
  sync(a: AllyLike): void {
    // A blocker braces, strains, and goes down on one knee with his health (T640a).
    const stance = this.#id !== null && hasAnim(this.#id, 'block_se') ? blockerPose(a) : null;
    if (stance !== this.#stance) {
      this.#stance = stance;
      if (!this.#body.anims.isPlaying || !isShot(this.#body.anims.currentAnim?.key))
        this.#play(false);
    }
    if (a.x === this.#x && a.y === this.#y) return;
    this.#x = a.x;
    this.#y = a.y;
    gridToScreen(a.x, a.y, this.#ctx.origin, pos);
    this.#sx = pos.x;
    this.#sy = pos.y;
    this.#body.setPosition(pos.x, pos.y).setDepth(worldDepth(pos.y, 'tower', this.#uid));
    this.#glow.setPosition(pos.x, pos.y);
    this.#syncXray();
  }

  /** The halo and the x-ray follow the frame the body shows. */
  #syncFrame(): void {
    this.#syncGlow();
    this.#syncXray();
  }

  /**
   * Points the x-ray at the look now (his frame behind the frames in front, at their offsets),
   * baking it the first time it shows; hidden while it's off, the body is, or nothing is in front.
   */
  #syncXray(): void {
    const b = this.#body;
    if (!this.#xrayOn || !b.visible || this.#id === null || this.#partCount === 0) {
      this.#xray.setVisible(false);
      return;
    }
    const left = Math.round(b.x - b.displayOriginX);
    const top = Math.round(b.y - b.displayOriginY);
    this.#lookAt = 0;
    this.#lookChanged = false;
    this.#lookPut(b.texture.key);
    this.#lookPut(b.frame.name);
    this.#lookPut((left + top) & 1);
    for (let i = 0; i < this.#partCount; i++) {
      const p = this.#parts[i]!; // i < partCount
      this.#lookPut(p.texture);
      this.#lookPut(p.frame);
      this.#lookPut(p.x - left);
      this.#lookPut(p.y - top);
    }
    if (this.#lookAt !== this.#lookLen) this.#lookChanged = true;
    this.#lookLen = this.#lookAt;
    if (this.#lookChanged || this.#xray.texture.key === '__DEFAULT') {
      const look = this.#look.slice(0, this.#lookLen).join('|');
      let key = this.#xrayFor.get(look);
      // Least recently shown first (Map order): a hit moves to the back.
      if (key !== undefined) this.#xrayFor.delete(look);
      else {
        if (this.#xrayFor.size >= XRAY_CACHE_MAX) this.#dropOldestXray();
        key = `overlay.xray.${look}`;
        const { scene } = this.#ctx;
        if (!scene.textures.exists(key)) {
          const m = frameRgba(scene, b.texture.key, b.frame.name);
          const covers: Cover[] = [];
          for (let i = 0; i < this.#partCount; i++) {
            const p = this.#parts[i]!; // i < partCount
            covers.push({ ...this.#alpha(p.texture, p.frame), dx: p.x - left, dy: p.y - top });
          }
          const img = xrayImage(m.data, m.w, m.h, covers, (left + top) & 1);
          scene.textures.addCanvas(key, imageToCanvas(img));
        }
      }
      this.#xrayFor.set(look, key);
      if (this.#xray.texture.key !== key) this.#xray.setTexture(key);
    }
    this.#xray.setPosition(b.x - b.displayOriginX, b.y - b.displayOriginY).setVisible(true);
  }

  /** Writes the next field of the look, noting a change. */
  #lookPut(v: string | number): void {
    if (this.#look[this.#lookAt] !== v) {
      this.#look[this.#lookAt] = v;
      this.#lookChanged = true;
    }
    this.#lookAt++;
  }

  /** A frame's alpha mask, read from its texture once. */
  #alpha(texture: string, frame: string): { alpha: Uint8Array; w: number; h: number } {
    const k = `${texture}:${frame}`;
    let m = this.#alphaOf.get(k);
    if (m === undefined) {
      m = frameAlpha(this.#ctx.scene, { texture, frame, left: 0, top: 0 });
      this.#alphaOf.set(k, m);
    }
    return m;
  }

  /** Frees the least recently shown baked x-ray texture (past the cap; never the one shown). */
  #dropOldestXray(): void {
    for (const [look, key] of this.#xrayFor) {
      if (key === this.#xray.texture.key) continue;
      this.#xrayFor.delete(look);
      const { textures } = this.#ctx.scene;
      if (textures.exists(key)) textures.remove(key);
      return;
    }
  }

  /** Frees the baked x-ray textures (the view released). */
  #dropXray(): void {
    const { scene } = this.#ctx;
    this.#xray.setTexture('__DEFAULT');
    for (const key of this.#xrayFor.values())
      if (scene.textures.exists(key)) scene.textures.remove(key);
    this.#xrayFor.clear();
    this.#lookLen = 0;
  }

  /**
   * Points the halo at the shown frame's @glow (a baked key `<sprite>#<variant>:<frame>`; the
   * default variant's glow, as towers use). Looked up once per frame key, then cached.
   */
  #syncGlow(): void {
    const id = this.#id;
    if (id === null) return;
    const key = this.#body.frame.name;
    let look = this.#glowFor.get(key);
    if (look === undefined) {
      const name = key.slice(key.indexOf(':') + 1);
      const ref = this.#ctx.sprites.glowFrame(id, name);
      const a = ref === null ? null : this.#ctx.sprites.frameAnchor(id, `${name}${GLOW_SUFFIX}`);
      look =
        ref === null || a === null
          ? null
          : { texture: ref.texture, frame: ref.frame, ax: a.x, ay: a.y };
      this.#glowFor.set(key, look);
    }
    if (look === null) {
      this.#glow.setVisible(false);
      return;
    }
    this.#glow
      .setTexture(look.texture, look.frame)
      .setDisplayOrigin(look.ax, look.ay)
      .setVisible(this.#body.visible);
  }

  release(): void {
    this.#uid = 0;
    this.#id = null;
    this.#isLowered = false;
    this.#x = Number.NaN;
    this.#y = Number.NaN;
    this.#sx = Number.NaN;
    this.#sy = Number.NaN;
    this.#body.stop();
    this.#body.setVisible(false);
    this.#glow.setVisible(false);
    this.#xrayOn = false;
    this.#partCount = 0;
    this.#xray.setVisible(false);
    this.#dropXray();
    this.#alphaOf.clear();
  }

  #play(fire: boolean): void {
    if (this.#id === null) return;
    const i = FACING_INDEX[this.#facing];
    const st = this.#stance;
    if (st !== null && !this.#isLowered) {
      // A blocker's stance (T640a): its own idle and shot, and its own anchor.
      const f = this.#facing;
      const { sprites } = this.#ctx;
      const anim = fire ? `${st}_fire_${f}` : `${st}_${f}`;
      const sa = sprites.frameAnchor(this.#id, `${st}_${f}_0`);
      this.#body.play(sprites.anim(this.#id, anim, DEFAULT_VARIANT), !fire);
      this.#body.setDisplayOrigin(sa.x, sa.y);
      this.#syncXray();
      return;
    }
    const low = !fire && this.#isLowered ? this.#lowered[i] : undefined;
    const idle = low ?? this.#idle[i];
    const shot = this.#fire[i];
    const a = low === undefined ? this.#anchors[i] : this.#loweredAnchors[i];
    if (idle === undefined || shot === undefined || a === undefined) return;
    // A new shot restarts the fire anim; an idle already playing carries on.
    this.#body.play(fire ? shot : idle, !fire);
    this.#body.setDisplayOrigin(a.x, a.y);
    this.#syncXray();
  }
}
