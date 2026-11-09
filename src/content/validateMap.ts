// Map validation (design/maps.md § 9's validation rules; architecture.md § Validation). The route
// format itself is a compile error (compileMap.ts); this adds the rest:
// - [feature]: Defend maps only until T305 (Escort safe exits, Holdout, Protect, Choir); no
//   companion until T207.
// - [map-range]: start credits, core integrity, and first-clear Stardust.
// - [grid-span]: campaign maps fit on one screen, `cols + rows ≤ 36` (maps.md § 1).
// - [core]: a Defend map has exactly one core `C`.
// - [marker]: markers (and so script tile changes) sit on decor tiles inside the map (§ 3).
// - [wreckage]: every `x` says what lies under it (a pad, high ground, power node, or decor) and
//   pays 30–80 salvage; nothing else does.
// - [wave]: every wave has groups; counts and intervals are positive; wave 1 has no countdown.
// - [route-walk]: every group can walk its route (flyers on air lanes, ground units on paths or
//   rift lanes; rift lanes carry only the Hollow, from the wave they open).
// - [wave-tag]: no duplicate tags; `fleeing`, `youngling`, and `quiet_wave` only on Skitterkin.
// - [threat-intel]: `threatIntel` is exactly the set of traits in the waves.
// - [required-counters]: at most 3, no duplicates, each with a `noCounterBuilds` entry.
// - [soft-traits]: soft enemies are ≤ 15% of every wave's threat (maps.md § 6.2).
// - [teach]: each `teach` wave or group teaches a trait new to the campaign, at most one per trait.
// - [new-threats], [new-counter]: in campaign order, at most two new threats and one new
//   required-counter category per map (maps.md § 6.3).
// - [script]: wave triggers name a wave of the map; markers, objectives, and forced inputs that
//   scripts name exist; cue ids follow `<map_id>_wNN` or `<map_id>_<slot>`.
// - [flag-variants]: every flag an event or ability lock reads has a `flagVariants` entry.
// - [revisit]: `revisitOf` names another map.
// - Builds: validateBuilds.ts.
//
// TODO stubs (their content can't exist yet): the revisit layout rules (A3M6, M5); medals
// (`medals.challenge` required on campaign maps, conditions never reading medal-exempt groups;
// T202).
import {
  MAX_CAMPAIGN_GRID_SPAN,
  MAX_NEW_COUNTER_CATEGORIES,
  MAX_NEW_THREATS,
  MAX_REQUIRED_COUNTERS,
  SALVAGE_MAX,
  SALVAGE_MIN,
  SKITTERKIN_ONLY_TAGS,
  SOFT_THREAT_MAX_SHARE,
  THREAT_ARMOR_DIVISOR,
  THREAT_AURA_FACTOR,
  THREAT_AURA_TRAITS,
  THREAT_SHIELD_WEIGHT,
  THREAT_TRAIT_FACTOR,
  TRAIT_COUNTER,
} from './rules.ts';
import type {
  ConditionDef,
  CounterId,
  EnemyDef,
  IdSpace,
  MapDef,
  RawContent,
  ScriptAction,
  ScriptFlagId,
  ScriptTrigger,
  Trait,
  WaveGroup,
} from './types.ts';
import type { ValidationRules } from './validate.ts';
import { validateBuilds } from './validateBuilds.ts';
import {
  Issues,
  duplicates,
  fmt,
  gridOf,
  isNonNegativeInt,
  isPositive,
  isPositiveInt,
  parseKey,
  type Grid,
} from './validateHelpers.ts';

/** What earlier campaign maps introduced (for the one-new-thing rules). */
interface History {
  readonly enemies: Set<string>;
  readonly traits: Set<Trait>;
  readonly counters: Set<CounterId>;
  airLane: boolean;
  secondSpawn: boolean;
  rift: boolean;
}

function emptyHistory(): History {
  return {
    enemies: new Set(),
    traits: new Set(),
    counters: new Set(),
    airLane: false,
    secondSpawn: false,
    rift: false,
  };
}

