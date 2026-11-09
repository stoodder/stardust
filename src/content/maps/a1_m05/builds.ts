// A1M5 balance-harness builds: docs/story/campaign/act1.md § A1M5, Par build (the step tables
// there mirror these).
import { defineBuilds } from '../../define.ts';
import { REFERENCE_PROFILES } from '../../upgrades/reference.ts';
import type { BuildStep, GridPos } from '../../types.ts';
import { OPEN } from './waves.ts';

/** The Spires high ground, inside the west zigzag: it covers the whole Spires road. */
const HG_WEST: GridPos = [3, 3];
/**
 * The gate high ground, just north-east of the gate: it covers both roads' runs into the gate and
 * the merged road.
 */
const HG_GATE: GridPos = [7, 5];
/** The power node above the gate's west side. */
const NODE: GridPos = [5, 5];
/** Directly above the gate, under the air lane. */
const GATE_N: GridPos = [6, 5];
/** South-east of the gate, beside row 6's east run. */
const GATE_SE: GridPos = [8, 7];
/** The west zigzag's lower pocket: two pads, the east one beside the node. */
const WEST_LOW: GridPos = [3, 5];
const WEST_LOW_E: GridPos = [4, 5];
/** South of row 6's east run, under the `sky_east` air lane's last leg. */
const SKY_EAST: GridPos = [11, 7];
/** Strike points: the gate, and row 6 east of it, where the warren convoys walk in. */
const GATE: GridPos = [6, 6];
const EAST_RUN: GridPos = [9, 6];
/** Row 6's east end, by the warren track's last turn. */
const EAST_TURN: GridPos = [11, 6];

