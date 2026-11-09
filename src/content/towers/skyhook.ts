// Skyhook Flak Battery, "Everglow SK-2: Keep Your Skies Corporate" (design/towers.md § 7). Anti-air
// splash: air only, issued for A1M3 (campaign.md § 4.1). Its shots are a projectile with a burst
// on arrival (`splashTiles`), so createSim refuses it until T304a runs projectiles and air
// targeting (FEATURE_GATES `attack.projectile`). The flak's flight speed isn't in the docs: 10
// tiles/s is a first pass for T304a to tune. Its specs (Flak Curtain, Seeker Swarm) are M4's
// (D064). Sprites are placeholders under their final ids (T311a).
import { defineTower } from '../define.ts';

export const skyhook = defineTower({
  id: 'skyhook',
  name: 'Skyhook',
  faction: 'everglow',
  role: 'Anti-air splash',
  sprites: { base: 'tower.skyhook', head: 'tower.skyhook_head', icon: 'icon.tower.skyhook' },
  tiers: [
    {
      cost: 110,
      targets: { ground: false, air: true },
      defaultPriority: 'first',
      attack: {
        kind: 'projectile',
        type: 'explosive',
        damage: 14,
        ratePerSec: 1.0,
        rangeTiles: 3.5,
        projectile: 'projectile.skyhook_flak',
        speedTilesPerSec: 10,
        splashTiles: 0.8,
      },
    },
    { cost: 90, attack: { damage: 20 } },
    { cost: 165, attack: { ratePerSec: 1.3, rangeTiles: 4.0 } },
  ],
});
