// Sproing Pad (design/towers.md § 7): a springy mushroom pad with a fearless leaper (a grown-up
// Puffwing-chaser) who boings into the sky; a gift (A3M5). Anti-air that grounds flyers. T1
// (130): the leaper bonks one target for 25 Kinetic, 0.5 leaps/s, range 3.0, G+A, always a flyer
// when one is in range; a bonked flyer is Pinned 1.5 s (grounded: ground towers hit it; a flying
// boss Chilled 50% instead). T2 (105): 35. T3 (195): Pin 2.0 s, 0.6 leaps/s. Sky Bouncers (390):
// 2 leapers. Big Bonk (390): 90 with a 0.8 splash where it lands.
//
// As built (T704): the leapers are owner allies from the swarmling pool (kind 'leaper'), and
// sim/leapers.ts runs them: the pick (flyers first, then Lookie Here's Marked, then a free unit,
// then First), the leap, the bonk, and the Pin. `ratePerSec` is each leaper's own period, from the
// tick it leaps. Links: Lookie Here (Lantern), Bounce Chorus (Hum Choir). Sprites:
// towers/sproing.ts (T740b: the mushroom pad and its leaper).
import { defineTower } from '../define.ts';

export const sproing = defineTower({
  id: 'sproing',
  name: 'Sproing Pad',
  faction: 'skitterkin',
  role: 'Anti-air; grounds flyers',
  sprites: { base: 'tower.sproing', head: 'tower.sproing_head', icon: 'icon.tower.sproing' },
  tiers: [
    {
      cost: 130,
      targets: { ground: true, air: true },
      defaultPriority: 'first',
      attack: {
        kind: 'leaper',
        type: 'kinetic',
        damage: 25,
        ratePerSec: 0.5,
        rangeTiles: 3.0,
        leapers: 1,
        pinSec: 1.5,
      },
    },
    { cost: 105, attack: { damage: 35 } },
    { cost: 195, attack: { pinSec: 2.0, ratePerSec: 0.6 } },
  ],
  specs: {
    a: { name: 'Sky Bouncers', cost: 390, attack: { leapers: 2 } },
    b: { name: 'Big Bonk', cost: 390, attack: { damage: 90, splashTiles: 0.8 } },
  },
});
