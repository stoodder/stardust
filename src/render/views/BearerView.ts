// Bearers and militia (design/maps.md § 5.4; T706's minimal readable views, polished by T730a in
// T740a's bodies):
// - **A bearer** (A3M5's Brood Haulers carrying the vats' dead home; sim/bearers.ts) walks its
//   route in its own body (`ally.bearer`: a Hauler in the allies' palette, its sack the **burden**,
//   glowing cold violet in the sprite itself, so a bearer never reads as the Hauler enemy it was;
//   no extra glow is drawn). One still filing in (`dist` < 0) isn't drawn; one a Hollow unit is
//   hushing freezes on its frame, dimmed. A hushed or home bearer's view goes with it (the sweep).
//   Depth-sorted in `world` like a refugee.
// - **Militia** (A3M6's colonist posts under `convoy`, a flag-gated post): a colonist behind
//   lettuce crates at its post (`ally.militia`), breathing (`idle_<facing>`, held on its first
//   frame under reduced motion), turning to its target, and on each shot (its cooldown reset since
//   the last frame) its `fire_<facing>` kick and muzzle flash, then idle again, with a brief gold
//   tracer from the muzzle to the target. Depth-sorted with the towers.
import * as Phaser from 'phaser';
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import type { SpriteId } from '../../content/sprites/index.ts';
import type { Ally } from '../../sim/index.ts';
import { worldDepth } from '../depth.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { facingOf, type Facing } from './spriteInfo.ts';
import type { ViewContext } from './ViewContext.ts';
import { ViewPool, type PooledView } from './ViewPool.ts';

/** A bearer's body (T740a's `ally.bearer`: a Hauler with its violet burden) and its palette. */
export const BEARER_SPRITE: SpriteId = 'ally.bearer';
export const BEARER_VARIANT = 'default';
/** A hushed bearer's alpha (frozen and dimmed under the hush). */
const HELD_ALPHA = 0.7;
/** The militia's body (T740a) and its anims. */
export const MILITIA_SPRITE: SpriteId = 'ally.militia';
/** A militia shot's tracer (ms), and its muzzle's offset from the post's ground point (px). */
const TRACER_MS = 80;
const MUZZLE_DX = 8;
const MUZZLE_DY = -10;
const FACINGS: readonly Facing[] = ['se', 'sw', 'ne', 'nw'];

/** Packs a master palette colour as Phaser's 0xRRGGBB. */
function hex(name: ColorName): number {
  const c = rgbOf(name);
  return (c.r << 16) | (c.g << 8) | c.b;
}
const TRACER = hex('gold.4');
const TRACER_UNDER = hex('ink.0');

const pos: Vec2 = { x: 0, y: 0 };
const aim: Vec2 = { x: 0, y: 0 };

/** The ally fields these views read (a live sim Ally satisfies it). */
export type BearerAlly = Readonly<
  Pick<
    Ally,
    | 'alive'
    | 'uid'
    | 'kind'
    | 'x'
    | 'y'
    | 'dist'
    | 'hushUid'
    | 'targetUid'
    | 'cooldownTicks'
    | 'periodTicks'
  >
>;

/** The allies pool, and where each enemy stands (for a tracer's end), as these views read them. */
export interface BearerWorld {
  readonly allies: { readonly used: number; readonly items: readonly BearerAlly[] };
  readonly enemies: {
    readonly used: number;
    readonly items: readonly {
      readonly alive: boolean;
      readonly uid: number;
      readonly x: number;
      readonly y: number;
    }[];
  };
}

/** One bearer: its Hauler body with its glowing burden. */
export class BearerView implements PooledView {
  stamp = 0;
  readonly #ctx: ViewContext;
  readonly #body: Phaser.GameObjects.Sprite;
  #uid = 0;
  #facing: Facing = 'sw';
  #x = Number.NaN;
  #y = Number.NaN;
  #held = false;

