// A pooled ally (design/maps.md § 5.4; T207b): Sgt. Bricks at his post, beside the path. He plays
// his idle anim (a slow breath) facing his last target, turns to each new one, and plays his fire
// anim on every shot (AllyAttacked), then settles back to idle. Depth-sorted in `world` with the
// towers (his ground point is his post plate's center). Allies with no sprite yet (militia, M3)
// draw nothing.
import * as Phaser from 'phaser';
import type { SpriteId } from '../../content/sprites/index.ts';
import type { AllyKind } from '../../content/types.ts';
import { worldDepth } from '../depth.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { DEFAULT_VARIANT } from '../sprites/bake.ts';
import type { Facing } from './spriteInfo.ts';
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
const FACING_INDEX: Readonly<Record<Facing, number>> = { se: 0, sw: 1, ne: 2, nw: 3 };
const pos: Vec2 = { x: 0, y: 0 };

export class AllyView implements PooledView {
  stamp = 0;
  readonly #ctx: ViewContext;
  readonly #body: Phaser.GameObjects.Sprite;
  #id: SpriteId | null = null;
  #uid = 0;
  #facing: Facing = 'se';
  #x = Number.NaN;
  #y = Number.NaN;
  /** Ground point in screen px (NaN before the first sync). */
  #sx = Number.NaN;
  #sy = Number.NaN;
  /** Anim keys by facing index: idle, then fire. */
  readonly #idle: string[] = [];
  readonly #fire: string[] = [];
  readonly #anchors: { x: number; y: number }[] = [];

  constructor(ctx: ViewContext) {
    this.#ctx = ctx;
    this.#body = ctx.scene.make.sprite({}, false);
    ctx.layers.world.add(this.#body);
    // Only the fire anims end (idles loop): a finished shot settles back to idle.
    this.#body.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.#play(false));
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
    this.#anchors.length = 0;
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
    }
    this.#body.setVisible(true);
    this.sync({ x, y });
    this.#play(false);
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
  }

  release(): void {
    this.#uid = 0;
    this.#id = null;
    this.#x = Number.NaN;
    this.#y = Number.NaN;
    this.#sx = Number.NaN;
    this.#sy = Number.NaN;
    this.#body.stop();
    this.#body.setVisible(false);
  }

  #play(fire: boolean): void {
    if (this.#id === null) return;
    const i = FACING_INDEX[this.#facing];
    const idle = this.#idle[i];
    const shot = this.#fire[i];
    const a = this.#anchors[i];
    if (idle === undefined || shot === undefined || a === undefined) return;
    // A new shot restarts the fire anim; an idle already playing carries on.
    this.#body.play(fire ? shot : idle, !fire);
    this.#body.setDisplayOrigin(a.x, a.y);
  }
}
