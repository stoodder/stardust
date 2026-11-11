// Support auras (design/towers.md § 4 and § 7's Hum Choir; T607): the last step of the links
// system's recompute (systems/links.ts), so it runs only when something changed and reads the
// links' Choir extras. For every live tower, per aura kind (rules.ts AURA_KINDS):
// - **Who covers it:** every other live tower with an aura of that kind whose radius reaches it
//   (centre to centre). A support tower never covers itself. **No Choir aura covers any Choir**
//   (NEVER_COVERS_ITS_KIND): a tower that projects a `choir` aura takes none, its own or another's.
// - **Strength:** each source's aura at its tower's strength: 1, +20% on a power node (a support
//   tower's: `powerNodeAuraPct`), plus its `supportStat` aura tune-up; its radius × its `supportStat`
//   radius tune-up (T406). A Choir's links add to it first (the stacking formula's flat-then-percent
//   order): Harmony's `linkAuraRadiusTiles` widens every aura it projects, and Bounce Chorus's
//   `linkAuraPct` adds to its damage auras' pct.
// - **Same kind, no stacking:** the strongest covering source of each kind wins, and the tower takes
//   every aura of that kind the source reaches it with, one per stat. So Rally Chorus, which
//   authors two `choir` auras (+30% damage and +10% fire rate), gives both, and a tower inside a
//   Rally Chorus and a Lullaby Choir takes the Rally's two, never the sum. A Lookout projects one
//   aura (range, or fire rate with Overclock Rig), so two Lookouts give only the stronger bonus.
//   "Strongest" is a source's strongest covering aura of the kind; ties go to the lower slot.
// - **The jam rule** (`Tower.jamMul`): the lowest `jamMul` of the sources of any kind covering it
//   (1: none; the Choir's T1 0.5, T3 0.25, Rally Chorus 0: immune). Inert until M7's jammers
//   (D141): nothing reads it yet. A Jammed tower provides no auras then.
// Allocation-free; O(towers² × kinds), only on a recompute.
import { AURA_KINDS, type AuraKind } from '../../content/rules.ts';
import type { TowerStat } from '../../content/types.ts';
import { assertNever } from '../../shared/types.ts';
import type { Tower } from '../entities.ts';
import type { SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';
import { supportPct } from './detection.ts';
import { liveTileAt } from './wreckage.ts';

/** The aura kinds whose projectors are never covered by that kind (towers.md § 7: the Choir). */
const NEVER_COVERS_ITS_KIND: readonly AuraKind[] = ['choir'];

/** Whether `t` projects an aura of `kind` at its tier (or specialization). */
export function projectsAura(t: Readonly<Tower>, kind: AuraKind): boolean {
  const auras = t.tierDef?.auras ?? null;
  if (auras === null) return false;
  for (const a of auras) if (a.kind === kind) return true;
  return false;
}

/**
 * An aura's reach from its source, squared, in tiles²: its radius plus the source's Harmony
 * extra, × its `supportStat` radius tune-up. Without a link extra it is `radiusSq × mul²`, the
 * same float the pre-T607 rule computed (so no harness number moves).
 */
export function auraReachSq(
  aura: { readonly radiusTiles: number; readonly radiusSq: number },
  linkRadiusTiles: number,
  radiusMul: number,
): number {
  if (linkRadiusTiles === 0) return aura.radiusSq * radiusMul * radiusMul;
  const r = (aura.radiusTiles + linkRadiusTiles) * radiusMul;
  return r * r;
}

/** Same-kind auras take the strongest source, not the sum (see the header); then the jam rule. */
export function applyAuras(state: SimState, ctx: TickContext, powerNodeAuraPct: number): void {
  const pool = state.towers;
  const map = ctx.map;
  const modifiers = ctx.config.modifiers;
  for (let i = 0; i < pool.used; i++) {
    const t = pool.items[i]!; // i < used ≤ items.length
    t.jamMul = 1;
    if (!t.alive || t.def === null) continue;
    for (const kind of AURA_KINDS) {
      if (NEVER_COVERS_ITS_KIND.includes(kind) && projectsAura(t, kind)) continue;
      let best = 0;
      let bestSlot = -1;
      let bestStrength = 1;
      let bestRadiusMul = 1;
      for (let j = 0; j < pool.used; j++) {
        const s = pool.items[j]!; // j < used ≤ items.length
        if (j === i || !s.alive || s.tierDef === null || s.tierDef.auras.length === 0) continue;
        const support = s.tierDef.attack === null;
        const onNode = support && liveTileAt(map, state.wreckage, s.row * map.cols + s.col) === '+';
        const tuned = support && s.def !== null ? supportPct(modifiers, s.def.id, 'aura') : 0;
        const strength = 1 + (onNode ? powerNodeAuraPct : 0) + tuned;
        const radiusMul =
          support && s.def !== null ? 1 + supportPct(modifiers, s.def.id, 'radius') : 1;
        const dx = s.x - t.x;
        const dy = s.y - t.y;
        const d2 = dx * dx + dy * dy;
        let covers = false;
        for (const aura of s.tierDef.auras) {
          if (aura.kind !== kind) continue;
          if (d2 > auraReachSq(aura, s.linkAuraRadiusTiles, radiusMul)) continue;
          covers = true;
          const v = auraPct(aura, s.linkAuraPct) * strength;
          if (v > best) {
            best = v;
            bestSlot = j;
            bestStrength = strength;
            bestRadiusMul = radiusMul;
          }
        }
        if (covers && s.tierDef.jamMul < t.jamMul) t.jamMul = s.tierDef.jamMul;
      }
      if (bestSlot < 0) continue;
      // The winner's every aura of this kind that reaches the tower, one per stat.
      const s = pool.items[bestSlot]!; // a slot found above
      const auras = s.tierDef!.auras; // the winner has a tier: checked above
      const dx = s.x - t.x;
      const dy = s.y - t.y;
      const d2 = dx * dx + dy * dy;
      for (const aura of auras) {
        if (aura.kind !== kind) continue;
        if (d2 > auraReachSq(aura, s.linkAuraRadiusTiles, bestRadiusMul)) continue;
        addBonus(t, aura.stat, 0, auraPct(aura, s.linkAuraPct) * bestStrength);
      }
    }
  }
}

/** An aura's pct with its source's Bounce Chorus extra (damage auras only). */
function auraPct(aura: { readonly stat: TowerStat; readonly pct: number }, linkPct: number): number {
  return aura.stat === 'damage' ? aura.pct + linkPct : aura.pct;
}

/** Adds a bonus to `stat`'s flat and percent totals (the links system sums its bonuses this way). */
export function addBonus(t: Tower, stat: TowerStat, flat: number, pct: number): void {
  switch (stat) {
    case 'damage':
      t.flatDamage += flat;
      t.pctDamage += pct;
      return;
    case 'rate':
      t.flatRate += flat;
      t.pctRate += pct;
      return;
    case 'range':
      t.flatRange += flat;
      t.pctRange += pct;
      return;
    default:
      assertNever(stat);
  }
}
