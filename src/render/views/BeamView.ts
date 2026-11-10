// Beams' minimal view (T504; design/towers.md § 7, art-direction.md § 7 Energy): enough to read the
// Prism Spire in play until the polish pass (T530a: beams by ramp, the thrown-thread look, the
// knot sparkle). Each frame, for every live beam tower whose beam is on (`Tower.beamActive`), a
// line from its crystal's tip to each lit beam's target (beam 1 `targetUid`, Refractor's
// `beam2Uid`/`beam3Uid`), at the target's body height (a flyer's, up in the air):
// - **The ramp reads as heat**, in three steps of the beam's ramp toward its cap (`beamLook`):
//   a thin `blue.3` thread at the start, a wider `teal.4` one past a third, and a `white.1`-cored
//   `teal.4` beam past two thirds (and at the cap), brighter at each step. A beam with no ramp
//   (the Lantern's light-beam) draws at its first step.
// - Every beam has an `blue.0` under-stroke (the Aelari outline colour) so it reads on any ground,
//   and flickers a pixel wider at 15 Hz (steady under reduced motion; art-direction § 7).
// One Graphics in `vfx` (over the units), redrawn each frame; allocation-free per frame.
import type * as Phaser from 'phaser';
import { rgbOf } from '../../content/palettes/master.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import type { Enemy, Tower } from '../../sim/index.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { AIR_LIFT_PX, BODY_LIFT_PX } from './TransientFx.ts';
import type { ViewContext } from './ViewContext.ts';

/** A pool as the view reads it. */
export interface BeamPool<T> {
  readonly used: number;
  readonly items: readonly DeepReadonly<T>[];
}

/** The beam leaves the crystal this high over the tower's tile (screen px). */
const MUZZLE_PX = 14;
/** The flicker's rate (art-direction § 7: beams flicker between two widths at 15 Hz). */
const FLICKER_HZ = 15;

type BeamColor = 'blue.3' | 'teal.4';

/** How a beam at a ramp step looks: its width (px), colour, alpha, and whether it has a core. */
export interface BeamLook {
  /** 0, 1, or 2: the ramp's third. */
  readonly step: 0 | 1 | 2;
  readonly widthPx: number;
  readonly color: BeamColor;
  readonly alpha: number;
  readonly core: boolean;
}

const LOOKS: readonly [BeamLook, BeamLook, BeamLook] = [
  { step: 0, widthPx: 2, color: 'blue.3', alpha: 0.75, core: false },
  { step: 1, widthPx: 3, color: 'teal.4', alpha: 0.9, core: false },
  { step: 2, widthPx: 4, color: 'teal.4', alpha: 1, core: true },
];

/**
 * A beam's look at `ramp` on a tier whose cap is `cap`: the step is the ramp's share of the way
 * from 1 to the cap, in thirds (the cap itself is the top step). No ramp (cap 1): the first step.
 */
export function beamLook(ramp: number, cap: number): BeamLook {
  if (cap <= 1) return LOOKS[0];
  const f = (ramp - 1) / (cap - 1);
  return f >= 2 / 3 ? LOOKS[2] : f >= 1 / 3 ? LOOKS[1] : LOOKS[0];
}

function hex(name: BeamColor | 'blue.0' | 'white.1'): number {
  const c = rgbOf(name);
  return (c.r << 16) | (c.g << 8) | c.b;
}
const COLOR: Readonly<Record<BeamColor, number>> = { 'blue.3': hex('blue.3'), 'teal.4': hex('teal.4') };
const UNDER = hex('blue.0');
const CORE = hex('white.1');

const a: Vec2 = { x: 0, y: 0 };
const b: Vec2 = { x: 0, y: 0 };

export class BeamView {
  readonly #ctx: ViewContext;
  readonly #reducedMotion: () => boolean;
  readonly #liftPx: (col: number, row: number) => number;
  readonly #gfx: Phaser.GameObjects.Graphics;
  #ms = 0;
  /** Beams drawn last frame, and the brightest step among them (−1: none; smoke's checks). */
  beams = 0;
  topStep = -1;

  constructor(
    ctx: ViewContext,
    reducedMotion: () => boolean,
    liftPx: (col: number, row: number) => number,
  ) {
    this.#ctx = ctx;
    this.#reducedMotion = reducedMotion;
    this.#liftPx = liftPx;
    this.#gfx = ctx.scene.make.graphics({}, false);
    ctx.layers.vfx.add(this.#gfx);
  }

  update(dt: number, towers: BeamPool<Tower>, enemies: BeamPool<Enemy>): void {
    const g = this.#gfx;
    g.clear();
    this.#ms += dt;
    const flick =
      !this.#reducedMotion() && Math.floor((this.#ms * FLICKER_HZ) / 1000) % 2 === 1 ? 1 : 0;
    let beams = 0;
    let top = -1;
    for (let i = 0; i < towers.used; i++) {
      const t = towers.items[i]!; // i < used ≤ items.length
      const attack = t.tierDef?.attack ?? null;
      if (!t.alive || !t.beamActive || attack === null || attack.kind !== 'beam') continue;
      gridToScreen(t.x, t.y, this.#ctx.origin, a);
      const x0 = a.x;
      const y0 = a.y - MUZZLE_PX - this.#liftPx(t.col, t.row);
      for (let k = 0; k < 3; k++) {
        const uid = k === 0 ? t.targetUid : k === 1 ? t.beam2Uid : t.beam3Uid;
        if (uid === 0) continue;
        const e = findEnemy(enemies, uid, k === 0 ? t.targetSlot : -1);
        if (e === null) continue;
        const ramp = k === 0 ? t.beamRamp : k === 1 ? t.beam2Ramp : t.beam3Ramp;
        const look = beamLook(ramp, attack.rampCap);
        gridToScreen(e.x, e.y, this.#ctx.origin, b);
        const y1 = b.y - BODY_LIFT_PX - (e.def?.layer === 'air' ? AIR_LIFT_PX : 0);
        const w = look.widthPx + flick;
        g.lineStyle(w + 2, UNDER, 0.6 * look.alpha).lineBetween(x0, y0, b.x, y1);
        g.lineStyle(w, COLOR[look.color], look.alpha).lineBetween(x0, y0, b.x, y1);
        if (look.core) g.lineStyle(2, CORE, 1).lineBetween(x0, y0, b.x, y1);
        beams++;
        if (look.step > top) top = look.step;
      }
    }
    this.beams = beams;
    this.topStep = top;
  }

  reset(): void {
    this.#gfx.clear();
    this.#ms = 0;
    this.beams = 0;
    this.topStep = -1;
  }
}

/** The live enemy `uid`: at `slot` when that hint holds, else by a scan. */
function findEnemy(
  enemies: BeamPool<Enemy>,
  uid: number,
  slot: number,
): DeepReadonly<Enemy> | null {
  if (slot >= 0 && slot < enemies.used) {
    const e = enemies.items[slot]!; // 0 ≤ slot < used
    if (e.uid === uid) return e.alive ? e : null;
  }
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (e.uid === uid) return e.alive ? e : null;
  }
  return null;
}
