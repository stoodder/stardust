// A1M5 balance-harness builds: docs/story/campaign/act1.md § A1M5, Par build (the step tables
// there mirror these).
import { defineBuilds } from '../../define.ts';
import type { BuildStep, GridPos } from '../../types.ts';

/** The Spires high ground, inside the west zigzag: it covers the whole Spires road. */
const HG_WEST: GridPos = [3, 3];
/** The warren high ground, inside the east zigzag: it covers the whole warren track. */
const HG_EAST: GridPos = [10, 3];
/** The power node above the gate's west side. */
const NODE: GridPos = [5, 5];
/** Above the gate, between the node and GATE_NE. */
const GATE_N: GridPos = [6, 5];
const GATE_NE: GridPos = [7, 5];
/** South-east of the gate, beside row 6's east run, under the air lane's end. */
const GATE_SE: GridPos = [8, 7];
/** The west zigzag's pads: its upper pocket, and its lower pocket's two. */
const WEST_UP: GridPos = [2, 3];
const WEST_LOW: GridPos = [2, 5];
const WEST_LOW_E: GridPos = [3, 5];
/** The east zigzag's pads. */
const EAST_UP: GridPos = [11, 3];
const EAST_LOW_W: GridPos = [10, 5];
const EAST_LOW: GridPos = [11, 5];
/** Strike points: the gate, and row 6 on each side of it. */
const GATE: GridPos = [6, 6];
const WEST_RUN: GridPos = [3, 6];
const EAST_RUN: GridPos = [9, 6];

function parSteps(): BuildStep[] {
  return [
    { wave: 1, build: 'rivet', tile: HG_WEST },
    { wave: 1, build: 'thumper', tile: NODE },
    { wave: 1, build: 'sprinkler', tile: GATE_N }, // Sitting Ducks with the node's Thumper
    { wave: 2, upgrade: HG_WEST },
    { wave: 3, build: 'rivet', tile: HG_EAST },
    { wave: 3, build: 'thumper', tile: GATE_NE }, // Sitting Ducks with the same Sprinkler
    { wave: 4, upgrade: NODE },
    { wave: 4, upgrade: GATE_NE },
    { wave: 5, upgrade: HG_WEST }, // T3: pierce
    { wave: 5, upgrade: HG_EAST },
    { wave: 5, ability: 1, target: GATE, when: { afterSec: 20 } },
    { wave: 6, build: 'skyhook', tile: GATE_SE },
    { wave: 6, upgrade: HG_EAST }, // T3: pierce
    { wave: 7, upgrade: NODE },
    { wave: 7, upgrade: GATE_NE },
    { wave: 7, upgrade: GATE_SE },
    { wave: 8, specialize: NODE, spec: 'a' }, // Cluster Thumper
    { wave: 8, ability: 1, target: GATE, when: { afterSec: 12 } },
    { wave: 8, ability: 2, target: GATE, when: { afterSec: 14 } },
    { wave: 9, targeting: HG_WEST, mode: 'strong' },
    { wave: 9, build: 'thumper', tile: WEST_LOW_E },
    { wave: 9, upgrade: WEST_LOW_E },
    { wave: 9, upgrade: WEST_LOW_E },
    { wave: 9, ability: 1, target: GATE, when: { afterSec: 57 } },
    { wave: 9, ability: 2, target: GATE, when: { afterSec: 57 } },
  ];
}

const PAR_STEPS = parSteps();
const PAR_LOADOUT = ['rivet', 'thumper', 'sprinkler', 'skyhook'] as const;

const key = ([c, r]: GridPos): string => `${c},${r}`;

/**
 * Par with every tower in `swap` built as `to` instead, every Rivet held at `rivetCap`, and
 * specializations and targeting changes on swapped towers dropped.
 */
function swapped(
  swap: readonly string[],
  to: 'rivet' | 'zapcoil' | 'thumper',
  rivetCap: number,
): BuildStep[] {
  const tier = new Map<string, number>();
  const rivets = new Set<string>();
  const changed = new Set<string>();
  const steps: BuildStep[] = [];
  for (const s of PAR_STEPS) {
    if ('build' in s) {
      const k = key(s.tile);
      const b = swap.includes(s.build) ? { ...s, build: to } : s;
      if (b !== s) changed.add(k);
      if (b.build === 'rivet') rivets.add(k);
      tier.set(k, 1);
      steps.push(b);
    } else if ('upgrade' in s) {
      const k = key(s.upgrade);
      const next = (tier.get(k) ?? 1) + 1;
      tier.set(k, next);
      if (!rivets.has(k) || next <= rivetCap) steps.push(s);
    } else if ('specialize' in s) {
      if (!changed.has(key(s.specialize))) steps.push(s);
    } else if ('targeting' in s) {
      if (!changed.has(key(s.targeting))) steps.push(s);
    } else {
      steps.push(s);
    }
  }
  return steps;
}

