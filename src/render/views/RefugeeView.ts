// Refugees on an Escort (design/maps.md § 5.2; T305c): the minimal readable view. Each refugee on
// the field walks its route as a Skitterkin in the `skitterkin.ally` palette (the Act I body, as
// maps.md says, carrying its belongings: `ally.refugee`, T540a; Pebble walks among them in her
// bottle cap, `ally.pebble`), facing the way it moves. One still filing in at the route's start
// (`dist` < 0) isn't drawn; one a Hollow unit is hushing freezes on its frame (its Hollow unit
// tells). A hushed or evacuated refugee's view goes with it (the sweep). Depth-sorted in `world`
// like an enemy. T530a (refugeeLook.ts): each walks a little to the side of the road's line by uid,
// every third parent carries a little one (`carry_<facing>`), and Pebble walks on the near side of
// her group, sorted in front of the parent ahead of her, so she is never hidden behind it.
import type * as Phaser from 'phaser';
import type { SpriteId } from '../../content/sprites/index.ts';
import type { Ally } from '../../sim/index.ts';
import { worldDepth } from '../depth.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { sideOf } from './EnemyView.ts';
import { nearSide, PEBBLE_RAISE_PX, refugeeAnim, refugeeLanePx } from './refugeeLook.ts';
import { facingOf, hasAnim, type Facing } from './spriteInfo.ts';
import type { ViewContext } from './ViewContext.ts';
import { ViewPool, type PooledView } from './ViewPool.ts';

/** The refugees' and Pebble's sprites (T540a; allies/refugee.ts, allies/pebble.ts). */
export const REFUGEE_SPRITE: SpriteId = 'ally.refugee';
export const PEBBLE_SPRITE: SpriteId = 'ally.pebble';
/** Refugees wear the Skitterkin allies' palette (maps.md § 5.2). */
export const REFUGEE_VARIANT = 'skitterkin.ally';

const pos: Vec2 = { x: 0, y: 0 };
const side: Vec2 = { x: 0, y: 0 };

/** The refugee fields the view reads (a live sim Ally satisfies it). */
export type RefugeeLike = Readonly<Pick<Ally, 'x' | 'y' | 'dist' | 'hushUid' | 'pebble'>>;

/** The allies pool as the views read it (the sim's, read-only). */
export interface AlliesLike {
  readonly used: number;
  readonly items: readonly (RefugeeLike & Readonly<Pick<Ally, 'alive' | 'uid' | 'group'>>)[];
}

export class RefugeeView implements PooledView {
  stamp = 0;
  readonly #ctx: ViewContext;
  readonly #body: Phaser.GameObjects.Sprite;
  #uid = 0;
  #sprite: SpriteId = REFUGEE_SPRITE;
  #facing: Facing = 'se';
  #x = Number.NaN;
  #y = Number.NaN;
  #held = false;
  /** Its walk's family (`walk`, or `carry` with a little one), its lane offset (px) and side. */
  #anim: 'walk' | 'carry' = 'walk';
  #lane = 0;
  #pebble = false;
  #sideX = 0;
  #sideY = 0;

  constructor(ctx: ViewContext) {
    this.#ctx = ctx;
    this.#body = ctx.scene.make.sprite({}, false);
    ctx.layers.world.add(this.#body);
    this.release();
  }

  /** Shows the view for a refugee (Pebble's sprite for her). */
  show(uid: number, pebble: boolean): void {
    this.#uid = uid;
    this.#sprite = pebble ? PEBBLE_SPRITE : REFUGEE_SPRITE;
    this.#pebble = pebble;
    const anim = refugeeAnim(uid, pebble);
    this.#anim = anim === 'carry' && hasAnim(this.#sprite, 'carry_se') ? 'carry' : 'walk';
    this.#lane = refugeeLanePx(uid, pebble);
    this.#sideX = 0;
    this.#sideY = 0;
    this.#facing = 'se';
    this.#x = Number.NaN;
    this.#y = Number.NaN;
    this.#held = false;
    this.#play();
  }

  /** Whether it's drawn now (on the field). */
  get shown(): boolean {
    return this.#body.visible;
  }

  /** Whether it stands frozen in a hush. */
  get held(): boolean {
    return this.#held;
  }

  /** Follows its refugee: hidden while filing in, facing its way, frozen while hushed. */
  sync(a: RefugeeLike): void {
    if (a.dist < 0) {
      this.#body.setVisible(false);
      return;
    }
    const moved = a.x !== this.#x || a.y !== this.#y;
    if (moved && !Number.isNaN(this.#x)) {
      const f = facingOf(a.x - this.#x, a.y - this.#y);
      if (f !== this.#facing) {
        this.#facing = f;
        this.#play();
      }
      if (sideOf(a.x - this.#x, a.y - this.#y, side) !== null) {
        if (this.#pebble) nearSide(side);
        this.#sideX = side.x;
        this.#sideY = side.y;
      }
    }
    const held = a.hushUid !== 0;
    if (held !== this.#held) {
      this.#held = held;
      if (held) this.#body.anims.pause();
      else this.#body.anims.resume();
    }
    this.#body.setVisible(true);
    if (!moved) return;
    this.#x = a.x;
    this.#y = a.y;
    gridToScreen(a.x, a.y, this.#ctx.origin, pos);
    const x = pos.x + Math.round(this.#sideX * this.#lane);
    const y = pos.y + Math.round(this.#sideY * this.#lane);
    const raise = this.#pebble ? PEBBLE_RAISE_PX : 0;
    this.#body.setPosition(x, y).setDepth(worldDepth(y + raise, 'enemy', this.#uid));
  }

  release(): void {
    this.#uid = 0;
    this.#body.stop();
    this.#body.setVisible(false);
  }

  #play(): void {
    const { sprites } = this.#ctx;
    const anim = `${this.#anim}_${this.#facing}`;
    this.#body.play(sprites.anim(this.#sprite, anim, REFUGEE_VARIANT), true);
    const a = sprites.frameAnchor(this.#sprite, `${anim}_0`);
    this.#body.setDisplayOrigin(a.x, a.y);
  }
}

/** Every refugee's view, synced from the sim's allies each frame (BattleScene). */
export class RefugeeViews {
  readonly #pool: ViewPool<RefugeeView>;

  constructor(ctx: ViewContext) {
    this.#pool = new ViewPool(() => new RefugeeView(ctx));
  }

  /** Syncs a view to each live refugee (`group` ≥ 0), then sweeps the rest. */
  sync(allies: AlliesLike, stamp: number): void {
    for (let i = 0; i < allies.used; i++) {
      const a = allies.items[i]!; // i < used ≤ items.length
      if (!a.alive || a.group < 0) continue;
      let v = this.#pool.get(a.uid);
      if (v === undefined) {
        v = this.#pool.acquire(a.uid);
        v.show(a.uid, a.pebble);
      }
      v.stamp = stamp;
      v.sync(a);
    }
    this.#pool.sweep(stamp);
  }

  releaseAll(): void {
    this.#pool.releaseAll();
  }

  /** Refugees drawn now, and those frozen in a hush (the render-state hook's view). */
  get counts(): { readonly shown: number; readonly held: number } {
    let shown = 0;
    let held = 0;
    for (const v of this.#pool.live.values()) {
      if (!v.shown) continue;
      shown++;
      if (v.held) held++;
    }
    return { shown, held };
  }
}
