// A1M3 balance-harness builds: docs/story/campaign/act1.md § A1M3, Par build (the step tables
// there mirror these).
import { defineBuilds } from '../../define.ts';
import type { BuildStep, GridPos } from '../../types.ts';

/** Inside the hairpin, under the air lane: covers both legs. */
const MID_WEST: GridPos = [4, 4];
const MID_EAST: GridPos = [8, 4];
const MID_SOUTH: GridPos = [7, 5];
/** The crashed drone at the hairpin's bend: a pad once the drone clears it. */
const BEND_WRECK: GridPos = [1, 5];
const NORTH_WEST: GridPos = [3, 2];
const SOUTH_MID: GridPos = [6, 7];
/** The salvage-only drones. */
const EAST_WRECK: GridPos = [12, 6];
const SOUTH_WRECK: GridPos = [6, 8];
const STRIKE_AT: GridPos = [2, 5];

function parSteps(): BuildStep[] {
  return [
    { wave: 1, holdFireWhile: 'neutral' },
    { wave: 1, build: 'rivet', tile: MID_WEST },
    { wave: 1, build: 'thumper', tile: MID_EAST },
    { wave: 2, clear: BEND_WRECK },
    { wave: 2, clear: EAST_WRECK },
    { wave: 2, clear: SOUTH_WRECK },
    { wave: 2, build: 'sprinkler', tile: MID_SOUTH },
    { wave: 3, build: 'skyhook', tile: NORTH_WEST },
    { wave: 4, upgrade: MID_WEST },
    { wave: 4, ability: 1, target: STRIKE_AT, when: { afterSec: 20 } },
    { wave: 5, build: 'skyhook', tile: SOUTH_MID },
    { wave: 5, ability: 2, when: { afterSec: 8 } },
    { wave: 6, build: 'thumper', tile: BEND_WRECK },
    { wave: 6, upgrade: MID_WEST },
    { wave: 6, targeting: MID_WEST, mode: 'strong' },
    { wave: 7, upgrade: MID_EAST },
    { wave: 7, ability: 1, target: STRIKE_AT, when: { afterSec: 20 } },
    { wave: 8, upgrade: NORTH_WEST },
    { wave: 8, ability: 2, when: { afterSec: 22 } },
    { wave: 8, ability: 1, target: STRIKE_AT, when: { afterSec: 20 } },
  ];
}

const PAR_STEPS = parSteps();
const PAR_LOADOUT = ['rivet', 'thumper', 'sprinkler', 'skyhook'] as const;

/** Far from the air lane (> 3.5 tiles): a Rivet here can't reach the flyers (D079). */
const HIGH_GROUND: GridPos = [9, 2];
const SPAWN_SIDE: GridPos = [12, 2];

export const builds = defineBuilds({
  // A1M3's reference profile (campaign.md § 4.9): the issued kit, now with the Skyhook.
  referenceProfile: {
    towers: ['rivet', 'thumper', 'sprinkler', 'skyhook'],
    specs: [],
    shop: {},
    protocols: [],
    technicianAbility: 'orbital_strike',
  },
  parBuild: { loadout: PAR_LOADOUT, steps: PAR_STEPS },
  noCounterBuilds: {
    // No air answer: Thumpers and the Sprinkler, Rivets only out of the air lane's reach.
    air: {
      loadout: ['rivet', 'thumper', 'sprinkler'],
      steps: [
        { wave: 1, holdFireWhile: 'neutral' },
        { wave: 1, build: 'thumper', tile: MID_EAST },
        { wave: 1, build: 'rivet', tile: HIGH_GROUND },
        { wave: 2, clear: BEND_WRECK },
        { wave: 2, build: 'sprinkler', tile: MID_SOUTH },
        { wave: 3, build: 'thumper', tile: MID_WEST },
        { wave: 4, ability: 1, target: STRIKE_AT, when: { afterSec: 20 } },
        { wave: 4, build: 'rivet', tile: SPAWN_SIDE },
        { wave: 5, upgrade: HIGH_GROUND },
        { wave: 5, ability: 2, when: { afterSec: 8 } },
        { wave: 6, upgrade: MID_EAST },
        { wave: 6, build: 'thumper', tile: BEND_WRECK },
        { wave: 7, upgrade: HIGH_GROUND },
        { wave: 7, ability: 1, target: STRIKE_AT, when: { afterSec: 20 } },
        { wave: 8, upgrade: MID_WEST },
      ],
    },
    // No armor answer: no Thumper, Rivets held below T3, the Sprinkler and the Skyhooks.
    armor: {
      loadout: ['rivet', 'sprinkler', 'skyhook'],
      steps: [
        { wave: 1, holdFireWhile: 'neutral' },
        { wave: 1, build: 'rivet', tile: MID_WEST },
        { wave: 1, build: 'rivet', tile: MID_EAST },
        { wave: 2, clear: BEND_WRECK },
        { wave: 2, build: 'sprinkler', tile: MID_SOUTH },
        { wave: 3, build: 'skyhook', tile: NORTH_WEST },
        { wave: 4, upgrade: MID_WEST },
        { wave: 4, ability: 1, target: STRIKE_AT, when: { afterSec: 20 } },
        { wave: 5, build: 'skyhook', tile: SOUTH_MID },
        { wave: 5, ability: 2, when: { afterSec: 8 } },
        { wave: 6, build: 'rivet', tile: BEND_WRECK },
        { wave: 6, upgrade: MID_EAST },
        { wave: 7, upgrade: BEND_WRECK },
        { wave: 7, ability: 1, target: STRIKE_AT, when: { afterSec: 20 } },
        { wave: 8, upgrade: NORTH_WEST },
      ],
    },
  },
  // The air test peaks with W5's flock and the armor test with W6's Haulers (act1.md § A1M3).
  noCounterLoseByWave: 6,
  parMedals: ['challenge'],
  rndPickChanges: ['orbital_strike_mk2'],
  altBuilds: {},
});
