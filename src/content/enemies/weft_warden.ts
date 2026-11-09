// Weft Warden (design/enemies.md § 5.2): A2M3's heavy Aelari walker ("heavy shield"; Soaked +
// Zapcoil is its teach), a heavy shield over light armor. The roster row is the spec: 250 HP,
// armor 3, shield 200 (regen 20/s after 3 s without a hit), 0.6 tiles/s, leak 3, bounty 18,
// ground, crystalline. A hit's shield overflow meets the armor (§ 2.3), so Kinetic that breaks the
// shield still plinks. Light armor: the Thumper answers it in Acts I–II (§ 3.1). Spawned 2.0 s
// apart: each one its own problem. Sprites are placeholders under their final ids (T440a).
import { defineEnemy } from '../define.ts';

export const weft_warden = defineEnemy({
  id: 'weft_warden',
  name: 'Weft Warden',
  faction: 'aelari',
  body: 'crystalline',
  layer: 'ground',
  hp: 250,
  armor: 3,
  shield: { hp: 200, regenPerSec: 20, regenDelaySec: 3 },
  speedTilesPerSec: 0.6,
  leak: 3,
  bounty: 18,
  spawnIntervalSec: 2.0,
  traits: ['shielded', 'armored'],
  tells: ['shielded', 'regen', 'armored'],
  sprites: { body: 'enemy.weft_warden', icon: 'icon.enemy.weft_warden' },
});
