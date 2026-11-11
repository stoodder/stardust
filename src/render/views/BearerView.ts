// Bearers and militia (design/maps.md § 5.4; T706's minimal readable views; T730a polishes them,
// T740a draws `ally.bearer` and `ally.militia`):
// - **A bearer** (A3M5's Brood Haulers carrying the vats' dead home; sim/bearers.ts) walks its
//   route as a Brood Hauler in the `skitterkin.ally` palette, its sack on its back, with its
//   **burden** over the sack: a small cold-violet glow (`stardust.unsung`'s violet), breathing
//   slowly (still under reduced motion), so a bearer never reads as the Hauler enemy it was. One
//   still filing in (`dist` < 0) isn't drawn; one a Hollow unit is hushing freezes on its frame,
//   its burden dimmed. A hushed or home bearer's view goes with it (the sweep). Depth-sorted in
//   `world` like a refugee.
// - **Militia** (A3M6's colonist posts under `convoy`, a flag-gated post): a small colonist at its
//   post, drawn in pixels (a brass post plate, a steel coat, a rifle), with a brief tracer to its
//   target as it fires (its cooldown reset since the last frame). Depth-sorted with the towers.
import type * as Phaser from 'phaser';
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import type { SpriteId } from '../../content/sprites/index.ts';
import type { Ally } from '../../sim/index.ts';
import { worldDepth } from '../depth.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { facingOf, type Facing } from './spriteInfo.ts';
import type { ViewContext } from './ViewContext.ts';
import { ViewPool, type PooledView } from './ViewPool.ts';

/** A bearer's body (T740a replaces it with `ally.bearer`) and its palette. */
export const BEARER_SPRITE: SpriteId = 'enemy.brood_hauler';
export const BEARER_VARIANT = 'skitterkin.ally';
/** The burden's glow: where it sits over the sack (px from the ground point), its size, its cycle. */
const BURDEN_DY = -13;
const BURDEN_R = 2.5;
const BURDEN_CYCLE_MS = 1800;
/** A militia shot's tracer (ms). */
const TRACER_MS = 80;

/** Packs a master palette colour as Phaser's 0xRRGGBB. */
function hex(name: ColorName): number {
  const c = rgbOf(name);
  return (c.r << 16) | (c.g << 8) | c.b;
}
const BURDEN_CORE = hex('violet.4');
const BURDEN_HALO = hex('violet.3');

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

/** One bearer: its Hauler body and its burden. */
export class BearerView implements PooledView {
  stamp = 0;
  readonly #ctx: ViewContext;
  readonly #body: Phaser.GameObjects.Sprite;
  readonly #burden: Phaser.GameObjects.Graphics;
  readonly #still: () => boolean;
  #uid = 0;
  #facing: Facing = 'sw';
  #x = Number.NaN;
  #y = Number.NaN;
  #held = false;

