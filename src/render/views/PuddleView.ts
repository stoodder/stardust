// Big Glorp's puddles on the field (towers.md § 7, the Gloop Spitter's spec A; T705's minimal
// readable view, polished by T730a; puddleLook.ts has the rules). While a `puddle` zone lives, a
// pool of acid lies at its centre at its reach in `decal` (under the units), whole until its last
// half second and then drying in steps. Read from the sim each frame, so it holds while paused.
// The spit itself is ProjectileView's (`projectile.gloop_glob`, a lobbed glob). Allocation-free
// per frame: a fixed pool of images set up once; each texture (snapped radius) registered once.
import type * as Phaser from 'phaser';
import type { DeepReadonly } from '../../shared/types.ts';
import type { Zone } from '../../sim/index.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import { puddleAlpha, puddleImage, puddleKey } from './puddleLook.ts';
import type { ViewContext } from './ViewContext.ts';

/** The zone pool as this view reads it. */
export interface PuddleZones {
  readonly used: number;
  readonly items: readonly DeepReadonly<Zone>[];
}

/** Puddles drawn at once: four Gloops' worth with a fire-rate bonus (three each live at 3 s). */
const MAX_PUDDLES = 16;

const pos: Vec2 = { x: 0, y: 0 };

export class PuddleView {
  readonly #ctx: ViewContext;
  readonly #reducedMotion: () => boolean;
  readonly #pools: Phaser.GameObjects.Image[] = [];
  #shown = 0;
  #spawned = 0;
  /** The highest puddle uid seen (uids only grow, so a higher one is a new puddle). */
  #lastUid = 0;

  constructor(ctx: ViewContext, reducedMotion: () => boolean = () => false) {
    this.#ctx = ctx;
    this.#reducedMotion = reducedMotion;
    for (let i = 0; i < MAX_PUDDLES; i++) {
      const img = ctx.scene.make.image({}, false).setVisible(false);
      ctx.layers.decal.add(img);
      this.#pools.push(img);
    }
  }

  /** Puddles showing now, and puddles seen since the battle began (the smoke flow's checks). */
  get shown(): { readonly puddles: number; readonly spawned: number } {
    return { puddles: this.#shown, spawned: this.#spawned };
  }

  /** Each frame: a pool on each live puddle. */
  update(zones: PuddleZones): void {
    let n = 0;
    let top = this.#lastUid;
    for (let i = 0; i < zones.used && n < MAX_PUDDLES; i++) {
      const z = zones.items[i]!; // i < used ≤ items.length
      if (!z.alive || z.kind !== 'puddle') continue;
      if (z.uid > this.#lastUid) {
        this.#spawned++;
        if (z.uid > top) top = z.uid;
      }
      const img = this.#pools[n++]!; // n < MAX_PUDDLES
      const radius = Math.sqrt(z.radiusSq);
      const key = puddleKey(radius);
      if (!this.#ctx.scene.textures.exists(key)) {
        const baked = puddleImage(radius);
        this.#ctx.scene.textures.addCanvas(key, imageToCanvas(baked.image));
        img.setTexture(key).setDisplayOrigin(baked.cx, baked.cy);
      } else if (img.texture.key !== key) {
        const frame = this.#ctx.scene.textures.getFrame(key);
        img.setTexture(key).setDisplayOrigin((frame.width - 1) / 2, (frame.height - 1) / 2);
      }
      gridToScreen(z.x, z.y, this.#ctx.origin, pos);
      const alpha = puddleAlpha(z.ticksLeft, this.#reducedMotion());
      img
        .setPosition(Math.round(pos.x), Math.round(pos.y))
        .setAlpha(alpha)
        .setVisible(alpha > 0);
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
