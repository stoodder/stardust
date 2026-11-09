// A pooled projectile. Straight shots draw in the `vfx` layer at their sim position; lobbed shells
// draw in the `air` layer on a parabolic arc over a ground shadow (art-direction §7, Explosive).
// The arc is cosmetic: the sim moves the shell's ground point; render only lifts it. A straight
// shot at a flyer (Skyhook's flak, D072) climbs from its muzzle's height to the flyer's (12 px up)
// along its flight, over its ground point. A seeker (Seeker Swarm's homing missile, T407b;
// vfx/specPixels.ts) climbs over its first ticks instead, turns along its flight, and trails smoke.
import * as Phaser from 'phaser';
import type { SpriteId } from '../../content/sprites/index.ts';
import { tintOf } from './holdMarker.ts';
import { worldDepth } from '../depth.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import { TRAIL_SAMPLE_TICKS, TRAIL_STEPS, dotImage, seekerLift } from '../vfx/specPixels.ts';
import { firstLook, spriteId } from './spriteInfo.ts';
import type { ViewContext } from './ViewContext.ts';
import type { PooledView } from './ViewPool.ts';

/** The projectile fields a view reads (a live sim Projectile satisfies it). */
export interface ProjectileLike {
  readonly x: number;
  readonly y: number;
  readonly ticksLeft: number;
  /** The shot's whole flight (ticks); a straight shot's climb follows it. */
  readonly flightTicks: number;
}

/** How a shot is drawn, from the firing tower's attack. */
export interface ShotLook {
  readonly sprite: string;
  /** Lobbed shells arc; 0 for straight shots. */
  readonly flightTicks: number;
  /** A straight shot's height (px) at its muzzle and at its target (flak climbs to a flyer). */
  readonly liftFrom?: number;
  readonly liftTo?: number;
  /**
   * A homing missile (T407b): it climbs from `liftFrom` to `liftTo` over its first ticks (its
   * flight has no fixed length), turns along its heading, and leaves a smoke trail.
   */
  readonly seeker?: boolean;
}

/** The trail's dot textures, by size. */
const DOT_KEYS = { 1: 'fx.trail.dot1', 2: 'fx.trail.dot2' } as const;

/** Peak height of a lobbed shell's arc, in pixels. */
const ARC_PEAK_PX = 18;

const pos: Vec2 = { x: 0, y: 0 };

export class ProjectileView implements PooledView {
  stamp = 0;
  readonly #ctx: ViewContext;
  readonly #body: Phaser.GameObjects.Sprite;
  readonly #shadow: Phaser.GameObjects.Image;
  #id: SpriteId | null = null;
  #uid = 0;
  #flightTicks = 0;
  #liftFrom = 0;
  #liftTo = 0;
  #seeker = false;
  /** A seeker's trail: its dots (made on first use), screen points newest first, the last sample. */
  readonly #trail: Phaser.GameObjects.Image[] = [];
  readonly #trailX: number[] = [];
  readonly #trailY: number[] = [];
  #trailN = 0;
  #sampledAge = 0;
  #prevX = Number.NaN;
  #prevY = Number.NaN;

