// A1M1 balance-harness builds: docs/story/campaign/act1.md § A1M1, Par build (the step lists
// there mirror these). Tuned by T127 and T130 (D026, D028) without links or tile bonuses; T202a
// then made both live (Crossfire between (10,4) and (10,5), +25% range on the roof) and nudged
// the map just enough to keep every harness check green, until T125 re-tunes it: par skips the
// Thumper's tier 2, and W5's and W7's Zoomer groups grew from 12 to 14. Par now wins at 100 (its
// strikes still save 4 integrity in W7); rivet_only wins lower, because W7's big clumps are what
// the Thumper's splash is for; par without its last step still ends well clear of a loss; and the
// under-built alts lose integrity over several waves, never to one.
//
// Economy (core-loop.md § 2.3: bounties plus a 20 + 4 × wave clear bonus; 350 to start): under
// par, the bank in each wave's build phase is W1 350, W2 198, W3 176, W4 119, W5 221, W6 215,
// W7 311. W4's phase buys nothing: par saves for the roof Rivet's tier 3 (150), which W4's
// bounties complete.
//
// Not yet here: medals, Suppressing Fire, and the Bricks ally (T125). The Technician's Orbital
// Strike (owned from A1M1, campaign.md § 4.2) hits the first clump of W5 and of W7 at the road's
// first corner (4,3): a clump's lead Nibbler (1 tile/s) is at route distance 3.4 when a strike
// cast 2.4 s into the wave lands 1 s later, and its tail is within 1.4 tiles behind (W5's 4 and
// W7's 8 at 0.2 s), so the whole clump sits inside the 1.5-tile radius around (4,3). In W5 it
// also catches the Zoomer burst running over that clump.
import { defineBuilds } from '../../define.ts';
import type { BuildStep } from '../../types.ts';

/** The greenhouse roof: A1M1's one high-ground tile. */
const ROOF = [7, 2] as const;
/** The road's first corner, where the strikes land on a clump. */
const CORNER = [4, 3] as const;
/** Cast 2.4 s into the wave; the strike lands 1 s later, on the lead clump at the corner. */
const STRIKE_WHEN = { afterSec: 2.4 } as const;
/** Suppressing Fire's segment: the road beside the Crossfire pair, (9,3)–(9,5). */
const SUPPRESS = [9, 4] as const;
const SF4 = Number(process.env.SF4 ?? 5);
const SF6 = Number(process.env.SF6 ?? 5);

/** Par's steps; `splash` is the tower in the Thumper's place (the Rivet in rivet_only). */
function parSteps(splash: 'thumper' | 'rivet'): BuildStep[] {
  return [
    { wave: 1, build: 'rivet', tile: ROOF },
    { wave: 1, build: 'rivet', tile: [10, 4] },
    { wave: 2, upgrade: ROOF }, // T2: W2 teaches upgrading
    { wave: 3, build: splash, tile: [10, 5] }, // the Crossfire pair with (10,4)
    { wave: 4, ability: 2, target: SUPPRESS, when: { afterSec: SF4 } },
    { wave: 5, upgrade: ROOF }, // T3, once W4's bounties complete the 150
    { wave: 5, ability: 1, target: CORNER, when: STRIKE_WHEN }, // W5 teaches the strike
    // T202a's interim nudge (header): par leaves the Thumper at tier 1; rivet_only still upgrades.
    ...(splash === 'rivet' ? [{ wave: 6, upgrade: [10, 5] } as const] : []),
    { wave: 6, upgrade: [10, 4] },
    { wave: 6, ability: 2, target: SUPPRESS, when: { afterSec: SF6 } },
    { wave: 7, build: 'rivet', tile: [3, 4] },
    { wave: 7, ability: 1, target: CORNER, when: STRIKE_WHEN },
  ];
}

const PAR_STEPS = parSteps('thumper');

export const builds = defineBuilds({
  // A1M1's reference profile: the issued kit and nothing bought (campaign.md § 4.9).
  referenceProfile: {
    towers: ['rivet', 'thumper'],
    specs: [],
    shop: {},
    protocols: [],
    technicianAbility: 'orbital_strike',
  },
  parBuild: { loadout: ['rivet', 'thumper'], steps: PAR_STEPS },
  // A1M1 requires no counters (maps.md § 6.4): the tutorial never punishes skipping the Thumper.
  noCounterBuilds: {},
  altBuilds: {
    // Par with the Thumper swapped for a Rivet.
    rivet_only: { loadout: ['rivet'], steps: parSteps('rivet') },
    // Par one purchase short: no W7 Rivet. An under-built player isn't wiped.
    par_minus_last: {
      loadout: ['rivet', 'thumper'],
      steps: PAR_STEPS.filter((s) => !('build' in s && s.wave === 7)),
    },
    // Under-built players (D028): par's towers and strikes with no upgrade ever bought, and two
    // setup Rivets with nothing after. Neither meets a single-wave wall (the `gradual` check).
    no_upgrades: {
      loadout: ['rivet', 'thumper'],
      steps: PAR_STEPS.filter((s) => !('upgrade' in s)),
    },
    two_rivets: { loadout: ['rivet'], steps: PAR_STEPS.slice(0, 2) },
  },
  altExpectations: {
    // The Thumper helps without being required (D006), and skipping it is never a rout.
    rivet_only: { belowPar: true, minMarginPct: 40 },
    par_minus_last: { minMarginPct: 40 },
    no_upgrades: { outcome: 'either' },
    two_rivets: { outcome: 'lose' },
  },
  // Par wins with Crossfire up: the Teamwork medal (act1.md § A1M1, Medals).
  parMedals: ['challenge'],
});
