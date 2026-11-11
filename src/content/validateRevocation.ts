// [revocation] (T606; design/towers.md § 9, progression.md § 8): the counter guarantee treats a
// revoked class as unowned. The class a `revokeTowerClass` takes depends on how the player built,
// so every class it could take is checked:
// - **The revoking map** (A3M2's Clean Exit): the cue's candidates are the reference profile's
//   classes of the action's faction (every class without one). For each, the profile without it
//   still owns an answer to every required counter (after the cue the player rebuilds from what's
//   left), counting the Technician ability only if the map doesn't revoke it.
// - **The maps after it** (A3M3), while the reference profile still lacks one of those candidates
//   (the class its row assumes gone; the jailbreak brings it back and ends the window): for each
//   candidate, the profile with the assumed class back and that candidate gone still answers every
//   required counter.
// The profile's towers count at their best (tier 3, and both specs where it owns them), anywhere
// on the map (a hypothetical tower: counterAnswers.ts), plus the companion's ability. Builds are
// judged by the usual [alt-builds] and [no-counter-build] rules, and the harness runs par against
// each class the cue could take from it (balance/revokeChecks.ts).
import { answerScope, answersCarried, type ReachedTower, type ScopeEnemy } from './counterAnswers.ts';
import { MAX_TIER_BEFORE_SPEC } from './rules.ts';
import type { IdSpace, MapDef, TowerFaction } from './types.ts';
import type { ValidationRules } from './validate.ts';
import type { Issues } from './validateHelpers.ts';

/** The classes an earlier campaign map's cue could take, and that map (validateMap.ts builds it). */
export interface RevocationWindow {
  readonly map: string;
  readonly classes: readonly string[];
}

/**
 * The classes `def`'s `revokeTowerClass` events could take (its reference profile's towers of each
 * action's faction), or null when its events revoke no class.
 */
export function revocationCandidates(
  def: Pick<MapDef<IdSpace>, 'events' | 'referenceProfile'>,
  factionOf: (tower: string) => TowerFaction | undefined,
): string[] | null {
  const factions: (TowerFaction | null)[] = [];
  for (const ev of def.events ?? []) {
    for (const a of ev.actions) {
      if ('revokeTowerClass' in a) factions.push(a.revokeTowerClass.faction ?? null);
    }
  }
  if (factions.length === 0) return null;
  return def.referenceProfile.towers.filter((t) =>
    factions.some((f) => f === null || f === factionOf(t)),
  );
}

/** The abilities `def`'s events revoke. */
function revokedAbilities(def: Pick<MapDef<IdSpace>, 'events'>): string[] {
  return (def.events ?? []).flatMap((ev) =>
    ev.actions.flatMap((a) => ('revokeAbility' in a ? [a.revokeAbility] : [])),
  );
}

/** [revocation] for one map (see the header). `window` is the earlier cue's, if any. */
export function validateRevocation(
  issues: Issues,
  def: MapDef<IdSpace>,
  ctx: {
    readonly rules: ValidationRules;
    readonly companionAbilities: ReadonlyMap<string, string>;
  },
  enemies: readonly ScopeEnemy[],
  own: readonly string[] | null,
  window: RevocationWindow | null,
): void {
  const where = `maps.${def.id}.referenceProfile`;
  const profile = def.referenceProfile;
  const revoked = revokedAbilities(def);
  const cast: string[] = [];
  const tech = profile.technicianAbility;
  if (tech !== null && !revoked.includes(tech)) cast.push(tech);
  const c = def.companion ?? null;
  if (c !== null && !('pick' in c) && c.state === 'present') {
    const a = ctx.companionAbilities.get(c.id);
    if (a !== undefined) cast.push(a);
  }

  const check = (owned: readonly string[], gone: string, why: string): void => {
    const towers: ReachedTower[] = owned.flatMap((t): ReachedTower[] => {
      const best: ReachedTower = { tower: t, tier: MAX_TIER_BEFORE_SPEC, spec: null };
      if (!profile.specs.includes(t)) return [best];
      return [best, { tower: t, tier: 4, spec: 'a' }, { tower: t, tier: 4, spec: 'b' }];
    });
    for (const counter of def.requiredCounters) {
      const scope = answerScope(counter, def.act, enemies);
      if (answersCarried(ctx.rules.counterAnswers[counter], scope, towers, cast).length > 0) {
        continue;
      }
      issues.add(
        'revocation',
        where,
        `without '${gone}' (${why}) the profile has no answer to required counter '${counter}'`,
      );
    }
  };

  if (own !== null) {
    for (const gone of own) {
      check(
        profile.towers.filter((t) => t !== gone),
        gone,
        'its revokeTowerClass could take it',
      );
    }
  }
  if (window !== null) {
    const assumed = window.classes.filter((t) => !profile.towers.includes(t));
    if (assumed.length === 0) return; // every class is back (the jailbreak): the window closed
    const all = [...profile.towers, ...assumed];
    for (const gone of window.classes) {
      check(
        all.filter((t) => t !== gone),
        gone,
        `${window.map}'s revokeTowerClass could have taken it`,
      );
    }
  }
}
