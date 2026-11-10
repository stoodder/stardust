// Skyhook Flak Battery, "Everglow SK-2: Keep Your Skies Corporate" (design/towers.md § 7). Anti-air
// splash: air only, issued for A1M3 (campaign.md § 4.1). Its shots are a projectile with a burst
// on arrival (`splashTiles`), so createSim refuses it until T304a runs projectiles and air
// targeting (FEATURE_GATES `attack.projectile`). The flak's flight speed isn't in the docs: 10
// tiles/s is a first pass for T304a to tune. Sprites: sprites/towers/skyhook.ts.
// Its specs (T407b; design/towers.md § 7):
// - Flak Curtain: the same flak, faster and wider: 3.0 shots/s, 12 damage, splash 1.2.
// - Seeker Swarm: volleys of 4 homing missiles (`homing`, `volley`; sim/systems/projectiles.ts),
//   25 damage each, armor pierce 4, range 5.0, default Strong, each missile at its own target
//   where it can. Not in the docs (first pass): a volley every 2 s (0.5/s) and missiles at 6
//   tiles/s, slower than flak so the steering reads. No splash: each missile hits its target.
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
  specs: {
    a: {
      name: 'Flak Curtain',
      cost: 330,
      attack: { damage: 12, ratePerSec: 3.0, splashTiles: 1.2 },
    },
    b: {
      name: 'Seeker Swarm',
      cost: 330,
      defaultPriority: 'strong',
      attack: {
        damage: 25,
        ratePerSec: 0.5,
        rangeTiles: 5.0,
        armorPierce: 4,
        projectile: 'projectile.skyhook_seeker',
        speedTilesPerSec: 6,
        splashTiles: 0,
        homing: true,
        volley: 4,
      },
    },
  },
});
