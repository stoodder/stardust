// Shield-recharge auras (design/enemies.md § 3 `shield_aura`, § 5.2; D137; T502), the Aegis
// Cantor's: allies within its radius regain `shieldPerTick` every tick, continuously (D137: not a
// pulse, so there is no timer, no tell, and no event; render reads the def). One pass over every
// unit at once, from the abilities system after the hush rule (enemyAbilities/index.ts):
// - **Sources:** every live unit with `def.shieldAura` that isn't leaving, burrowed or Phased (a Cantor
//   standing down or walking off projects nothing).
// - **Who regains:** every live unit of the source's faction with a shield, within the radius
//   (centres, any layer, so the Lightwings over a road are in it), never past its own max. Not the
//   source itself ("allies": a Cantor is recharged only by another Cantor), not a boss (a boss's
//   shield is its phases' business: the Penitent's broken shield, T506), not a neutral unit, and
//   not one that's leaving, burrowed or Phased (nothing reaches those, the pulse's rule). A cloaked unit is
//   recharged whether or not it's Revealed: the untouchable rule is about what the player sends
//   (enemies.md § 2.5).
// - **Stacking:** auras of the same kind don't stack (towers.md § 4; Haste's "highest only"): a unit
//   inside two Cantors' rings regains the strongest one's rate, once.
// - **The regen delay** is untouched and doesn't stop it: the aura works under fire (that's why
//   it's "kill it first"), and the unit's own regeneration still waits out its delay (status.ts).
//   Both add up while both run.
// - **Interrupts** don't stop it: Stasis and Unnerved cancel abilities with a tell (§ 2.4), and an
//   aura has none. A Pin, a jam, or a hush changes nothing either.
// Story difficulty's −30% shields scales the rate with the shield (systems/waves.ts `scaledEnemy`),
// so an aura restores the same share of a weaker shield. Allocation-free: the sources go in
// `ctx.scratch.slots`.
import type { CompiledShieldAura } from '../../content/compiled.ts';
import type { Enemy } from '../entities.ts';
import type { SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';
import { outOfReach } from './layers.ts';

/** The aura `e` projects now (render reads it), or null: none, dead, leaving, burrowed, or Phased. */
export function projectedAura(e: Readonly<Enemy>): CompiledShieldAura | null {
  const def = e.def;
  if (def === null || def.shieldAura === null) return null;
  if (!e.alive || outOfReach(e)) return null;
  return def.shieldAura;
}

/** One tick of every shield aura: each ally in reach regains the strongest rate, up to its max. */
export function shieldAuraPass(state: SimState, ctx: TickContext): void {
  const pool = state.enemies;
  const sources = ctx.scratch.slots;
  sources.length = 0;
  for (let i = 0; i < pool.used; i++) {
    if (projectedAura(pool.items[i]!) !== null) sources.push(i); // i < used ≤ items.length
  }
  if (sources.length === 0) return;
  for (let i = 0; i < pool.used; i++) {
    const a = pool.items[i]!; // i < used ≤ items.length
    const d = a.def;
    if (!a.alive || d === null || d.shield === null || d.neutral || d.boss !== null) continue;
    if (outOfReach(a)) continue;
    const max = d.shield.hp;
    if (a.shieldHp >= max) continue;
    let best = 0;
    for (let s = 0; s < sources.length; s++) {
      const slot = sources[s]!; // s < length
      if (slot === i) continue; // not itself
      const src = pool.items[slot]!; // pushed above: a slot < used
      const aura = src.def!.shieldAura!; // projectedAura checked both
      if (src.def!.faction !== d.faction || aura.shieldPerTick <= best) continue;
      const dx = a.x - src.x;
      const dy = a.y - src.y;
      if (dx * dx + dy * dy <= aura.radiusSq) best = aura.shieldPerTick;
    }
    if (best === 0) continue;
    const next = a.shieldHp + best;
    a.shieldHp = next < max ? next : max;
  }
}
