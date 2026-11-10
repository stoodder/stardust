// Link validation (design/towers.md § 6), the rules compile can't see from one partner alone
// (compileLinks.ts checks each partner's own bonuses):
// - [vs-shielded]: a partner's `vsShielded` bonus (Resonance) sits only on a tower whose every
//   tier and spec attacks with a kind that reads the tower's conditional damage per victim
//   (sim/systems/towers.ts `damageOn`: hitscan, pulse, chain, charge, line, beam). A shell
//   (`lobbed`) or a missile (`projectile`) bakes its damage when it fires and never sees the
//   shield, and a support or spawner tier deals none, so the bonus there would silently do
//   nothing (T563).
import { mergePatch } from './compileHelpers.ts';
import type { Issues } from './validateHelpers.ts';
import type { AttackKind, IdSpace, RawContent, TierDef, TowerDef } from './types.ts';

/** Attack kinds whose hits go through `damageOn` (sim/systems/towers.ts); keep in step with it. */
export const DAMAGE_ON_KINDS: ReadonlySet<AttackKind> = new Set<AttackKind>([
  'hitscan',
  'pulse',
  'chain',
  'charge',
  'line',
  'beam',
]);

/** [vs-shielded] over every link in the registry. */
export function validateLinks<K extends IdSpace>(issues: Issues, raw: RawContent<K>): void {
  const towers: Readonly<Record<string, TowerDef>> = raw.towers;
  for (const link of Object.values(raw.links ?? {})) {
    for (const [i, p] of link.partners.entries()) {
      if (!p.bonuses.some((b) => b.vsShielded === true)) continue;
      const def = towers[p.tower];
      if (def === undefined) continue; // compile reports an unknown partner
      const where = `links.${link.id}.partners[${i}]`;
      for (const [tier, w] of resolvedTiers(def)) {
        const kind = tier.attack?.kind;
        if (kind === undefined || !DAMAGE_ON_KINDS.has(kind)) {
          issues.add(
            'vs-shielded',
            where,
            `'${def.id}' ${w} attacks with ${kind === undefined ? 'nothing' : `'${kind}'`}, ` +
              'which never reads a vsShielded bonus (hitscan, pulse, chain, charge, line or beam only)',
          );
        }
      }
    }
  }
}

/** A tower's tiers and specs, each with its patches merged as compile merges them. */
function resolvedTiers(def: TowerDef): [TierDef, string][] {
  const [t1, p2, p3] = def.tiers;
  const t2 = resolve(t1, p2);
  const t3 = resolve(t2, p3);
  const out: [TierDef, string][] = [
    [t1, 'tier 1'],
    [t2, 'tier 2'],
    [t3, 'tier 3'],
  ];
  if (def.specs !== undefined) {
    out.push([resolve(t3, def.specs.a), 'spec A'], [resolve(t3, def.specs.b), 'spec B']);
  }
  return out;
}

function resolve(base: TierDef, patch: object): TierDef {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the compile merge rule; compile checks completeness
  return mergePatch(base, patch) as TierDef;
}
