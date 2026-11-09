// A pooled enemy: its walk anim for the facing it moves in, depth-sorted in `world` (ground units)
// or `air` (flyers, drawn 12 px up over a ground shadow; tech-spec § Sprite anchoring). It flashes
// white when its HP drops (art-direction §7, Impacts: 2 frames of white tint fill).
import * as Phaser from 'phaser';
import type { SpriteId } from '../../content/sprites/index.ts';
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

const pos: Vec2 = { x: 0, y: 0 };

export class EnemyView implements PooledView {
  stamp = 0;
  readonly #ctx: ViewContext;
  readonly #body: Phaser.GameObjects.Sprite;
  readonly #shadow: Phaser.GameObjects.Image;
  #id: SpriteId | null = null;
  #uid = 0;
  #flying = false;
  #selected = false;
  #facing: Facing = 'se';
  #x = Number.NaN;
  #y = Number.NaN;
  #hp = Number.NaN;
  #flashFrames = 0;

  constructor(ctx: ViewContext) {
    this.#ctx = ctx;
    this.#body = ctx.scene.make.sprite({}, false);
    this.#shadow = ctx.scene.make.image({}, false);
    ctx.layers.decal.add(this.#shadow);
    this.release();
  }

  /** The last synced position, in grid units (towers aim at it). */
  get x(): number {
    return this.#x;
  }

  get y(): number {
    return this.#y;
  }

  /** Shows the view for a spawned enemy. `flying` picks the `air` layer. */
  show(uid: number, body: string, flying: boolean): void {
    this.#uid = uid;
    this.#id = spriteId(body);
    this.#flying = flying;
    this.#selected = false;
    this.#facing = 'se';
    this.#x = Number.NaN;
    this.#y = Number.NaN;
    this.#hp = Number.NaN;
    this.#stopFlash();
    (flying ? this.#ctx.layers.air : this.#ctx.layers.world).add(this.#body);
    this.#body.setVisible(true);
    this.#play();
    if (flying) {
      const f = this.#ctx.sprites.frame('fx.shadow', 'small');
      const a = this.#ctx.sprites.frameAnchor('fx.shadow', 'small');
      this.#shadow.setTexture(f.texture, f.frame).setDisplayOrigin(a.x, a.y).setVisible(true);
    }
  }

  setSelected(selected: boolean): void {
    if (selected === this.#selected) return;
    this.#selected = selected;
    this.#play();
  }

  /** Positions the enemy from sim state and turns it to face where it moved. */
  sync(e: EnemyLike): void {
    this.#syncFlash(e.hp);
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
    this.#x = e.x;
    this.#y = e.y;
    gridToScreen(e.x, e.y, this.#ctx.origin, pos);
    this.#body.setPosition(pos.x, this.#flying ? pos.y - FLY_LIFT_PX : pos.y);
    const depth = worldDepth(pos.y, 'enemy', this.#uid);
    if (this.#body.depth !== depth) this.#body.setDepth(depth);
    if (this.#flying) this.#shadow.setPosition(pos.x, pos.y);
  }

  release(): void {
    this.#uid = 0;
    this.#id = null;
    this.#stopFlash();
    this.#body.stop();
    this.#body.setVisible(false);
    this.#shadow.setVisible(false);
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

  #play(): void {
    if (this.#id === null) return;
    const { sprites } = this.#ctx;
    const anim = `walk_${this.#facing}`;
    const key = sprites.anim(this.#id, anim, variantName(DEFAULT_VARIANT, this.#selected));
    this.#body.play(key);
    // Mirrored frames of an off-center sprite have their own anchor (tech-spec § Sprite anchoring).
    const a = sprites.frameAnchor(this.#id, `${anim}_0`);
    this.#body.setDisplayOrigin(a.x, a.y);
  }
}