  constructor(ctx: ViewContext) {
    this.#ctx = ctx;
    this.#body = ctx.scene.make.sprite({}, false);
    ctx.layers.world.add(this.#body);
    this.release();
  }

  show(uid: number): void {
    this.#uid = uid;
    this.#facing = 'sw';
    this.#x = Number.NaN;
    this.#y = Number.NaN;
    this.#held = false;
    this.#play();
  }

  /** Whether it's drawn now (on the field), and frozen in a hush. */
  get shown(): boolean {
    return this.#body.visible;
  }
  get held(): boolean {
    return this.#held;
  }
  /** Whether its burden shows (the glowing sack in its body: the difference from a Hauler enemy). */
  get burden(): boolean {
    return this.#body.visible;
  }

  sync(a: BearerAlly): void {
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
    }
    const held = a.hushUid !== 0;
    if (held !== this.#held) {
      this.#held = held;
      if (held) this.#body.anims.pause();
      else this.#body.anims.resume();
      this.#body.setAlpha(held ? HELD_ALPHA : 1);
    }
    this.#body.setVisible(true);
    if (moved) {
      this.#x = a.x;
      this.#y = a.y;
      gridToScreen(a.x, a.y, this.#ctx.origin, pos);
      const depth = worldDepth(pos.y, 'enemy', this.#uid);
      this.#body.setPosition(pos.x, pos.y).setDepth(depth);
    }
  }

  release(): void {
    this.#uid = 0;
    this.#body.stop();
    this.#body.setAlpha(1).setVisible(false);
  }

  #play(): void {
    const { sprites } = this.#ctx;
    const anim = `walk_${this.#facing}`;
    this.#body.play(sprites.anim(BEARER_SPRITE, anim, BEARER_VARIANT), true);
    const a = sprites.frameAnchor(BEARER_SPRITE, `${anim}_0`);
    this.#body.setDisplayOrigin(a.x, a.y);
  }
}

/** One militia post: the colonist behind its crates (`ally.militia`), and its tracer. */
export class MilitiaView implements PooledView {
  stamp = 0;
  readonly #ctx: ViewContext;
  readonly #still: () => boolean;
  readonly #body: Phaser.GameObjects.Sprite;
  readonly #tracer: Phaser.GameObjects.Graphics;
  /** Each facing's idle and fire anim keys and frame-0 anchor (FACINGS order), looked up once. */
  readonly #idle: string[] = [];
  readonly #fire: string[] = [];
  readonly #anchors: { readonly x: number; readonly y: number }[] = [];
  #facing = 0;
  #x = 0;
  #y = 0;
  #tracerUntil = 0;
  #cooldown = 0;
  shots = 0;

