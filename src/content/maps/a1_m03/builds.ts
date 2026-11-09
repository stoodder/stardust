// A1M3 balance-harness builds: docs/story/campaign/act1.md § A1M3, Par build (the step tables
// there mirror these).
import { defineBuilds } from '../../define.ts';
import { REFERENCE_PROFILES } from '../../upgrades/reference.ts';
import type { BuildStep, GridPos } from '../../types.ts';

/** Inside the hairpin, under the air lane: a tower here covers both legs. */
const HAIRPIN: GridPos = [4, 4];
/** Inside the hairpin's east end: covers both legs and the spawn road. */
const HAIRPIN_EAST: GridPos = [8, 4];
/** Inside the hairpin, beside HAIRPIN_EAST: the Sitting Ducks partner. */
const HAIRPIN_SOUTH: GridPos = [7, 5];
/** The crashed drone at the hairpin's bend: a pad once the salvage drone clears it. */
const BEND_WRECK: GridPos = [1, 5];
/** North of the upper leg, under the air lane. */
const NORTH_LANE: GridPos = [3, 2];
/** South of the lower leg, under the air lane. */
const SOUTH_LANE: GridPos = [6, 7];
/** South of the lower leg, by the bend. */
const SOUTH_BEND: GridPos = [3, 7];
/** West of the hairpin's bend. */
const BEND_PAD: GridPos = [1, 4];
/** Beside the gate road. */
const GATE_SIDE: GridPos = [11, 7];
/** The salvage-only drones. */
const EAST_WRECK: GridPos = [12, 6];
const SOUTH_WRECK: GridPos = [6, 8];
/** On the upper leg, where W4's Chonks walk while par holds fire for Gerald. */
const CHONK_STRIKE: GridPos = [5, 3];
/** The hairpin's bend: the Haulers' strike point. */
const BEND: GridPos = [2, 5];

function parSteps(): BuildStep[] {
  return [
    { wave: 1, holdFireWhile: 'neutral' }, // every Gerald pass: Hold Fire (all), then release
    { wave: 1, build: 'rivet', tile: HAIRPIN },
    { wave: 1, build: 'thumper', tile: HAIRPIN_EAST },
    { wave: 2, clear: BEND_WRECK },
    { wave: 2, clear: EAST_WRECK },
    { wave: 2, clear: SOUTH_WRECK },
    { wave: 2, build: 'sprinkler', tile: HAIRPIN_SOUTH }, // Sitting Ducks with the Thumper
    { wave: 3, build: 'skyhook', tile: NORTH_LANE },
    { wave: 4, upgrade: HAIRPIN },
    { wave: 4, ability: 1, target: CHONK_STRIKE, when: { afterSec: 17 } }, // the held Chonks
    { wave: 5, build: 'thumper', tile: BEND_WRECK },
    { wave: 5, ability: 2, when: { afterSec: 8 } }, // Time Dilation on the flock
    { wave: 6, upgrade: HAIRPIN_EAST },
    { wave: 6, upgrade: HAIRPIN }, // T3: pierce
    { wave: 6, targeting: HAIRPIN, mode: 'strong' },
    { wave: 6, ability: 1, target: BEND, when: { afterSec: 42 } },
    { wave: 7, upgrade: BEND_WRECK },
    { wave: 7, build: 'skyhook', tile: SOUTH_LANE },
    { wave: 7, ability: 1, target: BEND, when: { afterSec: 20 } },
    { wave: 8, upgrade: NORTH_LANE },
    { wave: 8, ability: 2, when: { afterSec: 22 } }, // Time Dilation on the big flock
    { wave: 8, ability: 1, target: BEND, when: { afterSec: 20 } },
  ];
}

const PAR_STEPS = parSteps();
const PAR_LOADOUT = ['rivet', 'thumper', 'sprinkler', 'skyhook'] as const;

/** The high ground, north of the spawn road: more than 3.5 tiles from the air lane (D079). */
const HIGH_GROUND: GridPos = [9, 2];
/** Beside the spawn road, far from the air lane. */
const SPAWN_SIDE: GridPos = [12, 2];

/** Steps in wave order, keeping each wave's own order. */
const byWave = (steps: readonly BuildStep[]): BuildStep[] =>
  steps
    .map((s, i) => [s, i] as const)
    .toSorted((a, b) => a[0].wave - b[0].wave || a[1] - b[1])
    .map(([s]) => s);

const key = ([c, r]: GridPos): string => `${c},${r}`;

