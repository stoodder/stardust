// Build validation: the balance harness's inputs (architecture.md § Validation, Builds; design/
// maps.md § 6.1 and § 6.4). Compile already checks ids and step shapes; this checks what the
// steps mean:
// - [profile]: the reference profile lists no tower twice, and its spec unlocks are towers it
//   owns that have specs.
// - [loadout]: at most 4 towers, no duplicates, all owned by the reference profile; a build
//   names a companion only on a pick-list map, from its list.
// - [build-step]: steps run in wave order on waves of the map; builds go on buildable, empty
//   tiles (wreckage once cleared), with a loadout tower that is unlocked by then; upgrades,
//   specs, sells, and per-tower settings address a tower built by then; tier 3 is the last
//   upgrade and a spec needs tier 3 and an unlocked spec; ability steps have an ability to use
//   (slot 2: a present companion or a pick);
//   clear, interact, scriptInput, and holdFireWhile name things the map has (a tag a group
//   carries, or 'neutral' on a map that spawns a neutral unit).
// - [no-counter-build]: `noCounterBuilds[c]` carries no answer to `c` (counterAnswers.ts: the
//   tiers and specs its towers reach, from placements that reach its enemies' routes, on this
//   map's act and enemies, and the abilities it casts).
// - [alt-builds]: every alt build carries an answer to every required counter; from A1M4, at
//   least 2 sensible alt builds (no `outcome` expectation), each sharing at most 2 tower types
//   with the par loadout. An under-built alt (`outcome: 'lose' | 'either'`: a player who stops
//   short, such as par without its spec) counts toward neither (T334).
// - [run-end-flags]: `runEndFlags` names flags with a run-end rule (dialogue/flags.ts FLAG_RULES)
//   whose `onMapEnd` is this map, each with at least one run that sets it, runs that exist on the
//   map (`holdFireWhile:<tag>` a tag some group carries, `alt:<name>` an alt build, spareFleeing
//   on a map with fleeing groups), and no run on both sides; a campaign map lists every rule
//   that ends on it (T412).
// - [builds-range]: margin bands are 0 ≤ min < max ≤ 100; flag variants list values; alt
//   build expectations name alt builds and at least one expectation, their minMarginPct is
//   0–100, and an `outcome` (an under-built build) comes without a win floor or belowPar; a
//   `noCounterLoseByWave` override is a whole wave from 1 to waves − 1 (never the final wave) on a
//   map with no-counter builds, or up to the final wave on a `teachMap` (a campaign map that
//   introduces a required-counter category).
//
// TODO stubs (their content can't exist yet): par is purchasable (availableAfter and the
// Stardust/Intel totals; T204); a build's ability is never one of the map's lockedAbilities
// under its flag variant (A3M5, M5).
import {
  ALT_BUILD_MAX_SHARED_TOWERS,
  ALT_BUILDS_FROM_CAMPAIGN_INDEX,
  COUNTER_CATEGORIES,
  MAX_LOADOUT,
  MAX_TIER_BEFORE_SPEC,
  MIN_ALT_BUILDS,
  NO_COUNTER_LOSE_BY_MIN_WAVES_LEFT,
} from './rules.ts';
import { STEP_KEYS } from './compileBuilds.ts';
import {
  answerScope,
  answersCarried,
  rangeReached,
  towersReached,
  type ReachedTower,
  type ReachStep,
  type ScopeEnemy,
} from './counterAnswers.ts';
import { FLAG_RULES } from './dialogue/flags.ts';
import type { BuildStep, CounterId, GridPos, IdSpace, MapDef, ScriptedBuild } from './types.ts';
import type { MapCtx } from './validateMap.ts';
import { BUILDABLE, Issues, duplicates, fmt, keyOf, type Grid } from './validateHelpers.ts';

