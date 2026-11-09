// A1M1 balance-harness builds: docs/story/campaign/act1.md § A1M1, Par build (the step lists
// there mirror these). Tuned by T107: par wins at 95 (one W1 Nibbler slips past the lone roof
// Rivet), and rivet_only wins lower, because W7's big clumps are what the Thumper's splash is for.
//
// Economy (core-loop.md § 2.3: bounties plus a 20 + 4 × wave clear bonus; 350 to start): under
// par, which lets that one W1 Nibbler through, the bank in each wave's build phase is W1 350,
// W2 295, W3 273, W4 116, W5 168, W6 98, W7 182. So the second Thumper (125) waits for W7: in W6
// it would only become affordable after most of the 10 Zoomers die, too late to touch W6.
//
// M1 cut (D004): no Crossfire, medals, Suppressing Fire, or Bricks ally. The Technician's Orbital
// Strike (owned from A1M1, campaign.md § 4.2) hits the first clump of W5 and of W7 at the road's
// first corner (4,3): a clump's lead Nibbler (1 tile/s) is at route distance 3.4 when a strike
// cast 2.4 s into the wave lands 1 s later, and its tail is within a tile behind (W5's 4 at
// 0.25 s, W7's 6 at 0.2 s), so the whole clump sits inside the 1.5-tile radius around (4,3).
import { defineBuilds } from '../../define.ts';

/** The greenhouse roof: A1M1's one high-ground tile. */
const ROOF = [7, 2] as const;
/** The road's first corner, where the strikes land on a clump. */
const CORNER = [4, 3] as const;
/** Cast 2.4 s into the wave; the strike lands 1 s later, on the lead clump at the corner. */
const STRIKE_WHEN = { afterSec: 2.4 } as const;

export const builds = defineBuilds({
  // A1M1's reference profile: the issued kit and nothing bought (campaign.md § 4.9).
  referenceProfile: {
    towers: ['rivet', 'thumper'],
    specs: [],
    shop: {},
    protocols: [],
    technicianAbility: 'orbital_strike',
  },
  parBuild: {
    loadout: ['rivet', 'thumper'],
    steps: [
      { wave: 1, build: 'rivet', tile: ROOF },
      { wave: 2, upgrade: ROOF }, // T2: W2 teaches upgrading
      { wave: 3, build: 'rivet', tile: [10, 4] },
      { wave: 3, build: 'thumper', tile: [10, 5] }, // the Crossfire pair (a link from T202)
      { wave: 5, upgrade: ROOF }, // T3 (affordable from W5's build phase)
      { wave: 5, ability: 1, target: CORNER, when: STRIKE_WHEN }, // W5 teaches the strike
      { wave: 7, build: 'thumper', tile: [3, 5] },
      { wave: 7, ability: 1, target: CORNER, when: STRIKE_WHEN },
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
        { wave: 5, ability: 1, target: CORNER, when: STRIKE_WHEN },
        { wave: 7, build: 'rivet', tile: [3, 5] },
        { wave: 7, ability: 1, target: CORNER, when: STRIKE_WHEN },
      ],
    },
  },
});
