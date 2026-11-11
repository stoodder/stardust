// Big Glorp's puddles on the field (towers.md § 7, the Gloop Spitter's spec A; T705's minimal
// view, T730a in T740b's `fx.puddle`; puddleLook.ts has the rules). While a `puddle` zone lives, a
// pool of acid lies at its centre at its reach in `decal` (under the units), bubbling until its
// last half second and then drying through the sprite's frames. Read from the sim each frame, so it
// holds while paused. Each pool sits on even pixels, so overlapping pools share the dither's phase.
// The spit itself is ProjectileView's (`projectile.gloop_glob`, a lobbed glob), its landing
// TransientFx's green splat (gloopLook.ts). Allocation-free per frame: a fixed pool of images set
// up once, each frame's texture looked up once.
import type * as Phaser from 'phaser';
import type { DeepReadonly } from '../../shared/types.ts';
import type { Zone } from '../../sim/index.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { PUDDLE_SPRITE, puddleFrame, puddleScale, type PuddleFrame } from './puddleLook.ts';
import type { ViewContext } from './ViewContext.ts';

/** The zone pool as this view reads it. */
export interface PuddleZones {
  readonly used: number;
  readonly items: readonly DeepReadonly<Zone>[];
}

/** Puddles drawn at once: four Gloops' worth with a fire-rate bonus (three each live at 3 s). */
const MAX_PUDDLES = 16;
const FRAMES: readonly PuddleFrame[] = ['pool_0', 'pool_1', 'dry_0', 'dry_1', 'dry_2'];
const SPRITE = PUDDLE_SPRITE;

interface FrameRef {
  readonly texture: string;
  readonly frame: string;
}

const pos: Vec2 = { x: 0, y: 0 };
const evenPx = (v: number): number => Math.round(v / 2) * 2;

export class PuddleView {
  readonly #ctx: ViewContext;
  readonly #reducedMotion: () => boolean;
  readonly #pools: Phaser.GameObjects.Image[] = [];
  readonly #frames = new Map<PuddleFrame, FrameRef>();
  #shown = 0;
  #spawned = 0;
  /** The highest puddle uid seen (uids only grow, so a higher one is a new puddle). */
  #lastUid = 0;

  constructor(ctx: ViewContext, reducedMotion: () => boolean = () => false) {
    this.#ctx = ctx;
    this.#reducedMotion = reducedMotion;
    for (const f of FRAMES) {
      const ref = ctx.sprites.frame(SPRITE, f);
      this.#frames.set(f, { texture: ref.texture, frame: ref.frame });
    }
    const a = ctx.sprites.meta(SPRITE).anchor;
    for (let i = 0; i < MAX_PUDDLES; i++) {
      const img = ctx.scene.make.image({}, false).setVisible(false);
      const first = this.#frames.get('pool_0')!; // set above
      img.setTexture(first.texture, first.frame).setDisplayOrigin(a.x, a.y);
      ctx.layers.decal.add(img);
      this.#pools.push(img);
    }
  }

  /** Puddles showing now, and puddles seen since the battle began (the smoke flow's checks). */
  get shown(): { readonly puddles: number; readonly spawned: number } {
    return { puddles: this.#shown, spawned: this.#spawned };
  }

  /** Each frame: a pool on each live puddle, at sim tick `tick`. */
  update(zones: PuddleZones, tick = 0): void {
    let n = 0;
    let top = this.#lastUid;
    const still = this.#reducedMotion();
    for (let i = 0; i < zones.used && n < MAX_PUDDLES; i++) {
      const z = zones.items[i]!; // i < used ≤ items.length
      if (!z.alive || z.kind !== 'puddle') continue;
      if (z.uid > this.#lastUid) {
        this.#spawned++;
        if (z.uid > top) top = z.uid;
      }
      const name = puddleFrame(z.ticksLeft, tick, z.uid, still);
      if (name === null) continue;
      const img = this.#pools[n++]!; // n < MAX_PUDDLES
      const f = this.#frames.get(name)!; // every PuddleFrame is in FRAMES
      if (img.frame.name !== f.frame) img.setTexture(f.texture, f.frame);
      const scale = puddleScale(Math.sqrt(z.radiusSq));
      if (img.scaleX !== scale) img.setScale(scale);
      gridToScreen(z.x, z.y, this.#ctx.origin, pos);
      // Snapped to even pixels, so overlapping pools keep one dither phase (it stays a pool, not
      // a solid green blob where two lie over each other).
      img.setPosition(evenPx(pos.x), evenPx(pos.y)).setVisible(true);
    }
    this.#lastUid = top;
    this.#shown = n;
    for (; n < MAX_PUDDLES; n++) {
      const img = this.#pools[n]!; // n < MAX_PUDDLES
      if (img.visible) img.setVisible(false);
    }
  }

  reset(): void {
    for (const p of this.#pools) p.setVisible(false);
    this.#shown = 0;
    this.#spawned = 0;
    this.#lastUid = 0;
  }
}