  constructor(ctx: ViewContext, reducedMotion: () => boolean) {
    this.#ctx = ctx;
    this.#still = reducedMotion;
    this.#body = ctx.scene.make.sprite({}, false);
    this.#burden = ctx.scene.make.graphics({}, false);
    ctx.layers.world.add([this.#body, this.#burden]);
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
  /** Whether its burden shows (the readable difference from a Hauler enemy). */
  get burden(): boolean {
    return this.#burden.visible;
  }

  sync(a: BearerAlly, nowMs: number): void {
    if (a.dist < 0) {
      this.#body.setVisible(false);
      this.#burden.setVisible(false);
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
    }
    this.#body.setVisible(true);
    if (moved) {
      this.#x = a.x;
      this.#y = a.y;
      gridToScreen(a.x, a.y, this.#ctx.origin, pos);
      const depth = worldDepth(pos.y, 'enemy', this.#uid);
      this.#body.setPosition(pos.x, pos.y).setDepth(depth);
      this.#burden.setPosition(pos.x, pos.y + BURDEN_DY).setDepth(depth + 1e-5);
    }
    // The burden breathes (a slow sine), dimmed while a hush holds the bearer.
    const breath = this.#still()
      ? 0.5
      : 0.5 + 0.5 * Math.sin((nowMs / BURDEN_CYCLE_MS) * Math.PI * 2);
    const alpha = (held ? 0.35 : 0.7) + 0.3 * breath;
    const g = this.#burden;
    g.clear();
    g.fillStyle(BURDEN_HALO, 0.35 * alpha);
    g.fillCircle(0, 0, BURDEN_R + 1.5);
    g.fillStyle(BURDEN_CORE, alpha);
    g.fillCircle(0, 0, BURDEN_R);
    g.setVisible(true);
  }

  release(): void {
    this.#uid = 0;
    this.#body.stop();
    this.#body.setVisible(false);
    this.#burden.setVisible(false);
  }

  #play(): void {
    const { sprites } = this.#ctx;
    const anim = `walk_${this.#facing}`;
    this.#body.play(sprites.anim(BEARER_SPRITE, anim, BEARER_VARIANT), true);
    const a = sprites.frameAnchor(BEARER_SPRITE, `${anim}_0`);
    this.#body.setDisplayOrigin(a.x, a.y);
  }
}

/** One militia post: the colonist in pixels, and its tracer. */
export class MilitiaView implements PooledView {
  stamp = 0;
  readonly #ctx: ViewContext;
  readonly #body: Phaser.GameObjects.Graphics;
  readonly #tracer: Phaser.GameObjects.Graphics;
  #tracerUntil = 0;
  #cooldown = 0;
  shots = 0;

  constructor(ctx: ViewContext) {
    this.#ctx = ctx;
    this.#body = ctx.scene.make.graphics({}, false);
    this.#tracer = ctx.scene.make.graphics({}, false);
    ctx.layers.world.add(this.#body);
    ctx.layers.vfx.add(this.#tracer);
    this.release();
  }

  show(uid: number, x: number, y: number): void {
    gridToScreen(x, y, this.#ctx.origin, pos);
    const g = this.#body;
    g.clear();
    // The post plate, the colonist (coat, head, a helmet's brim), the rifle across.
    g.fillStyle(hex('brass.1'), 1).fillEllipse(0, 0, 14, 6);
    g.fillStyle(hex('steel.1'), 1).fillRect(-3, -11, 6, 10);
    g.fillStyle(hex('skin.b.3'), 1).fillRect(-2, -15, 4, 4);
    g.fillStyle(hex('steel.3'), 1).fillRect(-3, -16, 6, 2);
    g.fillStyle(hex('grime.3'), 1).fillRect(-6, -8, 12, 2);
    g.setPosition(pos.x, pos.y)
      .setDepth(worldDepth(pos.y, 'tower', uid))
      .setVisible(true);
    this.#tracer.setVisible(false);
    this.#tracerUntil = 0;
    this.#cooldown = 0;
    this.shots = 0;
  }

  get shown(): boolean {
    return this.#body.visible;
  }

  /**
   * Draws a tracer when it fired since the last frame (its cooldown reset upward: frames can skip
   * ticks) and fades it out.
   */
  sync(a: BearerAlly, world: BearerWorld, nowMs: number): void {
    const fired = a.cooldownTicks > this.#cooldown;
    this.#cooldown = a.cooldownTicks;
    if (fired && a.targetUid !== 0) {
      const t = findEnemy(world, a.targetUid);
      if (t !== null) {
        gridToScreen(a.x, a.y, this.#ctx.origin, pos);
        gridToScreen(t.x, t.y, this.#ctx.origin, aim);
        const g = this.#tracer;
        g.clear();
        g.lineStyle(1, hex('gold.4'), 1);
        g.lineBetween(pos.x + 5, pos.y - 9, aim.x, aim.y - 6);
        g.setVisible(true);
        this.#tracerUntil = nowMs + TRACER_MS;
        this.shots++;
      }
    }
    if (this.#tracer.visible && nowMs >= this.#tracerUntil) this.#tracer.setVisible(false);
  }

  release(): void {
    this.#body.setVisible(false);
    this.#tracer.setVisible(false);
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
    this.#bearers = new ViewPool(() => new BearerView(ctx, reducedMotion));
    this.#militia = new ViewPool(() => new MilitiaView(ctx));
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
        v.sync(a, nowMs);
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