export function validateBuilds(
  issues: Issues,
  def: MapDef<IdSpace>,
  grid: Grid | null,
  ctx: MapCtx,
  campaignIndex: number | null,
  /** The map's required counters include one no earlier campaign map required. */
  introducesCounter = false,
): void {
  const where = `maps.${def.id}`;
  const profile = def.referenceProfile;
  const pw = `${where}.referenceProfile`;
  for (const t of duplicates(profile.towers))
    issues.add('profile', `${pw}.towers`, `'${t}' is listed twice`);
  for (const t of profile.specs) {
    if (!profile.towers.includes(t)) {
      issues.add('profile', `${pw}.specs`, `'${t}' isn't one of the profile's towers`);
    } else if (!ctx.towersWithSpecs.has(t)) {
      issues.add('profile', `${pw}.specs`, `'${t}' has no tier-4 specs to unlock`);
    }
  }

  const builds: [string, ScriptedBuild<IdSpace>][] = [
    ['parBuild', def.parBuild],
    ...Object.entries(def.altBuilds ?? {}).map(([n, b]): [string, ScriptedBuild<IdSpace>] => [
      `altBuilds.${n}`,
      b,
    ]),
    ...Object.entries(def.noCounterBuilds).flatMap(([c, b]): [string, ScriptedBuild<IdSpace>][] =>
      b === undefined ? [] : [[`noCounterBuilds.${c}`, b]],
    ),
  ];
  for (const [name, b] of builds) validateBuild(issues, def, grid, ctx, b, `${where}.${name}`);

  // Counter builds (by category: maps.md § 6.1), judged by what each build reaches, and from where
  // (a placed tower answers only if it can reach a route the category's enemies take).
  const answers = ctx.rules.counterAnswers;
  const routes = new Map<string, readonly GridPos[]>();
  for (const p of def.paths) routes.set(p.id, p.tiles);
  for (const p of def.airLanes ?? []) routes.set(p.id, p.points);
  for (const p of def.riftLanes ?? []) routes.set(p.id, p.tiles);
  const enemies = def.waves.flatMap((w) =>
    w.groups.flatMap((g): ScopeEnemy[] => {
      const e = ctx.enemies.get(g.enemy);
      if (e === undefined) return [];
      const route = routes.get(g.route);
      return [{ ...e, neutral: e.neutral === true, ...(route === undefined ? {} : { route }) }];
    }),
  );
  const rangeOf = (t: ReachedTower): number | null => {
    const tower = ctx.towers.get(t.tower);
    return tower === undefined ? null : rangeReached(tower, t);
  };
  const carried = (b: ScriptedBuild<IdSpace>, c: CounterId): string[] =>
    answersCarried(
      answers[c],
      answerScope(c, def.act, enemies),
      reachedBy(def, grid, b),
      castBy(def, ctx, b),
      rangeOf,
    );
  for (const [c, b] of Object.entries(def.noCounterBuilds)) {
    if (b === undefined || !isCounter(c)) continue;
    const hits = carried(b, c);
    if (hits.length > 0) {
      issues.add(
        'no-counter-build',
        `${where}.noCounterBuilds.${c}`,
        `uses ${hits.join(', ')}, which answer${hits.length === 1 ? 's' : ''} '${c}'`,
      );
    }
  }
  const alts = Object.entries(def.altBuilds ?? {});
  for (const [n, b] of alts) {
    for (const c of def.requiredCounters) {
      if (carried(b, c).length === 0) {
        issues.add(
          'alt-builds',
          `${where}.altBuilds.${n}`,
          `has no answer to required counter '${c}' (an alt build must not be a no-counter build)`,
        );
      }
    }
  }
  if (campaignIndex !== null && campaignIndex >= ALT_BUILDS_FROM_CAMPAIGN_INDEX) {
    // Under-built alts model a player who stops short of par, so par's towers are theirs.
    const sensible = alts.filter(([n]) => def.altExpectations?.[n]?.outcome === undefined);
    if (sensible.length < MIN_ALT_BUILDS) {
      issues.add(
        'alt-builds',
        `${where}.altBuilds`,
        `${sensible.length} sensible alt build${sensible.length === 1 ? '' : 's'} (under-built ones don't count); from A1M4 every map needs at least ${MIN_ALT_BUILDS}`,
      );
    }
    for (const [n, b] of sensible) {
      const shared = b.loadout.filter((t) => def.parBuild.loadout.includes(t));
      if (shared.length > ALT_BUILD_MAX_SHARED_TOWERS) {
        issues.add(
          'alt-builds',
          `${where}.altBuilds.${n}`,
          `shares ${shared.join(', ')} with par; at most ${ALT_BUILD_MAX_SHARED_TOWERS} tower types`,
        );
      }
    }
  }

  const loseBy = def.noCounterLoseByWave;
  if (loseBy !== undefined) {
    // A teach map (the one that introduces a required counter) may ask only for a loss by its
    // final wave; every other map, never later than the wave before it.
    const n = def.waves.length;
    const max = def.teachMap === true ? n : n - NO_COUNTER_LOSE_BY_MIN_WAVES_LEFT;
    if (!Number.isInteger(loseBy) || loseBy < 1 || loseBy > max) {
      issues.add(
        'builds-range',
        `${where}.noCounterLoseByWave`,
        `must be a whole wave from 1 to ${max} (${
          def.teachMap === true ? 'the final wave on a teach map' : 'never the final wave'
        })`,
      );
    }
    if (Object.keys(def.noCounterBuilds).length === 0) {
      issues.add(
        'builds-range',
        `${where}.noCounterLoseByWave`,
        'the map has no no-counter builds',
      );
    }
  }

  if (def.teachMap === true && !introducesCounter) {
    issues.add(
      'builds-range',
      `${where}.teachMap`,
      'only a campaign map whose required counters include one no earlier map required is a teach map',
    );
  }

  const band = def.marginBand;
  if (
    band !== undefined &&
    !(band.minPct >= 0 && band.minPct < band.maxPct && band.maxPct <= 100)
  ) {
    issues.add('builds-range', `${where}.marginBand`, 'must have 0 ≤ minPct < maxPct ≤ 100');
  }
  for (const [name, expect] of Object.entries(def.altExpectations ?? {})) {
    const at = `${where}.altExpectations.${name}`;
    if (!Object.hasOwn(def.altBuilds ?? {}, name)) {
      issues.add('builds-range', at, 'names no alt build');
    }
    const min = expect.minMarginPct;
    if (min !== undefined && !(min >= 0 && min <= 100)) {
      issues.add('builds-range', at, 'minMarginPct must be 0–100');
    }
    const { belowPar, outcome } = expect;
    if (belowPar === undefined && min === undefined && outcome === undefined) {
      issues.add('builds-range', at, 'names no expectation');
    }
    if (outcome !== undefined && (belowPar !== undefined || min !== undefined)) {
      issues.add(
        'builds-range',
        at,
        `outcome '${outcome}' (an under-built build) can't also set a win floor or belowPar`,
      );
    }
  }
  for (const [flag, values] of Object.entries(def.flagVariants ?? {})) {
    if (values === undefined || values.length === 0) {
      issues.add('builds-range', `${where}.flagVariants.${flag}`, 'must list at least one value');
    }
  }
  validateRunEndFlags(issues, def, where, campaignIndex !== null);
  // Par is purchasable (available by this map and affordable): validatePurchasable.ts.
  // TODO(A3M5, M5): a build's technicianAbility is never in lockedAbilities under its variant.
}