/** Validates every map: campaign maps in campaign order (with history), then the rest. */
export function validateCampaignMaps<K extends IdSpace>(
  issues: Issues,
  raw: RawContent<K>,
  rules: ValidationRules,
): void {
  const maps = new Map<string, MapDef<IdSpace>>(Object.entries<MapDef<IdSpace>>(raw.maps));
  const enemies = new Map<string, EnemyDef>(Object.entries<EnemyDef>(raw.enemies));
  const towersWithSpecs = new Set<string>(
    Object.values<{ id: string; specs?: unknown }>(raw.towers)
      .filter((t) => t.specs !== undefined)
      .map((t) => t.id),
  );
  const ctx = { enemies, towersWithSpecs, rules, mapIds: new Set(maps.keys()) };
  const history = emptyHistory();
  const done = new Set<string>();
  for (const [index, id] of raw.campaign.entries()) {
    const def = maps.get(id);
    if (def === undefined || done.has(id)) continue; // compile reports unknown ids
    done.add(id);
    validateMap(issues, ctx, def, { index, history });
  }
  for (const [id, def] of maps) {
    if (!done.has(id)) validateMap(issues, ctx, def, null);
  }
}

export interface MapCtx {
  readonly enemies: ReadonlyMap<string, EnemyDef>;
  readonly towersWithSpecs: ReadonlySet<string>;
  readonly rules: ValidationRules;
  readonly mapIds: ReadonlySet<string>;
}

/**
 * TODO(T105c): A1M1 is registered before its waves exist. A map with no waves yet is a stub:
 * its wave-derived checks (threat intel, soft traits, new threats) wait for the waves. Delete
 * this once every registered map has waves.
 */
function isStubMap(def: MapDef<IdSpace>): boolean {
  return def.waves.length === 0;
}

function validateMap(
  issues: Issues,
  ctx: MapCtx,
  def: MapDef<IdSpace>,
  campaign: { readonly index: number; readonly history: History } | null,
): void {
  const where = `maps.${def.id}`;
  const grid = gridOf(def);

  // Feature guards.
  if (def.objective !== 'defend') {
    issues.add(
      'feature',
      `${where}.objective`,
      `'${def.objective}' maps arrive with T305 (Escort safe exits, Holdout, Protect); only 'defend' runs now`,
    );
  }
  if (def.companion !== null) {
    issues.add('feature', `${where}.companion`, 'companions arrive with T207; use null');
  }

  if (!isNonNegativeInt(def.startCredits)) {
    issues.add('map-range', `${where}.startCredits`, 'must be a whole number ≥ 0');
  }
  if (def.coreIntegrity !== undefined && !isPositiveInt(def.coreIntegrity)) {
    issues.add('map-range', `${where}.coreIntegrity`, 'must be a whole number ≥ 1');
  }
  if (!isNonNegativeInt(def.stardust)) {
    issues.add('map-range', `${where}.stardust`, 'must be a whole number ≥ 0');
  }
  if (def.revisitOf !== undefined && (def.revisitOf === def.id || !ctx.mapIds.has(def.revisitOf))) {
    issues.add('revisit', `${where}.revisitOf`, `'${def.revisitOf}' is not another map`);
  }
  // TODO(A3M6, M5): revisit layout rules — the original's pads unchanged, new pads only in the
  // added band, the original layout centred.

  if (grid !== null) validateGeometry(issues, def, grid, campaign !== null, where);
  validateWaves(issues, ctx, def, where);
  if (!isStubMap(def))
    validateThreats(issues, ctx, def, campaign?.history ?? emptyHistory(), where);
  if (campaign !== null) validateNovelty(issues, ctx, def, grid, campaign.history, where);
  validateScripts(issues, def, where);
  validateBuilds(issues, def, grid, ctx, campaign?.index ?? null);
  // TODO(T202): medals — `medals.challenge` on every campaign map, and medal conditions never
  // reference medal-exempt groups.
}

// ── Geometry ─────────────────────────────────────────────────────────────────────────────────

