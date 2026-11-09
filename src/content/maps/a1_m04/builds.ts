// A1M4 balance-harness builds: docs/story/campaign/act1.md § A1M4, Par build (the step tables
// there mirror these).
import { defineBuilds } from '../../define.ts';
import type { BuildStep, GridPos } from '../../types.ts';

/** Inside the plaza's north-west corner, beside the west side. */
const NW_PAD: GridPos = [3, 2];
/** Inside the south-east bend: covers the south side's east half and the east side. */
const SE_BEND: GridPos = [9, 6];
/** The podium cart (the power node underneath) by the south-west bend. */
const NODE: GridPos = [4, 5];
/** The south-east cart (a pad underneath), inside the bend. */
const SE_CART: GridPos = [8, 5];
/** The salvage-only carts. */
const N_CART_W: GridPos = [5, 2];
const N_CART_E: GridPos = [7, 2];
const S_CART: GridPos = [6, 6];
/** The gate court between the east side and the east edge: the Conductive pair. */
const COURT_W: GridPos = [11, 5];
const COURT_E: GridPos = [12, 5];
/** The gate court's north pad. */
const COURT_N: GridPos = [11, 4];
/** West of the west side. */
const WEST_N: GridPos = [1, 3];
const WEST_S: GridPos = [1, 6];
/** The strike points: the south-west bend and the south side's east end. */
const SW_STRIKE: GridPos = [3, 7];
const SE_STRIKE: GridPos = [9, 7];

function parSteps(): BuildStep[] {
  return [
    { wave: 1, build: 'rivet', tile: NW_PAD },
    { wave: 1, build: 'thumper', tile: SE_BEND },
    { wave: 1, clear: NODE },
    { wave: 2, build: 'zapcoil', tile: COURT_E },
    { wave: 2, clear: SE_CART },
    { wave: 3, build: 'thumper', tile: NODE },
    { wave: 3, build: 'sprinkler', tile: COURT_W }, // Conductive with the Zapcoil
    { wave: 3, clear: N_CART_W },
    { wave: 3, clear: N_CART_E },
    { wave: 3, clear: S_CART },
    { wave: 4, ability: 2 }, // Clearance Sale: three upgrades at 40% off
    { wave: 4, upgrade: SE_BEND },
    { wave: 4, upgrade: NODE },
    { wave: 4, upgrade: COURT_E },
    { wave: 5, build: 'thumper', tile: COURT_N },
    { wave: 5, ability: 1, target: SE_STRIKE, when: { afterSec: 12 } },
    { wave: 6, upgrade: NW_PAD },
    { wave: 6, upgrade: COURT_N },
    { wave: 7, upgrade: NW_PAD }, // T3: pierce
    { wave: 7, ability: 1, target: SW_STRIKE, when: { afterSec: 14 } },
    { wave: 8, ability: 2 },
    { wave: 8, upgrade: SE_BEND },
    { wave: 8, upgrade: NODE },
    { wave: 8, upgrade: COURT_E },
    { wave: 9, ability: 1, target: SW_STRIKE, when: { afterSec: 14 } },
    { wave: 9, upgrade: COURT_N },
  ];
}

const PAR_STEPS = parSteps();

const key = ([c, r]: GridPos): string => `${c},${r}`;

/**
 * Par with every tower in `swap` built as a Rivet instead, and every Rivet held at `rivetCap`
 * (its upgrades past that dropped); targeting changes only matter to the pierce, so they go too.
 */
function swapped(swap: readonly string[], rivetCap: number): BuildStep[] {
  const tier = new Map<string, number>();
  const rivets = new Set<string>();
  const steps: BuildStep[] = [];
  for (const s of PAR_STEPS) {
    if ('build' in s) {
      const b = swap.includes(s.build) ? { ...s, build: 'rivet' as const } : s;
      if (b.build === 'rivet') rivets.add(key(s.tile));
      tier.set(key(s.tile), 1);
      steps.push(b);
    } else if ('upgrade' in s) {
      const k = key(s.upgrade);
      const next = (tier.get(k) ?? 1) + 1;
      tier.set(k, next);
      if (!rivets.has(k) || next <= rivetCap) steps.push(s);
    } else if (!('targeting' in s)) {
      steps.push(s);
    }
  }
  return steps;
}
const PAR_LOADOUT = ['rivet', 'thumper', 'sprinkler', 'zapcoil'] as const;

