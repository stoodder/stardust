// The Stasis Bloom's look (T608, polished by T630a; design/towers.md § Stasis Bloom): pure rules
// and pixel images, unit-tested, applied by BloomView. The flower itself is the tower's sprites
// (T640b), and its head's `fire` burst on each pulse is TowerView's (towerLook.ts `idleFire`).
// - **The field:** a faint filled disc on the ground at the field's reach (`bloomReach`: the sim's
//   own rule, systems/fields.ts `fieldReachTiles`), its edge dithered, under a dashed ring at the
//   same reach, so the held ground reads at a glance without hiding the road. Cold `blue` for the
//   tiers, `violet` for Gravity Well (the pull), `teal` for Timeless Garden (the stronger chill):
//   the disc in the colour's `.3`, the ring in its `.4` (Act III's ground is a deep violet, so a
//   `.2` disc vanished into it). The ring is the colour's `.4` while the pulse is **ready** (its
//   timer run down: the next unit in pulses at once) and a step darker, its `.3`, while it
//   recharges (`ringColor`), whole either way (night rings: partial alpha sinks into Act III's
//   ground), so the player reads when it can fire again.
// - **The pulse:** for PULSE_FLASH_TICKS after a pulse (the sim's pulse timer just reset:
//   `pulseFlash`), the disc draws brighter (`.4`, more opaque), and the Bloom's own burst ring
//   grows from the tower to the reach over PULSE_RING_TICKS in quarter-tile steps, stepping down
//   the alpha ladder (`pulseRing`): a `white.1` ring set with six petal-points in the spec's `.4`
//   (`pulseRingImage`, the flower's six petals), so it never reads as Flash Freeze's plain ice
//   ring (battleEvents.ts skips that ring for a Bloom). Read from sim state, so it holds while
//   paused; under reduced motion the ring doesn't grow: it shows at the reach and fades.
// - **The pull** (Gravity Well, `PulledBack`): a streak from where the unit stood back to where
//   the pull set it (`violet.4` over an `ink.0` under-stroke, a `white.1` head at the new spot),
//   stepping down the alpha ladder over STREAK_MS on real time, so the yank reads; the same under
//   reduced motion (it doesn't move, it fades).
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import { fieldPulseTicks, fieldReachTiles } from '../../sim/index.ts';
import { rangeEllipsePx, type Vec2 } from '../iso.ts';
import { STEPPED_ALPHA } from '../vfx/fxTiming.ts';
import { ringImage, RING_STEP_TILES, type RingImage } from '../vfx/overlayPixels.ts';

/** How long a pulse brightens the disc, in sim ticks (0.3 s). */
export const PULSE_FLASH_TICKS = 18;
/** The disc's alpha at rest, and while a pulse flashes. */
export const DISC_ALPHA = 0.2;
export const DISC_FLASH_ALPHA = 0.36;

/** The field's colours: the disc at rest, the disc flashing, and the edge ring. */
export interface BloomColors {
  readonly disc: ColorName;
  readonly flash: ColorName;
  readonly ring: ColorName;
}

const PLAIN: BloomColors = { disc: 'blue.3', flash: 'blue.4', ring: 'blue.4' };
const WELL: BloomColors = { disc: 'violet.3', flash: 'violet.4', ring: 'violet.4' };
const GARDEN: BloomColors = { disc: 'teal.3', flash: 'teal.4', ring: 'teal.4' };

/** What the look reads of a tower. */
export interface BloomTower {
  readonly alive: boolean;
  readonly spec: 'a' | 'b' | null;
  readonly tierDef: {
    readonly field: {
      readonly radiusTiles: number;
      readonly pulseEveryTicks: number;
      readonly pullBackTiles: number;
    } | null;
  } | null;
  readonly linkFieldRadiusTiles: number;
  readonly linkPulseSoonerTicks: number;
  /** Its `supportStat` radius tune-up (systems/links.ts sets it on every tower). */
  readonly detectPct: number;
  /** The pulse timer (systems/fields.ts): reset to the period on the tick it pulses. */
  readonly cooldownTicks: number;
  /** −1 until its first pulse. */
  readonly firstFiredTick: number;
  readonly holdFire: boolean;
}

/** The field's reach in tiles (the sim's rule), or 0 for a tower with no field or a dead one. */
export function bloomReach(t: BloomTower): number {
  if (!t.alive || t.tierDef === null || t.tierDef.field === null) return 0;
  return fieldReachTiles(t.tierDef.field, t);
}

/** The field's colours: violet for Gravity Well's pull, teal for Timeless Garden, else blue. */
export function bloomColors(t: Pick<BloomTower, 'spec'>): BloomColors {
  return t.spec === 'a' ? WELL : t.spec === 'b' ? GARDEN : PLAIN;
}

