// The Auditor's ring, minimal (T707; takeoverLook.ts has the rules; T730a polishes it): each
// Auditor ringing shows the whole reach it will jam as a faint outline from the tell's first tick
// and an orange ring growing out to it, redrawn each frame into one Graphics on the vfx layer
// (over the towers it reaches). The jams themselves show as JamView's static and arc.
// Allocation-free per frame: the scratch points are module-level, the Graphics redraws in place.
import type * as Phaser from 'phaser';
import type { IdSpace } from '../../content/types.ts';
import type { Bus } from '../../shared/bus.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import { ringGrowth, ringTelling, type Enemy, type SimEvent } from '../../sim/index.ts';
import { gridToScreen, rangeEllipsePx, type Vec2 } from '../iso.ts';
import { hexOf } from './jamLook.ts';
import { RING_COLOR, RING_OUTLINE, ringAlpha, ringTiles, UNDER } from './takeoverLook.ts';
import type { ViewContext } from './ViewContext.ts';

interface Pool<T> {
  readonly used: number;
  readonly items: readonly DeepReadonly<T>[];
}

const RING = hexOf(RING_COLOR);
const OUTLINE = hexOf(RING_OUTLINE);
const INK = hexOf(UNDER);
const at: Vec2 = { x: 0, y: 0 };
const semi: Vec2 = { x: 0, y: 0 };

export class JamRingView {
  readonly #ctx: ViewContext;
  readonly #reducedMotion: () => boolean;
  readonly #g: Phaser.GameObjects.Graphics;
  #rings = 0;
  /** Ring tells seen since the view was made (smoke's check). */
  ringsSeen = 0;

  constructor(ctx: ViewContext, reducedMotion: () => boolean) {
    this.#ctx = ctx;
    this.#reducedMotion = reducedMotion;
    this.#g = ctx.scene.make.graphics({}, false);
    ctx.layers.vfx.add(this.#g);
  }

  /** Counts the ring tells. Returns the off. */
  bind(bus: Bus<SimEvent<IdSpace>>): () => void {
    return bus.on('JamTell', (ev) => {
      if (ev.kind === 'ring') this.ringsSeen++;
    });
  }

  /** Each frame: every Auditor's ring under way. */
  update(enemies: Pool<Enemy>): void {
    const g = this.#g;
    g.clear();
    const still = this.#reducedMotion();
    let rings = 0;
    for (let i = 0; i < enemies.used; i++) {
      const e = enemies.items[i]!; // i < used ≤ items.length
      if (!ringTelling(e)) continue;
      const reach = e.def!.jam!.radiusTiles; // ringTelling: a ring jammer
      const growth = ringGrowth(e);
      gridToScreen(e.x, e.y, this.#ctx.origin, at);
      rangeEllipsePx(reach, semi);
      g.lineStyle(1, OUTLINE, 0.75).strokeEllipse(at.x, at.y, semi.x * 2, semi.y * 2);
      rangeEllipsePx(ringTiles(growth, reach, still), semi);
      const alpha = ringAlpha(growth);
      g.lineStyle(4, INK, 0.6 * alpha).strokeEllipse(at.x, at.y, semi.x * 2, semi.y * 2);
      g.lineStyle(2, RING, alpha).strokeEllipse(at.x, at.y, semi.x * 2, semi.y * 2);
      rings++;
    }
    this.#rings = rings;
  }

  /** Rings drawn now (the smoke flow's check). */
  get shown(): number {
    return this.#rings;
  }

  reset(): void {
    this.#g.clear();
    this.#rings = 0;
  }
}
