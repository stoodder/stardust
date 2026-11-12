// Challenge maps' rules as content sees them (design/maps.md § 8; T862; `MapDef.challenge`). The
// run applies them in the sim (sim/rules.ts `challengeConfig`); this file makes the content side
// read the same map: under `allCloaked`, every hostile unit on the map carries the `cloaked` trait,
// so the threat intel, the required counters (detection), the soft-trait share, the counter model
// (content/counterAnswers.ts), and the briefing's answers judge the map the player meets. The
// compiler compiles such a map's groups against cloaked defs (compileCore.ts `challengeRefs`) and
// the validator checks it against cloaked raw defs (validateChallenge.ts). Pure.
import type { CompiledEnemyDef } from './compiled.ts';
import type { Refs } from './compileHelpers.ts';
import type { ChallengeDef, ChallengeRuleDef, EnemyDef, IdSpace, Trait } from './types.ts';

const CLOAKED: Trait = 'cloaked';

/** A challenge's rule of `kind`, or undefined. */
export function challengeRule<T extends ChallengeRuleDef['kind']>(
  map: { readonly challenge?: ChallengeDef | null | undefined },
  kind: T,
): Extract<ChallengeRuleDef, { readonly kind: T }> | undefined {
  return map.challenge?.rules.find(
    (r): r is Extract<ChallengeRuleDef, { readonly kind: T }> => r.kind === kind,
  );
}

/** True when every hostile unit the map spawns is cloaked (`allCloaked`). */
export function mapCloaksAll(map: {
  readonly challenge?: ChallengeDef | null | undefined;
}): boolean {
  return challengeRule(map, 'allCloaked') !== undefined;
}

/** `def` cloaked (its traits gain `cloaked`); a neutral or already cloaked def as it is. */
export function cloakedEnemyDef<E extends EnemyDef>(def: E): E {
  if (def.neutral === true || def.traits.includes('cloaked')) return def;
  return { ...def, traits: [...def.traits, CLOAKED] };
}

const COMPILED_CLOAKED = new WeakMap<object, object>();

/**
 * Compiled `def` cloaked (`cloaked` set, its traits gain `cloaked`), once per def; a neutral or
 * already cloaked def as it is. The sim's `allCloaked` spawns use it too (systems/waves.ts).
 */
export function cloakedCompiledEnemy<Id extends string>(
  def: CompiledEnemyDef<Id>,
): CompiledEnemyDef<Id> {
  if (def.neutral || def.cloaked) return def;
  const known = COMPILED_CLOAKED.get(def);
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- keyed by this def, set below
  if (known !== undefined) return known as CompiledEnemyDef<Id>;
  const out: CompiledEnemyDef<Id> = Object.freeze({
    ...def,
    cloaked: true,
    traits: [...def.traits, CLOAKED],
  });
  COMPILED_CLOAKED.set(def, out);
  return out;
}

/** `enemies` as `map` sees them: cloaked under `allCloaked`, else `enemies` itself. */
export function enemiesOnMap<E>(
  map: { readonly challenge?: ChallengeDef | null | undefined },
  enemies: ReadonlyMap<string, E>,
  cloak: (e: E) => E,
): ReadonlyMap<string, E> {
  if (!mapCloaksAll(map)) return enemies;
  return new Map([...enemies].map(([id, e]) => [id, cloak(e)]));
}

/** The compile refs `map`'s waves and groups resolve against (compileCore.ts). */
export function challengeRefs<K extends IdSpace>(
  refs: Refs<K>,
  map: { readonly challenge?: ChallengeDef | null | undefined },
): Refs<K> {
  if (!mapCloaksAll(map)) return refs;
  return { ...refs, enemies: enemiesOnMap(map, refs.enemies, cloakedCompiledEnemy) };
}
