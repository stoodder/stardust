// Rivet Autoturret, "Everglow RV-1: Perimeter Peace of Mind™" (design/towers.md § 7). The
// generalist: hitscan single target, ground and air. Tier-4 specs (Rivet Storm, Railspike) land
// with T202.
import { defineTower } from '../define.ts';

export const rivet = defineTower({
  id: 'rivet',
  faction: 'everglow',
  role: 'Single-target DPS',
  sprites: { base: 'tower.rivet', head: 'tower.rivet_head', icon: 'icon.tower.rivet' },
  tiers: [
    {
      cost: 100,
      targets: { ground: true, air: true },
      defaultPriority: 'first',
      attack: { kind: 'hitscan', type: 'kinetic', damage: 8, ratePerSec: 2.0, rangeTiles: 3.0 },
    },
    { cost: 80, attack: { damage: 11 } },
    { cost: 150, attack: { ratePerSec: 2.5, armorPierce: 3 } },
  ],
});
