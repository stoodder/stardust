// Thumper Mortar, "Everglow TM-4: Because Pests Hate Surprises" (design/towers.md § 7). Splash,
// ground only, lobbed shells with lead targeting (towers.md § 5). Tier-4 specs (Cluster Thumper,
// Bunker Buster) land with T202.
import { defineTower } from '../define.ts';

export const thumper = defineTower({
  id: 'thumper',
  faction: 'everglow',
  role: 'Splash',
  sprites: { base: 'tower.thumper', head: 'tower.thumper_head', icon: 'icon.tower.thumper' },
  tiers: [
    {
      cost: 125,
      targets: { ground: true, air: false },
      defaultPriority: 'first',
      attack: {
        kind: 'lobbed',
        type: 'explosive',
        damage: 20,
        ratePerSec: 0.5,
        rangeTiles: 3.5,
        minRangeTiles: 1.0,
        projectile: 'projectile.thumper_shell',
        flightSec: 0.8,
        splashTiles: 0.9,
        lead: true,
      },
    },
    { cost: 100, attack: { damage: 30 } },
    { cost: 190, attack: { splashTiles: 1.2, ratePerSec: 0.6 } },
  ],
});
