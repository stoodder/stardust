// The finale's choir on its walk (design/maps.md § 5.5; sim/choir.ts; T804's minimal readable view,
// polished by T830). It reads sim state only, so it holds while paused:
// - **The column:** each choir member (allies of mode `choir`) walks the road in a body: Pebble in
//   her bottle cap (`ally.pebble`), the singers as colonist Skitterkin (`ally.refugee` in the
//   allies' palette), Old Thrum beside Pebble in the elder's body (`enemy.elder`). Each faces the
//   way it moves; a hushed singer is dimmed and greyed, its walk held, as it trails at the back.
//   One held in a hush tell freezes. The Returned are bearers: BearerView draws them.
// - **The song's circles** (`songCircles`: the leader's, and each Returned's 1-tile aura), dashed
//   warm gold in `decal`, on a map with a song.
// - **The halt window:** a line from the leader up the road for `haltTiles`, faint while she walks
//   and red while the choir is halted (a Hollow unit inside it).
// Pooled bodies; the circles and the line are one Graphics redrawn each frame (no allocation).
import type * as Phaser from 'phaser';
import type { CompiledMapDef } from '../../content/compiled.ts';
import type { SpriteId } from '../../content/sprites/index.ts';
import type { IdSpace } from '../../content/types.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import { isHushedSinger, songCircles, type Ally, type SimState } from '../../sim/index.ts';
import { worldDepth } from '../depth.ts';
import { gridToScreen, rangeEllipsePx, type Vec2 } from '../iso.ts';
import { DEFAULT_VARIANT } from '../sprites/bake.ts';
import { hexOf } from './jamLook.ts';
import { PEBBLE_SPRITE, REFUGEE_SPRITE, REFUGEE_VARIANT } from './RefugeeView.ts';
import { facingOf, hasAnim, type Facing } from './spriteInfo.ts';
import type { ViewContext } from './ViewContext.ts';
import { ViewPool, type PooledView } from './ViewPool.ts';

/** Old Thrum's body (the elder Skitterkin). */
export const THRUM_SPRITE: SpriteId = 'enemy.elder';
/** A hushed singer: dimmed and greyed. */
export const HUSHED_ALPHA = 0.5;
const HUSHED_TINT = 0x8a8aa8;
/** Thrum walks this far (px) to Pebble's right. */
const THRUM_SIDE_PX = 7;
const SONG = hexOf('gold.3');
const INK = hexOf('gold.0');
const HALT = hexOf('red.3');
const WALK = hexOf('gold.2');

const pos: Vec2 = { x: 0, y: 0 };
const semi: Vec2 = { x: 0, y: 0 };
const tip: Vec2 = { x: 0, y: 0 };

type MemberLike = Readonly<
  Pick<Ally, 'x' | 'y' | 'hushUid' | 'pebble' | 'kind' | 'alive' | 'mode' | 'vulnerability'>
>;

class MemberView implements PooledView {
  stamp = 0;
  readonly #ctx: ViewContext;
  readonly #body: Phaser.GameObjects.Sprite;
  #sprite: SpriteId = REFUGEE_SPRITE;
  #variant = REFUGEE_VARIANT;
  #facing: Facing = 'ne';
  #x = Number.NaN;
  #y = Number.NaN;
  #side = 0;
  #uid = 0;
  hushed = false;

