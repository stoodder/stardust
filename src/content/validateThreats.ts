// Threat intel and counters (maps.md § 6.2–6.3; the rule list is validateMap.ts's header):
// [threat-intel], [required-counters], [soft-traits], [teach], [new-threats], [new-counter].
import {
  MAX_NEW_COUNTER_CATEGORIES,
  MAX_NEW_THREATS,
  MAX_REQUIRED_COUNTERS,
  SOFT_THREAT_MAX_SHARE,
  THREAT_ARMOR_DIVISOR,
  THREAT_AURA_FACTOR,
  THREAT_AURA_TRAITS,
  THREAT_SHIELD_WEIGHT,
  THREAT_TRAIT_FACTOR,
  TRAIT_COUNTER,
} from './rules.ts';
import type {
  CounterId,
  EnemyDef,
  IdSpace,
  MapDef,
  ThreatIntelId,
  Trait,
  WaveGroup,
} from './types.ts';
import type { MapCtx } from './validateMap.ts';
import { Issues, duplicates, type Grid } from './validateHelpers.ts';
import { routesOf, type RouteKind } from './validateWaves.ts';

/** What earlier campaign maps introduced (for the one-new-thing rules). */
export interface History {
  readonly enemies: Set<string>;
  readonly traits: Set<Trait>;
  readonly counters: Set<CounterId>;
  airLane: boolean;
  secondSpawn: boolean;
  rift: boolean;
}

export function emptyHistory(): History {
  return {
    enemies: new Set(),
    traits: new Set(),
    counters: new Set(),
    airLane: false,
    secondSpawn: false,
    rift: false,
  };
}

/** An enemy's planning threat (maps.md § 6.2). */
export function threatOf(e: EnemyDef): number {
  let factor = 1;
  for (const t of e.traits) factor *= THREAT_TRAIT_FACTOR[t] ?? 1;
  if (e.traits.some((t) => THREAT_AURA_TRAITS.includes(t))) factor *= THREAT_AURA_FACTOR;
  return (
    (e.hp + THREAT_SHIELD_WEIGHT * (e.shield?.hp ?? 0)) *
    (1 + e.armor / THREAT_ARMOR_DIVISOR) *
    Math.sqrt(e.speedTilesPerSec) *
    factor
  );
}

/** Soft on this map (enemies.md § 3.1): a category trait, and none the map requires. */
function isSoft(e: EnemyDef, required: readonly CounterId[]): boolean {
  const cats = e.traits.map((t) => TRAIT_COUNTER[t]).filter((c) => c !== null);
  return cats.length > 0 && !cats.some((c) => required.includes(c));
}

/**
 * A unit that threatens nothing: a neutral unit (Gerald, core-loop § 2.7) is not part of the
 * roster, so it brings no trait, threat, or novelty to a map (T304a).
 */
function isNeutralId(ctx: MapCtx, id: string): boolean {
  return ctx.enemies.get(id)?.neutral === true;
}

/**
 * The traits a set of groups brings: each enemy's, plus `skittish` for a `fleeing` Skitterkin
 * group (Skittish is the fleeing modifier, not an enemy's trait; D101).
 */
function traitsOf(ctx: MapCtx, groups: readonly WaveGroup<IdSpace>[]): Set<Trait> {
  const out = new Set<Trait>();
  for (const g of groups) {
    if (isNeutralId(ctx, g.enemy)) continue;
    const e = ctx.enemies.get(g.enemy);
    for (const t of e?.traits ?? []) out.add(t);
    if (e?.faction === 'skitterkin' && (g.tags ?? []).includes('fleeing')) out.add('skittish');
  }
  return out;
}

/** The threat intel a map's waves call for: their traits, plus `boss` when a boss walks them. */
function intelOf(ctx: MapCtx, groups: readonly WaveGroup<IdSpace>[]): Set<ThreatIntelId> {
  const out = new Set<ThreatIntelId>(traitsOf(ctx, groups));
  if (groups.some((g) => ctx.enemies.get(g.enemy)?.boss !== undefined)) out.add('boss');
  return out;
}

