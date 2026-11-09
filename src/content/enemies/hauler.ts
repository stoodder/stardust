// Brood Hauler: the big, slow, armored Skitterkin with a glittering sack (design/enemies.md § 5.1,
// "the dramatic-irony unit"). In Act I its codex says the sack holds stolen stardust; when it
// dies the sack bursts and a few tiny shapes scurry back the way it came (`carrier`, sim/
// carrier.ts: render-only, no leak, no bounty). Its behavior never changes across the acts.
// Armor 9 is heavy for Act I on purpose (D049): a Rivet below T3 hits it at the 20% floor, so
// A1M2's required armor counter means the Thumper or the T3 Rivet's pierce. The default spawn
// interval (2.5 s, about 1.75 tiles at 0.7 tiles/s) wasn't in the docs; A1M2's W7–W8 override
// it to 12 s so the Orbital Strike can't stand in for an armor answer.
import { defineEnemy } from '../define.ts';

export const hauler = defineEnemy({
  id: 'hauler',
  name: 'Brood Hauler',
  faction: 'skitterkin',
  body: 'organic',
  layer: 'ground',
  hp: 330,
  armor: 9,
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
