// A1M2 balance-harness builds: docs/story/campaign/act1.md § A1M2, Par build (the step tables
// there mirror these).
import { defineBuilds } from '../../define.ts';
import { REFERENCE_PROFILES } from '../../upgrades/reference.ts';
import type { BuildStep, GridPos } from '../../types.ts';

/** The irrigation tower: A1M2's one high-ground tile. */
const IRRIGATION: GridPos = [6, 4];
/** The pump station: the power node at the east switchback. */
const PUMP: GridPos = [10, 6];
/** Beside the pump station: the Sitting Ducks partner. */
const BESIDE_PUMP: GridPos = [10, 7];
/** The bottom of the east switchback. */
const BOTTOM: GridPos = [12, 7];
/** Inside the west switchback: a Thumper here covers both terraces' lips and the turn. */
const WEST: GridPos = [3, 4];
/** The west switchback, where a wave's first Hauler walks into the strike. */
const WEST_TURN: GridPos = [2, 3];
const STRIKE_WHEN = { afterSec: 17.5 } as const;
/** The same spot, one Hauler later (W7–W8 release one every 12 s): W8's second Hauler. */
const SECOND_HAULER = { afterSec: 28.5 } as const;
const SUPPRESS: GridPos = [11, 7];
/** Beside the housing block on Terrace 2. */
const HOUSING_PAD: GridPos = [5, 3];

function parSteps(): BuildStep[] {
  return [
    { wave: 1, build: 'rivet', tile: IRRIGATION },
    { wave: 1, build: 'thumper', tile: BESIDE_PUMP },
    { wave: 2, build: 'thumper', tile: WEST },
    { wave: 2, build: 'sprinkler', tile: PUMP }, // Sitting Ducks with the Thumper beside it
    { wave: 3, upgrade: IRRIGATION },
    { wave: 4, build: 'thumper', tile: BOTTOM },
    { wave: 5, upgrade: BESIDE_PUMP },
    { wave: 5, ability: 1, target: WEST_TURN, when: STRIKE_WHEN }, // the teach Hauler
    { wave: 6, ability: 2, target: SUPPRESS, when: { afterSec: 4 } }, // the Zoomer rush
    { wave: 7, upgrade: PUMP },
    { wave: 7, ability: 1, target: WEST_TURN, when: STRIKE_WHEN },
    // No W8 purchase: the towers hold the first Hauler, and the strike waits for the second.
    { wave: 8, ability: 1, target: WEST_TURN, when: SECOND_HAULER },
  ];
}

const PAR_STEPS = parSteps();
const PAR_LOADOUT = ['rivet', 'thumper', 'sprinkler'] as const;

/** Steps in wave order, keeping each wave's own order. */
const byWave = (steps: readonly BuildStep[]): BuildStep[] =>
  steps
    .map((s, i) => [s, i] as const)
    .toSorted((a, b) => a[0].wave - b[0].wave || a[1] - b[1])
    .map(([s]) => s);

/** No armor answer (D038): no Thumper, Rivets held at T2, and both abilities still cast. */
function noArmorSteps(): BuildStep[] {
  const steps: BuildStep[] = [];
  const seen = new Map<string, number>();
  for (const s of PAR_STEPS) {
    if ('build' in s) {
      steps.push(s.build === 'thumper' ? { ...s, build: 'rivet' } : s);
      seen.set(`${s.tile[0]},${s.tile[1]}`, 1);
    } else if ('upgrade' in s) {
      const k = `${s.upgrade[0]},${s.upgrade[1]}`;
      const tier = (seen.get(k) ?? 1) + 1;
      const isSprinkler = k === `${PUMP[0]},${PUMP[1]}`;
      if (isSprinkler || tier <= 2) steps.push(s);
      seen.set(k, tier);
    } else {
      steps.push(s);
    }
  }
  return steps;
}

