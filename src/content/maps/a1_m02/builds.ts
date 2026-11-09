// A1M2 balance-harness builds: docs/story/campaign/act1.md § A1M2, Par build (the step tables
// there mirror these).
import { defineBuilds } from '../../define.ts';
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
const SUPPRESS: GridPos = [11, 7];

function parSteps(): BuildStep[] {
  return [
    { wave: 1, build: 'rivet', tile: IRRIGATION },
    { wave: 1, build: 'thumper', tile: BESIDE_PUMP },
    { wave: 2, build: 'thumper', tile: WEST },
    { wave: 2, build: 'sprinkler', tile: PUMP }, // Sitting Ducks with the Thumper beside it
    { wave: 3, upgrade: IRRIGATION },
    { wave: 3, targeting: IRRIGATION, mode: 'strong' }, // W3 teaches Strong on the Chonks
    { wave: 4, build: 'thumper', tile: BOTTOM },
    { wave: 5, upgrade: BESIDE_PUMP },
    { wave: 5, ability: 1, target: WEST_TURN, when: STRIKE_WHEN }, // the teach Hauler
    { wave: 6, ability: 2, target: SUPPRESS, when: { afterSec: 4 } }, // the Zoomer rush
    { wave: 7, upgrade: PUMP },
    { wave: 7, ability: 1, target: WEST_TURN, when: STRIKE_WHEN },
    { wave: 8, upgrade: BESIDE_PUMP },
    { wave: 8, ability: 1, target: WEST_TURN, when: STRIKE_WHEN },
  ];
}

const PAR_STEPS = parSteps();

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
  referenceProfile: {
    towers: ['rivet', 'thumper', 'sprinkler'],
    specs: [],
    shop: {},
    protocols: [],
    technicianAbility: 'orbital_strike',
  },
  parBuild: { loadout: ['rivet', 'thumper', 'sprinkler'], steps: PAR_STEPS },
  noCounterBuilds: {
    armor: { loadout: ['rivet', 'sprinkler'], steps: noArmorSteps() },
  },
  // A teach map (armor is new here): W5's Hauler walks alone and the Haulers come in numbers only
  // in W7–W8 (act1.md § A1M2), so a no-armor defense breaks in W8, not before the final third.
  teachMap: true,
  noCounterLoseByWave: 8,
});