/** [run-end-flags]: the runs each run-end flag check names exist, and every rule is covered. */
function validateRunEndFlags(
  issues: Issues,
  def: MapDef<IdSpace>,
  where: string,
  isCampaign: boolean,
): void {
  const tags: ReadonlySet<string> = new Set(
    def.waves.flatMap((w) => w.groups.flatMap((g) => g.tags ?? [])),
  );
  const listed = def.runEndFlags ?? {};
  const runExists = (label: string): boolean => {
    if (label === 'par') return true;
    if (label === 'spareFleeing') return tags.has('fleeing');
    const [kind, name = ''] = label.split(':');
    if (kind === 'alt') return Object.hasOwn(def.altBuilds ?? {}, name);
    return kind === 'holdFireWhile' && tags.has(name);
  };
  for (const [flag, runs] of Object.entries(listed)) {
    if (runs === undefined) continue;
    const at = `${where}.runEndFlags.${flag}`;
    const rule = FLAG_RULES.find((r) => r.flag === flag);
    if (rule === undefined) issues.add('run-end-flags', at, 'no run-end rule sets this flag');
    else if (isCampaign && rule.onMapEnd !== def.id) {
      issues.add('run-end-flags', at, `its run-end rule ends on ${rule.onMapEnd}, not this map`);
    }
    if (runs.setBy.length === 0) issues.add('run-end-flags', `${at}.setBy`, 'names no run');
    for (const label of [...runs.setBy, ...runs.notSetBy]) {
      if (!runExists(label)) issues.add('run-end-flags', at, `'${label}' is no run on this map`);
    }
    for (const label of runs.setBy) {
      if (runs.notSetBy.includes(label)) {
        issues.add('run-end-flags', at, `'${label}' is in both setBy and notSetBy`);
      }
    }
  }
  if (!isCampaign) return;
  for (const rule of FLAG_RULES) {
    if (rule.onMapEnd === def.id && !Object.hasOwn(listed, rule.flag)) {
      issues.add(
        'run-end-flags',
        `${where}.runEndFlags`,
        `'${rule.flag}' is set when this map ends: list the runs that set it and that don't`,
      );
    }
  }
}