/** No armor answer (D038): every Thumper a Rivet, every Rivet held at T2, the same casts. */
function noArmorSteps(): BuildStep[] {
  const tier = new Map<string, number>();
  const rivets = new Set<string>();
  const steps: BuildStep[] = [];
  for (const s of PAR_STEPS) {
    if ('build' in s) {
      const swapped = s.build === 'thumper' ? { ...s, build: 'rivet' as const } : s;
      if (swapped.build === 'rivet') rivets.add(key(s.tile));
      tier.set(key(s.tile), 1);
      steps.push(swapped);
    } else if ('upgrade' in s) {
      const k = key(s.upgrade);
      const next = (tier.get(k) ?? 1) + 1;
      tier.set(k, next);
      if (!rivets.has(k) || next <= 2) steps.push(s);
    } else if ('targeting' in s) {
      // Strong targeting only matters to the pierce par's Rivet gets at T3.
    } else {
      steps.push(s);
    }
  }
  return steps;
}

export const builds = defineBuilds({
  // A1M3's reference profile (campaign.md § 4.9): the issued kit, now with the Skyhook.
  referenceProfile: REFERENCE_PROFILES.a1_m03,
  parBuild: { loadout: PAR_LOADOUT, steps: PAR_STEPS },
  noCounterBuilds: {
    // No air answer (enemies.md § 3.1): Thumpers and the Sprinkler, and Rivets only where they
    // can't reach the air lane (the high ground and the spawn road); the same casts.
    air: {
      loadout: ['rivet', 'thumper', 'sprinkler'],
      steps: [
        { wave: 1, holdFireWhile: 'neutral' },
        { wave: 1, build: 'thumper', tile: HAIRPIN_EAST },
        { wave: 1, build: 'rivet', tile: HIGH_GROUND },
        { wave: 2, clear: BEND_WRECK },
        { wave: 2, clear: EAST_WRECK },
        { wave: 2, clear: SOUTH_WRECK },
        { wave: 2, build: 'sprinkler', tile: HAIRPIN_SOUTH },
        { wave: 3, build: 'thumper', tile: HAIRPIN },
        { wave: 4, upgrade: HIGH_GROUND },
        { wave: 4, ability: 1, target: CHONK_STRIKE, when: { afterSec: 17 } },
        { wave: 5, build: 'rivet', tile: SPAWN_SIDE },
        { wave: 5, ability: 2, when: { afterSec: 8 } },
        { wave: 6, upgrade: HAIRPIN_EAST },
        { wave: 6, build: 'thumper', tile: BEND_WRECK },
        { wave: 6, ability: 1, target: BEND, when: { afterSec: 42 } },
        { wave: 7, upgrade: HIGH_GROUND },
        { wave: 7, ability: 1, target: BEND, when: { afterSec: 20 } },
        { wave: 8, upgrade: HAIRPIN },
        { wave: 8, ability: 2, when: { afterSec: 22 } },
        { wave: 8, ability: 1, target: BEND, when: { afterSec: 20 } },
      ],
    },
    // No armor answer: par with every Thumper swapped for a Rivet and every Rivet held at T2 (no
    // pierce), the same Sprinkler, Skyhooks, and casts.
    armor: { loadout: ['rivet', 'sprinkler', 'skyhook'], steps: noArmorSteps() },
  },
  // The armor test is W6–W7's Haulers (four, then two more), after W5's flock tests the air
  // (act1.md § A1M3), so both no-counter builds must lose by W7 rather than W5.
  noCounterLoseByWave: 7,
  // Par holds fire for every Gerald pass, so it earns Return to Sender.
  parMedals: ['challenge'],
  // Mk II's wider blast takes all three of W4's held Chonks; Mk I's leaves one to leak (T228).
  rndPickChanges: ['orbital_strike_mk2'],
  altBuilds: {
    // Par one purchase short: no W8 Skyhook upgrade.
    par_minus_last: {
      loadout: PAR_LOADOUT,
      steps: PAR_STEPS.filter((s) => s.wave !== 8 || !('upgrade' in s)),
    },
    // No Sprinkler (no Sitting Ducks): a Rivet takes its pad.
    no_sprinkler: {
      loadout: ['rivet', 'thumper', 'skyhook'],
      steps: PAR_STEPS.map((s) =>
        'build' in s && s.build === 'sprinkler' ? { ...s, build: 'rivet' as const } : s,
      ),
    },
    // Par's towers and casts, never upgraded; the hoard goes on three more Thumpers in W6–W7,
    // the kind of purchase QUILL's bank nudge asks for.
    no_upgrades: {
      loadout: PAR_LOADOUT,
      steps: byWave([
        ...PAR_STEPS.filter((s) => !('upgrade' in s)),
        { wave: 6, build: 'thumper', tile: SOUTH_BEND },
        { wave: 6, build: 'thumper', tile: BEND_PAD },
        { wave: 7, build: 'thumper', tile: GATE_SIDE },
      ]),
    },
  },
  altExpectations: {
    par_minus_last: { minMarginPct: 40 },
    no_sprinkler: { minMarginPct: 40 },
    no_upgrades: { outcome: 'either' },
  },
});
