// The Stasis Bloom's minimal look (T608; design/towers.md § Stasis Bloom): pure rules, unit-tested,
// applied by BloomView. T630a/T640b polish it.
// - **The field:** a faint filled disc on the ground at the field's reach (`bloomReach`: the sim's
//   own rule, systems/fields.ts `fieldReachTiles`), its edge dithered, under a dashed ring at the
//   same reach, so the held ground reads at a glance without hiding the road. Cold `blue` for the
//   tiers, `violet` for Gravity Well (the pull), `teal` for Timeless Garden (the stronger chill):
//   the disc in the colour's `.3`, the ring in its `.4` (Act III's ground is a deep violet, so a
//   `.2` disc vanished into it).
// - **The pulse:** for PULSE_FLASH_TICKS after a pulse (the sim's pulse timer just reset:
//   `pulseFlash`), the disc draws brighter (`.4`, more opaque), on top of the battle's own frost
//   ring (PulseBurst, battleEvents.ts). Read from sim state, so it holds while paused; still the
//   same under reduced motion (a brightness step, not motion).
import type { ColorName } from '../../content/palettes/master.ts';
import { fieldPulseTicks, fieldReachTiles } from '../../sim/index.ts';

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
