// A pooled projectile. Straight shots draw in the `vfx` layer at their sim position; lobbed shells
// draw in the `air` layer on a parabolic arc over a ground shadow (art-direction §7, Explosive).
// The arc is cosmetic: the sim moves the shell's ground point; render only lifts it.
import * as Phaser from 'phaser';
import type { SpriteId } from '../../content/sprites/index.ts';
import { worldDepth } from '../depth.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { firstLook, spriteId } from './spriteInfo.ts';
import type { ViewContext } from './ViewContext.ts';
import type { PooledView } from './ViewPool.ts';

/** The projectile fields a view reads (a live sim Projectile satisfies it). */
export interface ProjectileLike {
  readonly x: number;
  readonly y: number;
  readonly ticksLeft: number;
}

/** How a shot is drawn, from the firing tower's attack. */
export interface ShotLook {
  readonly sprite: string;
  /** Lobbed shells arc; 0 for straight shots. */
  readonly flightTicks: number;
}

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

  constructor(ctx: ViewContext) {
    this.#ctx = ctx;
    this.#body = ctx.scene.make.sprite({}, false);
    this.#shadow = ctx.scene.make.image({}, false);
    ctx.layers.decal.add(this.#shadow);
    this.release();
  }

  show(uid: number, look: ShotLook): void {
    const { sprites, layers } = this.#ctx;
    this.#uid = uid;
    this.#id = spriteId(look.sprite);
    this.#flightTicks = look.flightTicks;
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
    }
    this.#body.setPosition(pos.x, pos.y - lift);
  }

  release(): void {
    this.#uid = 0;
    this.#id = null;
    this.#body.stop();
    this.#body.setVisible(false);
    this.#shadow.setVisible(false);
  }
}
