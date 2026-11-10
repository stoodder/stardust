// Phasing's view (T503; art-direction §8's `phasing` tell, `teal.4`; phaseLook.ts has the rules;
// T530a's polish): a broken (dashed) `teal.4` ring on the ground under each unit in its phase
// tell, stepping with the tell, and steady under a Phased one, so the player sees a Rift Moth is
// about to vanish from its towers' reach and when it can be hit again. The ring sits under the
// body as EnemyView draws it (its lane offset; a flyer's at its ground point, under its shadow;
// unitAnchor.ts). As it phases a small `teal.4` ring pops where it is, and as it comes back
// (solid, hittable again) a small `white.1` one. The body itself flickers and goes ghostly in
// EnemyView (phaseLook.ts `phaseDithered`, `phaseAlpha`), folded into the Moth's `phase` pose.
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
import { blankBox, NO_ANCHORS, type UnitAnchors } from './unitAnchor.ts';
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
/** Coming back: a `white.1` pop, a touch smaller (it's solid again). */
const SOLID_POP_TILES = 0.4;
const SOLID_POP_MS = 180;
export const SOLID_POP_COLOR = 'white.1';

const pos: Vec2 = { x: 0, y: 0 };
const body = blankBox();

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
  readonly #anchors: UnitAnchors;
  readonly #rings: Phaser.GameObjects.Image[] = [];
  #telling = 0;
  #phased = 0;
  /** Units seen phasing in since the view was made (the smoke flow's check). */
  phasedIn = 0;
  /** Units seen coming back solid since the view was made (the smoke flow's check). */
  phasedOut = 0;

  constructor(
    ctx: ViewContext,
    fx: TransientFx,
    reducedMotion: () => boolean,
    anchors: UnitAnchors = NO_ANCHORS,
  ) {
    this.#ctx = ctx;
    this.#fx = fx;
    this.#reducedMotion = reducedMotion;
    this.#anchors = anchors;
    const tex = brokenRing(ctx.scene);
    for (let i = 0; i < MAX_RINGS; i++) {
      const ring = ctx.scene.make.image({}, false).setVisible(false);
      ring.setTexture(tex.key).setDisplayOrigin(tex.ox, tex.oy);
      ctx.layers.decal.add(ring);
      this.#rings.push(ring);
    }
  }

  /** Subscribes to PhaseShift (the pops as a unit phases and comes back). Returns the off. */
  bind(bus: Bus<SimEvent<IdSpace>>): () => void {
    return bus.on('PhaseShift', (ev) => {
      if (ev.phase === 'in') {
        this.phasedIn++;
        this.#fx.ring(ev.x, ev.y, POP_TILES, PHASE_RING_COLOR, POP_MS, true);
      } else if (ev.phase === 'out') {
        this.phasedOut++;
        this.#fx.ring(ev.x, ev.y, SOLID_POP_TILES, SOLID_POP_COLOR, SOLID_POP_MS, true);
      }
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
      if (this.#anchors.box(e.uid, body)) {
        pos.x = body.x;
        pos.y = body.groundY;
      } else {
        gridToScreen(e.x, e.y, this.#ctx.origin, pos);
      }
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
