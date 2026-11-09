// Scanner Sweep's circle (T406; core-loop.md § 3.2): while a `reveal` zone lives, a `green.4` ring
// at its real radius (ink under-stroke, so it reads on light ground) lies on the ground in the
// `decal` layer, under the actors it reveals; a ring sweeps out to it when the zone opens (the ping:
// a shape, so color is never the only signal). It holds while paused (it follows the sim zone) and
// fades on the stepped ladder over its last second, on sim ticks (vfx/fxTiming.ts `sweepAlpha`).
// A minimal readable view: T431 owns the aim polish and T430a the cloak art. Allocation-free per
// frame.
import * as Phaser from 'phaser';
import { TICK_HZ } from '../../shared/time.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { sweepAlpha } from '../vfx/fxTiming.ts';
import { effectRingTexture } from '../vfx/overlayTextures.ts';
import type { ZonePoolLike } from './FxView.ts';
import type { TransientFx } from './TransientFx.ts';
import type { ViewContext } from './ViewContext.ts';

/** Live sweeps drawn at once (a 30 s cooldown and a 10 s zone: one, plus a Ready Room recast). */
const MAX_SWEEPS = 2;
/** The sweep's colour: detection green, distinct from Time Dilation's teal. */
const SWEEP_COLOR = 'green.4';
/** The opening ping's duration. */
const PING_MS = 450;
/** The ring fades (stepped) over the zone's last second. */
const FADE_TICKS = TICK_HZ;

/** One sweep's ring and the sim zone it follows. */
interface Sweep {
  readonly ring: Phaser.GameObjects.Image;
  uid: number;
}

/** Scratch for screen positions. */
const pos: Vec2 = { x: 0, y: 0 };

export class SweepView {
  readonly #ctx: ViewContext;
  readonly #fx: TransientFx;
  readonly #sweeps: Sweep[] = [];

  constructor(ctx: ViewContext, fx: TransientFx) {
    this.#ctx = ctx;
    this.#fx = fx;
    for (let i = 0; i < MAX_SWEEPS; i++) {
      const ring = ctx.scene.make.image({}, false).setVisible(false);
      ctx.layers.decal.add(ring);
      this.#sweeps.push({ ring, uid: 0 });
    }
  }

  update(zones: ZonePoolLike): void {
    for (const s of this.#sweeps) {
      if (s.uid !== 0 && !this.#alive(zones, s.uid)) this.#free(s);
    }
    for (let i = 0; i < zones.used; i++) {
      const z = zones.items[i]!; // i < used ≤ items.length
      if (!z.alive || z.kind !== 'reveal') continue;
      let s = this.#sweeps.find((k) => k.uid === z.uid);
      if (s === undefined) {
        s = this.#sweeps.find((k) => k.uid === 0) ?? this.#sweeps[0]!; // MAX_SWEEPS > 0
        this.#open(s, z.uid, z.x, z.y, Math.sqrt(z.radiusSq));
      }
      s.ring.setAlpha(sweepAlpha(z.ticksLeft, FADE_TICKS));
    }
  }

  reset(): void {
    for (const s of this.#sweeps) this.#free(s);
  }

  #open(s: Sweep, uid: number, x: number, y: number, radiusTiles: number): void {
    const tex = effectRingTexture(this.#ctx.scene, radiusTiles, SWEEP_COLOR, 'ink.0');
    gridToScreen(x, y, this.#ctx.origin, pos);
    s.uid = uid;
    s.ring.setTexture(tex.key).setDisplayOrigin(tex.ox, tex.oy).setPosition(pos.x, pos.y);
    s.ring.setVisible(true);
    this.#fx.ring(x, y, radiusTiles, SWEEP_COLOR, PING_MS, true);
  }

  #free(s: Sweep): void {
    s.uid = 0;
    s.ring.setVisible(false);
  }

  #alive(zones: ZonePoolLike, uid: number): boolean {
    for (let i = 0; i < zones.used; i++) {
      const z = zones.items[i]!; // i < used ≤ items.length
      if (z.alive && z.uid === uid) return true;
    }
    return false;
  }
}
