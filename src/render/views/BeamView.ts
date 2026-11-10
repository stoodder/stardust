// Beams (T504, T530a; design/towers.md § 7, art-direction.md § 7 Energy and the Aelari's thrown
// threads). Each frame, for every live beam tower whose beam is on (`Tower.beamActive`), a line
// from its crystal's tip to each lit beam's target (beam 1 `targetUid`, Refractor's
// `beam2Uid`/`beam3Uid`), ending at the middle of the target's body as EnemyView draws it (its
// lane offset, a flyer's lift; unitAnchor.ts):
// - **A thrown thread:** when a beam locks (a new target), the strand snaps out from the crystal to
//   the target over THROW_MS (whole at once under reduced motion), then the knot sparkles where it
//   meets the body: `fx.beam_knot`'s `spark` (a white star flinging thread-ends, a teal knot in a
//   ruby ring, loosening; once at 15 fps), then its `hold`, the knot burning on the held target,
//   flicking between its two frames with the beam's 15 Hz (`knotFrame`; held on the first under
//   reduced motion). A retarget throws a new thread.
// - **The ramp reads as heat**, in three steps of the beam's ramp toward its cap (`beamLook`):
//   a taut 1 px `blue.3` thread at the start, a wider `teal.4` one past a third, and a
//   `white.1`-cored `teal.4` beam past two thirds (and at the cap), brighter at each step. A beam
//   with no ramp (the Lantern's light-beam) draws at its first step.
// - Every beam has an `blue.0` under-stroke (the Aelari outline colour) so it reads on any ground,
//   and flickers a pixel wider at 15 Hz (steady under reduced motion; art-direction § 7).
// One Graphics and a pool of knot images in `vfx` (over the units), redrawn each frame; each beam's
// lock is kept per tower slot in typed arrays (grown only when the tower pool grows), so a frame
// allocates nothing.
import type * as Phaser from 'phaser';
import { rgbOf } from '../../content/palettes/master.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import type { Enemy, Tower } from '../../sim/index.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import type { FrameRef } from '../sprites/SpriteSource.ts';
import { AIR_LIFT_PX, BODY_LIFT_PX } from './TransientFx.ts';
import { blankBox, NO_ANCHORS, type UnitAnchors } from './unitAnchor.ts';
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
  { step: 0, widthPx: 1, color: 'blue.3', alpha: 0.85, core: false },
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
const COLOR: Readonly<Record<BeamColor, number>> = {
  'blue.3': hex('blue.3'),
  'teal.4': hex('teal.4'),
};
const UNDER = hex('blue.0');
const CORE = hex('white.1');

/** A locked thread snaps out from the crystal to its target over this long (ms). */
export const THROW_MS = 90;
/** The knot's sprite and its frames: `spark` s0–s2 (once, 15 fps), then `hold` h0/h1. */
const KNOT_SPRITE = 'fx.beam_knot';
const KNOT_FRAMES = ['s0', 's1', 's2', 'h0', 'h1'] as const;
const SPARK_FRAME_MS = 1000 / 15;
const MAX_KNOTS = 24;

/** How far the thread has been thrown (0 to 1) `ageMs` after its lock; whole under reduced motion. */
export function throwFrac(ageMs: number, reducedMotion: boolean): number {
  if (reducedMotion || ageMs >= THROW_MS) return 1;
  return ageMs <= 0 ? 0 : ageMs / THROW_MS;
}

/**
 * The knot's frame (KNOT_FRAMES' index) `ageMs` after its lock, or −1 while the thread is still in
 * flight: the spark's three frames, then the hold flicking on `flick` (the beam's 15 Hz half);
 * under reduced motion the spark plays (a one-off, no flicker) and the hold stays on its first.
 */
export function knotFrame(ageMs: number, flick: number, reducedMotion: boolean): number {
  const t = ageMs - (reducedMotion ? 0 : THROW_MS);
  if (t < 0) return -1;
  const spark = Math.floor(t / SPARK_FRAME_MS);
  if (spark < 3) return spark;
  return reducedMotion ? 3 : 3 + (flick === 0 ? 0 : 1);
}

const a: Vec2 = { x: 0, y: 0 };
const b: Vec2 = { x: 0, y: 0 };
const body = blankBox();

export class BeamView {
  readonly #ctx: ViewContext;
  readonly #reducedMotion: () => boolean;
  readonly #liftPx: (col: number, row: number) => number;
  readonly #gfx: Phaser.GameObjects.Graphics;
  readonly #anchors: UnitAnchors;
  readonly #knots: Phaser.GameObjects.Image[] = [];
  readonly #knotFrames: readonly FrameRef[];
  /** Per tower slot: its uid; per beam (slot × 3 + beam): the locked target and the lock's age. */
  #towerUid = new Int32Array(0);
  #lockUid = new Int32Array(0);
  #lockAge = new Float64Array(0);
  #ms = 0;
  /** Beams drawn last frame, and the brightest step among them (−1: none; smoke's checks). */
  beams = 0;
  topStep = -1;
  /** Knots burning on targets now, and locks thrown since the battle began (smoke's checks). */
  knots = 0;
  throws = 0;