function validateGeometry(
  issues: Issues,
  def: MapDef<IdSpace>,
  grid: Grid,
  isCampaign: boolean,
  where: string,
): void {
  if (isCampaign && grid.cols + grid.rows > MAX_CAMPAIGN_GRID_SPAN) {
    issues.add(
      'grid-span',
      `${where}.size`,
      `cols + rows is ${grid.cols + grid.rows}; a campaign map fits one screen (≤ ${MAX_CAMPAIGN_GRID_SPAN})`,
    );
  }
  if (def.objective === 'defend' && grid.count('C') !== 1) {
    issues.add(
      'core',
      `${where}.tiles`,
      `a Defend map has exactly one core 'C' (found ${grid.count('C')})`,
    );
  }
  for (const [name, pos] of Object.entries(def.markers ?? {})) {
    const t = grid.at(pos);
    if (t !== '.') {
      issues.add(
        'marker',
        `${where}.markers.${name}`,
        `${fmt(pos)} is ${t === undefined ? 'off the map' : `'${t}'`}; markers sit on decor ('.')`,
      );
    }
  }
  const under = def.underWreckage ?? {};
  const salvage = def.salvage ?? {};
  for (const [key, ch] of Object.entries(under)) {
    const pos = parseKey(key);
    if (pos === null || grid.at(pos) !== 'x') {
      issues.add('wreckage', `${where}.underWreckage.${key}`, "is not a wreckage tile ('x')");
    } else if (ch === undefined || !['o', '^', '+', '.'].includes(ch)) {
      issues.add(
        'wreckage',
        `${where}.underWreckage.${key}`,
        `'${String(ch)}' can't lie under wreckage (a pad, high ground, power node, or decor)`,
      );
    }
  }
  for (const [key, credits] of Object.entries(salvage)) {
    const pos = parseKey(key);
    if (pos === null || grid.at(pos) !== 'x') {
      issues.add('wreckage', `${where}.salvage.${key}`, "is not a wreckage tile ('x')");
    } else if (
      !Number.isInteger(credits) ||
      (credits ?? 0) < SALVAGE_MIN ||
      (credits ?? 0) > SALVAGE_MAX
    ) {
      issues.add(
        'wreckage',
        `${where}.salvage.${key}`,
        `${String(credits)} must be a whole number of credits in ${SALVAGE_MIN}–${SALVAGE_MAX}`,
      );
    }
  }
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      if (grid.at([c, r]) !== 'x') continue;
      const key = `${c},${r}`;
      if (!(key in under)) {
        issues.add(
          'wreckage',
          `${where}.underWreckage`,
          `wreckage at ${fmt([c, r])} needs an entry`,
        );
      }
      if (!(key in salvage)) {
        issues.add('wreckage', `${where}.salvage`, `wreckage at ${fmt([c, r])} needs an entry`);
      }
    }
  }
}

// ── Waves ────────────────────────────────────────────────────────────────────────────────────

type RouteKind = 'path' | 'air' | 'rift';

function routesOf(def: MapDef<IdSpace>): Map<string, { kind: RouteKind; opensAtWave: number }> {
  const out = new Map<string, { kind: RouteKind; opensAtWave: number }>();
  // Like compile, the first route with an id wins (a duplicate id is a compile error).
  const add = (id: string, kind: RouteKind, opensAtWave: number): void => {
    if (!out.has(id)) out.set(id, { kind, opensAtWave });
  };
  for (const p of def.paths) add(p.id, 'path', 1);
  for (const p of def.airLanes ?? []) add(p.id, 'air', 1);
  for (const p of def.riftLanes ?? []) add(p.id, 'rift', p.opensAtWave);
  return out;
}