export const builds = defineBuilds({
  // A1M4's reference profile (campaign.md § 4.9): the issued kit and Zibzab's Zapcoil sample, Head
  // Start in the protocol slot, and the Rivet and Thumper tune-ups at rank 1.
  referenceProfile: {
    towers: ['rivet', 'thumper', 'sprinkler', 'skyhook', 'zapcoil'],
    specs: [],
    shop: { tune_rivet: 1, tune_thumper: 1 },
    protocols: ['head_start'],
    technicianAbility: 'orbital_strike',
  },
  parBuild: { loadout: PAR_LOADOUT, steps: PAR_STEPS },
  noCounterBuilds: {
    // No splash answer (enemies.md § 3.1): par with every Thumper and the Zapcoil swapped for a
    // Rivet (the Rivets may reach T3), an idle Skyhook for the fourth slot, the same casts.
    splash: { loadout: ['rivet', 'sprinkler', 'skyhook'], steps: swapped(['thumper', 'zapcoil'], 3) },
    // No armor answer: par with every Thumper swapped for a Rivet and every Rivet held at T2 (no
    // pierce); the same Sprinkler, Zapcoil, and casts, and an idle Skyhook.
    armor: { loadout: ['rivet', 'sprinkler', 'skyhook', 'zapcoil'], steps: swapped(['thumper'], 2) },
  },
  // The armor test is W7's six Haulers, and they walk the plaza for 44 s: their leaks land after
  // W8's countdown has started, so both no-counter builds must lose by W8 rather than W6.
  noCounterLoseByWave: 8,
  altBuilds: {
    // Skyhook (idle), Thumper, Zapcoil: the Zapcoil chains through the huddles, the Thumpers take
    // the Chonks and Haulers.
    chain_and_shell: {
      loadout: ['skyhook', 'thumper', 'zapcoil'],
      steps: [
        { wave: 1, build: 'thumper', tile: SE_BEND },
        { wave: 1, build: 'zapcoil', tile: NW_PAD },
        { wave: 1, clear: NODE },
        { wave: 2, clear: SE_CART },
        { wave: 3, build: 'thumper', tile: NODE },
        { wave: 3, build: 'zapcoil', tile: COURT_E },
        { wave: 4, ability: 2 },
        { wave: 4, upgrade: SE_BEND },
        { wave: 4, upgrade: NODE },
        { wave: 4, upgrade: NW_PAD },
        { wave: 5, build: 'thumper', tile: COURT_N },
        { wave: 5, ability: 1, target: SE_STRIKE, when: { afterSec: 12 } },
        { wave: 6, upgrade: COURT_N },
        { wave: 6, upgrade: COURT_E },
        { wave: 7, ability: 1, target: SW_STRIKE, when: { afterSec: 14 } },
        { wave: 7, build: 'thumper', tile: SE_CART },
        { wave: 8, ability: 2 },
        { wave: 8, upgrade: SE_BEND },
        { wave: 8, upgrade: NODE },
        { wave: 8, upgrade: COURT_N },
        { wave: 9, ability: 1, target: SW_STRIKE, when: { afterSec: 14 } },
      ],
    },
    // Thumper, Sprinkler, Skyhook (idle): the Sprinklers slow the huddles into the bends, where
    // three Thumpers shell them.
    slow_and_shell: {
      loadout: ['thumper', 'sprinkler', 'skyhook'],
      steps: [
        { wave: 1, build: 'thumper', tile: SE_BEND },
        { wave: 1, build: 'sprinkler', tile: COURT_W },
        { wave: 1, clear: NODE },
        { wave: 3, build: 'thumper', tile: NODE },
        { wave: 3, build: 'sprinkler', tile: NW_PAD },
        { wave: 4, ability: 2 },
        { wave: 4, upgrade: SE_BEND },
        { wave: 4, upgrade: NODE },
        { wave: 4, build: 'thumper', tile: COURT_N },
        { wave: 5, ability: 1, target: SE_STRIKE, when: { afterSec: 12 } },
        { wave: 6, upgrade: COURT_N },
        { wave: 6, build: 'thumper', tile: WEST_N },
        { wave: 7, ability: 1, target: SW_STRIKE, when: { afterSec: 14 } },
        { wave: 7, upgrade: WEST_N },
        { wave: 8, ability: 2 },
        { wave: 8, upgrade: SE_BEND },
        { wave: 8, upgrade: NODE },
        { wave: 8, upgrade: COURT_N },
        { wave: 9, ability: 1, target: SW_STRIKE, when: { afterSec: 14 } },
      ],
    },
  },
});
