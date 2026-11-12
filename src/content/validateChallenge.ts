// [challenge] (design/maps.md § 8; T862): a challenge map's rules (`MapDef.challenge`) and what they
// demand of its data. The run applies them (sim/rules.ts `challengeConfig`), so the builds the
// harness runs must already obey them, or a step would be rejected for a tower the run left home:
// - `challenge` goes with `act: 'challenge'`, and only there; a challenge map is never a campaign
//   map; its tagline isn't blank; each rule kind appears at most once.
// - `towerFaction`: every scripted build's loadout is of that faction.
// - `noAbilities`: no build brings a Technician ability or casts one.
// - `glassCore`: the map has a core (Defend or Protect).
// - a challenge map has a Challenge medal (its medals pay Intel, progression.md § 3).
import type { ChallengeRuleDef, IdSpace, MapDef, RawContent, ScriptedBuild } from './types.ts';
import type { Issues } from './validateHelpers.ts';

/** The [challenge] checks over every map in `raw`. */
export function validateChallenges<K extends IdSpace>(issues: Issues, raw: RawContent<K>): void {
  const factionOf = new Map<string, string>(
    Object.values<{ id: string; faction: string }>(raw.towers).map((t) => [t.id, t.faction]),
  );
  const campaign: readonly string[] = raw.campaign;
  for (const def of Object.values<MapDef<IdSpace>>(raw.maps)) {
    const where = `maps.${def.id}`;
    const c = def.challenge;
    if ((c !== undefined) !== (def.act === 'challenge')) {
      issues.add('challenge', `${where}.challenge`, "goes with act 'challenge' (and only there)");
    }
    if (c === undefined) continue;
    if (campaign.includes(def.id)) {
      issues.add('challenge', where, 'a challenge map is never a campaign map');
    }
    if (c.tagline.trim() === '') issues.add('challenge', `${where}.challenge.tagline`, 'is blank');
    const kinds = new Set<ChallengeRuleDef['kind']>();
    for (const r of c.rules) {
      if (kinds.has(r.kind)) {
        issues.add('challenge', `${where}.challenge.rules`, `'${r.kind}' is listed twice`);
      }
      kinds.add(r.kind);
    }
    if (def.medals === undefined) {
      issues.add('challenge', `${where}.medals`, 'a challenge map needs its Challenge medal');
    }
    if (kinds.has('glassCore') && def.objective !== 'defend' && def.objective !== 'protect') {
      issues.add(
        'challenge',
        `${where}.challenge.rules`,
        `glassCore needs a core (got '${def.objective}')`,
      );
    }
    const builds: [string, ScriptedBuild<IdSpace> | undefined][] = [
      ['parBuild', def.parBuild],
      ...Object.entries(def.altBuilds ?? {}),
      ...Object.entries(def.noCounterBuilds),
    ];
    for (const [name, b] of builds) {
      if (b === undefined) continue;
      const at = `${where}.${name}`;
      for (const r of c.rules) {
        if (r.kind === 'towerFaction') {
          for (const t of b.loadout) {
            const f = factionOf.get(t);
            if (f !== undefined && f !== r.faction) {
              issues.add('challenge', `${at}.loadout`, `'${t}' is ${f}; only ${r.faction} deploys`);
            }
          }
        } else if (r.kind === 'noAbilities') {
          if ((b.technicianAbility ?? null) !== null) {
            issues.add('challenge', `${at}.technicianAbility`, 'Radio Silence: slot 1 stays empty');
          }
          if (b.steps.some((s) => 'ability' in s)) {
            issues.add('challenge', `${at}.steps`, 'Radio Silence: no ability is cast');
          }
        }
      }
    }
  }
}
