// Glimmer (design/enemies.md § 5.2): the first Aelari unit (A2M2's teach, "Shielded!"), a small
// lumenglass construct gliding in formation behind a regenerating shield (races.md § Aelari). The
// roster row is the spec: 60 HP, no armor, shield 40 (regen 10/s after 3 s without a hit), 1.1
// tiles/s, leak 1, bounty 6, ground, crystalline. Energy strips its shield at ×2 and Kinetic at
// ×0.5 (§ 2.1, § 2.3; src/sim/aelari.test.ts); the Glass Witch's pulse refills it (D101). Spawned
// 0.8 s apart: a tight column, so a Zapcoil's chain earns its keep. Sprites are placeholders under
// their final ids (T440a).
import { defineEnemy } from '../define.ts';

export const glimmer = defineEnemy({
  id: 'glimmer',
  name: 'Glimmer',
  faction: 'aelari',
  body: 'crystalline',
  layer: 'ground',
  hp: 60,
  armor: 0,
  shield: { hp: 40, regenPerSec: 10, regenDelaySec: 3 },
  speedTilesPerSec: 1.1,
  leak: 1,
  bounty: 6,
  spawnIntervalSec: 0.8,
  traits: ['shielded'],
  tells: ['shielded', 'regen'],
  sprites: { body: 'enemy.glimmer', icon: 'icon.enemy.glimmer' },
});
