// Echo Spike's echo (design/towers.md § 7, Mindspike [Echo Spike]; T507): a hitscan attack with an
// `echo` sends `pct` of each hit's damage to every other enemy within `radiusTiles` of its target.
// - **The amount** is the hit's damage before the pipeline, with the tower's bonuses (towers.ts
//   `damageOn`, so a conditional link bonus is checked per victim), × `pct`; each victim then takes
//   it through its own damage pipeline (Psionic ignores armor; the body and shield multipliers are
//   the victim's, enemies.md § 2.2–2.3).
// - **Who:** live units on the layers the tier hits (`canHit`: never one cloaked out, burrowed,
//   Phased, or leaving), centre within the radius of where the target stood (inclusive, like
//   splash), the target itself excluded. A neutral unit (Gerald) is passed by, as a pulse passes
//   him (combat/neutral.ts), and a hit on a neutral target (which plinks off) echoes nothing.
// - **Only damage:** the tier's on-hit statuses and link statuses stay with the main hit.
// - **Order:** victims are chosen before any echo lands (a split's children, born of a kill here,
//   aren't hit), in ascending slot order; then EchoBurst, after the hit's ProjectileHit, with how
//   many units it reached (0 is still a burst: the ring shows where it went off).
import type { CompiledAttack, CompiledTier } from '../../content/compiled.ts';
import { applyDamage } from '../combat/damage.ts';
import { isNeutral } from '../combat/neutral.ts';
import { canHit } from '../combat/targeting.ts';
import type { Tower } from '../entities.ts';
import { emit, type SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';
import { damageOn } from '../systems/towers.ts';

type HitscanAttack = Extract<CompiledAttack, { kind: 'hitscan' }>;
type Echo = NonNullable<HitscanAttack['echo']>;

/**
 * The echo of a hit by `t` on the unit `targetUid`, which stood at (x, y) when it was hit: `echo`'s
 * share of the damage to every other unit in its radius, then EchoBurst.
 */
export function echoHit(
  state: SimState,
  ctx: TickContext,
  t: Tower,
  tier: CompiledTier,
  attack: HitscanAttack,
  echo: Echo,
  targetUid: number,
  x: number,
  y: number,
): void {
  const enemies = state.enemies;
  const layers = tier.targets;
  const victims = ctx.scratch.slots;
  victims.length = 0;
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (e.uid === targetUid || !canHit(e, layers) || isNeutral(e)) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    if (dx * dx + dy * dy <= echo.radiusSq) victims.push(i);
  }
  const source = ctx.scratch.towerSource;
  source.uid = t.uid;
  const hits = victims.length;
  for (let k = 0; k < hits; k++) {
    const e = enemies.items[victims[k]!]!; // collected slots < used
    if (!e.alive) continue; // defensive: a slot in the list is never freed before its turn
    applyDamage(state, e, damageOn(t, attack, e) * echo.pct, attack.type, source, attack);
  }
  victims.length = 0;
  emit(state, {
    type: 'EchoBurst',
    towerUid: t.uid,
    x,
    y,
    radiusTiles: echo.radiusTiles,
    hits,
  });
}