  constructor(ctx: ViewContext) {
    this.#ctx = ctx;
    this.#body = ctx.scene.make.sprite({}, false);
    ctx.layers.world.add(this.#body);
    this.release();
  }

  show(uid: number, a: MemberLike): void {
    this.#uid = uid;
    const thrum = a.kind === 'thrum';
    this.#sprite = thrum ? THRUM_SPRITE : a.pebble ? PEBBLE_SPRITE : REFUGEE_SPRITE;
    this.#variant = thrum ? DEFAULT_VARIANT : REFUGEE_VARIANT;
    this.#side = thrum ? THRUM_SIDE_PX : 0;
    this.#facing = 'ne';
    this.#x = Number.NaN;
    this.#y = Number.NaN;
    this.hushed = false;
    this.#body.setAlpha(1).clearTint().setVisible(true);
    this.#play();
  }

  sync(a: MemberLike): void {
    const moved = a.x !== this.#x || a.y !== this.#y;
    if (moved && !Number.isNaN(this.#x)) {
      const f = facingOf(a.x - this.#x, a.y - this.#y);
      if (f !== this.#facing) {
        this.#facing = f;
        this.#play();
      }
    }
    const hushed = isHushedSinger(a);
    if (hushed !== this.hushed) {
      this.hushed = hushed;
      if (hushed) this.#body.setAlpha(HUSHED_ALPHA).setTint(HUSHED_TINT);
      else this.#body.setAlpha(1).clearTint();
    }
    const still = hushed || a.hushUid !== 0 || !moved;
    if (still && this.#body.anims.isPlaying) this.#body.anims.pause();
    else if (!still && this.#body.anims.isPaused) this.#body.anims.resume();
    if (!moved) return;
    this.#x = a.x;
    this.#y = a.y;
    gridToScreen(a.x, a.y, this.#ctx.origin, pos);
    this.#body
      .setPosition(pos.x + this.#side, pos.y)
      .setDepth(worldDepth(pos.y, 'enemy', this.#uid));
  }

  release(): void {
    this.#uid = 0;
    this.#body.stop();
    this.#body.setVisible(false);
  }

  #play(): void {
    const key = `walk_${this.#facing}`;
    if (!hasAnim(this.#sprite, key)) return;
    this.#body.play(this.#ctx.sprites.anim(this.#sprite, key, this.#variant), true);
    const a = this.#ctx.sprites.frameAnchor(this.#sprite, `${key}_0`);
    this.#body.setDisplayOrigin(a.x, a.y);
  }
}

/** The choir's bodies, its song circles, and its halt window, synced each frame (BattleScene). */
export class ChoirWalkView {
  readonly #ctx: ViewContext;
  readonly #pool: ViewPool<MemberView>;
  readonly #g: Phaser.GameObjects.Graphics;
  #rings = 0;
  #halted = false;

  constructor(ctx: ViewContext) {
    this.#ctx = ctx;
    this.#pool = new ViewPool(() => new MemberView(ctx));
    this.#g = ctx.scene.make.graphics({}, false);
    ctx.layers.decal.add(this.#g);
  }

  update(
    state: DeepReadonly<Pick<SimState, 'allies' | 'choir'>>,
    map: CompiledMapDef<IdSpace>,
    stamp: number,
  ): void {
    const g = this.#g;
    g.clear();
    this.#rings = 0;
    this.#halted = false;
    const c = map.choir;
    if (c === null) return;
    const allies = state.allies;
    for (let i = 0; i < allies.used; i++) {
      const a = allies.items[i]!; // i < used ≤ items.length
      if (!a.alive || a.mode !== 'choir' || a.kind === 'bearer') continue;
      let v = this.#pool.get(a.uid);
      if (v === undefined) {
        v = this.#pool.acquire(a.uid);
        v.show(a.uid, a);
      }
      v.stamp = stamp;
      v.sync(a);
    }
    this.#pool.sweep(stamp);
    const circles = songCircles(state, map);
    for (let i = 0; i < circles.length; i++) {
      const s = circles[i]!; // i < length
      gridToScreen(s.x, s.y, this.#ctx.origin, pos);
      rangeEllipsePx(s.r, semi);
      g.lineStyle(3, INK, 0.45).strokeEllipse(pos.x, pos.y, semi.x * 2, semi.y * 2);
      g.lineStyle(1, SONG, 0.9).strokeEllipse(pos.x, pos.y, semi.x * 2, semi.y * 2);
      this.#rings++;
    }
    const ch = state.choir;
    if (ch.arrived) return;
    this.#halted = ch.halted;
    // The halt window: haltTiles up the road (toward its spawn) from the leader.
    const route = c.route;
    let d = route.lengthTiles - ch.dist - c.haltTiles;
    if (d < 0) d = 0;
    let seg = 0;
    while (seg < route.cumLenTiles.length - 2 && d >= route.cumLenTiles[seg + 1]!) seg++;
    const start = route.cumLenTiles[seg]!;
    const end = route.cumLenTiles[seg + 1] ?? start;
    const t = end > start ? (d - start) / (end - start) : 0;
    const tx = route.xs[seg]! + ((route.xs[seg + 1] ?? route.xs[seg]!) - route.xs[seg]!) * t;
    const ty = route.ys[seg]! + ((route.ys[seg + 1] ?? route.ys[seg]!) - route.ys[seg]!) * t;
    gridToScreen(ch.x, ch.y, this.#ctx.origin, pos);
    gridToScreen(tx, ty, this.#ctx.origin, tip);
    if (ch.halted) g.lineStyle(3, HALT, 0.9);
    else g.lineStyle(1, WALK, 0.5);
    g.lineBetween(pos.x, pos.y, tip.x, tip.y);
  }

  releaseAll(): void {
    this.#pool.releaseAll();
    this.#g.clear();
    this.#rings = 0;
    this.#halted = false;
  }

  /** The render-state hook's view: members drawn, hushed ones, song rings, and the halt. */
  get counts(): {
    readonly shown: number;
    readonly hushed: number;
    readonly rings: number;
    readonly halted: boolean;
  } {
    let shown = 0;
    let hushed = 0;
    for (const v of this.#pool.live.values()) {
      shown++;
      if (v.hushed) hushed++;
    }
    return { shown, hushed, rings: this.#rings, halted: this.#halted };
  }
}
