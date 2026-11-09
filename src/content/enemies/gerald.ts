// Gerald the mail drone (design/core-loop.md § 2.7; act1.md § A1M3): a neutral unit, not part of
// the roster (enemies.md § 5). He is an **air** unit that flies the **ground path** (T304a settles
// D064's fork: core-loop's "flies along the path" names his route, act1.md's "neutral air unit" his
// layer), so the towers the player built along the path see him, and the ones that hit air (Rivet,
// Skyhook) target him like an enemy while ground-only towers (Thumper, Sprinkler) can't.
// - A shot aimed at him plinks off: no damage, `NeutralHit`, and `stats.neutralHits` (the Return
//   to Sender Challenge). Area hits (a burst aimed at someone else, a pulse, a chain's jump) pass
//   him by and never count (sim/combat/neutral.ts).
// - He never leaks: at the end of his route he delivers the mail and leaves (`NeutralExited`), so
//   he pays nothing, costs no integrity, and never touches Perfect Core.
// - He is Everglow's, so the Skitterkin-only stats never count him.
// HP 100 only matters to Strong targeting (he is never hurt): it sits under a Chonk's 180, so a
// Strong tower prefers a real Chonk but picks him over Nibblers and Puffwings. Speed 1.2 tiles/s
// (his pace isn't in the docs) lets him overtake a wave of Nibblers, so First towers lock onto him
// and the Hold Fire lesson bites; A1M3's wave data times his passes (T304e). Sprites are
// placeholders under their final ids (T311a).
import { defineEnemy } from '../define.ts';

export const gerald = defineEnemy({
  id: 'gerald',
  name: 'Gerald',
  faction: 'everglow',
  body: 'mechanical',
  layer: 'air',
  hp: 100,
  armor: 0,
  speedTilesPerSec: 1.2,
  leak: 0,
  bounty: 0,
  spawnIntervalSec: 1.0,
  traits: ['flying'],
  tells: ['flying'],
  neutral: true,
  sprites: { body: 'enemy.gerald', icon: 'icon.enemy.gerald' },
});
