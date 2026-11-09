// System 4c: enemyAbilities. Enemy ability state machines (design/enemies.md § 3, § 5–6;
// architecture.md § Entity model), before the commander abilities and before movement, so a dig,
// a huddle's pace, or a boss's haste applies to this tick's step. Three passes, each in ascending
// slot order:
// 1. Reset each live unit's per-tick ability state (`paceMul` 1, `huddleUid` 0).
// 2. Each unit's own abilities: a leaving unit only leaves (leave.ts); otherwise burrow.ts (the
//    Digger's dig cycle) and boss.ts (a boss's phase abilities: sneezes, burrows, haste).
// 3. Huddles (huddle.ts: the Elder, a boss's huddle phase), last, so each leader's pace is final.
// Units born this tick (a boss's young) are visited by the later passes like any other.
// Elsewhere: splitting runs from cleanup over the tick's kills (split.ts); a boss's phase changes
// and ending run from the damage pipeline (bossPhases.ts) and the `bossEnd` script action; who
// can't be touched is layers.ts. Per-enemy state is on `Enemy` (entities.ts: abilityTicks,
// abilityCount, paceMul, burrowed, huddleUid, bossPhase, invulnerableTicks, leaving).
import type { SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';
import { bossHuddle, bossStep } from './boss.ts';
import { burrowStep } from './burrow.ts';
import { huddleStep } from './huddle.ts';
import { leaveStep } from './leave.ts';

export { splitOnDeath, wasKilled } from './split.ts';
export { untargetable, immune } from './layers.ts';
export { bossDamage, startBossEnding } from './bossPhases.ts';
export { bossNextAbility, bossTelling, type BossAbility } from './boss.ts';
export { burrowTelling } from './burrow.ts';

export function enemyAbilities(state: SimState, ctx: TickContext): void {
  const pool = state.enemies;
  for (let i = 0; i < pool.used; i++) {
    const e = pool.items[i]!; // i < used ≤ items.length
    if (!e.alive) continue;
    e.paceMul = 1;
    e.huddleUid = 0;
  }
  for (let i = 0; i < pool.used; i++) {
    const e = pool.items[i]!; // i < used (which a boss's young may grow) ≤ items.length
    const def = e.def;
    if (!e.alive || def === null) continue;
    if (e.leaving) {
      leaveStep(state, ctx, e);
      continue;
    }
    if (def.burrow !== null) burrowStep(e, def.burrow);
    if (def.boss !== null) bossStep(state, ctx, e, def.boss);
  }
  for (let i = 0; i < pool.used; i++) {
    const e = pool.items[i]!; // i < used ≤ items.length
    const def = e.def;
    if (!e.alive || def === null || e.leaving || e.burrowed) continue;
    const huddle = def.boss !== null ? bossHuddle(e) : def.huddle;
    if (huddle !== null) huddleStep(state, e, huddle);
  }
}
