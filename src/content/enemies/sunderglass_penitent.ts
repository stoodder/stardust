// The Sunderglass Penitent (design/enemies.md § 6; A2M5's boss): Ves'thara in a glass giant. HP
// 1200, shield 600 (regen 40/s after 4 s), speed 0.2, no armor, bounty 0 (its wave's clear bonus
// is tripled). Phases (T506):
// (1) marches behind its shield wall with a Cantor-style recharge pulse: every 8 s (1.5 s tell)
//     it restores 60 shield (a tenth of its own, the Glass Witch's share) to itself and every
//     Aelari within 2 tiles (the Cantor's radius; enemyAbilities/pulse.ts).
// (2) the moment its shield breaks (`fromPct: 'shieldBroken'`; enemyAbilities/shieldBroken.ts) it
//     sheds 3 cloaked Glimmer-shards onto the road, 0.6 tiles behind it, at it, and 0.6 ahead
//     (D138: pieces you can find, not hidden in its sprite), and its shield re-forms to full 4 s after each break
//     while any shard lives (D137). No pulse here: only the shards bring the wall back, so killing
//     them is the answer, not out-damaging a refill.
// It ends at 50%, or when the Hollow surge wave starts if that comes first (D137; the map's
// script runs `bossEnd: 'pivot'` then), with `pivot` (enemyAbilities/pivot.ts): the Aelari stand
// down, and it kneels and becomes the Ward, an ally whose aura Chills Hollow units within 2.5
// tiles 40% (enemies.md § 6.1; systems/allies.ts). `leak` 3 never applies (a leaking boss drains
// everything it reaches).
// The numbers are A2M5's curve (T560; act2.md § A2M5): at 0.2 tiles/s it walks 12 tiles in the
// 60 s before W6 forces the pivot, so the Ward kneels at the fencing's end, where the rig road
// joins, and its chill counts there; the shield breaks in W5 in every reference run (the shards
// unrevealed, so it re-forms), and a skilled build that reveals and kills the shards (a Lookout
// over the road's first leg and an Orbital Strike on the break) has 600 HP to take for Kneel, with
// about 11 s to spare before W6 (D138: 10–15 s of slack; par still takes a quarter of her HP).
import { defineEnemy } from '../define.ts';

export const sunderglass_penitent = defineEnemy({
  id: 'sunderglass_penitent',
  name: 'Sunderglass Penitent',
  faction: 'aelari',
  body: 'crystalline',
  layer: 'ground',
  hp: 1200,
  armor: 0,
  shield: { hp: 600, regenPerSec: 40, regenDelaySec: 4 },
  speedTilesPerSec: 0.2,
  leak: 3,
  bounty: 0,
  spawnIntervalSec: 1.0,
  traits: ['shielded'],
  tells: ['boss', 'shielded', 'regen'],
  boss: {
    phases: [
      { fromPct: 1, pulse: { everySec: 8, tellSec: 1.5, radiusTiles: 2, shield: 60 } },
      {
        fromPct: 'shieldBroken',
        shards: { enemy: 'glimmer_shard', count: 3, spreadTiles: 0.6, reformSec: 4 },
      },
    ],
    ending: 'pivot',
    endAtPct: 0.5,
    ward: { radiusTiles: 2.5, chillPct: 0.4 },
  },
  sprites: { body: 'enemy.sunderglass_penitent', icon: 'icon.enemy.sunderglass_penitent' },
});