export const builds = defineBuilds({
  // A1M2's reference profile (campaign.md § 4.9): the issued kit, now with the Sprinkler; A1M1's
  // Intel isn't spent on the reference path.
  referenceProfile: REFERENCE_PROFILES.a1_m02,
  parBuild: { loadout: PAR_LOADOUT, steps: PAR_STEPS },
  noCounterBuilds: {
    armor: { loadout: ['rivet', 'sprinkler'], steps: noArmorSteps() },
  },
  // A teach map (armor is new here): W5's Hauler walks alone and the Haulers come in numbers only
  // in W7–W8 (act1.md § A1M2), so a no-armor defense breaks in W8, not before the final third.
  teachMap: true,
  noCounterLoseByWave: 8,
  // The act's band, kept: par holds every wave (100) because one Hauler leak costs 15 points, so
  // the act's target of 92 can't be met without faking a leak (D059); A1M3 resumes below 90.
  marginBand: { minPct: 80, maxPct: 100 },
  altBuilds: {
    // No Sprinkler (so no Sitting Ducks): a Rivet takes the pump station instead. The Thumpers
    // still answer the armor.
    no_sprinkler: {
      loadout: ['rivet', 'thumper'],
      steps: PAR_STEPS.map((s) =>
        'build' in s && s.build === 'sprinkler' ? { ...s, build: 'rivet' as const } : s,
      ),
    },
    // Par one purchase short: no W7 Sprinkler upgrade (par buys nothing in W8).
    par_minus_last: {
      loadout: PAR_LOADOUT,
      steps: PAR_STEPS.filter((s) => s.wave !== 7 || !('upgrade' in s)),
    },
    // An under-built player who stops buying after W5 (casts included).
    stops_after_w5: {
      loadout: PAR_LOADOUT,
      steps: PAR_STEPS.filter((s) => s.wave <= 5 || 'ability' in s),
    },
    // A Thumper fan: Thumpers on the pump-side pad, the west switchback, and the irrigation tower
    // (no Sprinkler), upgrades on the Thumpers, the same casts.
    thumper_heavy: {
      loadout: ['thumper', 'rivet'],
      steps: [
        { wave: 1, build: 'thumper', tile: BESIDE_PUMP },
        { wave: 1, build: 'thumper', tile: WEST },
        { wave: 2, build: 'thumper', tile: IRRIGATION },
        { wave: 3, upgrade: IRRIGATION },
        { wave: 4, build: 'thumper', tile: BOTTOM },
        { wave: 5, upgrade: BESIDE_PUMP },
        { wave: 5, ability: 1, target: WEST_TURN, when: STRIKE_WHEN },
        { wave: 6, build: 'thumper', tile: HOUSING_PAD },
        { wave: 6, ability: 2, target: SUPPRESS, when: { afterSec: 4 } },
        { wave: 6, upgrade: WEST },
        { wave: 7, ability: 1, target: WEST_TURN, when: STRIKE_WHEN },
        { wave: 7, upgrade: BESIDE_PUMP },
        { wave: 8, ability: 1, target: WEST_TURN, when: STRIKE_WHEN },
      ],
    },
    // Wide, not tall: par's first towers, then a new tower on a fresh pad every wave and never an
    // upgrade (ten towers by W8), the same casts.
    build_wide: {
      loadout: PAR_LOADOUT,
      steps: [
        { wave: 1, build: 'rivet', tile: IRRIGATION },
        { wave: 1, build: 'thumper', tile: BESIDE_PUMP },
        { wave: 2, build: 'thumper', tile: WEST },
        { wave: 2, build: 'sprinkler', tile: PUMP },
        { wave: 4, build: 'thumper', tile: BOTTOM },
        { wave: 5, ability: 1, target: WEST_TURN, when: STRIKE_WHEN },
        { wave: 5, build: 'thumper', tile: HOUSING_PAD },
        { wave: 6, ability: 2, target: SUPPRESS, when: { afterSec: 4 } },
        { wave: 6, build: 'thumper', tile: [8, 3] },
        { wave: 7, ability: 1, target: WEST_TURN, when: STRIKE_WHEN },
        { wave: 7, build: 'thumper', tile: [7, 6] },
        { wave: 7, build: 'rivet', tile: [6, 7] },
        { wave: 8, ability: 1, target: WEST_TURN, when: STRIKE_WHEN },
        { wave: 8, build: 'thumper', tile: [5, 1] },
      ],
    },
    // Par's towers and casts, never upgraded; the one purchase is a fourth Thumper beside the
    // housing block in W6, the kind QUILL's bank nudge asks for. (Par without it banks 560
    // credits and meets W7–W8 as a wall, 12 then the loss: the nudge is for that player.)
    no_upgrades: {
      loadout: PAR_LOADOUT,
      steps: byWave([
        ...PAR_STEPS.filter((s) => !('upgrade' in s)),
        { wave: 6, build: 'thumper', tile: HOUSING_PAD },
      ]),
    },
  },
  altExpectations: {
    par_minus_last: { minMarginPct: 40 },
    stops_after_w5: { outcome: 'either' },
    // Plausible human builds that should stay comfortable: the easy side of the tuning.
    thumper_heavy: { minMarginPct: 40 },
    build_wide: { minMarginPct: 40 },
    no_upgrades: { outcome: 'either' },
  },
});
