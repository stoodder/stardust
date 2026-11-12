// Thrum's echo (T830; design/maps.md § 5.5, `spared_quiet_wave = false`; sim/echo.ts; the look is
// echoLook.ts): each live ally of kind `echo` drawn as `fx.echo` in `world` (sorted in front of the
// Unsung she drifts out of), grey as it drifts in
// toward the choir, warming gold where the song takes it, then rising and fading. It reads sim
// state only (its position and `restTicks`), so it holds while paused. One pooled sprite per echo;
// nothing allocates per frame.
import type * as Phaser from 'phaser';
import type { DeepReadonly } from '../../shared/types.ts';
import type { Ally } from '../../sim/index.ts';
import { worldDepth } from '../depth.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { DEFAULT_VARIANT } from '../sprites/bake.ts';
import { ECHO_SPRITE, echoLook, echoRiseAt, type EchoLook } from './echoLook.ts';
import { facingOf, type Facing } from './spriteInfo.ts';
import type { ViewContext } from './ViewContext.ts';
import { ViewPool, type PooledView } from './ViewPool.ts';

/** The allies pool as this view reads it. */
export interface EchoPool {
  readonly used: number;
  readonly items: readonly DeepReadonly<Ally>[];
}

const pos: Vec2 = { x: 0, y: 0 };
/** She drifts out of the Unsung, in front of it: her sort depth is this far (px) nearer. */
const FRONT_PX = 40;
const rise = { lift: 0, alpha: 1 };

class OneEcho implements PooledView {
  stamp = 0;
  readonly #ctx: ViewContext;
  readonly #body: Phaser.GameObjects.Sprite;
  #uid = 0;
  #x = Number.NaN;
  #y = Number.NaN;
  #facing: Facing = 'se';
  look: EchoLook = 'walk';

  constructor(ctx: ViewContext) {
    this.#ctx = ctx;
    this.#body = ctx.scene.make.sprite({}, false);
    ctx.layers.world.add(this.#body);
    this.release();
  }

  show(uid: number): void {
    this.#uid = uid;
    this.#x = Number.NaN;
    this.#y = Number.NaN;
    this.#facing = 'se';
    this.look = 'walk';
    this.#body.setAlpha(1).setVisible(true);
    this.#play();
  }

  sync(a: DeepReadonly<Ally>, still: boolean): void {
    let facing = this.#facing;
    const moved = a.x !== this.#x || a.y !== this.#y;
    if (moved && !Number.isNaN(this.#x)) facing = facingOf(a.x - this.#x, a.y - this.#y);
    const look = echoLook(a.restTicks);
    if (look !== this.look || facing !== this.#facing) {
      // The warm plays once into the rise (chained): a change of look past it doesn't restart it.
      const restart = !(this.look === 'warm' && look === 'rise' && facing === this.#facing);
      this.look = look;
      this.#facing = facing;
      if (restart) this.#play();
    }
    this.#x = a.x;
    this.#y = a.y;
    echoRiseAt(a.restTicks, still, rise);
    gridToScreen(a.x, a.y, this.#ctx.origin, pos);
    this.#body
      .setPosition(Math.round(pos.x), Math.round(pos.y) - rise.lift)
      .setAlpha(rise.alpha)
      .setDepth(worldDepth(pos.y + FRONT_PX, 'enemy', this.#uid));
    if (still && this.look !== 'walk' && this.#body.anims.isPlaying) this.#body.anims.pause();
  }

  release(): void {
    this.#uid = 0;
    this.#body.stop();
    this.#body.setVisible(false);
  }

  #play(): void {
    const sprites = this.#ctx.sprites;
    const key = `${this.look}_${this.#facing}`;
    this.#body.play(sprites.anim(ECHO_SPRITE, key, DEFAULT_VARIANT));
    if (this.look === 'warm') {
      this.#body.chain(sprites.anim(ECHO_SPRITE, `rise_${this.#facing}`, DEFAULT_VARIANT));
    }
    const a = sprites.frameAnchor(ECHO_SPRITE, `${key}_0`);
    this.#body.setDisplayOrigin(a.x, a.y);
  }
}

/** Every echo on the field, synced each frame (BattleScene). */
export class EchoView {
  readonly #pool: ViewPool<OneEcho>;
  readonly #still: () => boolean;
  /** Echoes that arrived in the song this battle (the smoke flow's check). */
  arrivedSeen = 0;

  constructor(ctx: ViewContext, reducedMotion: () => boolean = () => false) {
    this.#pool = new ViewPool(() => new OneEcho(ctx));
    this.#still = reducedMotion;
  }

  update(allies: EchoPool, stamp: number): void {
    const still = this.#still();
    for (let i = 0; i < allies.used; i++) {
      const a = allies.items[i]!; // i < used ≤ items.length
      if (!a.alive || a.kind !== 'echo') continue;
      let v = this.#pool.get(a.uid);
      if (v === undefined) {
        v = this.#pool.acquire(a.uid);
        v.show(a.uid);
      }
      v.stamp = stamp;
      const was = v.look;
      v.sync(a, still);
      if (was === 'walk' && v.look !== 'walk') this.arrivedSeen++;
    }
    this.#pool.sweep(stamp);
  }

  releaseAll(): void {
    this.#pool.releaseAll();
    this.arrivedSeen = 0;
  }

  /** The render-state hook's view: echoes drawn, by look. */
  get shown(): { walk: number; warm: number; rise: number } {
    const out = { walk: 0, warm: 0, rise: 0 };
    for (const v of this.#pool.live.values()) out[v.look]++;
    return out;
  }
}
