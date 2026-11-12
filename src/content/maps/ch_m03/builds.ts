// CH_M03 balance-harness builds (Glass Core; T862). The reference profile is the campaign's end
// (FIN's row, campaign.md § 4.9). Under Radio Silence the run's slot 1 is empty whatever the profile
// says (sim/rules.ts `challengeConfig`), so no build casts. Par plays A2M4's answers with the
// campaign's end in hand: Zapcoils (shields, chains, the sky), a Prism on the catwalk, Thumpers for
// the crowds, a Skyhook, and something always watching the hatch.
import { defineBuilds } from '../../define.ts';
import { REFERENCE_PROFILES } from '../../upgrades/reference.ts';
import type { BuildStep, GridPos, TowerId } from '../../types.ts';

// A2M4's pads.
/** The two catwalks either side of the drain hatch (high ground). */
const CATWALK_W: GridPos = [6, 7];
const CATWALK_E: GridPos = [10, 7];
/** East of the vats, inside the road's last bend. */
const VATS_E: GridPos = [12, 7];
/** The conduit (power node), inside the road's last bend. */
const CONDUIT: GridPos = [11, 9];
/** South of the run under the vats. */
const SOUTH_W: GridPos = [4, 9];
const SOUTH_MID: GridPos = [7, 9];
const SOUTH_E: GridPos = [10, 9];
/** Beside the core, west of the last leg. */
const CORE_W: GridPos = [8, 10];
/** In the intake yard, beside the road down into it. */
const YARD_N: GridPos = [4, 3];
const YARD: GridPos = [4, 4];
/** Beside the road in at the north-east. */
const GATE_E: GridPos = [13, 1];
const GATE_W: GridPos = [15, 1];

/** Build `tower` at `tile`, then take it to tier 3. */
const raise = (wave: number, tower: TowerId, tile: GridPos): BuildStep[] => [
  { wave, build: tower, tile },
  { wave, upgrade: tile },
  { wave, upgrade: tile },
];

function parSteps(): BuildStep[] {
  return [
    ...raise(1, 'zapcoil', CATWALK_E),
    ...raise(1, 'thumper', SOUTH_MID),
    ...raise(1, 'zapcoil', CONDUIT),
    { wave: 2, build: 'prism', tile: CATWALK_W },
    { wave: 2, upgrade: CATWALK_W },
    ...raise(3, 'skyhook', CORE_W),
    { wave: 4, upgrade: CATWALK_W },
    ...raise(5, 'thumper', SOUTH_E),
    { wave: 6, specialize: CATWALK_E, spec: 'a' },
    ...raise(7, 'zapcoil', VATS_E),
    { wave: 8, specialize: SOUTH_MID, spec: 'a' },
    ...raise(9, 'zapcoil', YARD),
    ...raise(10, 'thumper', SOUTH_W),
    { wave: 11, specialize: CONDUIT, spec: 'a' },
  ];
}

/** Par's placements and spending with each tower swapped by `swap` (a no-counter build). */
function swapped(swap: Readonly<Partial<Record<TowerId, TowerId>>>): BuildStep[] {
  return parSteps().flatMap((st): BuildStep[] => {
    if ('specialize' in st) return [];
    if (!('build' in st)) return [st];
    const to = swap[st.build];
    return to === undefined ? [st] : [{ ...st, build: to }];
  });
}

export const builds = defineBuilds({
  referenceProfile: REFERENCE_PROFILES.fin_m01,
  // The challenge maps' band is 50–70 (ch_m01, ch_m02), but a Glass Core has 7 integrity (5, and
  // the reference's two Reinforced Core ranks), so a margin only comes in steps of 14.3 points:
  // 2 lost 71.4, 3 lost 57.1, 4 lost 42.9. The band here is 40–75, two to four lost, centred on
  // three (T862 ruling).
  marginBand: { minPct: 40, maxPct: 75 },
  parBuild: { loadout: ['zapcoil', 'thumper', 'prism', 'skyhook'], steps: parSteps() },
  noCounterBuilds: {
    // No Energy, no Soaked: Rivets and a Harpoon for the Zapcoils and the Prism.
    shield: {
      loadout: ['rivet', 'thumper', 'harpoon', 'skyhook'],
      steps: swapped({ zapcoil: 'rivet', prism: 'harpoon' }),
    },
    // No chain, no shell: Prisms and Rivets for the Zapcoils and the Thumpers.
    splash: {
      loadout: ['prism', 'rivet', 'skyhook'],
      steps: swapped({ zapcoil: 'prism', thumper: 'rivet' }),
    },
    // Nothing for the sky: Sprinklers for the Zapcoils and the Skyhook, a Thumper for the Prism.
    air: {
      loadout: ['sprinkler', 'thumper'],
      steps: swapped({ zapcoil: 'sprinkler', skyhook: 'sprinkler', prism: 'thumper' }),
    },
  },
});