const COUNTERS: ReadonlySet<string> = new Set<string>(COUNTER_CATEGORIES);
function isCounter(c: string): c is CounterId {
  return COUNTERS.has(c);
}

/**
 * A raw step as a ReachStep (null for steps that don't change towers or tiers). A build is placed
 * on its tile, high ground included (a cleared wreckage tile is what lies under it).
 */
function reachStep(
  def: MapDef<IdSpace>,
  grid: Grid | null,
  s: BuildStep<IdSpace>,
): ReachStep | null {
  if ('build' in s) {
    const key = keyOf(s.tile);
    const raw = grid?.at(s.tile);
    const tile = raw === 'x' ? def.underWreckage?.[key] : raw;
    return {
      op: 'build',
      tower: s.build,
      tile: key,
      at: { tile: s.tile, highGround: tile === '^' },
    };
  }
  if ('upgrade' in s) return { op: 'upgrade', tile: keyOf(s.upgrade) };
  if ('specialize' in s) return { op: 'specialize', tile: keyOf(s.specialize), spec: s.spec };
  if ('sell' in s) return { op: 'sell', tile: keyOf(s.sell) };
  return null;
}

/** The towers a build reaches, and where (counterAnswers.ts towersReached). */
function reachedBy(
  def: MapDef<IdSpace>,
  grid: Grid | null,
  b: ScriptedBuild<IdSpace>,
): ReachedTower[] {
  const steps = b.steps
    .map((s) => reachStep(def, grid, s))
    .filter((s): s is ReachStep => s !== null);
  return towersReached(b.loadout, steps);
}

/**
 * The abilities a build casts: slot 1's (the build's, else the profile's) and slot 2's (the
 * map's companion, or the build's pick on a pick-list map), each only if a step uses its slot.
 */
