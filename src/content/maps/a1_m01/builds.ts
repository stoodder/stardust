// A1M1 balance-harness builds: docs/story/campaign/act1.md § A1M1, Par build (the step lists
// there mirror these). First pass: T107 tunes them against the harness.
//
// Economy, assuming every enemy dies (core-loop.md § 2.3: bounties plus a 20 + 4 × wave clear
// bonus; 350 to start): the bank in each wave's build phase under par is W1 350, W2 292, W3 270,
// W4 113, W5 165, W6 95, W7 179. So the second Thumper (125) waits for W7: in W6 it would only
// become affordable after about 8 of the 10 Zoomers die, too late to touch W6.
//
// M1 cut (D004): no Crossfire, medals, Suppressing Fire, or Bricks ally. The Technician's Orbital
// Strike (owned from A1M1, campaign.md § 4.2) arrives with T113.
// TODO(T113): set `technicianAbility: 'orbital_strike'` and add par's strikes on the W5 and W7
// clumps (`{ wave: 5, ability: 1, … }`, `{ wave: 7, ability: 1, … }`).
import { defineBuilds } from '../../define.ts';

/** The greenhouse roof: A1M1's one high-ground tile. */
const ROOF = [7, 2] as const;

export const builds = defineBuilds({
  // A1M1's reference profile: the issued kit and nothing bought (campaign.md § 4.9).
  referenceProfile: {
    towers: ['rivet', 'thumper'],
    specs: [],
    shop: {},
    protocols: [],
    technicianAbility: null,
  },
  parBuild: {
    loadout: ['rivet', 'thumper'],
    steps: [
      { wave: 1, build: 'rivet', tile: ROOF },
      { wave: 2, upgrade: ROOF }, // T2: W2 teaches upgrading
      { wave: 3, build: 'rivet', tile: [10, 4] },
      { wave: 3, build: 'thumper', tile: [10, 5] }, // the Crossfire pair (a link from T202)
      { wave: 5, upgrade: ROOF }, // T3 (affordable from W5's build phase)
      { wave: 7, build: 'thumper', tile: [3, 5] },
    ],
  },
  // A1M1 requires no counters (maps.md § 6.4): the tutorial never punishes skipping the Thumper.
  noCounterBuilds: {},
  altBuilds: {
    // Par with every Thumper swapped for a Rivet. Must win, at a lower margin than par.
    rivet_only: {
      loadout: ['rivet'],
      steps: [
        { wave: 1, build: 'rivet', tile: ROOF },
        { wave: 2, upgrade: ROOF },
        { wave: 3, build: 'rivet', tile: [10, 4] },
        { wave: 3, build: 'rivet', tile: [10, 5] },
        { wave: 5, upgrade: ROOF },
        { wave: 7, build: 'rivet', tile: [3, 5] },
      ],
    },
  },
});