function validateWaves(issues: Issues, ctx: MapCtx, def: MapDef<IdSpace>, mapWhere: string): void {
  const routes = routesOf(def);
  for (const [w, wave] of def.waves.entries()) {
    const where = `${mapWhere}.waves[${w}]`;
    if (wave.groups.length === 0) issues.add('wave', where, 'a wave needs at least one group');
    if (wave.countdownSec !== undefined) {
      if (w === 0)
        issues.add(
          'wave',
          `${where}.countdownSec`,
          'wave 1 has no countdown (the player starts it)',
        );
      else if (!isPositive(wave.countdownSec))
        issues.add('wave', `${where}.countdownSec`, 'must be > 0');
    }
    for (const [g, group] of wave.groups.entries()) {
      const gw = `${where}.groups[${g}]`;
      if (!isPositiveInt(group.count))
        issues.add('wave', `${gw}.count`, 'must be a whole number ≥ 1');
      if (group.intervalSec !== undefined && !isPositive(group.intervalSec)) {
        issues.add('wave', `${gw}.intervalSec`, 'must be > 0');
      }
      const enemy = ctx.enemies.get(group.enemy);
      const route = routes.get(group.route);
      if (enemy !== undefined && route !== undefined) {
        if ((enemy.layer === 'air') !== (route.kind === 'air')) {
          issues.add(
            'route-walk',
            gw,
            `${enemy.layer} unit '${enemy.id}' can't walk ${route.kind} route '${group.route}'`,
          );
        }
        if (route.kind === 'rift') {
          if (enemy.faction !== 'hollow') {
            issues.add('route-walk', gw, `rift lane '${group.route}' carries only the Hollow`);
          }
          if (w + 1 < route.opensAtWave) {
            issues.add(
              'route-walk',
              gw,
              `rift lane '${group.route}' opens at wave ${route.opensAtWave}, not wave ${w + 1}`,
            );
          }
        }
      }
      const tags = group.tags ?? [];
      for (const t of duplicates(tags))
        issues.add('wave-tag', `${gw}.tags`, `'${t}' is listed twice`);
      if (enemy !== undefined && enemy.faction !== 'skitterkin') {
        for (const t of tags.filter((x) => SKITTERKIN_ONLY_TAGS.includes(x))) {
          issues.add('wave-tag', `${gw}.tags`, `'${t}' is only for Skitterkin (not '${enemy.id}')`);
        }
      }
    }
  }
}

// ── Threats ──────────────────────────────────────────────────────────────────────────────────

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

function traitsOf(ctx: MapCtx, groups: readonly WaveGroup<IdSpace>[]): Set<Trait> {
  const out = new Set<Trait>();
  for (const g of groups) for (const t of ctx.enemies.get(g.enemy)?.traits ?? []) out.add(t);
  return out;
}

