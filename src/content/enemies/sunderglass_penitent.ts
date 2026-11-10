// The Sunderglass Penitent (design/enemies.md § 6; A2M5's boss). HP 3500, shield 2500 (regen 40/s
// after 4 s), speed 0.35, no armor, bounty 0 (its wave's clear bonus is tripled). Phase 1: marches
// behind its shield wall with a Cantor-style recharge pulse. Phase 2, the moment its shield breaks
// (`fromPct: 'shieldBroken'`): it releases 3 cloaked Glimmer-shards, and its shield re-forms 4 s
// after breaking unless all three are dead (D137). It ends at 50%, or when the Hollow surge wave
// starts if that comes first (D137; the map's script), with `pivot`: it kneels and becomes the Ward
// (Hollow units within 2.5 tiles Chilled 40%; enemies.md § 6.1).
//
// A stub registered ahead of its task (T500a): T506 runs the shield-broken phase, the shards, the
// re-form, and the pivot (FEATURE_GATES `enemy.boss.shieldBroken`, `enemy.boss.pivot`) and
// confirms the numbers. Not in the docs, so T506 settles it: the pulse's numbers (here the Glass
// Witch's: 120 shield within 2 tiles every 8 s, 1.5 s tell). Sprites: placeholders (T540b).
import { defineEnemy } from '../define.ts';

const PULSE = { everySec: 8, tellSec: 1.5, radiusTiles: 2, shield: 120 } as const;

export const sunderglass_penitent = defineEnemy({
  id: 'sunderglass_penitent',
  name: 'Sunderglass Penitent',
  faction: 'aelari',
  body: 'crystalline',
  layer: 'ground',
  hp: 3500,
  armor: 0,
  shield: { hp: 2500, regenPerSec: 40, regenDelaySec: 4 },
  speedTilesPerSec: 0.35,
  leak: 3,
  bounty: 0,
  spawnIntervalSec: 1.0,
  traits: ['shielded'],
  tells: ['boss', 'shielded', 'regen'],
  boss: {
    phases: [
      { fromPct: 1, pulse: PULSE },
      {
        fromPct: 'shieldBroken',
        pulse: PULSE,
        shards: { enemy: 'glimmer_shard', count: 3, reformSec: 4 },
      },
    ],
    ending: 'pivot',
    endAtPct: 0.5,
    ward: { radiusTiles: 2.5, chillPct: 0.4 },
  },
  sprites: { body: 'enemy.sunderglass_penitent', icon: 'icon.enemy.sunderglass_penitent' },
});