/** Whether a pulse went off within the last PULSE_FLASH_TICKS (the timer just reset). */
export function pulseFlash(t: BloomTower): boolean {
  const f = t.tierDef?.field ?? null;
  if (!t.alive || f === null || t.firstFiredTick < 0) return false;
  const since = fieldPulseTicks(f, t) - t.cooldownTicks;
  return since >= 0 && since < PULSE_FLASH_TICKS;
}

/** The edge ring's colour: the spec's `.4` while the pulse is ready, its `.3` while it recharges. */
export function ringColor(t: Pick<BloomTower, 'cooldownTicks'>, colors: BloomColors): ColorName {
  return t.cooldownTicks <= 0 ? colors.ring : colors.disc;
}

/** The burst ring grows to the reach over this many sim ticks (0.4 s), fading as it goes. */
export const PULSE_RING_TICKS = 24;

/**
 * The burst ring after a pulse, for a field reaching `reach` tiles: its radius (tiles, in
 * quarter-tile steps, at least one) and alpha (0: none). Grows over PULSE_RING_TICKS; under
 * reduced motion it holds at the reach and only fades.
 */
export function pulseRing(
  t: BloomTower,
  reach: number,
  reducedMotion: boolean,
): { readonly tiles: number; readonly alpha: number } {
  const f = t.tierDef?.field ?? null;
  if (!t.alive || f === null || t.firstFiredTick < 0 || reach <= 0) return { tiles: 0, alpha: 0 };
  const since = fieldPulseTicks(f, t) - t.cooldownTicks;
  if (since < 0 || since >= PULSE_RING_TICKS) return { tiles: 0, alpha: 0 };
  const p = since / PULSE_RING_TICKS;
  const step = Math.min(STEPPED_ALPHA.length - 1, Math.floor(p * STEPPED_ALPHA.length));
  const grown = reducedMotion ? reach : reach * Math.min(1, (since + 1) / (PULSE_RING_TICKS / 2));
  const tiles = Math.max(RING_STEP_TILES, Math.ceil(grown / RING_STEP_TILES) * RING_STEP_TILES);
  return { tiles: Math.min(tiles, Math.max(RING_STEP_TILES, reach)), alpha: STEPPED_ALPHA[step]! };
}

const semi: Vec2 = { x: 0, y: 0 };
/** The burst ring's six petal-points: their angles, and how far each reaches in and out (px). */
const PETALS = 6;
const PETAL_IN_PX = 2;
const PETAL_OUT_PX = 1;

/**
 * The Bloom's burst ring at `radiusTiles`: a solid `white.1` ring over an `ink.0` under-stroke,
 * set with six `petal`-coloured points (a short radial stroke across the ring), the flower's six
 * petals; padded so the points fit. (cx, cy) sits on the tower's tile.
 */
export function pulseRingImage(radiusTiles: number, petal: ColorName): RingImage {
  const base = ringImage(radiusTiles, 'white.1', false, 'ink.0');
  const pad = PETAL_OUT_PX + 1;
  const w = base.image.w + 2 * pad;
  const h = base.image.h + 2 * pad;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < base.image.h; y++) {
    const from = y * base.image.w * 4;
    data.set(base.image.data.subarray(from, from + base.image.w * 4), ((y + pad) * w + pad) * 4);
  }
  const cx = base.cx + pad;
  const cy = base.cy + pad;
  rangeEllipsePx(radiusTiles, semi);
  const c = rgbOf(petal);
  const put = (x: number, y: number): void => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 4;
    data[i] = c.r;
    data[i + 1] = c.g;
    data[i + 2] = c.b;
    data[i + 3] = 255;
  };
  for (let k = 0; k < PETALS; k++) {
    const a = (k * Math.PI * 2) / PETALS + Math.PI / 2;
    const ex = Math.cos(a);
    const ey = Math.sin(a);
    for (let d = -PETAL_IN_PX; d <= PETAL_OUT_PX; d++) {
      // Along the ray through the ring's point at angle a, d px in (−) or out (+), 2:1 squashed.
      put(Math.round(cx + ex * (semi.x + d)), Math.round(cy + ey * (semi.y + d / 2)));
    }
  }
  return { image: { w, h, data }, cx, cy };
}

/** A pull's streak: how long it lasts (ms), and its alpha `ms` into it (0: gone). */
export const STREAK_MS = 320;
export function streakAlpha(ms: number): number {
  if (ms < 0 || ms >= STREAK_MS) return 0;
  const step = Math.min(
    STEPPED_ALPHA.length - 1,
    Math.floor((ms / STREAK_MS) * STEPPED_ALPHA.length),
  );
  return STEPPED_ALPHA[step]!; // step < length
}