function parSteps(): BuildStep[] {
  return [
    { wave: 1, build: 'rivet', tile: HG_WEST },
    { wave: 1, build: 'thumper', tile: NODE },
    { wave: 1, build: 'sprinkler', tile: WEST_LOW_E }, // Sitting Ducks with the node's Thumper
    { wave: 2, upgrade: HG_WEST },
    { wave: 3, build: 'rivet', tile: HG_GATE },
    { wave: 3, build: 'thumper', tile: GATE_SE },
    { wave: 4, upgrade: NODE },
    { wave: 4, upgrade: GATE_SE },
    { wave: 5, upgrade: HG_WEST }, // T3: pierce
    { wave: 5, upgrade: HG_GATE },
    { wave: 5, ability: 1, target: EAST_RUN, when: { afterSec: OPEN + 30 } },
    { wave: 6, build: 'skyhook', tile: GATE_N },
    { wave: 6, upgrade: HG_GATE }, // T3: pierce
    { wave: 6, ability: 2, target: GATE, when: { afterSec: OPEN + 45 } }, // the Chonk column
    { wave: 7, upgrade: NODE },
    { wave: 7, ability: 1, target: EAST_TURN, when: { afterSec: OPEN + 27 } }, // the warren convoy
    { wave: 7, ability: 2, target: GATE, when: { afterSec: OPEN + 30 } },
    { wave: 7, upgrade: GATE_SE },
    { wave: 7, upgrade: GATE_N },
    { wave: 8, specialize: NODE, spec: 'a' }, // Cluster Thumper
    { wave: 8, build: 'skyhook', tile: SKY_EAST }, // W6 showed the east lane: cover it
    { wave: 8, ability: 1, target: EAST_RUN, when: { afterSec: OPEN + 44 } }, // the warren convoy
    { wave: 9, targeting: HG_WEST, mode: 'strong' },
    { wave: 9, targeting: HG_GATE, mode: 'strong' },
    { wave: 9, build: 'thumper', tile: WEST_LOW },
    { wave: 9, upgrade: WEST_LOW },
    { wave: 9, upgrade: WEST_LOW },
    // The Matriarch's phase 3, at the gate (she comes up the road BOSS_DELAY_SEC into W9).
    { wave: 9, ability: 1, target: GATE, when: { afterSec: 60 } },
    { wave: 9, ability: 2, target: GATE, when: { afterSec: 60 } },
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
  referenceProfile: REFERENCE_PROFILES.a1_m05,
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
  // Par drives the Matriarch off at the gate, before the banner line: Party Pooper Prevention.
  parMedals: ['challenge'],
  // Each pick saves W7's second warren Hauler: Mk II's wider blast takes it with its Elder, and
  // Rapport readies Suppressing Fire at the gate in time for it (T228).
  rndPickChanges: ['orbital_strike_mk2', 'rapport_bricks'],
  // C1 (campaign.md § 6.2): par holding fire through the Quiet Wave spares it; par clears it.
  runEndFlags: {
    spared_quiet_wave: { setBy: ['holdFireWhile:quiet_wave'], notSetBy: ['par'] },
  },
  altBuilds: {
    // Under-built (T334): par without its Cluster spec, a player who never opened Engineering.
    // It may win or lose, but never to one wave's wall.
    no_spec: {
      loadout: PAR_LOADOUT,
      steps: PAR_STEPS.filter((s) => !('specialize' in s)),
    },
    // Thumper (Bunker Buster), Sprinkler, Zapcoil: the Thumpers and the Sprinkler at the gate
    // (Sitting Ducks), a Zapcoil beside the Sprinkler (Conductive) chaining through the
    // Bunchlings, Zapcoils on the high ground and under the air lane for the flocks, and a Bunker
    // Buster on the node for the Haulers and the Matriarch.
    ducks_and_chain: {
      loadout: ['thumper', 'sprinkler', 'zapcoil'],
      steps: [
        { wave: 1, build: 'thumper', tile: NODE },
        { wave: 1, build: 'sprinkler', tile: WEST_LOW_E },
        { wave: 1, build: 'zapcoil', tile: WEST_LOW },
        { wave: 2, upgrade: NODE },
        { wave: 3, build: 'thumper', tile: GATE_SE },
        { wave: 3, build: 'zapcoil', tile: HG_GATE },
        { wave: 4, upgrade: GATE_SE },
        { wave: 4, upgrade: WEST_LOW },
        { wave: 5, ability: 1, target: EAST_RUN, when: { afterSec: OPEN + 30 } },
        { wave: 5, upgrade: NODE },
        { wave: 5, upgrade: HG_GATE },
        { wave: 6, build: 'zapcoil', tile: GATE_N },
        { wave: 6, upgrade: GATE_N },
        { wave: 7, ability: 1, target: EAST_RUN, when: { afterSec: OPEN + 28 } },
        { wave: 7, upgrade: GATE_SE },
        { wave: 7, upgrade: WEST_LOW_E },
        { wave: 8, ability: 1, target: EAST_RUN, when: { afterSec: OPEN + 45 } },
        { wave: 8, specialize: NODE, spec: 'b' }, // Bunker Buster
        { wave: 9, ability: 1, target: GATE, when: { afterSec: 60 } },
        { wave: 9, ability: 2, target: GATE, when: { afterSec: 60 } },
        { wave: 9, upgrade: GATE_N },
        { wave: 9, upgrade: HG_GATE },
      ],
    },
    // Rivet, Thumper, Zapcoil: par's Rivets and Thumpers with a Zapcoil under the air lane in place
    // of the Skyhook (it hits air) and no Sprinkler; a third Thumper for the Matriarch.
    shell_and_chain: {
      loadout: ['rivet', 'thumper', 'zapcoil'],
      steps: [
        { wave: 1, build: 'rivet', tile: HG_WEST },
        { wave: 1, build: 'thumper', tile: NODE },
        { wave: 2, upgrade: HG_WEST },
        { wave: 3, build: 'rivet', tile: HG_GATE },
        { wave: 3, build: 'thumper', tile: GATE_SE },
        { wave: 4, upgrade: NODE },
        { wave: 4, upgrade: GATE_SE },
        { wave: 5, upgrade: HG_WEST }, // T3: pierce
        { wave: 5, upgrade: HG_GATE },
        { wave: 5, ability: 1, target: EAST_RUN, when: { afterSec: OPEN + 30 } },
        { wave: 6, build: 'zapcoil', tile: GATE_N },
        { wave: 6, upgrade: HG_GATE }, // T3: pierce
        { wave: 7, ability: 1, target: EAST_RUN, when: { afterSec: OPEN + 28 } },
        { wave: 7, upgrade: NODE },
        { wave: 7, upgrade: GATE_SE },
        { wave: 7, upgrade: GATE_N },
        { wave: 8, ability: 1, target: EAST_RUN, when: { afterSec: OPEN + 45 } },
        { wave: 8, specialize: NODE, spec: 'a' }, // Cluster Thumper
        { wave: 9, targeting: HG_WEST, mode: 'strong' },
        { wave: 9, targeting: HG_GATE, mode: 'strong' },
        { wave: 9, build: 'thumper', tile: WEST_LOW },
        { wave: 9, upgrade: WEST_LOW },
        { wave: 9, ability: 1, target: GATE, when: { afterSec: 60 } },
        { wave: 9, ability: 2, target: GATE, when: { afterSec: 60 } },
        { wave: 9, upgrade: WEST_LOW },
      ],
    },
  },
  altExpectations: { no_spec: { outcome: 'either' } },
});
