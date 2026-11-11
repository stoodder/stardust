// Healer auras (design/enemies.md § 3 `healer_aura`, § 5.3; T703), the Maintenance Associate's:
// every ally within its radius regains `hpPerTick` every tick, continuously (as the Cantor's shield
// aura, D137, and the Expediter's haste aura: no timer, no tell, no event; render reads the state,
// HealAuraView's `green.3` pulse ring and the ✚ on each unit it is mending). One pass over every
// unit at once, last in the enemy abilities (index.ts), so a unit healed this tick is whole before
// the towers fire.
// - **Sources:** every live unit with `def.healAura` that isn't leaving, burrowed or Phased
//   (`projectedHeal`; the shield aura's rule, layers.ts `outOfReach`).
// - **Who regains:** every live unit **of the source's faction with the aura's `body`** (the
//   Associate's: Mechanical) whose centre is within the radius (any layer, so a gunship over the
//   road is in it; cloaked or not: the untouchable rule is about what the player sends, enemies.md
//   § 2.5), never past its max HP (`gatherMaxHp`: `def.hp + bonusMaxHp`). Not the source itself ("allies": an
//   Associate is mended only by another Associate), not a boss (a boss's HP is its phases'
//   business: "Shareholder Value" is never mended), not a neutral unit, and not one that's leaving,
//   burrowed or Phased.
// - **Stacking:** auras of one kind don't stack (towers.md § 4): a unit inside two rings regains
//   the strongest rate, once.
// - **Interrupts** don't stop it (an aura has no tell, § 2.4): an Associate in Stasis, Pinned,
//   Unnerved or Lulled still mends. The answer is to kill it first (Strong targeting, Harpoon).
// - **Under fire:** it mends a unit that's being hit; it never revives a dead one (a kill is final
//   the tick it lands, and this pass runs before the towers).
// Story difficulty's −30% HP scales the rate with the HP (systems/waves.ts `scaledEnemy`), so an
// aura restores the same share of a weaker unit. Allocation-free: the sources go in
// `ctx.scratch.slots`.
import type { CompiledHealAura } from '../../content/compiled.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import type { Enemy } from '../entities.ts';
import type { SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';
import { gatherMaxHp } from './gather.ts';
import { outOfReach } from './layers.ts';

/** The healer aura `e` projects now (render reads it), or null: none, dead, leaving, burrowed, or Phased. */
export function projectedHeal(e: DeepReadonly<Enemy>): CompiledHealAura | null {
  const def = e.def;
  if (def === null || def.healAura === null) return null;
  if (!e.alive || outOfReach(e)) return null;
  return def.healAura;
}

/** The enemy pool as the rule reads it (the sim's, or render's read-only view of it). */
export interface HealUnits {
  readonly used: number;
  readonly items: readonly DeepReadonly<Enemy>[];
}

/**
 * The HP per tick the auras mend slot `slot` of `pool` by now (0: none, or it's whole). `sources`
 * holds the slots of the units projecting a healer aura (`projectedHeal`), the first `n` of them.
 * The pass and HealAuraView's ✚ both read it, so the two never disagree.
 */
export function healRate(pool: HealUnits, slot: number, sources: ArrayLike<number>, n: number): number {
  const a = pool.items[slot];
  const d = a?.def ?? null;
  if (a === undefined || d === null || !a.alive || d.neutral || d.boss !== null) return 0;
  if (outOfReach(a) || a.hp >= gatherMaxHp(a)) return 0;
  let best = 0;
  for (let s = 0; s < n; s++) {
    const k = sources[s]!; // s < n ≤ length
    if (k === slot) continue; // not itself
    const src = pool.items[k]!; // a source slot < used
    const aura = projectedHeal(src);
    if (aura === null || aura.hpPerTick <= best) continue;
    if (src.def!.faction !== d.faction || aura.body !== d.body) continue; // projectedHeal checked def
    const dx = a.x - src.x;
    const dy = a.y - src.y;
    if (dx * dx + dy * dy <= aura.radiusSq) best = aura.hpPerTick;
  }
  return best;
}

/** One tick of every healer aura: each ally in reach regains the strongest rate, up to its max. */
export function healAuraPass(state: SimState, ctx: TickContext): void {
  const pool = state.enemies;
  const sources = ctx.scratch.slots;
  sources.length = 0;
  for (let i = 0; i < pool.used; i++) {
    if (projectedHeal(pool.items[i]!) !== null) sources.push(i); // i < used ≤ items.length
  }
  if (sources.length === 0) return;
  for (let i = 0; i < pool.used; i++) {
    const rate = healRate(pool, i, sources, sources.length);
    if (rate === 0) continue;
    const a = pool.items[i]!; // healRate found it: i < used
    const max = gatherMaxHp(a);
    const next = a.hp + rate;
    a.hp = next < max ? next : max;
  }
}
