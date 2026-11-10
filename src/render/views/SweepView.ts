// Scanner Sweep's circle (T406; core-loop.md § 3.2): while a `reveal` zone lives, a `green.4` ring
// at its real radius (ink under-stroke, so it reads on light ground) lies on the ground in the
// `decal` layer, under the actors it reveals; a ring sweeps out to it when the zone opens (the ping:
// a shape, so color is never the only signal). It holds while paused (it follows the sim zone) and
// fades on the stepped ladder over its last second, on sim ticks (vfx/fxTiming.ts `sweepAlpha`).
// Aiming it (T431) previews its own circle where it would land, not the strike's reticle: the same
// green ring at the aim alpha over a faint green disc, held still (a scan area, not a countdown).
// Allocation-free per frame.
import * as Phaser from 'phaser';
import { TICK_HZ } from '../../shared/time.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { sweepAlpha } from '../vfx/fxTiming.ts';
import { discTexture, effectRingTexture } from '../vfx/overlayTextures.ts';
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
/** The aim preview's ring alpha (over the strike reticle's 0.6, to read on green) and fill. */
const AIM_ALPHA = 0.8;
const AIM_FILL_ALPHA = 0.25;

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
  /** The aim preview: its ring and fill, and the radius they were textured for (−1: hidden). */
  readonly #aimRing: Phaser.GameObjects.Image;
  readonly #aimFill: Phaser.GameObjects.Image;
  #aimRadius = -1;

  constructor(ctx: ViewContext, fx: TransientFx) {
    this.#ctx = ctx;
    this.#fx = fx;
    this.#aimFill = ctx.scene.make.image({}, false).setVisible(false);
    this.#aimRing = ctx.scene.make.image({}, false).setVisible(false).setAlpha(AIM_ALPHA);
    ctx.layers.decal.add([this.#aimFill, this.#aimRing]);
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

  /**
   * The aim preview on tile (col, row) at `radiusTiles` while the player aims a sweep; col < 0
   * hides it. Re-textured only when the radius changes.
   */
  setAim(col: number, row: number, radiusTiles: number): void {
    if (col < 0 || radiusTiles <= 0) {
      if (this.#aimRing.visible) {
        this.#aimRing.setVisible(false);
        this.#aimFill.setVisible(false);
      }
      return;
    }
    const scene = this.#ctx.scene;
    if (radiusTiles !== this.#aimRadius) {
      this.#aimRadius = radiusTiles;
      const ring = effectRingTexture(scene, radiusTiles, SWEEP_COLOR, 'ink.0');
      this.#aimRing.setTexture(ring.key).setDisplayOrigin(ring.ox, ring.oy);
      const fill = discTexture(scene, radiusTiles, SWEEP_COLOR, AIM_FILL_ALPHA);
      this.#aimFill.setTexture(fill.key).setDisplayOrigin(fill.ox, fill.oy);
    }
    gridToScreen(col + 0.5, row + 0.5, this.#ctx.origin, pos);
    this.#aimRing.setPosition(pos.x, pos.y).setVisible(true);
    this.#aimFill.setPosition(pos.x, pos.y).setVisible(true);
  }

  /** Whether the aim preview shows (the smoke hooks' view of it). */
  get aiming(): boolean {
    return this.#aimRing.visible;
  }

  reset(): void {
    for (const s of this.#sweeps) this.#free(s);
    this.setAim(-1, 0, 0);
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