function castBy(def: MapDef<IdSpace>, ctx: MapCtx, b: ScriptedBuild<IdSpace>): string[] {
  const out: string[] = [];
  const slots = new Set(b.steps.flatMap((s) => ('ability' in s ? [s.ability] : [])));
  const technician = b.technicianAbility ?? def.referenceProfile.technicianAbility;
  if (slots.has(1) && technician !== null) out.push(technician);
  const c = def.companion;
  const companion =
    c === null
      ? null
      : 'pick' in c
        ? (b.companion ?? c.pick[0] ?? null)
        : c.state === 'present'
          ? c.id
          : null;
  const companionAbility = companion === null ? undefined : ctx.companionAbilities.get(companion);
  if (slots.has(2) && companionAbility !== undefined) out.push(companionAbility);
  return out;
}

interface Placed {
  readonly tower: string;
  tier: number;
  spec: boolean;
}

function validateBuild(
  issues: Issues,
  def: MapDef<IdSpace>,
  grid: Grid | null,
  ctx: MapCtx,
  b: ScriptedBuild<IdSpace>,
  where: string,
): void {
  if (b.loadout.length > MAX_LOADOUT) {
    issues.add('loadout', `${where}.loadout`, `${b.loadout.length} towers; at most ${MAX_LOADOUT}`);
  }
  for (const t of duplicates(b.loadout))
    issues.add('loadout', `${where}.loadout`, `'${t}' is listed twice`);
  for (const t of b.loadout) {
    if (!def.referenceProfile.towers.includes(t)) {
      issues.add('loadout', `${where}.loadout`, `'${t}' isn't in the reference profile`);
    }
  }
  const mapCompanion = def.companion;
  const pick = mapCompanion !== null && 'pick' in mapCompanion ? mapCompanion.pick : null;
  if (b.companion !== undefined && (pick === null || !pick.includes(b.companion))) {
    issues.add(
      'loadout',
      `${where}.companion`,
      pick === null
        ? 'only a pick-list map lets a build choose its companion'
        : `'${b.companion}' isn't in the map's pick list`,
    );
  }
  // Slot 2 holds a usable ability with a present companion or a pick (validateMap's [companion]).
  const slot2 =
    mapCompanion === null
      ? 'the map has no companion'
      : 'state' in mapCompanion && mapCompanion.state === 'absent'
        ? 'the companion is absent'
        : null;

  const ability = b.technicianAbility ?? def.referenceProfile.technicianAbility;
  const unlockWave = def.towerUnlockWave ?? {};
  const markers = def.markers ?? {};
  const forced = new Set<string>();
  for (const e of def.events ?? []) {
    for (const a of e.actions) if ('forceInput' in a) forced.add(a.forceInput.id);
  }
  const tags: ReadonlySet<string> = new Set(
    def.waves.flatMap((w) => w.groups.flatMap((g) => g.tags ?? [])),
  );
  const hasNeutral = def.waves.some((w) =>
    w.groups.some((g) => ctx.enemies.get(g.enemy)?.neutral === true),
  );
  const placed = new Map<string, Placed>();
  const cleared = new Set<string>();
  let lastWave = 1;

  for (const [i, s] of b.steps.entries()) {
    const w = `${where}.steps[${i}]`;
    const bad = (msg: string): void => issues.add('build-step', w, msg);
    if (STEP_KEYS.filter((k) => k in s).length !== 1) continue; // a compile error
    if (!Number.isInteger(s.wave) || s.wave < 1 || s.wave > Math.max(1, def.waves.length)) {
      bad(`wave ${s.wave} is not a wave of this map`);
    } else if (s.wave < lastWave) {
      bad(`wave ${s.wave} comes after a wave-${lastWave} step; steps run in order`);
    } else {
      lastWave = s.wave;
    }
    const tower = (pos: GridPos): Placed | undefined => {
      const p = placed.get(keyOf(pos));
      if (p === undefined) bad(`no tower is built at ${fmt(pos)} by then`);
      return p;
    };
    const inMap = (pos: GridPos): boolean => {
      if (grid !== null && grid.at(pos) === undefined) {
        bad(`${fmt(pos)} is off the map`);
        return false;
      }
      return true;
    };
    if ('build' in s) {
      if (!b.loadout.includes(s.build)) bad(`'${s.build}' isn't in the loadout`);
      const unlock = unlockWave[s.build];
      if (unlock !== undefined && s.wave < unlock) {
        bad(`'${s.build}' unlocks at wave ${unlock}, not wave ${s.wave}`);
      }
      if (grid !== null && inMap(s.tile)) {
        const key = keyOf(s.tile);
        const raw = grid.at(s.tile);
        const tile = raw === 'x' && cleared.has(key) ? def.underWreckage?.[key] : raw;
        if (tile === undefined || !BUILDABLE.has(tile)) {
          bad(
            `${fmt(s.tile)} is '${String(raw)}'${raw === 'x' ? ' (not cleared)' : ''}, not buildable`,
          );
        } else if (placed.has(key)) {
          bad(`${fmt(s.tile)} already has a tower`);
        }
      }
      placed.set(keyOf(s.tile), { tower: s.build, tier: 1, spec: false });
    } else if ('upgrade' in s) {
      const p = tower(s.upgrade);
      if (p !== undefined) {
        if (p.spec || p.tier >= MAX_TIER_BEFORE_SPEC) {
          bad(`the tower at ${fmt(s.upgrade)} is at tier ${p.tier}; tier 4 is a 'specialize' step`);
        }
        p.tier++;
      }
    } else if ('specialize' in s) {
      const p = tower(s.specialize);
      if (p !== undefined) {
        if (p.spec || p.tier !== MAX_TIER_BEFORE_SPEC) {
          bad(`a spec needs a tier-3 tower; ${fmt(s.specialize)} is at tier ${p.tier}`);
        }
        if (!def.referenceProfile.specs.includes(p.tower)) {
          bad(`'${p.tower}' specs aren't unlocked in the reference profile`);
        }
        p.spec = true;
      }
    } else if ('sell' in s) {
      if (tower(s.sell) !== undefined) placed.delete(keyOf(s.sell));
    } else if ('targeting' in s) {
      tower(s.targeting);
    } else if ('holdFire' in s) {
      if (s.holdFire !== 'all') tower(s.holdFire);
    } else if ('spareRunners' in s) {
      if (s.spareRunners !== 'all') tower(s.spareRunners);
    } else if ('ability' in s) {
      if (s.ability === 2) {
        if (slot2 !== null) bad(`slot 2 is empty: ${slot2}`);
      } else if (ability === null) bad('slot 1 is empty: the build has no technicianAbility');
      if (s.target !== undefined) inMap(s.target);
      if (typeof s.when === 'object' && !(s.when.afterSec >= 0)) bad('when.afterSec must be ≥ 0');
    } else if ('clear' in s) {
      if (grid !== null && inMap(s.clear)) {
        const key = keyOf(s.clear);
        if (grid.at(s.clear) !== 'x') bad(`${fmt(s.clear)} is not wreckage`);
        else if (cleared.has(key)) bad(`${fmt(s.clear)} is already cleared`);
        cleared.add(key);
      }
    } else if ('interact' in s) {
      // A clickable world object (T409): a marker the map lists in `clickables`.
      if (!(s.interact in markers)) bad(`unknown marker '${s.interact}'`);
      else if (!Object.hasOwn(def.clickables ?? {}, s.interact)) {
        bad(`marker '${s.interact}' is not in clickables`);
      }
    } else if ('scriptInput' in s) {
      if (!forced.has(s.scriptInput)) bad(`no forceInput action requests '${s.scriptInput}'`);
    } else if ('holdFireWhile' in s) {
      if (s.holdFireWhile === 'neutral') {
        if (!hasNeutral) bad('no wave group spawns a neutral unit');
      } else if (!tags.has(s.holdFireWhile)) {
        bad(`no wave group is tagged '${s.holdFireWhile}'`);
      }
    }
  }
}
