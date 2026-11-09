// Rivet Autoturret, "Everglow RV-1: Perimeter Peace of Mind™" (design/towers.md § 7). The
// generalist: hitscan single target, ground and air. Tier 4: Rivet Storm (a minigun with a spin-up)
// or Railspike (a long-range sniper that ignores armor).
import { defineTower } from '../define.ts';

export const rivet = defineTower({
  id: 'rivet',
  name: 'Rivet',
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
  specs: {
    a: {
      name: 'Rivet Storm',
      cost: 300,
      attack: { damage: 9, ratePerSec: 7.5, spinUpSec: 1.0, armorPierce: 0 },
    },
    b: {
      name: 'Railspike',
      cost: 300,
      defaultPriority: 'strong',
      attack: { damage: 120, ratePerSec: 0.5, rangeTiles: 6.0, ignoresArmor: true },
    },
  },
});
