// System 4c: enemyAbilities. Enemy ability state machines (design/enemies.md § 3, § 5–6;
// architecture.md § Entity model), before the commander abilities and before movement, so a dig,
// a huddle's pace, or a boss's haste applies to this tick's step. Four passes, each in ascending
// slot order:
// 1. Reset each live unit's per-tick ability state (`paceMul` 1, `huddleUid` 0).
// 2. Each unit's own abilities: a leaving unit only leaves (leave.ts); otherwise burrow.ts (the
//    Digger's dig cycle) and boss.ts (a boss's phase abilities: sneezes, burrows, haste). Act II
//    (T400a seams): skittish.ts (a bolting fleeing unit's haste; T402), pulse.ts (shield pulses,
//    a unit's or its boss phase's; T403), and blink.ts (a unit's or its boss phase's, holding it
//    still through the tell; T404). M5: phase.ts (the Rift Moth's Phased cycle; T503). cloak.ts
//    is the untouchable rule's query (T406), run from targeting rather than here.
// 3. The hush rule over every unit at once (hush.ts; T402): tells count down and land, then new
//    contacts are matched order-independently; a unit in a tell stands still (`paceMul` 0).
// 4. Huddles (huddle.ts: the Elder, a boss's huddle phase), so each leader's pace is final.
// 5. Shield-recharge auras over every unit at once (shieldAura.ts: the Aegis Cantor; T502).
// Units born this tick (a boss's young) are visited by the later passes like any other.
// Elsewhere: splitting runs from cleanup over the tick's kills (split.ts); a boss's phase changes
// and ending run from the damage pipeline (bossPhases.ts) and the `bossEnd` script action; who
// can't be touched is layers.ts. Per-enemy state is on `Enemy` (entities.ts: abilityTicks,
// abilityCount, paceMul, burrowed, huddleUid, bossPhase, invulnerableTicks, leaving).
import type { SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';
import { blinkStep } from './blink.ts';
import { bossHuddle, bossStep } from './boss.ts';
import { burrowStep } from './burrow.ts';
import { huddleStep } from './huddle.ts';
import { hushPass } from './hush.ts';
import { leaveStep } from './leave.ts';
import { phaseStep } from './phase.ts';
import { pulseStep } from './pulse.ts';
import { shieldAuraPass } from './shieldAura.ts';
import { skittishStep } from './skittish.ts';

export { splitOnDeath, wasKilled } from './split.ts';
export { untargetable, immune } from './layers.ts';
export { bossDamage, startBossEnding } from './bossPhases.ts';
export { bossNextAbility, bossTelling, type BossAbility } from './boss.ts';
export { burrowTelling } from './burrow.ts';
export { cloakedOut } from './cloak.ts';
export { activeBlink, blinkLanding, blinkTelling } from './blink.ts';
export { projectedAura } from './shieldAura.ts';
export { phaseTelling, solidTicks } from './phase.ts';

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
    if (e.skittishTicks > 0) skittishStep(state, e);
    const phase = def.boss === null ? null : (def.boss.phases[e.bossPhase - 1] ?? null);
    const pulse = phase?.pulse ?? def.pulse;
    if (pulse !== null) pulseStep(state, ctx, e, pulse);
    const blink = phase?.blink ?? def.blink;
    if (blink !== null) blinkStep(state, ctx, e, blink);
    if (def.phase !== null) phaseStep(state, e, def.phase);
  }
  hushPass(state, ctx);
  for (let i = 0; i < pool.used; i++) {
    const e = pool.items[i]!; // i < used ≤ items.length
    const def = e.def;
    if (!e.alive || def === null || e.leaving || e.burrowed) continue;
    const huddle = def.boss !== null ? bossHuddle(e) : def.huddle;
    if (huddle !== null) huddleStep(state, e, huddle);
  }
  shieldAuraPass(state, ctx);
}
