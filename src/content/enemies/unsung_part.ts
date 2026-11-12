// A part of the Unsung (design/enemies.md § 6, its phase 2): one of the three its split releases,
// each with a third of the 75–50% band (the split's `hpPct`, 0.25 / 3 of the Unsung's max HP: 2500
// of 30000, more with the Deep Bore's bonus; `hp` here is that share of 30000). Boss rules:
// Pinned and Stasis become Chilled 50%, and a part at the gate is defeat. Its HP shows on the
// Unsung's one boss bar, a cell each. The parts never merge: killed inside the song a part is laid
// to rest (song.ts), outside it falls for good (it never scatters), and once the last is gone the
// Unsung rises again where it fell, in phase 3 (bossMerge.ts `riseAfterSplit`; T808).
// As built (T808): it dies at 0 HP like a unit (its boss `ending` is only a `bossEnd` action's).
// Sprites: T841's `enemy.unsung_part`, under the Unsung's icon.
import { defineEnemy } from '../define.ts';

export const unsung_part = defineEnemy({
  id: 'unsung_part',
  name: 'The Unsung',
  faction: 'hollow',
  body: 'void',
  layer: 'ground',
  hp: 2500,
  armor: 0,
  speedTilesPerSec: 0.1,
  leak: 3,
  bounty: 0,
  spawnIntervalSec: 1.0,
  traits: [],
  tells: ['boss', 'hollow'],
  boss: { phases: [{ fromPct: 1 }], ending: 'driveOff', endAtPct: 0 },
  sprites: { body: 'enemy.unsung_part', icon: 'icon.enemy.unsung' },
});
