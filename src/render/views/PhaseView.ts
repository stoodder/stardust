// Phasing's minimal view (T503; art-direction §8's `phasing` tell, `teal.4`; phaseLook.ts has the
// rules): a broken (dashed) `teal.4` ring on the ground under each unit in its phase tell, stepping
// with the tell, and steady under a Phased one, so the player sees a Rift Moth is about to vanish
// from its towers' reach and when it can be hit again. A flyer's ring sits at its ground point,
// under its shadow. As it phases a small `teal.4` ring pops where it is. The body itself flickers
// and goes ghostly in EnemyView (phaseLook.ts `phaseDithered`, `phaseAlpha`). T530a polishes it.
// Allocation-free per frame: a fixed pool of ring images in `decal`.
import type * as Phaser from 'phaser';
import type { IdSpace } from '../../content/types.ts';
import type { Bus } from '../../shared/bus.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import type { Enemy, SimEvent } from '../../sim/index.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import { ringImage, snapRingRadius } from '../vfx/overlayPixels.ts';
import { PHASE_RING_COLOR, phaseRingAlpha, phaseState } from './phaseLook.ts';
import type { TransientFx } from './TransientFx.ts';
import type { ViewContext } from './ViewContext.ts';

/** The enemy pool as the phase view reads it. */
export interface PhasePool {
  readonly used: number;
  readonly items: readonly DeepReadonly<Enemy>[];
}

const MAX_RINGS = 12;
const RING_TILES = 0.5;
const POP_TILES = 0.5;
const POP_MS = 220;

const pos: Vec2 = { x: 0, y: 0 };

/** The broken ring's texture (dashed `teal.4` over an `ink.0` under-stroke), registered once. */
function brokenRing(scene: Phaser.Scene): { key: string; ox: number; oy: number } {
  const r = snapRingRadius(RING_TILES);
  const ring = ringImage(r, PHASE_RING_COLOR, true, 'ink.0');
  const key = `fx.phase_ring.${r}`;
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, imageToCanvas(ring.image));
  return { key, ox: ring.cx, oy: ring.cy };
}

export class PhaseView {
  readonly #ctx: ViewContext;
  readonly #fx: TransientFx;
  readonly #reducedMotion: () => boolean;
  readonly #rings: Phaser.GameObjects.Image[] = [];
  #telling = 0;
  #phased = 0;
  /** Units seen phasing in since the view was made (the smoke flow's check). */
  phasedIn = 0;

  constructor(ctx: ViewContext, fx: TransientFx, reducedMotion: () => boolean) {
    this.#ctx = ctx;
    this.#fx = fx;
    this.#reducedMotion = reducedMotion;
    const tex = brokenRing(ctx.scene);
    for (let i = 0; i < MAX_RINGS; i++) {
      const ring = ctx.scene.make.image({}, false).setVisible(false);
      ring.setTexture(tex.key).setDisplayOrigin(tex.ox, tex.oy);
      ctx.layers.decal.add(ring);
      this.#rings.push(ring);
    }
  }

  /** Subscribes to PhaseShift (the pop as a unit phases). Returns the off. */
  bind(bus: Bus<SimEvent<IdSpace>>): () => void {
    return bus.on('PhaseShift', (ev) => {
      if (ev.phase !== 'in') return;
      this.phasedIn++;
      this.#fx.ring(ev.x, ev.y, POP_TILES, PHASE_RING_COLOR, POP_MS, true);
    });
  }

  /** Each frame: a ring under each unit telling or Phased. */
  update(enemies: PhasePool): void {
    const reduced = this.#reducedMotion();
    let n = 0;
    let telling = 0;
    let phased = 0;
    for (let i = 0; i < enemies.used && n < MAX_RINGS; i++) {
      const e = enemies.items[i]!; // i < used ≤ items.length
      if (!e.alive || e.def === null || e.def.phase === null) continue;
      const s = phaseState(e);
      if (s === 'solid') continue;
      if (s === 'tell') telling++;
      else phased++;
      const ring = this.#rings[n++]!; // n < MAX_RINGS
      gridToScreen(e.x, e.y, this.#ctx.origin, pos);
      ring
        .setPosition(Math.round(pos.x), Math.round(pos.y))
        .setAlpha(phaseRingAlpha(e, reduced))
        .setVisible(true);
    }
    for (; n < MAX_RINGS; n++) {
      const ring = this.#rings[n]!; // n < MAX_RINGS
      if (ring.visible) ring.setVisible(false);
    }
    this.#telling = telling;
    this.#phased = phased;
  }

  /** Rings showing a tell, and under Phased units (the smoke flow's check). */
  get shown(): { readonly tells: number; readonly phased: number } {
    return { tells: this.#telling, phased: this.#phased };
  }

  reset(): void {
    for (const r of this.#rings) r.setVisible(false);
    this.#telling = 0;
    this.#phased = 0;
  }
}
