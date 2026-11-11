// A part of the Gathering Maw (design/enemies.md § 6; D146): one of the three its phase-2 split
// releases, each with 20% of the Maw's max HP (the split's `hpPct` sets it; `hp` here is that
// share of 12000). Boss rules: Pinned and Stasis become Chilled 50%, and a part at the gate is
// defeat. Its HP joins the Maw's one boss bar. No gather of its own; 12 s after the split (or as
// the last but one dies) the survivors merge back into the Maw.
//
// As built (T708; enemyAbilities/bossSplit.ts, bossMerge.ts): its HP is set at the split
// (20% of the Maw's stat HP); it carries the split's clock (`mergeTicks`), the Maw's def
// (`splitFrom`), and the bar's maximum (`splitMaxHp`), and dies at 0 HP like a unit (its boss
// `ending` is only a `bossEnd` action's). Sprites: placeholders under their final ids (T740a).
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