  constructor(
    ctx: ViewContext,
    reducedMotion: () => boolean,
    liftPx: (col: number, row: number) => number,
    anchors: UnitAnchors = NO_ANCHORS,
  ) {
    this.#ctx = ctx;
    this.#reducedMotion = reducedMotion;
    this.#liftPx = liftPx;
    this.#anchors = anchors;
    this.#gfx = ctx.scene.make.graphics({}, false);
    ctx.layers.vfx.add(this.#gfx);
    const { sprites } = ctx;
    this.#knotFrames = KNOT_FRAMES.map((f) => sprites.frame(KNOT_SPRITE, f));
    const anchor = sprites.meta(KNOT_SPRITE).anchor;
    for (let i = 0; i < MAX_KNOTS; i++) {
      const img = ctx.scene.make.image({}, false).setVisible(false);
      const f = this.#knotFrames[0]!; // KNOT_FRAMES is non-empty
      img.setTexture(f.texture, f.frame).setDisplayOrigin(anchor.x, anchor.y);
      ctx.layers.vfx.add(img);
      this.#knots.push(img);
    }
  }

  /** Grows the per-slot lock arrays to the tower pool's size (rare: the pool grows). */
  #fit(slots: number): void {
    if (this.#towerUid.length >= slots) return;
    const n = Math.max(slots, this.#towerUid.length * 2, 8);
    const towerUid = new Int32Array(n);
    towerUid.set(this.#towerUid);
    const lockUid = new Int32Array(n * 3);
    lockUid.set(this.#lockUid);
    const lockAge = new Float64Array(n * 3);
    lockAge.set(this.#lockAge);
    this.#towerUid = towerUid;
    this.#lockUid = lockUid;
    this.#lockAge = lockAge;
  }

  update(dt: number, towers: BeamPool<Tower>, enemies: BeamPool<Enemy>): void {
    const g = this.#gfx;
    g.clear();
    this.#ms += dt;
    const reduced = this.#reducedMotion();
    const flick = !reduced && Math.floor((this.#ms * FLICKER_HZ) / 1000) % 2 === 1 ? 1 : 0;
    this.#fit(towers.used);
    let beams = 0;
    let top = -1;
    let knots = 0;
    for (let i = 0; i < towers.used; i++) {
      const t = towers.items[i]!; // i < used ≤ items.length
      const attack = t.tierDef?.attack ?? null;
      const on = t.alive && t.beamActive && attack !== null && attack.kind === 'beam';
      if (this.#towerUid[i] !== t.uid || !on) {
        // A new tower in the slot, or the beam went dark: its threads must be thrown again.
        this.#towerUid[i] = t.uid;
        this.#lockUid[i * 3] = 0;
        this.#lockUid[i * 3 + 1] = 0;
        this.#lockUid[i * 3 + 2] = 0;
      }
      if (!on) continue;
      gridToScreen(t.x, t.y, this.#ctx.origin, a);
      const x0 = a.x;
      const y0 = a.y - MUZZLE_PX - this.#liftPx(t.col, t.row);
      for (let k = 0; k < 3; k++) {
        const slot = i * 3 + k;
        const uid = k === 0 ? t.targetUid : k === 1 ? t.beam2Uid : t.beam3Uid;
        const e = uid === 0 ? null : findEnemy(enemies, uid, k === 0 ? t.targetSlot : -1);
        if (e === null) {
          this.#lockUid[slot] = 0;
          continue;
        }
        if (this.#lockUid[slot] !== uid) {
          this.#lockUid[slot] = uid;
          this.#lockAge[slot] = 0;
          this.throws++;
        } else {
          this.#lockAge[slot] += dt; // slot < length (#fit)
        }
        const age = this.#lockAge[slot] ?? 0; // slot < length (#fit)
        const ramp = k === 0 ? t.beamRamp : k === 1 ? t.beam2Ramp : t.beam3Ramp;
        const look = beamLook(ramp, attack.rampCap);
        if (this.#anchors.box(uid, body)) {
          b.x = body.x;
          b.y = Math.round((body.top + body.bottom) / 2);
        } else {
          gridToScreen(e.x, e.y, this.#ctx.origin, b);
          b.y -= BODY_LIFT_PX + (e.def?.layer === 'air' ? AIR_LIFT_PX : 0);
        }
        // The thread snaps out from the crystal to the target.
        const f = throwFrac(age, reduced);
        const x1 = x0 + (b.x - x0) * f;
        const y1 = y0 + (b.y - y0) * f;
        const w = look.widthPx + flick;
        g.lineStyle(w + 2, UNDER, 0.6 * look.alpha).lineBetween(x0, y0, x1, y1);
        g.lineStyle(w, COLOR[look.color], look.alpha).lineBetween(x0, y0, x1, y1);
        if (look.core) g.lineStyle(2, CORE, 1).lineBetween(x0, y0, x1, y1);
        beams++;
        if (look.step > top) top = look.step;
        // The knot where it meets the body: the spark, then the hold.
        const kf = knotFrame(age, flick, reduced);
        if (kf >= 0 && knots < MAX_KNOTS) {
          const img = this.#knots[knots++]!; // knots < MAX_KNOTS
          const ref = this.#knotFrames[kf]!; // kf < KNOT_FRAMES.length
          if (img.frame.name !== ref.frame || img.texture.key !== ref.texture) {
            img.setTexture(ref.texture, ref.frame);
          }
          img.setPosition(Math.round(b.x), Math.round(b.y)).setVisible(true);
        }
      }
    }
    this.beams = beams;
    this.topStep = top;
    this.knots = knots;
    for (let n = knots; n < MAX_KNOTS; n++) {
      const img = this.#knots[n]!; // n < MAX_KNOTS
      if (img.visible) img.setVisible(false);
    }
  }

  reset(): void {
    this.#gfx.clear();
    this.#ms = 0;
    this.beams = 0;
    this.topStep = -1;
    this.knots = 0;
    this.throws = 0;
    this.#lockUid.fill(0);
    this.#towerUid.fill(0);
    for (const k of this.#knots) k.setVisible(false);
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
