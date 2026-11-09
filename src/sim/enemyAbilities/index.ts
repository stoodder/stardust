// System 5a: enemyAbilities. Enemy ability state machines (design/enemies.md § 3, § 5–6;
// architecture.md § Entity model): each live enemy runs the abilities its definition carries,
// telegraph → effect → cooldown, in ascending slot order, before the commander abilities and
// before movement (so a dig or a huddle's pace applies to this tick's step).
// - burrow.ts: Burrowing (the Digger): digs in on a timer, untargetable while underground.
// - huddle.ts: Huddle (the Elder): nearby allies match its pace and regenerate.
// - boss.ts: bosses (Chitterbloom): phases by HP, their abilities, and the ending (`driveOff`).
// - split.ts: Splitting (the Bunchling) runs on death, from killEnemy (combat/damage.ts).
//
// T300a seam: wired into the tick and a no-op until T304c lifts the `enemy.*` FEATURE_GATES rows;
// createSim refuses any map whose waves use them until then. Per-enemy state is on `Enemy`
// (entities.ts: abilityTicks, burrowed, huddleUid, bossPhase, invulnerableTicks, leaving).
import type { SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';
import { bossStep } from './boss.ts';
import { burrowStep } from './burrow.ts';
import { huddleStep } from './huddle.ts';

export { splitOnDeath } from './split.ts';

export function enemyAbilities(state: SimState, ctx: TickContext): void {
  const pool = state.enemies;
  for (let i = 0; i < pool.used; i++) {
    const e = pool.items[i]!; // i < used ≤ items.length
    const def = e.def;
    if (!e.alive || def === null) continue;
    if (def.burrow !== null) burrowStep(state, ctx, e, def.burrow);
    if (def.huddle !== null) huddleStep(state, ctx, e, def.huddle);
    if (def.boss !== null) bossStep(state, ctx, e, def.boss);
  }
}
