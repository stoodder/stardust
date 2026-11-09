// A pooled enemy: its walk anim for the facing it moves in, depth-sorted in `world` (ground units)
// or `air` (flyers, drawn 12 px up over a ground shadow; tech-spec § Sprite anchoring). It flashes
// white when its HP drops (art-direction §7, Impacts: 2 frames of white tint fill). Each one walks a
// little to the side of the path's center line, by uid (D026), so a tight clump reads as a crowd,
// not a centipede.
import * as Phaser from 'phaser';
import type { SpriteId } from '../../content/sprites/index.ts';
import { groundShadowFor } from '../../content/sprites/shadows.ts';
import { worldDepth } from '../depth.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { DEFAULT_VARIANT } from '../sprites/bake.ts';
import { facingOf, spriteId, type Facing } from './spriteInfo.ts';
import { variantName, type ViewContext } from './ViewContext.ts';
import type { PooledView } from './ViewPool.ts';

/** The enemy fields a view reads (a live sim Enemy satisfies it). */
export interface EnemyLike {
  readonly x: number;
  readonly y: number;
  readonly hp: number;
}

/** Flyers draw this far above their ground point. */
const FLY_LIFT_PX = 12;
/** Moves shorter than this (in tiles) keep the current facing, so a pause doesn't flip it. */
const MIN_TURN_TILES = 1e-4;
/** Hit flash: this many rendered frames of white fill (art-direction §7, never longer). */
const HIT_FLASH_FRAMES = 2;
/** `white.1` (master palette). */
const HIT_FLASH_COLOR = 0xffffff;
/** Lateral offset step (px), perpendicular to the direction of travel: ((uid % 5) − 2) steps. */
const LANE_STEP_PX = 1.5;
const FACINGS: readonly Facing[] = ['ne', 'nw', 'se', 'sw'];
/** A tell glyph shows above a new enemy for 3 s (art-direction §8), counted in rendered frames. */
const TELL_FRAMES = 180;
/** The glyph's gap above the body's top (px). */
const TELL_GAP_PX = 2;

/** The sideways offset (px) for an enemy uid: −3 to +3 in 1.5 px steps. */
export function laneOffsetPx(uid: number): number {
  return ((uid % 5) - 2) * LANE_STEP_PX;
}

const pos: Vec2 = { x: 0, y: 0 };

export class EnemyView implements PooledView {
  stamp = 0;
  readonly #ctx: ViewContext;
  readonly #body: Phaser.GameObjects.Sprite;
  readonly #shadow: Phaser.GameObjects.Image;
  readonly #tell: Phaser.GameObjects.Image;
  #tellFrames = 0;
  /** The body's height above its anchor (px), for placing the tell glyph. */
  #headroom = 0;
  #id: SpriteId | null = null;
  #uid = 0;
  #flying = false;
  #selected = false;
  #facing: Facing = 'se';
  #x = Number.NaN;
  #y = Number.NaN;
  #hp = Number.NaN;
  #flashFrames = 0;
  /** Sideways offset (px), and the screen unit vector it runs along (the ground perpendicular to travel). */
  #lane = 0;
  #sideX = -0.894;
  #sideY = 0.447;
  /** Anim keys and frame-0 anchors per facing, for the shown sprite and selection (show()). */
  readonly #keys = new Map<string, string>();
  readonly #anchors = new Map<string, { x: number; y: number }>();

