// The Jammed state (design/enemies.md § 4; T700a slot, T702 fills it): each jammed tower counts
// its `jamTicks` down (no fire, auras and links off: `state.linksDirty` on each change), then
// `TowerUnjammed` and JAM_IMMUNITY_SEC of `jamImmuneTicks`; `stats.jammedPeak` keeps the most
// towers jammed at once. The jammers' tells run in enemyAbilities (the Silencer's tendril T702,
// the Auditor's ring and Hostile Takeover T707), so this pass runs after them (tick.ts) and a jam
// that lands this tick holds from it. Until T702 lands, createSim refuses every jam (`enemy.jam`,
// `enemy.jam.ring`) and System Reboot (`ability.reboot`), so this pass has nothing to do.
import type { SimState } from './state.ts';
import type { TickContext } from './tick.ts';

export function jams(_state: SimState, _ctx: TickContext): void {
  // T702.
}
