// A pooled ally (design/maps.md § 5.4; T207b): Sgt. Bricks at his post, beside the path. He plays
// his idle anim (a slow breath) facing his last target, turns to each new one, and plays his fire
// anim on every shot (AllyAttacked), then settles back to idle. Depth-sorted in `world` with the
// towers (his ground point is his post plate's center), with the additive @glow halo of the frame
// he shows in the `vfx` layer (his visor and the glinting stone; T216), following each anim frame.
// Allies with no sprite yet (militia, M3) draw nothing.
// Lowered (`setLowered`, allyPose.ts: A1M5's Quiet Wave, T330), he idles on `lowered_<facing>`
// instead, the cannon held low across his hip, and stays so: a silent tell, never mentioned.
import * as Phaser from 'phaser';
import type { SpriteId } from '../../content/sprites/index.ts';
import type { AllyKind } from '../../content/types.ts';
import { worldDepth } from '../depth.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { DEFAULT_VARIANT } from '../sprites/bake.ts';
import { hasAnim, type Facing } from './spriteInfo.ts';
import type { ViewContext } from './ViewContext.ts';
import type { PooledView } from './ViewPool.ts';

/** The ally fields a view reads (a live sim Ally satisfies it). */
export interface AllyLike {
  readonly x: number;
  readonly y: number;
}

/** Each ally kind's sprite (null: not drawn yet). */
export const ALLY_SPRITES: Readonly<Record<AllyKind, SpriteId | null>> = {
  bricks: 'ally.bricks',
  swarmling: null,
  leaper: null,
  refugee: null,
  bearer: null,
  singer: null,
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

  constructor(ctx: ViewContext) {
    this.#ctx = ctx;
    this.#body = ctx.scene.make.sprite({}, false);
    this.#glow = ctx.scene.make.image({}, false).setBlendMode(Phaser.BlendModes.ADD);
    ctx.layers.world.add(this.#body);
    ctx.layers.vfx.add(this.#glow);
    // Only the fire anims end (idles loop): a finished shot settles back to idle.
    this.#body.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.#play(false));
    // The halo follows every frame the body shows.
    this.#body.on(Phaser.Animations.Events.ANIMATION_UPDATE, () => this.#syncGlow());
    this.#body.on(Phaser.Animations.Events.ANIMATION_START, () => this.#syncGlow());
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
  get lowered(): boolean {
    return this.#isLowered && this.#lowered.length > 0;
  }

  /** Lowers or raises the weapon (its idle swaps); a shot in progress finishes first. */
  setLowered(lowered: boolean): void {
    if (lowered === this.#isLowered) return;
    this.#isLowered = lowered;
    const current = this.#body.anims.currentAnim?.key;
    if (!this.#body.anims.isPlaying || !this.#fire.includes(current ?? '')) this.#play(false);
  }

  /** Turns to a facing (idle anim); a shot in progress finishes first. */
  setFacing(facing: Facing): void {
    if (facing === this.#facing) return;
    this.#facing = facing;
    const current = this.#body.anims.currentAnim?.key;
    if (!this.#body.anims.isPlaying || !this.#fire.includes(current ?? '')) this.#play(false);
  }

  /** A shot: faces `facing`, plays the fire anim once, then idles again. */
  fire(facing: Facing): void {
    this.#facing = facing;
    this.#play(true);
  }

  /** Writes the muzzle's screen position (px) for the current facing into `out`. */
  muzzle(out: Vec2): Vec2 {
    const m = BRICKS_MUZZLE[this.#facing];
    out.x = this.#sx + m.dx;
    out.y = this.#sy + m.dy;
    return out;
  }

  /** Positions the ally at its sim position. Cheap when it hasn't moved (a post never does). */
  sync(a: AllyLike): void {
    if (a.x === this.#x && a.y === this.#y) return;
    this.#x = a.x;
    this.#y = a.y;
    gridToScreen(a.x, a.y, this.#ctx.origin, pos);
    this.#sx = pos.x;
    this.#sy = pos.y;
    this.#body.setPosition(pos.x, pos.y).setDepth(worldDepth(pos.y, 'tower', this.#uid));
    this.#glow.setPosition(pos.x, pos.y);
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
  }

  #play(fire: boolean): void {
    if (this.#id === null) return;
    const i = FACING_INDEX[this.#facing];
    const low = !fire && this.#isLowered ? this.#lowered[i] : undefined;
    const idle = low ?? this.#idle[i];
    const shot = this.#fire[i];
    const a = low === undefined ? this.#anchors[i] : this.#loweredAnchors[i];
    if (idle === undefined || shot === undefined || a === undefined) return;
    // A new shot restarts the fire anim; an idle already playing carries on.
    this.#body.play(fire ? shot : idle, !fire);
    this.#body.setDisplayOrigin(a.x, a.y);
  }
}
