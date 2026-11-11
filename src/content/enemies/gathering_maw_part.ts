// A part of the Gathering Maw (design/enemies.md § 6; D146): one of the three its phase-2 split
// releases, each with 20% of the Maw's max HP (the split's `hpPct` sets it; `hp` here is that
// share of 12000). Boss rules: Pinned and Stasis become Chilled 50%, and a part at the gate is
// defeat. Its HP joins the Maw's one boss bar. No gather of its own.
//
// A stub registered ahead of its task (T700a): T708 confirms it (the parts' bar, the merge).
// Sprites: placeholders under their final ids (T740a).
import { defineEnemy } from '../define.ts';

export const gathering_maw_part = defineEnemy({
  id: 'gathering_maw_part',
  name: 'Gathering Maw',
  faction: 'hollow',
  body: 'void',
  layer: 'ground',
  hp: 2400,
  armor: 4,
  speedTilesPerSec: 0.3,
  leak: 3,
  bounty: 0,
  spawnIntervalSec: 1.0,
  traits: ['armored'],
  tells: ['armored', 'boss', 'hollow'],
  boss: { phases: [{ fromPct: 1 }], ending: 'driveOff', endAtPct: 0 },
  sprites: { body: 'enemy.gathering_maw_part', icon: 'icon.enemy.gathering_maw_part' },
});