  constructor(ctx: ViewContext) {
    this.#ctx = ctx;
    this.#body = ctx.scene.make.sprite({}, false);
    this.#shadow = ctx.scene.make.image({}, false);
    ctx.layers.decal.add(this.#shadow);
    this.#tell = ctx.scene.make.image({}, false).setOrigin(0.5, 1);
    ctx.layers.overlay.add(this.#tell);
    this.release();
  }

  /** The last synced position, in grid units (towers aim at it). */
  get x(): number {
    return this.#x;
  }

  get y(): number {
    return this.#y;
  }

  /**
   * Shows the view for a spawned enemy. `flying` picks the `air` layer. `tell`: the 8×8 tell glyph
   * to show above it for its first 3 s (null for none).
   */
  show(uid: number, body: string, flying: boolean, tell: SpriteId | null = null): void {
    this.#uid = uid;
    this.#id = spriteId(body);
    this.#flying = flying;
    this.#selected = false;
    this.#facing = 'se';
    this.#x = Number.NaN;
    this.#y = Number.NaN;
    this.#hp = Number.NaN;
    this.#lane = laneOffsetPx(uid);
    this.#stopFlash();
    this.#cacheAnims();
    (flying ? this.#ctx.layers.air : this.#ctx.layers.world).add(this.#body);
    this.#body.setVisible(true);
    this.#play();
    const { sprites } = this.#ctx;
    // Flyers cast the soft fx.shadow; ground units a contact shadow sized to the body.
    const sh = flying
      ? { sprite: 'fx.shadow' as const, frame: 'small', alpha: 1 }
      : groundShadowFor(this.#id);
    const f = sprites.frame(sh.sprite, sh.frame);
    const a = sprites.frameAnchor(sh.sprite, sh.frame);
    this.#shadow
      .setTexture(f.texture, f.frame)
      .setDisplayOrigin(a.x, a.y)
      .setAlpha(sh.alpha)
      .setVisible(false);
    this.#headroom = sprites.meta(this.#id).anchor.y;
    this.#tellFrames = tell === null ? 0 : TELL_FRAMES;
    if (tell !== null) {
      const g = sprites.frame(tell, 'icon');
      this.#tell.setTexture(g.texture, g.frame);
    }
    this.#tell.setVisible(false);
  }

  setSelected(selected: boolean): void {
    if (selected === this.#selected) return;
    this.#selected = selected;
    this.#play();
  }

  /** Positions the enemy from sim state and turns it to face where it moved. */
  sync(e: EnemyLike): void {
    this.#syncFlash(e.hp);
    if (this.#tellFrames > 0 && --this.#tellFrames === 0) this.#tell.setVisible(false);
    if (e.x === this.#x && e.y === this.#y) return;
    if (!Number.isNaN(this.#x)) {
      const dx = e.x - this.#x;
      const dy = e.y - this.#y;
      if (dx * dx + dy * dy > MIN_TURN_TILES * MIN_TURN_TILES) {
        const facing = facingOf(dx, dy);
        if (facing !== this.#facing) {
          this.#facing = facing;
          this.#play();
        }
      }
    }
    const px = this.#x;
    const py = this.#y;
    this.#x = e.x;
    this.#y = e.y;
    gridToScreen(e.x, e.y, this.#ctx.origin, pos);
    const gx = pos.x;
    const gy = pos.y;
    if (!Number.isNaN(px)) {
      // The ground perpendicular to travel (grid (dx, dy) → (−dy, dx)), on screen (iso: grid x →
      // (+2, +1), grid y → (−2, +1)).
      const qx = -(e.y - py);
      const qy = e.x - px;
      const sx = (qx - qy) * 2;
      const sy = qx + qy;
      const len = Math.hypot(sx, sy);
      if (len > 1e-9) {
        this.#sideX = sx / len;
        this.#sideY = sy / len;
      }
    }
    const ox = Math.round(this.#sideX * this.#lane);
    const oy = Math.round(this.#sideY * this.#lane);
    this.#body.setPosition(gx + ox, (this.#flying ? gy - FLY_LIFT_PX : gy) + oy);
    const depth = worldDepth(gy + oy, 'enemy', this.#uid);
    if (this.#body.depth !== depth) this.#body.setDepth(depth);
    this.#shadow.setPosition(gx + ox, gy + oy).setVisible(true);
    if (this.#tellFrames > 0) {
      const top = this.#body.y - this.#headroom - TELL_GAP_PX;
      this.#tell.setPosition(this.#body.x, top).setVisible(true);
    }
  }

  release(): void {
    this.#uid = 0;
    this.#id = null;
    this.#stopFlash();
    this.#body.stop();
    this.#body.setVisible(false);
    this.#shadow.setVisible(false);
    this.#tell.setVisible(false);
    this.#tellFrames = 0;
  }

  /** Starts the flash when HP dropped since the last frame; ends it after HIT_FLASH_FRAMES. */
  #syncFlash(hp: number): void {
    const hit = hp < this.#hp; // false on the first frame (NaN)
    this.#hp = hp;
    if (hit) {
      this.#flashFrames = HIT_FLASH_FRAMES;
      this.#body.setTint(HIT_FLASH_COLOR).setTintMode(Phaser.TintModes.FILL);
    } else if (this.#flashFrames > 0 && --this.#flashFrames === 0) {
      this.#stopFlash();
    }
  }

  #stopFlash(): void {
    this.#flashFrames = 0;
    this.#body.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
  }

  /** Looks up every facing's anim key (plain and selected) and anchor once per show. */
  #cacheAnims(): void {
    this.#keys.clear();
    this.#anchors.clear();
    if (this.#id === null) return;
    const { sprites } = this.#ctx;
    for (const f of FACINGS) {
      const anim = `walk_${f}`;
      for (const sel of [false, true]) {
        this.#keys.set(
          `${f}${sel ? '+' : ''}`,
          sprites.anim(this.#id, anim, variantName(DEFAULT_VARIANT, sel)),
        );
      }
      // Mirrored frames of an off-center sprite have their own anchor (tech-spec § Sprite anchoring).
      this.#anchors.set(f, sprites.frameAnchor(this.#id, `${anim}_0`));
    }
  }

  #play(): void {
    if (this.#id === null) return;
    const key = this.#keys.get(`${this.#facing}${this.#selected ? '+' : ''}`);
    const a = this.#anchors.get(this.#facing);
    if (key === undefined || a === undefined) return;
    this.#body.play(key);
    this.#body.setDisplayOrigin(a.x, a.y);
  }
}
