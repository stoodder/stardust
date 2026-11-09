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
//   clear, interact, scriptInput, and holdFireWhile name things the map has.
// - [no-counter-build]: `noCounterBuilds[c]` uses no tower or ability that answers `c`.
// - [alt-builds]: every alt build answers every required counter; from A1M4, at least 2 alt
//   builds, each sharing at most 2 tower types with the par loadout.
// - [builds-range]: margin bands are 0 ≤ min < max ≤ 100; flag variants list values; alt
//   build expectations name alt builds and at least one expectation, their minMarginPct is
//   0–100, and an `outcome` (an under-built build) comes without a win floor or belowPar.
//
// TODO stubs (their content can't exist yet): par is purchasable (availableAfter and the
// Stardust/Intel totals; T204); a build's ability is never one of the map's lockedAbilities
// under its flag variant (A3M5, M5); answer tiers and specs (T208).
import {
  ALT_BUILD_MAX_SHARED_TOWERS,
  ALT_BUILDS_FROM_CAMPAIGN_INDEX,
  MAX_LOADOUT,
  MAX_TIER_BEFORE_SPEC,
  MIN_ALT_BUILDS,
  type CounterAnswers,
} from './rules.ts';
import { STEP_KEYS } from './compileBuilds.ts';
import type { CounterId, GridPos, IdSpace, MapDef, ScriptedBuild } from './types.ts';
import type { MapCtx } from './validateMap.ts';
import { BUILDABLE, Issues, duplicates, fmt, keyOf, type Grid } from './validateHelpers.ts';

export function validateBuilds(
  issues: Issues,
  def: MapDef<IdSpace>,
  grid: Grid | null,
  ctx: MapCtx,
  campaignIndex: number | null,
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

  // Counter builds (by category: maps.md § 6.1).
  const answers = ctx.rules.counterAnswers;
  for (const [c, b] of Object.entries(def.noCounterBuilds)) {
    if (b === undefined || !isCounter(c)) continue;
    const hits = answersIn(def, b, answers[c]);
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
      if (answersIn(def, b, answers[c]).length === 0) {
        issues.add(
          'alt-builds',
          `${where}.altBuilds.${n}`,
          `has no answer to required counter '${c}' (an alt build must not be a no-counter build)`,
        );
      }
    }
  }
  if (campaignIndex !== null && campaignIndex >= ALT_BUILDS_FROM_CAMPAIGN_INDEX) {
    if (alts.length < MIN_ALT_BUILDS) {
      issues.add(
        'alt-builds',
        `${where}.altBuilds`,
        `${alts.length} alt build${alts.length === 1 ? '' : 's'}; from A1M4 every map needs at least ${MIN_ALT_BUILDS}`,
      );
    }
    for (const [n, b] of alts) {
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
  // TODO(T204): par is purchasable — every profile tower, spec, upgrade, protocol, and ability
  // is available by this map and affordable from what the campaign paid out before it.
  // TODO(A3M5, M5): a build's technicianAbility is never in lockedAbilities under its variant.
}

const COUNTERS: ReadonlySet<string> = new Set<CounterId>([
  'armor',
  'shield',
  'detection',
  'air',
  'burrowed',
  'splash',
  'jam',
]);
function isCounter(c: string): c is CounterId {
  return COUNTERS.has(c);
}

/** The answers to a category a build carries: its loadout towers and its ability. */
function answersIn(
  def: MapDef<IdSpace>,
  b: ScriptedBuild<IdSpace>,
  answers: CounterAnswers,
): string[] {
  const out = b.loadout.filter((t) => answers.towers.includes(t));
  const ability = b.technicianAbility ?? def.referenceProfile.technicianAbility;
  if (ability !== null && answers.abilities.includes(ability)) out.push(ability);
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
  const tags = new Set(def.waves.flatMap((w) => w.groups.flatMap((g) => g.tags ?? [])));
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
      if (!(s.interact in markers)) bad(`unknown marker '${s.interact}'`);
    } else if ('scriptInput' in s) {
      if (!forced.has(s.scriptInput)) bad(`no forceInput action requests '${s.scriptInput}'`);
    } else if ('holdFireWhile' in s) {
      if (!tags.has(s.holdFireWhile)) bad(`no wave group is tagged '${s.holdFireWhile}'`);
    }
  }
}
