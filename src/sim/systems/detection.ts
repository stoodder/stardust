// System 9b: detection (design/enemies.md § 2.5; T400a seam, run by T406). After movement, before
// the towers pick targets: each live cloaked unit (`def.cloaked`) inside a detector's radius
// (a tier's `detect`, plus its links' `bonusDetectTiles`) or a live `reveal` zone (Scanner Sweep)
// is Revealed for at least the detector's linger (`Enemy.revealTicks`), and everyone else's reveal
// ticks down. An undetected cloaked unit is untouchable (enemyAbilities/cloak.ts `cloakedOut`):
// no targeting, splash, auras, or links reach it, and it still leaks. Revealed and Cloaked events
// mark the changes for render and audio.
//
// A stub until T406: it changes nothing (no live content is cloaked or detects yet, and createSim
// refuses both: `enemy.cloak`, `tower.detection`, and `ability.reveal` in FEATURE_GATES).
import type { SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';

export function detection(_state: SimState, _ctx: TickContext): void {
  // T406.
}
