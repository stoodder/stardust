// Underfoot's trap (core-loop.md § 3.2; T604): the minimal readable view (T630a polishes it; T631
// draws the aim). While a `trap` zone lives, a moss-green ring holds on its path tile in `decal`
// (a half-tile ring over a 1 px `ink.0` under-stroke, so it reads on any road), blinking at 4 Hz
// in its last second (held lit under reduced motion) so the end is no surprise. Each time it
// springs (a new pair in the sim's `trapSprung`), a quick green ring bursts from the tile (FxView's
// effect ring). Read from the sim each frame, so it holds while paused. Allocation-free per frame:
// a fixed pool of ring images, set up once.
import type * as Phaser from 'phaser';
import { TICK_HZ } from '../../shared/time.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import type { Zone } from '../../sim/index.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { effectRingTexture } from '../vfx/overlayTextures.ts';
import type { ViewContext } from './ViewContext.ts';

/** The zone pool as this view reads it. */
export interface TrapZones {
  readonly used: number;
  readonly items: readonly DeepReadonly<Zone>[];
}

/** Where a spring's burst goes (FxView's effect ring). */
export interface TrapFx {
  ring(
    x: number,
    y: number,
    radiusTiles: number,
    color: 'green.4',
    ms: number,
    grow: boolean,
  ): void;
}

/** Underfoot is one slot's: two at once is plenty (a Ready Room recast). */
const MAX_TRAPS = 2;
const RING_TILES = 0.5;
const RING_COLOR = 'green.3';
const RING_UNDER = 'ink.0';
const BURST_TILES = 0.75;
const BURST_MS = 300;
/** The last second blinks at 4 Hz. */
const WARN_TICKS = TICK_HZ;
const BLINK_TICKS = TICK_HZ / 8;

const pos: Vec2 = { x: 0, y: 0 };

export class TrapView {
  readonly #ctx: ViewContext;
  readonly #fx: TrapFx;
  readonly #reducedMotion: () => boolean;
  readonly #rings: Phaser.GameObjects.Image[] = [];
  /** How many pairs `trapSprung` held last frame. */
  #pairs = 0;
  #shown = 0;
  #sprung = 0;

  constructor(ctx: ViewContext, fx: TrapFx, reducedMotion: () => boolean = () => false) {
    this.#ctx = ctx;
    this.#fx = fx;
    this.#reducedMotion = reducedMotion;
    const tex = effectRingTexture(ctx.scene, RING_TILES, RING_COLOR, RING_UNDER);
    for (let i = 0; i < MAX_TRAPS; i++) {
      const ring = ctx.scene.make.image({}, false).setVisible(false);
      ring.setTexture(tex.key).setDisplayOrigin(tex.ox, tex.oy);
      ctx.layers.decal.add(ring);
      this.#rings.push(ring);
    }
  }

  /** Traps showing now, and springs seen since the battle began (the smoke flow's checks). */
  get shown(): { readonly traps: number; readonly sprung: number } {
    return { traps: this.#shown, sprung: this.#sprung };
  }

  /** Each frame: a ring on each live trap's tile; a burst for each new spring. */
  update(zones: TrapZones, sprung: readonly number[]): void {
    let n = 0;
    for (let i = 0; i < zones.used && n < MAX_TRAPS; i++) {
      const z = zones.items[i]!; // i < used ≤ items.length
      if (!z.alive || z.kind !== 'trap') continue;
      const ring = this.#rings[n++]!; // n < MAX_TRAPS
      gridToScreen(z.x, z.y, this.#ctx.origin, pos);
      const blinkOff =
        !this.#reducedMotion() &&
        z.ticksLeft <= WARN_TICKS &&
        Math.floor(z.ticksLeft / BLINK_TICKS) % 2 === 1;
      ring.setPosition(Math.round(pos.x), Math.round(pos.y)).setVisible(!blinkOff);
    }
    this.#shown = n;
    for (; n < MAX_TRAPS; n++) {
      const ring = this.#rings[n]!; // n < MAX_TRAPS
      if (ring.visible) ring.setVisible(false);
    }
    // New springs: the pairs past last frame's count (an expired trap's pairs are pruned).
    if (sprung.length < this.#pairs) this.#pairs = 0;
    for (let k = this.#pairs; k + 1 < sprung.length; k += 2) {
      const z = zoneByUid(zones, sprung[k]!); // k < length
      this.#sprung++;
      if (z !== null) this.#fx.ring(z.x, z.y, BURST_TILES, 'green.4', BURST_MS, true);
    }
    this.#pairs = sprung.length;
  }

  reset(): void {
    for (const r of this.#rings) r.setVisible(false);
    this.#pairs = 0;
    this.#shown = 0;
    this.#sprung = 0;
  }
}

function zoneByUid(zones: TrapZones, uid: number): DeepReadonly<Zone> | null {
  for (let i = 0; i < zones.used; i++) {
    const z = zones.items[i]!; // i < used ≤ items.length
    if (z.alive && z.uid === uid) return z;
  }
  return null;
}
