// Huddle (design/enemies.md § 3, § 5.1; the `huddle` tell). Each tick a leader (the Elder;
// Chitterbloom in her phase 3) gathers every ally within its radius, nearest-slot leader first:
// - An ally is a live unit of the leader's faction, on the ground (not burrowed or leaving), and
//   neither a leader itself, a boss, nor a neutral unit. Each joins at most one huddle a tick
//   (`Enemy.huddleUid`; render draws the cluster from it).
// - It regenerates `regenPerTick` HP, up to its full HP.
// - It moves at the leader's pace when that's slower than its own (`Enemy.paceMul`): the Elder
//   holds the group *back* to protect the young, so a huddle never speeds anyone up. The pace is
//   the leader's whole speed this tick, chill included: slow the leader and the huddle crawls.
// Kill the leader to scatter them. The leader itself doesn't regenerate.
import type { CompiledHuddle } from '../../content/compiled.ts';
import type { Enemy } from '../entities.ts';
import type { SimState } from '../state.ts';
import { enemySpeedPerTick } from '../systems/movement.ts';

/** Whether `a` may join `leader`'s huddle this tick (the radius aside). */
export function mayHuddle(leader: Enemy, a: Enemy): boolean {
  const d = a.def;
  const l = leader.def;
  if (!a.alive || a === leader || d === null || l === null) return false;
  if (a.huddleUid !== 0 || a.burrowed || a.leaving) return false;
  return (
    d.faction === l.faction &&
    d.layer === 'ground' &&
    d.huddle === null &&
    d.boss === null &&
    !d.neutral
  );
}

/** One tick of a leader's huddle: pace and regeneration for the allies around it. */
export function huddleStep(state: SimState, leader: Enemy, huddle: CompiledHuddle): void {
  const pool = state.enemies;
  const pace = enemySpeedPerTick(leader);
  for (let i = 0; i < pool.used; i++) {
    const a = pool.items[i]!; // i < used ≤ items.length
    if (!mayHuddle(leader, a)) continue;
    const dx = a.x - leader.x;
    const dy = a.y - leader.y;
    if (dx * dx + dy * dy > huddle.radiusSq) continue;
    a.huddleUid = leader.uid;
    const max = a.def!.hp; // mayHuddle checked def
    if (a.hp < max) {
      const hp = a.hp + huddle.regenPerTick;
      a.hp = hp < max ? hp : max;
    }
    const own = enemySpeedPerTick(a);
    if (own > pace) a.paceMul *= pace / own;
  }
}