  constructor(ctx: ViewContext) {
    this.#ctx = ctx;
    this.#body = ctx.scene.make.sprite({}, false);
    this.#shadow = ctx.scene.make.image({}, false);
    ctx.layers.decal.add(this.#shadow);
    this.release();
  }

  /** Whether it's a seeker with its trail laid (the smoke flows' check). */
  get trailing(): boolean {
    return this.#seeker && this.#trailN > 0;
  }

  show(uid: number, look: ShotLook): void {
    const { sprites, layers } = this.#ctx;
    this.#uid = uid;
    this.#id = spriteId(look.sprite);
    this.#flightTicks = look.flightTicks;
    this.#liftFrom = look.liftFrom ?? 0;
    this.#liftTo = look.liftTo ?? 0;
    this.#seeker = look.seeker === true;
    this.#trailN = 0;
    this.#sampledAge = 0;
    this.#prevX = Number.NaN;
    this.#prevY = Number.NaN;
    this.#body.setRotation(0);
    if (this.#seeker && this.#trail.length === 0) this.#makeTrail();
    const lobbed = look.flightTicks > 0;
    (lobbed ? layers.air : layers.vfx).add(this.#body);
    const meta = sprites.meta(this.#id);
    const look0 = firstLook(this.#id);
    const f = sprites.frame(this.#id, look0.frame);
    // Projectiles anchor at their center (tech-spec § Sprite anchoring).
    this.#body.setTexture(f.texture, f.frame).setDisplayOrigin(meta.anchor.x, meta.anchor.y);
    if (look0.anim !== null) this.#body.play(sprites.anim(this.#id, look0.anim));
    this.#body.setVisible(true);
    if (lobbed) {
      const s = sprites.frame('fx.shadow', 'small');
      const a = sprites.frameAnchor('fx.shadow', 'small');
      this.#shadow.setTexture(s.texture, s.frame).setDisplayOrigin(a.x, a.y).setVisible(true);
    }
  }

  sync(p: ProjectileLike): void {
    gridToScreen(p.x, p.y, this.#ctx.origin, pos);
    let lift = 0;
    if (this.#flightTicks > 0) {
      const t = Phaser.Math.Clamp(1 - p.ticksLeft / this.#flightTicks, 0, 1);
      lift = Math.round(4 * ARC_PEAK_PX * t * (1 - t));
      this.#shadow.setPosition(pos.x, pos.y);
      const depth = worldDepth(pos.y, 'enemy', this.#uid);
      if (this.#body.depth !== depth) this.#body.setDepth(depth);
    } else if (this.#seeker) {
      lift = seekerLift(p.flightTicks - p.ticksLeft, this.#liftFrom, this.#liftTo);
    } else if (this.#liftFrom !== 0 || this.#liftTo !== 0) {
      const t = p.flightTicks > 0 ? Phaser.Math.Clamp(1 - p.ticksLeft / p.flightTicks, 0, 1) : 1;
      lift = Math.round(this.#liftFrom + (this.#liftTo - this.#liftFrom) * t);
    }
    const x = pos.x;
    const y = pos.y - lift;
    this.#body.setPosition(x, y);
    if (this.#seeker) this.#syncSeeker(p.flightTicks - p.ticksLeft, x, y);
  }

  /** Turns the seeker along its heading and lays its trail (on sim ticks: a pause holds it). */
  #syncSeeker(age: number, x: number, y: number): void {
    const px = this.#prevX;
    const py = this.#prevY;
    if (!Number.isNaN(px) && (px !== x || py !== y)) {
      // The sprite's nose points up the screen.
      this.#body.setRotation(Math.atan2(y - py, x - px) + Math.PI / 2);
      if (age - this.#sampledAge >= TRAIL_SAMPLE_TICKS) {
        this.#sampledAge = age;
        // The newest point is where it was a frame ago, so the spark sits just behind it.
        for (let k = TRAIL_STEPS.length - 1; k > 0; k--) {
          this.#trailX[k] = this.#trailX[k - 1]!; // k − 1 < length
          this.#trailY[k] = this.#trailY[k - 1]!;
        }
        this.#trailX[0] = Math.round(px);
        this.#trailY[0] = Math.round(py);
        this.#trailN = Math.min(this.#trailN + 1, TRAIL_STEPS.length);
      }
    }
    this.#prevX = x;
    this.#prevY = y;
    for (let k = 0; k < this.#trail.length; k++) {
      const dot = this.#trail[k]!; // k < length
      if (k >= this.#trailN) {
        dot.setVisible(false);
        continue;
      }
      dot.setPosition(this.#trailX[k], this.#trailY[k]).setVisible(true); // k < trailN
    }
  }

  /** The trail's dots, one per TRAIL_STEPS entry (added before the body, so drawn under it). */
  #makeTrail(): void {
    const { scene, layers } = this.#ctx;
    for (const size of [1, 2] as const) {
      if (!scene.textures.exists(DOT_KEYS[size])) {
        scene.textures.addCanvas(DOT_KEYS[size], imageToCanvas(dotImage(size)));
      }
    }
    for (const step of TRAIL_STEPS) {
      const dot = scene.make.image({}, false).setTexture(DOT_KEYS[step.size]);
      dot.setOrigin(0.5, 0.5).setTint(tintOf(step.color)).setAlpha(step.alpha).setVisible(false);
      layers.vfx.add(dot);
      this.#trail.push(dot);
      this.#trailX.push(0);
      this.#trailY.push(0);
    }
  }

  release(): void {
    this.#uid = 0;
    this.#id = null;
    this.#body.stop();
    this.#body.setVisible(false);
    this.#shadow.setVisible(false);
    this.#seeker = false;
    this.#trailN = 0;
    for (const dot of this.#trail) dot.setVisible(false);
  }
}
