// M7's map validation (T700a seams; design/maps.md § 5.2, § 7; the rule list is validateMap.ts's
// header):
// - [flag-gate]: every flag gate on map data (`FlagGateDef`: an ally post's, a dressing layer's, a
//   `markerWhen` entry's) names a script flag and one of its values; a `markerWhen` names a marker
//   of the map; a gated ally post (it changes the sim per value) has a `flagVariants` entry.
// - [bearers]: a refugee group of `kind: 'bearer'` walks only on a Protect map whose asset has
//   `bearers`, and such an asset has at least one; bearers never carry Pebble.
// - [script-group]: each `scriptGroups` entry has a whole count ≥ 1, a positive interval and a
//   delay ≥ 0, and walks a route of its layer (a flyer an air lane, a ground unit a path or rift
//   lane); every `spawnWave` names one, and every script group is spawned by some `spawnWave`.
// - [jettison]: a boss in the waves whose phase jettisons names plates that are markers of the
//   map on decor ('.'): its `openTile`s land there (never a pad).
// The `cleared` condition atom is validateScripts.ts's [script].
import { FLAGS, type FlagDef } from './dialogue/flags.ts';
import type { EnemyDef, FlagGateDef, IdSpace, MapDef } from './types.ts';
import {
  type Grid,
  Issues,
  fmt,
  isNonNegative,
  isPositive,
  isPositiveInt,
} from './validateHelpers.ts';

/** The flag registry by plain id. */
const FLAG_DEFS: Readonly<Record<string, FlagDef>> = FLAGS;

/** [flag-gate]: `gate` names a script flag and one of its values. */
export function checkFlagGate(issues: Issues, gate: FlagGateDef, where: string): void {
  const rule = FLAG_DEFS[gate.flag];
  if (rule === undefined || rule.script !== true) {
    issues.add('flag-gate', `${where}.flag`, `'${gate.flag}' is not a script flag`);
  } else if (!rule.values.includes(gate.eq)) {
    issues.add('flag-gate', `${where}.eq`, `'${String(gate.eq)}' is not a value of '${gate.flag}'`);
  }
}

export function validateM7Map(
  issues: Issues,
  enemies: ReadonlyMap<string, EnemyDef>,
  def: MapDef<IdSpace>,
  grid: Grid | null,
  where: string,
): void {
  const markers = def.markers ?? {};
  const variants = def.flagVariants ?? {};
  for (const [i, a] of (def.allies ?? []).entries()) {
    if (a.when === undefined) continue;
    const w = `${where}.allies[${i}].when`;
    checkFlagGate(issues, a.when, w);
    if (variants[a.when.flag] === undefined) {
      issues.add('flag-variants', w, `reads flag '${a.when.flag}', so flagVariants needs an entry`);
    }
  }
  for (const [i, d] of (def.dressing ?? []).entries()) {
    if (d.when !== undefined) checkFlagGate(issues, d.when, `${where}.dressing[${i}].when`);
  }
  for (const [m, gate] of Object.entries(def.markerWhen ?? {})) {
    const w = `${where}.markerWhen.${m}`;
    if (!Object.hasOwn(markers, m)) issues.add('flag-gate', w, `unknown marker '${m}'`);
    checkFlagGate(issues, gate, w);
  }
  validateBearers(issues, def, where);
  validateScriptGroups(issues, enemies, def, where);
  validateJettison(issues, enemies, def, grid, where);
}

/** [bearers] (see the header). */
function validateBearers(issues: Issues, def: MapDef<IdSpace>, where: string): void {
  const bearers = Object.entries(def.refugees ?? {}).filter(([, g]) => g.kind === 'bearer');
  const carried = def.asset?.bearers === true;
  for (const [id, g] of bearers) {
    if (!carried) {
      issues.add(
        'bearers',
        `${where}.refugees.${id}.kind`,
        'bearers walk with an asset that has `bearers`',
      );
    }
    if (g.withPebble === true) {
      issues.add(
        'bearers',
        `${where}.refugees.${id}.withPebble`,
        'Pebble never rides with bearers',
      );
    }
  }
  if (carried && bearers.length === 0) {
    issues.add('bearers', `${where}.asset.bearers`, "needs a refugee group of kind 'bearer'");
  }
}

/** [script-group] (see the header). */
function validateScriptGroups(
  issues: Issues,
  enemies: ReadonlyMap<string, EnemyDef>,
  def: MapDef<IdSpace>,
  where: string,
): void {
  const groups = def.scriptGroups ?? {};
  const spawned = new Set<string>();
  const actions = [
    ...(def.events ?? []).flatMap((e) => e.actions),
    ...(def.objectives ?? []).flatMap((o) => o.onComplete ?? []),
  ];
  for (const a of actions) {
    if (!('spawnWave' in a)) continue;
    spawned.add(a.spawnWave);
    if (!Object.hasOwn(groups, a.spawnWave)) {
      issues.add(
        'script-group',
        `${where}.events`,
        `spawnWave names no script group '${a.spawnWave}'`,
      );
    }
  }
  const air = new Set((def.airLanes ?? []).map((l) => l.id));
  for (const [id, g] of Object.entries(groups)) {
    const w = `${where}.scriptGroups.${id}`;
    if (!spawned.has(id)) issues.add('script-group', w, 'no spawnWave action spawns it');
    if (!isPositiveInt(g.count))
      issues.add('script-group', `${w}.count`, 'must be a whole number ≥ 1');
    if (g.intervalSec !== undefined && !isPositive(g.intervalSec)) {
      issues.add('script-group', `${w}.intervalSec`, 'must be > 0');
    }
    if (g.delaySec !== undefined && !isNonNegative(g.delaySec)) {
      issues.add('script-group', `${w}.delaySec`, 'must be ≥ 0');
    }
    const layer = enemies.get(g.enemy)?.layer;
    if (layer !== undefined && (layer === 'air') !== air.has(g.route)) {
      issues.add(
        'script-group',
        `${w}.route`,
        layer === 'air' ? 'a flyer walks an air lane' : 'a ground unit walks a path or rift lane',
      );
    }
  }
}

/** [jettison] (see the header). */
function validateJettison(
  issues: Issues,
  enemies: ReadonlyMap<string, EnemyDef>,
  def: MapDef<IdSpace>,
  grid: Grid | null,
  where: string,
): void {
  const sent = new Set(def.waves.flatMap((w) => w.groups.map((g) => g.enemy)));
  for (const id of sent) {
    for (const p of enemies.get(id)?.boss?.phases ?? []) {
      for (const m of p.jettison?.plates ?? []) {
        const pos = def.markers?.[m];
        const w = `${where}.markers`;
        if (pos === undefined) {
          issues.add('jettison', w, `'${id}' jettisons a plate on '${m}', which isn't a marker`);
        } else if (grid !== null && grid.at(pos) !== '.') {
          issues.add('jettison', w, `plate marker '${m}' ${fmt(pos)} must sit on decor ('.')`);
        }
      }
    }
  }
}
