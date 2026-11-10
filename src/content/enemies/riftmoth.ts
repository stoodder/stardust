// Rift Moth (design/enemies.md § 5.4): A2M6's Hollow flyer. The roster row: 120 HP, no armor, 1.2
// tiles/s, leak 1, bounty 10, air, void; Phasing: untargetable for 1.5 s every 5 s after a 0.5 s
// flicker tell (the Phased layer, enemies.md § 2.6; Stasis and Unnerved interrupt the tell, D137).
// Run by enemyAbilities/phase.ts: 3.5 s solid (its last 0.5 s the tell), then 1.5 s Phased, from
// the top of a solid stretch at spawn. Sprites: placeholders under their final ids (T540a).
import { defineEnemy } from '../define.ts';

export const riftmoth = defineEnemy({
  id: 'riftmoth',
  name: 'Rift Moth',
  faction: 'hollow',
  body: 'void',
  layer: 'air',
  hp: 120,
  armor: 0,
  speedTilesPerSec: 1.2,
  leak: 1,
  bounty: 10,
  spawnIntervalSec: 0.8,
  traits: ['flying', 'phasing'],
  tells: ['flying', 'phasing', 'hollow'],
  phase: { everySec: 5, durationSec: 1.5, tellSec: 0.5 },
  sprites: { body: 'enemy.riftmoth', icon: 'icon.enemy.riftmoth' },
});