function validateThreats(
  issues: Issues,
  ctx: MapCtx,
  def: MapDef<IdSpace>,
  history: History,
  where: string,
): void {
  const allGroups = def.waves.flatMap((w) => w.groups);
  const present = traitsOf(ctx, allGroups);
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
      if (e === undefined || (g.tags ?? []).includes('fleeing')) continue;
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
  const newTraits = new Set([...present].filter((t) => !history.traits.has(t)));
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
function validateNovelty(
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
    (id) => ctx.enemies.has(id) && !history.enemies.has(id),
  );
  const broughtByNew = new Set(newEnemies.flatMap((id) => ctx.enemies.get(id)?.traits ?? []));
  const present = traitsOf(ctx, groups);
  const newTraits = [...present].filter((t) => !history.traits.has(t) && !broughtByNew.has(t));
  const modifiers: string[] = [];
  const spawns = grid?.count('S') ?? 0;
  if (spawns >= 2 && !history.secondSpawn) modifiers.push('second spawn');
  // The air lane arrives with the first flyer and counts with it.
  const newFlyer = newEnemies.some((id) => ctx.enemies.get(id)?.layer === 'air');
  if (used('air') && !history.airLane && !newFlyer) modifiers.push('air lane');
  if (used('rift') && !history.rift) modifiers.push('rift lanes');
  const threats = [
    ...newEnemies.map((e) => `enemy ${e}`),
    ...newTraits.map((t) => `trait ${t}`),
    ...modifiers,
  ];
  if (!isStubMap(def) && threats.length > MAX_NEW_THREATS) {
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

// ── Scripts ──────────────────────────────────────────────────────────────────────────────────

function validateScripts(issues: Issues, def: MapDef<IdSpace>, mapWhere: string): void {
  const markers = new Set(Object.keys(def.markers ?? {}));
  const objectives = new Set((def.objectives ?? []).map((o) => o.id));
  const actions: [ScriptAction<IdSpace>, string][] = [];
  const triggers: [ScriptTrigger<IdSpace>, string][] = [];
  const flagsRead: [ScriptFlagId, string][] = [];
  for (const [i, e] of (def.events ?? []).entries()) {
    const w = `${mapWhere}.events[${i}]`;
    triggers.push([e.on, `${w}.on`]);
    for (const [j, a] of e.actions.entries()) actions.push([a, `${w}.actions[${j}]`]);
    if (e.when !== undefined) for (const f of flagsOf(e.when)) flagsRead.push([f, `${w}.when`]);
  }
  for (const id of duplicates((def.objectives ?? []).map((o) => o.id))) {
    issues.add('script', `${mapWhere}.objectives`, `duplicate objective id '${id}'`);
  }
  for (const [i, o] of (def.objectives ?? []).entries()) {
    const w = `${mapWhere}.objectives[${i}]`;
    if (!isNonNegativeInt(o.intel))
      issues.add('script', `${w}.intel`, 'must be a whole number ≥ 0');
    for (const [j, a] of (o.onComplete ?? []).entries()) actions.push([a, `${w}.onComplete[${j}]`]);
  }
  for (const [i, l] of (def.lockedAbilities ?? []).entries()) {
    for (const f of flagsOf(l.when)) flagsRead.push([f, `${mapWhere}.lockedAbilities[${i}].when`]);
  }
  const forcedInputs = new Set<string>();
  for (const [a] of actions) if ('forceInput' in a) forcedInputs.add(a.forceInput.id);

  const cueRe = new RegExp(`^${def.id}_[a-z0-9_]+$`);
  const radioRe = new RegExp(`^${def.id}_w(\\d+)$`);
  for (const [a, w] of actions) {
    const marker = (m: string): void => {
      if (!markers.has(m)) issues.add('script', w, `unknown marker '${m}'`);
    };
    if ('cue' in a) {
      const radio = radioRe.exec(a.cue);
      if (!cueRe.test(a.cue)) {
        issues.add('script', w, `cue '${a.cue}' must be '${def.id}_wNN' or '${def.id}_<slot>'`);
      } else if (
        radio !== null &&
        (radio[1]?.length !== 2 || Number(radio[1]) > def.waves.length)
      ) {
        issues.add(
          'script',
          w,
          `cue '${a.cue}': a radio cue names a wave of this map as two digits`,
        );
      }
    }
    if ('setClickable' in a) {
      marker(a.setClickable.marker);
      if (a.setClickable.fallback !== undefined) {
        triggers.push([a.setClickable.fallback, `${w}.setClickable.fallback`]);
      }
    }
    if ('openTile' in a) marker(a.openTile);
  }
  for (const [t, w] of triggers) {
    if ('wave' in t && (!Number.isInteger(t.wave) || t.wave < 1 || t.wave > def.waves.length)) {
      issues.add('script', w, `wave ${t.wave} is not a wave of this map`);
    }
    if ('tick' in t && !isNonNegativeInt(t.tick))
      issues.add('script', w, 'tick must be a whole number ≥ 0');
    if ('bossHpPct' in t && !(t.bossHpPct > 0 && t.bossHpPct < 100)) {
      issues.add('script', w, 'bossHpPct must be in (0, 100)');
    }
    if ('objectiveCompleted' in t && !objectives.has(t.objectiveCompleted)) {
      issues.add('script', w, `unknown objective '${t.objectiveCompleted}'`);
    }
    if ('interacted' in t && !markers.has(t.interacted)) {
      issues.add('script', w, `unknown marker '${t.interacted}'`);
    }
    if ('forcedInputResolved' in t && !forcedInputs.has(t.forcedInputResolved)) {
      issues.add('script', w, `no forceInput action requests '${t.forcedInputResolved}'`);
    }
  }
  const variants = def.flagVariants ?? {};
  for (const [f, w] of flagsRead) {
    if (variants[f] === undefined) {
      issues.add('flag-variants', w, `reads flag '${f}', so flagVariants needs a '${f}' entry`);
    }
  }
}

/** Every story flag a condition reads. */
function flagsOf(c: ConditionDef<IdSpace>): ScriptFlagId[] {
  if ('flag' in c) return [c.flag];
  if ('all' in c) return c.all.flatMap(flagsOf);
  if ('any' in c) return c.any.flatMap(flagsOf);
  if ('not' in c) return flagsOf(c.not);
  return [];
}