export function validateThreats(
  issues: Issues,
  ctx: MapCtx,
  def: MapDef<IdSpace>,
  history: History,
  where: string,
): void {
  const allGroups = def.waves.flatMap((w) => w.groups);
  const present = intelOf(ctx, allGroups);
  for (const t of duplicates(def.threatIntel)) {
    issues.add('threat-intel', `${where}.threatIntel`, `'${t}' is listed twice`);
  }
  const missing = [...present].filter((t) => !def.threatIntel.includes(t));
  const extra = def.threatIntel.filter((t) => !present.has(t));
  if (missing.length > 0) {
    issues.add(
      'threat-intel',
      `${where}.threatIntel`,
      `missing ${missing.join(', ')} (in the waves)`,
    );
  }
  if (extra.length > 0) {
    issues.add(
      'threat-intel',
      `${where}.threatIntel`,
      `lists ${extra.join(', ')}, which no wave has`,
    );
  }

  const required = def.requiredCounters;
  for (const c of duplicates(required)) {
    issues.add('required-counters', `${where}.requiredCounters`, `'${c}' is listed twice`);
  }
  if (required.length > MAX_REQUIRED_COUNTERS) {
    issues.add(
      'required-counters',
      `${where}.requiredCounters`,
      `${required.length} entries; at most ${MAX_REQUIRED_COUNTERS}`,
    );
  }
  for (const c of required) {
    if (def.noCounterBuilds[c] === undefined) {
      issues.add(
        'required-counters',
        `${where}.noCounterBuilds`,
        `'${c}' needs a no-counter build`,
      );
    }
  }

  // Soft-trait share, per wave (fleeing units count 0; teach waves and groups are exempt).
  for (const [w, wave] of def.waves.entries()) {
    if (wave.teach === true) continue;
    let total = 0;
    let soft = 0;
    for (const g of wave.groups) {
      const e = ctx.enemies.get(g.enemy);
      if (e === undefined || e.neutral === true || (g.tags ?? []).includes('fleeing')) continue;
      const threat = threatOf(e) * g.count;
      total += threat;
      if (g.teach !== true && isSoft(e, required)) soft += threat;
    }
    if (total > 0 && soft / total > SOFT_THREAT_MAX_SHARE) {
      issues.add(
        'soft-traits',
        `${where}.waves[${w}]`,
        `soft enemies are ${Math.round((soft / total) * 100)}% of the wave's threat (max ${SOFT_THREAT_MAX_SHARE * 100}%)`,
      );
    }
  }

  // Teach waves and groups: each teaches a trait new to the campaign, at most one per trait.
  const newTraits = new Set([...traitsOf(ctx, allGroups)].filter((t) => !history.traits.has(t)));
  const taught = new Map<Trait, string>();
  const teach = (groups: readonly WaveGroup<IdSpace>[], w: string): void => {
    const fresh = [...traitsOf(ctx, groups)].filter((t) => newTraits.has(t));
    if (fresh.length === 0) {
      issues.add('teach', w, 'a teach wave or group must bring a trait new to the campaign');
    }
    for (const t of fresh) {
      const earlier = taught.get(t);
      if (earlier !== undefined) issues.add('teach', w, `'${t}' is already taught by ${earlier}`);
      else taught.set(t, w);
    }
  };
  for (const [w, wave] of def.waves.entries()) {
    if (wave.teach === true) teach(wave.groups, `${where}.waves[${w}]`);
    for (const [g, group] of wave.groups.entries()) {
      if (group.teach === true) teach([group], `${where}.waves[${w}].groups[${g}]`);
    }
  }
}

/** The one-new-thing limits (maps.md § 6.3), in campaign order; then records this map. */
export function validateNovelty(
  issues: Issues,
  ctx: MapCtx,
  def: MapDef<IdSpace>,
  grid: Grid | null,
  history: History,
  where: string,
): void {
  const routes = routesOf(def);
  const groups = def.waves.flatMap((w) => w.groups);
  const used = (kind: RouteKind): boolean => groups.some((g) => routes.get(g.route)?.kind === kind);
  const newEnemies = [...new Set(groups.map((g) => g.enemy))].filter(
    (id) => ctx.enemies.has(id) && !history.enemies.has(id) && !isNeutralId(ctx, id),
  );
  // What a new enemy's own groups bring (its traits, and Skittish when it walks fleeing).
  const broughtByNew = traitsOf(
    ctx,
    groups.filter((g) => newEnemies.includes(g.enemy)),
  );
  const present = traitsOf(ctx, groups);
  const newTraits = [...present].filter((t) => !history.traits.has(t) && !broughtByNew.has(t));
  const modifiers: string[] = [];
  const spawns = grid?.count('S') ?? 0;
  if (spawns >= 2 && !history.secondSpawn) modifiers.push('second spawn');
  // The air lane arrives with the first flyer and counts with it.
  const newFlyer = newEnemies.some((id) => ctx.enemies.get(id)?.layer === 'air');
  if (used('air') && !history.airLane && !newFlyer) modifiers.push('air lane');
  if (used('rift') && !history.rift) modifiers.push('rift lanes');
  // A capstone boss built only from mechanics already taught is exempt (maps.md § 6.3, rule 2):
  // every trait it has is known, and so is every unit its phases bring. Shards (the Penitent's
  // Glimmer-shards) are born only from their boss, never in a wave, so they're judged by their
  // traits: every one already taught.
  const known = (t: Trait): boolean => history.traits.has(t);
  const capstone = (id: string): boolean => {
    const e = ctx.enemies.get(id);
    if (e?.boss === undefined) return false;
    const brings = e.boss.phases.flatMap((p) => [
      ...(p.spawn === undefined ? [] : [p.spawn.enemy]),
      ...(p.burrow?.surfaceSpawn === undefined ? [] : [p.burrow.surfaceSpawn.enemy]),
    ]);
    const shards = e.boss.phases.flatMap((p) =>
      p.shards === undefined ? [] : [ctx.enemies.get(p.shards.enemy)],
    );
    return (
      e.traits.every(known) &&
      shards.every((s) => s !== undefined && s.traits.every(known)) &&
      brings.every((b) => history.enemies.has(b))
    );
  };
  const threats = [
    ...newEnemies.filter((e) => !capstone(e)).map((e) => `enemy ${e}`),
    ...newTraits.map((t) => `trait ${t}`),
    ...modifiers,
  ];
  if (threats.length > MAX_NEW_THREATS) {
    issues.add(
      'new-threats',
      where,
      `${threats.length} new threats (${threats.join(', ')}); at most ${MAX_NEW_THREATS}`,
    );
  }
  const newCounters = def.requiredCounters.filter((c) => !history.counters.has(c));
  if (newCounters.length > MAX_NEW_COUNTER_CATEGORIES) {
    issues.add(
      'new-counter',
      `${where}.requiredCounters`,
      `${newCounters.join(', ')} are all new; at most ${MAX_NEW_COUNTER_CATEGORIES} new category per map`,
    );
  }

  for (const e of groups) history.enemies.add(e.enemy);
  for (const t of present) history.traits.add(t);
  for (const c of def.requiredCounters) history.counters.add(c);
  history.secondSpawn ||= spawns >= 2;
  history.airLane ||= used('air');
  history.rift ||= used('rift');
}
