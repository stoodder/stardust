// Escort and Sundown map validation (T500a; design/maps.md § 5.1–5.2; the rule list is
// validateMap.ts's header): [escort] and [darkness].
import { DARK_RANGE_PENALTY, REFUGEE_GROUP_SIZE } from './rules.ts';
import type { IdSpace, MapDef } from './types.ts';
import { Issues, duplicates, fmt, isPositive, isPositiveInt } from './validateHelpers.ts';

/**
 * [escort]: `safeExit` and `refugees` go together; the exit is a marker on the map's core `C` (the
 * Preserve gate: the core before A2M5's pivot, the safe exit after); each refugee group walks a
 * ground path that ends there, `count` refugees (a whole number ≥ 1), Pebble with at most one
 * group; an Escort map (from the start, or by `setObjective`) has refugees; every `spawnAllies`
 * names a group; `maxLost` (losing that many loses the map) is 1 to the refugees' total.
 */
export function validateEscort(issues: Issues, def: MapDef<IdSpace>, where: string): void {
  const bad = (w: string, msg: string): void => issues.add('escort', w, msg);
  const groups = def.refugees;
  if ((def.safeExit === undefined) !== (groups === undefined)) {
    bad(`${where}.safeExit`, 'goes with `refugees` (and only with them)');
  }
  const actions = [
    ...(def.events ?? []).flatMap((e) => e.actions),
    ...(def.objectives ?? []).flatMap((o) => o.onComplete ?? []),
  ];
  const escorts =
    def.objective === 'escort' ||
    actions.some((a) => 'setObjective' in a && a.setObjective === 'escort');
  if (escorts && groups === undefined) {
    bad(`${where}.refugees`, 'an Escort map (from the start or by setObjective) has refugees');
  }
  for (const a of actions) {
    if ('spawnAllies' in a && (groups === undefined || !Object.hasOwn(groups, a.spawnAllies))) {
      bad(`${where}.events`, `spawnAllies names no refugee group '${a.spawnAllies}'`);
    }
  }
  if (def.safeExit === undefined || groups === undefined) return;
  const exit = def.markers?.[def.safeExit];
  if (exit === undefined) {
    bad(`${where}.safeExit`, `unknown marker '${def.safeExit}'`);
    return;
  }
  if (def.tiles[exit[1]]?.charAt(exit[0]) !== 'C') {
    bad(`${where}.safeExit`, `marker '${def.safeExit}' ${fmt(exit)} is not on the core 'C'`);
  }
  const ids = Object.keys(groups);
  if (ids.length === 0) bad(`${where}.refugees`, 'has no groups (omit it)');
  let pebble = 0;
  for (const [id, g] of Object.entries(groups)) {
    const w = `${where}.refugees.${id}`;
    const path = def.paths.find((p) => p.id === g.route);
    if (path === undefined) {
      bad(`${w}.route`, `'${g.route}' is not a ground path of this map`);
    } else {
      const end = path.tiles[path.tiles.length - 1];
      if (end === undefined || end[0] !== exit[0] || end[1] !== exit[1]) {
        bad(`${w}.route`, `path '${g.route}' doesn't end on the safe exit ${fmt(exit)}`);
      }
    }
    if (g.count !== undefined && !isPositiveInt(g.count)) {
      bad(`${w}.count`, 'must be a whole number ≥ 1');
    }
    if (g.withPebble === true && ++pebble === 2) bad(w, 'Pebble rides with one group only');
  }
  // Losing `maxLost` refugees loses the map (D138), so it's at least 1 and at most them all.
  if (def.maxLost !== undefined) {
    const total = Object.values(groups).reduce(
      (n, g) => n + (g.count ?? REFUGEE_GROUP_SIZE),
      0,
    );
    if (!(Number.isInteger(def.maxLost) && def.maxLost >= 1)) {
      bad(`${where}.maxLost`, 'must be a whole number ≥ 1 (losing that many loses the map)');
    } else if (def.maxLost > total) {
      bad(`${where}.maxLost`, `${def.maxLost} is more than the map's ${total} refugees`);
    }
  }
}

/**
 * [darkness]: each lighting key's `dark` is in [0, 1]; each lamp (`lights`) names a marker of the
 * map, once, with a radius > 0 when it gives one (LAMP_RADIUS_TILES by default); lamps go with a darkening schedule (they light nothing otherwise).
 */
export function validateDarkness(issues: Issues, def: MapDef<IdSpace>, where: string): void {
  const bad = (w: string, msg: string): void => issues.add('darkness', w, msg);
  for (const [i, k] of (def.lighting ?? []).entries()) {
    if (k.dark !== undefined && !(k.dark >= 0 && k.dark <= 1)) {
      bad(`${where}.lighting[${i}].dark`, `${k.dark} must be in [0, 1]`);
    }
  }
  const lights = def.lights ?? [];
  const markers = def.markers ?? {};
  for (const [i, l] of lights.entries()) {
    const w = `${where}.lights[${i}]`;
    if (!Object.hasOwn(markers, l.marker)) bad(`${w}.marker`, `unknown marker '${l.marker}'`);
    if (l.radiusTiles !== undefined && !isPositive(l.radiusTiles)) {
      bad(`${w}.radiusTiles`, 'must be > 0');
    }
  }
  for (const m of duplicates(lights.map((l) => l.marker))) {
    bad(`${where}.lights`, `marker '${m}' has two lamps`);
  }
  const darkens = (def.lighting ?? []).some((k) => (k.dark ?? 0) > 0);
  if (lights.length > 0 && !darkens) {
    bad(
      `${where}.lights`,
      `lamps need a lighting key with dark > 0 (they only lift the −${DARK_RANGE_PENALTY * 100}% dark range)`,
    );
  }
}
