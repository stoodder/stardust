// Thumper Mortar, "Everglow TM-4: Because Pests Hate Surprises" (design/towers.md § 7). Splash,
// ground only, lobbed shells with lead targeting (towers.md § 5). Tier 4: Cluster Thumper (each
// shell scatters bomblets) or Bunker Buster (one heavy, armor-cracking shell).
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
  specs: {
    a: {
      name: 'Cluster Thumper',
      cost: 375,
      attack: {
        bomblets: {
          count: 4,
          damage: 12,
          splashTiles: 0.6,
          scatterTiles: 1.2,
          flightSec: 0.3,
          projectile: 'projectile.thumper_bomblet',
        },
      },
    },
    b: {
      name: 'Bunker Buster',
      cost: 375,
      attack: { damage: 140, splashTiles: 0.6, ratePerSec: 0.4 },
      effects: [{ status: 'corroded', stacks: 3, maxStacks: 3 }],
    },
  },
});
