// Mote (design/enemies.md § 5.4): the first Hollow unit (A2M1, Rig Nine), small and quick, in
// clusters of 6–12. The roster row is the spec: 25 HP, no armor, 1.6 tiles/s, leak 1, bounty 2,
// ground, void. `clustered` (D101) makes a cluster a splash-category threat, so A2M1 can require
// splash and its briefing shows "Hollow clusters". It hushes under the hush rule (every non-boss
// Hollow unit does: `hushes` is derived at compile; enemyAbilities/hush.ts), turning Heavy, and may
// walk rift lanes. At 1.6 tiles/s it catches a Nibbler fleeing 2–4 s ahead of it, but not a Zoomer
// or a bolting runner (Skittish). Its 0.3 s spawn interval packs a cluster of 12 into 3.3 s of
// road. Its sprite (T440a) draws the Heavy walk and the hush reach too (sprites/enemies/mote.ts).
import { defineEnemy } from '../define.ts';

export const mote = defineEnemy({
  id: 'mote',
  name: 'Mote',
  faction: 'hollow',
  body: 'void',
  layer: 'ground',
  hp: 25,
  armor: 0,
  speedTilesPerSec: 1.6,
  leak: 1,
  bounty: 2,
  spawnIntervalSec: 0.3,
  traits: ['clustered'],
  tells: ['hollow'],
  sprites: { body: 'enemy.mote', icon: 'icon.enemy.mote' },
});