export const builds = defineBuilds({
  // A1M5's reference profile (campaign.md § 4.9): A1M4's, plus the Thumper's specs (Engineering
  // opened after A1M4), Reinforced Core 1, and the Sprinkler tune-up.
  referenceProfile: {
    towers: ['rivet', 'thumper', 'sprinkler', 'skyhook', 'zapcoil'],
    specs: ['thumper'],
    shop: { tune_rivet: 1, tune_thumper: 1, tune_sprinkler: 1, reinforced_core: 1 },
    protocols: ['head_start'],
    technicianAbility: 'orbital_strike',
  },
  parBuild: { loadout: PAR_LOADOUT, steps: PAR_STEPS },
  noCounterBuilds: {
    // No air answer: Thumpers and Sprinklers only (no Rivet, Skyhook, or Zapcoil anywhere).
    air: {
      loadout: ['thumper', 'sprinkler'],
      steps: swapped(['rivet', 'skyhook'], 'thumper', 3),
    },
    // No splash answer: par with every Thumper a Rivet (the Rivets may reach T3).
    splash: {
      loadout: ['rivet', 'sprinkler', 'skyhook'],
      steps: swapped(['thumper'], 'rivet', 3),
    },
    // No armor answer: par with every Thumper a Zapcoil and every Rivet held at T2 (no pierce).
    armor: {
      loadout: ['rivet', 'sprinkler', 'skyhook', 'zapcoil'],
      steps: swapped(['thumper'], 'zapcoil', 2),
    },
  },
  // The armor test is W5's Haulers and the air test W6's flock, so each no-counter build must lose
  // by W7 rather than W6 (act1.md § A1M5).
  noCounterLoseByWave: 7,
  rndPickChanges: ['orbital_strike_mk2', 'rapport_bricks'],
  altBuilds: {
    // Rivet, Skyhook, Zapcoil: Rivet T3 on the Haulers, Zapcoils chaining through the boss's young,
    // two Skyhooks on the flock.
    rivet_chain: {
      loadout: ['rivet', 'skyhook', 'zapcoil'],
      steps: [
        { wave: 1, build: 'rivet', tile: HG_WEST },
        { wave: 1, build: 'zapcoil', tile: NODE },
        { wave: 2, upgrade: HG_WEST },
        { wave: 3, build: 'rivet', tile: HG_EAST },
        { wave: 3, build: 'zapcoil', tile: GATE_NE },
        { wave: 4, upgrade: NODE },
        { wave: 4, upgrade: GATE_NE },
        { wave: 5, upgrade: HG_WEST },
        { wave: 5, upgrade: HG_EAST },
        { wave: 5, ability: 1, target: GATE, when: { afterSec: 20 } },
        { wave: 6, build: 'skyhook', tile: GATE_SE },
        { wave: 6, build: 'skyhook', tile: GATE_N },
        { wave: 6, upgrade: HG_EAST },
        { wave: 7, upgrade: NODE },
        { wave: 7, upgrade: GATE_NE },
        { wave: 7, build: 'rivet', tile: WEST_LOW_E },
        { wave: 8, upgrade: WEST_LOW_E },
        { wave: 8, upgrade: WEST_LOW_E },
        { wave: 8, ability: 1, target: GATE, when: { afterSec: 12 } },
        { wave: 8, ability: 2, target: GATE, when: { afterSec: 14 } },
        { wave: 9, ability: 1, target: WEST_RUN, when: { afterSec: 60 } },
        { wave: 9, ability: 2, target: WEST_RUN, when: { afterSec: 61 } },
      ],
    },
    // Thumper (Bunker Buster), Zapcoil, Skyhook: a dedicated air answer under the lane, Zapcoils on
    // the zigzags, the Bunker Buster for the armor.
    buster_chain: {
      loadout: ['thumper', 'zapcoil', 'skyhook'],
      steps: [
        { wave: 1, build: 'thumper', tile: NODE },
        { wave: 1, build: 'zapcoil', tile: WEST_LOW_E },
        { wave: 2, upgrade: NODE },
        { wave: 3, build: 'zapcoil', tile: EAST_LOW_W },
        { wave: 3, build: 'thumper', tile: GATE_NE },
        { wave: 4, upgrade: WEST_LOW_E },
        { wave: 4, upgrade: EAST_LOW_W },
        { wave: 5, upgrade: GATE_NE },
        { wave: 5, ability: 1, target: GATE, when: { afterSec: 20 } },
        { wave: 6, build: 'skyhook', tile: GATE_N },
        { wave: 6, upgrade: GATE_N },
        { wave: 7, upgrade: NODE },
        { wave: 7, upgrade: GATE_NE },
        { wave: 8, specialize: NODE, spec: 'b' }, // Bunker Buster
        { wave: 8, ability: 1, target: GATE, when: { afterSec: 12 } },
        { wave: 8, ability: 2, target: GATE, when: { afterSec: 14 } },
        { wave: 9, ability: 1, target: WEST_RUN, when: { afterSec: 40 } },
        { wave: 9, ability: 2, target: WEST_RUN, when: { afterSec: 60 } },
      ],
    },
  },
});

// Pads the builds don't use yet (kept named for tuning).
void [WEST_UP, WEST_LOW, EAST_UP, EAST_LOW, EAST_RUN];
