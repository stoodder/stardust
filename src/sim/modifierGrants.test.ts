// The meta catalog's grants (content/upgrades) are sim Modifiers minus their `source`. Content may
// not import the sim, so content/upgrades/types.ts restates the kinds; this test holds the two
// together: at compile time every grant plus a source is a `Modifier`, and at run time every
// catalog grant names a feature the sim gates (so it is simulated, or refused, never ignored).
import { describe, expect, it } from 'vitest';
import {
  PROTOCOLS,
  UPGRADES,
  type ModifierGrant,
  type ProtocolDef,
  type UpgradeDef,
} from '../content/upgrades/index.ts';
import type { Modifier } from './config.ts';
import { FEATURE_GATES, modifierFeature } from './gates.ts';

type Sourced<G> = G extends unknown ? G & { readonly source: string } : never;
/** Compile-time: a grant with a source is a Modifier. */
function toModifier(g: ModifierGrant, source: string): Modifier {
  const m: Sourced<ModifierGrant> = { ...g, source };
  return m;
}

function allGrants(): [string, ModifierGrant][] {
  const out: [string, ModifierGrant][] = [];
  for (const u of Object.values<UpgradeDef>(UPGRADES)) {
    for (const r of u.ranks) for (const g of r.grants) out.push([`upgrade:${u.id}`, g]);
  }
  for (const p of Object.values<ProtocolDef>(PROTOCOLS)) {
    for (const g of p.grants) out.push([`protocol:${p.id}`, g]);
  }
  return out;
}

describe('catalog grants are sim modifiers', () => {
  it('every grant maps to a modifier the sim gates', () => {
    const grants = allGrants();
    expect(grants.length).toBeGreaterThan(0);
    for (const [source, g] of grants) {
      expect(Object.hasOwn(FEATURE_GATES, modifierFeature(toModifier(g, source)))).toBe(true);
    }
  });
});
