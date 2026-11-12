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
/** The conduit (power node), inside the road's last bend. */
const CONDUIT: GridPos = [11, 9];
/** South of the run under the vats. */
const SOUTH_MID: GridPos = [7, 9];
const SOUTH_E: GridPos = [10, 9];
/** Beside the core, west of the last leg. */
const CORE_W: GridPos = [8, 10];

function parSteps(): BuildStep[] {
  return [
    // The setup: a Zapcoil on the east catwalk over the hatch, one on the conduit, a Thumper
    // between the road's runs, a Skyhook by the core.
    { wave: 1, build: 'zapcoil', tile: CATWALK_E },
    { wave: 1, build: 'thumper', tile: SOUTH_MID },
    { wave: 1, build: 'zapcoil', tile: CONDUIT },
    { wave: 1, build: 'skyhook', tile: CORE_W },
    { wave: 1, upgrade: CATWALK_E },
    { wave: 2, upgrade: SOUTH_MID },
    { wave: 2, upgrade: CONDUIT },
    { wave: 3, upgrade: CORE_W },
    { wave: 3, upgrade: SOUTH_MID },
    { wave: 4, upgrade: CATWALK_E },
    { wave: 4, build: 'prism', tile: CATWALK_W },
    { wave: 5, upgrade: CATWALK_W },
    { wave: 5, upgrade: CORE_W },
    { wave: 6, upgrade: CONDUIT },
    { wave: 6, build: 'thumper', tile: SOUTH_E },
    { wave: 7, upgrade: SOUTH_E },
    { wave: 7, upgrade: CATWALK_W },
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