  constructor(ctx: ViewContext, reducedMotion: () => boolean) {
    this.#ctx = ctx;
    this.#still = reducedMotion;
    const { sprites } = ctx;
    for (const f of FACINGS) {
      this.#idle.push(sprites.anim(MILITIA_SPRITE, `idle_${f}`));
      this.#fire.push(sprites.anim(MILITIA_SPRITE, `fire_${f}`));
      this.#anchors.push(sprites.frameAnchor(MILITIA_SPRITE, `idle_${f}_0`));
    }
    this.#body = ctx.scene.make.sprite({}, false);
    this.#tracer = ctx.scene.make.graphics({}, false);
    ctx.layers.world.add(this.#body);
    ctx.layers.vfx.add(this.#tracer);
    // A shot's kick ends back on its facing's idle.
    this.#body.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.#play(false));
    this.release();
  }

  show(uid: number, x: number, y: number): void {
    gridToScreen(x, y, this.#ctx.origin, pos);
    this.#x = x;
    this.#y = y;
    this.#facing = 0;
    this.#body
      .setPosition(pos.x, pos.y)
      .setDepth(worldDepth(pos.y, 'tower', uid))
      .setVisible(true);
    this.#play(false);
    this.#tracer.setVisible(false);
    this.#tracerUntil = 0;
    this.#cooldown = 0;
    this.shots = 0;
  }

  get shown(): boolean {
    return this.#body.visible;
  }

  /**
   * Turns to its target and, when it fired since the last frame (its cooldown reset upward: frames
   * can skip ticks), plays its shot and draws a tracer, fading it out.
   */
  sync(a: BearerAlly, world: BearerWorld, nowMs: number): void {
    const fired = a.cooldownTicks > this.#cooldown;
    this.#cooldown = a.cooldownTicks;
    const t = a.targetUid === 0 ? null : findEnemy(world, a.targetUid);
    if (t !== null) {
      const f = FACINGS.indexOf(facingOf(t.x - this.#x, t.y - this.#y));
      if (f !== this.#facing && f >= 0) {
        this.#facing = f;
        this.#play(false);
      }
    }
    if (fired && t !== null) {
      this.#play(true);
      gridToScreen(a.x, a.y, this.#ctx.origin, pos);
      gridToScreen(t.x, t.y, this.#ctx.origin, aim);
      // The barrel points right facing se or nw (the sprite's own and its mirror), else left.
      const f = FACINGS[this.#facing];
      const mx = pos.x + (f === 'se' || f === 'nw' ? MUZZLE_DX : -MUZZLE_DX);
      const my = pos.y + MUZZLE_DY;
      const g = this.#tracer;
      g.clear();
      g.lineStyle(3, TRACER_UNDER, 0.6).lineBetween(mx, my, aim.x, aim.y - 6);
      g.lineStyle(1, TRACER, 1).lineBetween(mx, my, aim.x, aim.y - 6);
      g.setVisible(true);
      this.#tracerUntil = nowMs + TRACER_MS;
      this.shots++;
    }
    if (this.#tracer.visible && nowMs >= this.#tracerUntil) this.#tracer.setVisible(false);
  }

  release(): void {
    this.#body.stop();
    this.#body.setVisible(false);
    this.#tracer.setVisible(false);
  }

  /** Its idle for its facing (held still under reduced motion), or its shot once. */
  #play(fire: boolean): void {
    const i = this.#facing;
    const a = this.#anchors[i]!; // i < FACINGS.length
    this.#body.play(fire ? this.#fire[i]! : this.#idle[i]!, !fire); // same index
    this.#body.setDisplayOrigin(a.x, a.y);
    if (!fire && this.#still()) this.#body.anims.pause();
  }
}

function findEnemy(world: BearerWorld, uid: number): { x: number; y: number } | null {
  const pool = world.enemies;
  for (let i = 0; i < pool.used; i++) {
    const e = pool.items[i]!; // i < used ≤ items.length
    if (e.alive && e.uid === uid) return e;
  }
  return null;
}

/** Every bearer's and militia post's view, synced from the sim each frame (BattleScene). */
export class BearerViews {
  readonly #bearers: ViewPool<BearerView>;
  readonly #militia: ViewPool<MilitiaView>;

  constructor(ctx: ViewContext, reducedMotion: () => boolean = () => false) {
    this.#bearers = new ViewPool(() => new BearerView(ctx));
    this.#militia = new ViewPool(() => new MilitiaView(ctx, reducedMotion));
  }

  sync(world: BearerWorld, stamp: number, nowMs: number): void {
    const allies = world.allies;
    for (let i = 0; i < allies.used; i++) {
      const a = allies.items[i]!; // i < used ≤ items.length
      if (!a.alive) continue;
      if (a.kind === 'bearer') {
        let v = this.#bearers.get(a.uid);
        if (v === undefined) {
          v = this.#bearers.acquire(a.uid);
          v.show(a.uid);
        }
        v.stamp = stamp;
        v.sync(a);
      } else if (a.kind === 'militia') {
        let v = this.#militia.get(a.uid);
        if (v === undefined) {
          v = this.#militia.acquire(a.uid);
          v.show(a.uid, a.x, a.y);
        }
        v.stamp = stamp;
        v.sync(a, world, nowMs);
      }
    }
    this.#bearers.sweep(stamp);
    this.#militia.sweep(stamp);
  }

  releaseAll(): void {
    this.#bearers.releaseAll();
    this.#militia.releaseAll();
  }

  /** What's drawn now (the render-state hook): bearers shown, held, with their burden; militia. */
  get counts(): {
    readonly shown: number;
    readonly held: number;
    readonly burdens: number;
    readonly militia: number;
    readonly shots: number;
  } {
    let shown = 0;
    let held = 0;
    let burdens = 0;
    for (const v of this.#bearers.live.values()) {
      if (!v.shown) continue;
      shown++;
      if (v.held) held++;
      if (v.burden) burdens++;
    }
    let militia = 0;
    let shots = 0; // since the battle began (posts never leave)
    for (const v of this.#militia.live.values()) {
      if (v.shown) militia++;
      shots += v.shots;
    }
    return { shown, held, burdens, militia, shots };
  }
}
