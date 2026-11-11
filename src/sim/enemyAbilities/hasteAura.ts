// Haste auras (design/enemies.md § 3 `haste_aura`, § 5.3; T603), the Expediter's: every ally within
// its radius has Haste at its `pct`, continuously (like the Cantor's shield aura, D137: no timer,
// no tell, no event; render reads the state). One pass over every unit at once, last in the enemy
// abilities (index.ts), so movement reads this tick's value (`Enemy.auraHastePct`, systems/
// movement.ts's speed rule: `base × (1 − chill) × (1 − unnerved) × (1 + haste)`).
// - **Sources:** every live unit with `def.hasteAura` that isn't leaving, burrowed or Phased
//   (`projectedHaste`; the shield aura's rule, layers.ts `outOfReach`).
// - **Who is hasted:** every live unit of the source's faction whose centre is within the radius
//   (any layer, so a gunship over the road is in it; cloaked or not: the untouchable rule is about
//   what the player sends, enemies.md § 2.5). Not the source itself ("allies": an Expediter is
//   hasted only by another Expediter), not a boss (a boss's pace is its phases' business, as its
//   shield is to the shield aura: "Shareholder Value"'s jettison haste is its own), not a neutral
//   unit, and not one that's leaving, burrowed or Phased.
// - **Stacking:** highest only, capped (enemies.md § 2.4, HASTE_CAP): a unit inside two rings has
//   the strongest pct, once. The other haste sources never meet an aura: Skittish is a fleeing
//   Skitterkin's and no Skitterkin projects haste (content test), and a boss is never in one.
// - **Interrupts** don't stop it (an aura has no tell, § 2.4); a Pin or Stasis holds the hasted
//   unit still all the same (its speed is 0), and chill and Unnerved multiply with it.
// Story difficulty changes no haste number. Allocation-free: the sources go in `ctx.scratch.slots`.
import type { CompiledHasteAura } from '../../content/compiled.ts';
import { HASTE_CAP } from '../../content/rules.ts';
import type { Enemy } from '../entities.ts';
import type { SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';
import { outOfReach } from './layers.ts';

/** The haste aura `e` projects now (render reads it), or null: none, dead, leaving, burrowed, or Phased. */
export function projectedHaste(e: Readonly<Enemy>): CompiledHasteAura | null {
  const def = e.def;
  if (def === null || def.hasteAura === null) return null;
  if (!e.alive || outOfReach(e)) return null;
  return def.hasteAura;
}

/** Whether a haste aura can reach `e` at all: alive, not a boss or neutral, on the field. */
export function hasteable(e: Readonly<Enemy>): boolean {
  const d = e.def;
  return e.alive && d !== null && !d.neutral && d.boss === null && !outOfReach(e);
}

/** One tick of every haste aura: each unit's `auraHastePct` is the strongest ring covering it. */
export function hasteAuraPass(state: SimState, ctx: TickContext): void {
  const pool = state.enemies;
  const sources = ctx.scratch.slots;
  sources.length = 0;
  for (let i = 0; i < pool.used; i++) {
    if (projectedHaste(pool.items[i]!) !== null) sources.push(i); // i < used ≤ items.length
  }
  for (let i = 0; i < pool.used; i++) {
    const a = pool.items[i]!; // i < used ≤ items.length
    if (sources.length === 0 || !hasteable(a)) {
      a.auraHastePct = 0;
      continue;
    }
    const faction = a.def!.faction; // hasteable checked def
    let best = 0;
    for (let s = 0; s < sources.length; s++) {
      const slot = sources[s]!; // s < length
      if (slot === i) continue; // not itself
      const src = pool.items[slot]!; // pushed above: a slot < used
      const aura = src.def!.hasteAura!; // projectedHaste checked both
      if (src.def!.faction !== faction || aura.pct <= best) continue;
      const dx = a.x - src.x;
      const dy = a.y - src.y;
      if (dx * dx + dy * dy <= aura.radiusSq) best = aura.pct;
    }
    a.auraHastePct = best < HASTE_CAP ? best : HASTE_CAP;
  }
}
