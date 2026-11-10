// Aegis Cantor (design/enemies.md § 5.2): A2M5's shield-aura teach ("kill it first"). The roster
// row: 150 HP, no armor, shield 100 (regen 15/s after 3 s), 0.8 tiles/s, leak 2, bounty 14,
// ground, crystalline; a shield-recharge aura: allies within 2 tiles regain 15 shield/s,
// continuously (D137: not a pulse; `shieldAura`, enemyAbilities/shieldAura.ts, T502; the rule is
// enemies.md § 3's: not itself, not a boss, the strongest of two rings). Spawn interval 1.2 s (no
// doc number: a support unit walks among its escorts). Sprites: placeholders under their final ids
// (T540a draws them).
import { defineEnemy } from '../define.ts';

export const cantor = defineEnemy({
  id: 'cantor',
  name: 'Aegis Cantor',
  faction: 'aelari',
  body: 'crystalline',
  layer: 'ground',
  hp: 150,
  armor: 0,
  shield: { hp: 100, regenPerSec: 15, regenDelaySec: 3 },
  speedTilesPerSec: 0.8,
  leak: 2,
  bounty: 14,
  spawnIntervalSec: 1.2,
  traits: ['shielded', 'shield_aura'],
  tells: ['shielded', 'regen', 'shield_aura'],
  shieldAura: { radiusTiles: 2, shieldPerSec: 15 },
  sprites: { body: 'enemy.cantor', icon: 'icon.enemy.cantor' },
});
