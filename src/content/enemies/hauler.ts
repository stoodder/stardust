// Brood Hauler: the big, slow, armored Skitterkin with a glittering sack (design/enemies.md § 5.1,
// "the dramatic-irony unit"). In Act I its codex says the sack holds stolen stardust; when it
// dies the sack bursts and a few tiny shapes scurry back the way it came (`carrier`, sim/
// carrier.ts: render-only, no leak, no bounty). Its behavior never changes across the acts.
// The spawn interval isn't in the docs ("set when their data is authored"): 2.5 s, so at
// 0.7 tiles/s Haulers walk about 1.75 tiles apart: a pair fits one Orbital Strike (radius 1.5).
import { defineEnemy } from '../define.ts';

export const hauler = defineEnemy({
  id: 'hauler',
  faction: 'skitterkin',
  body: 'organic',
  layer: 'ground',
  hp: 300,
  armor: Number(process.env.HA ?? 6),
  speedTilesPerSec: 0.7,
  leak: 3,
  bounty: 15,
  spawnIntervalSec: 2.5,
  traits: ['armored'],
  // The carrier glyph first (spriteInfo.tellGlyph shows the first tell with an icon).
  tells: ['carrier', 'armored'],
  carrier: { young: 3 },
  sprites: { body: 'enemy.brood_hauler', icon: 'icon.enemy.brood_hauler' },
});
