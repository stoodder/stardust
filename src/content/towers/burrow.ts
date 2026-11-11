// Scuttle Den (design/towers.md § 7): a warren mound, Skitterkin, Bramble's warren's gift in A3M1's
// briefing (upgrades/access.ts). Its young-adult swarmlings dash out to a ground enemy within 2.5
// tiles (a burrowed one too: Skitterkin follow anything underground), latch on for 4 s dealing
// 5 Kinetic/s as a DoT (armor bypassed) and Chilled 10% (swarmling chills stack to 30%), then run
// home and rest 3 s. They can't be harmed and always come home. T1 (140) 3 swarmlings; T2 (110) 4;
// T3 (210) 8/s and a 5 s latch. Big Family (420): 7 swarmlings. Brave Hearts (420): 3 Champions,
// 20/s and Chilled 15% each, and they leap onto flyers too (the tier targets air).
//
// The numbers are towers.md's first pass, confirmed by T604, which runs the spawner
// (sim/swarmlings.ts: the dash, the latch, the DoT and stacked chill, the rest). No targeting
// priority: each swarmling picks the First unit in range, spreading once the chill is stacked.
// `ratePerSec` restates the DoT tick (4/s; a rate bonus quickens it). Links: Splash Zone
// (Sprinkler), Finders Keepers (Crane). Sprites: placeholders under their final ids (T640b).
import { DOT_TICK_SEC } from '../rules.ts';
import { defineTower } from '../define.ts';

export const burrow = defineTower({
  id: 'burrow',
  name: 'Scuttle Den',
  faction: 'skitterkin',
  role: 'DoT swarm',
  sprites: { base: 'tower.burrow', head: 'tower.burrow_head', icon: 'icon.tower.burrow' },
  tiers: [
    {
      cost: 140,
      targets: { ground: true, air: false },
      defaultPriority: null,
      attack: {
        kind: 'spawner',
        type: 'kinetic',
        damage: 5,
        ratePerSec: 1 / DOT_TICK_SEC,
        rangeTiles: 2.5,
        ally: 'swarmling',
        maxAlive: 3,
        latchSec: 4,
        restSec: 3,
        chillPct: 0.1,
      },
    },
    { cost: 110, attack: { maxAlive: 4 } },
    { cost: 210, attack: { damage: 8, latchSec: 5 } },
  ],
  specs: {
    a: { name: 'Big Family', cost: 420, attack: { maxAlive: 7 } },
    b: {
      name: 'Brave Hearts',
      cost: 420,
      targets: { ground: true, air: true },
      attack: { ally: 'champion', maxAlive: 3, damage: 20, chillPct: 0.15 },
    },
  },
});
