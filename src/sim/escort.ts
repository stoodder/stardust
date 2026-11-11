// Escort (design/maps.md § 5.2, its rules' one home; core-loop.md § 2.9–2.10; T305c). A map's
// `escort` data names its refugee groups and the safe exit, a marker on its core `C` (A2M5's
// Preserve gate: the core before the pivot, the exit after). An Escort map is one from the start
// (`objective: 'escort'`) or once a `setObjective` action makes it one (the A2M5 pivot).
// - **Refugees** are route allies (systems/allies.ts walks them): `spawnAllies` releases a group,
//   `count` refugees in a line REFUGEE_SPACING_TILES apart, each starting that far further back
//   (a refugee with `dist` < 0 is still filing in at the route's start: not on the field, not drawn,
//   not hushable), at REFUGEE_SPEED_TILES_PER_SEC. Pebble rides in the middle of her group: she
//   walks with it, is never hushed (`vulnerability: 'never'`), and is never counted.
// - **The exit rule:** a refugee that reaches its route's end (the safe exit) is evacuated
//   (`stats.evacuated` + 1, RefugeeEvacuated) and leaves the map. One a Hollow unit hushes on the
//   road is lost (enemyAbilities/hush.ts; `stats.refugeesLost` + 1, RefugeeLost `hushed`).
// - **An enemy at the exit** (while the map is an Escort, or a Holdout at its doors; T605): it
//   follows them in and hushes one refugee already sheltered there (`evacuated` − 1,
//   `refugeesLost` + 1, RefugeeLost `exit`), a Heavy unit too; a leak-free unit (fleeing,
//   youngling) takes no one, and with nobody sheltered yet it takes no one. It costs no integrity
//   (EnemyLeaked with leak 0, so the leak barks still see it). **A boss at the exit loses an
//   Escort** (cleanup; enemies.md § 6); a Holdout has no defeat.
// - **Defeat** also comes when the lost count reaches the run's limit (`escortLost`): every pip of
//   the HUD's lost row full is the map lost (D138). The limit (`escortMaxLost`) is the map's
//   `maxLost`, or its `maxLostPct` of the run's refugees rounded up (⌈pct × total⌉, at least 1:
//   lost ≥ it exactly when lost ≥ pct × total), so a gated group scales it (D143 R7).
// - **Perfect** on an Escort is "no refugee lost": a lost refugee forfeits Perfect Core, and a leak
//   while the map is an Escort doesn't by itself (sim/medals.ts). Pebble never counts.
// - **Victory** waits for the road to empty: every wave resolved and no refugee still walking
//   (cleanup; `refugeesOnRoad`).
// - **The meter** is Evacuated: `evacuated` of the run's `state.refugeeTotal` (Pebble not counted;
//   `escortTotal`); `refugeesRemaining` (total − evacuated − lost: the ones not yet safe or lost,
//   spawned or not) only falls, so its script trigger is monotonic like every other.
// - **Gated groups** (T600a; A3M3's `door_choice`): a group whose `when` doesn't hold under the
//   run's story flags never walks. createSim marks it released (`gateRefugeeGroups`), so
//   `spawnAllies` does nothing for it, and it isn't in the run's total.
// - **Losses by group** (`stats.lostByGroup`; the `groupLost` condition): a refugee hushed or
//   gathered on the road is its group's loss; one taken at the exit was already sheltered, so it
//   is the shelter's, booked to no group.
// T506's pivot (`standDown`, the Ward, `bossEnd: 'pivot'`) runs `setObjective` and `spawnAllies`
// from the same script as any other map.
import type { CompiledMapDef, CompiledRefugeeGroup } from '../content/compiled.ts';
import type { IdSpace, MeterLabel, ObjectiveKind } from '../content/types.ts';
import type { ScriptFlags } from './config.ts';
import type { DeepReadonly } from '../shared/types.ts';
import { ALLY_BLANK, type Ally, type Enemy } from './entities.ts';
import { bookRefugeeLost } from './medals.ts';
import { pointAt } from './path.ts';
import { poolAlloc, poolKill } from './pool.ts';
import { defaultMeterLabel, emit, takeUid, type SimState } from './state.ts';

type EscortMap = Pick<CompiledMapDef<IdSpace>, 'escort'>;

/**
 * The run's refugee total (the meter's denominator; Pebble not counted): every group of the map's
 * escort data whose `when` holds under `flags`. 0 without escort data.
 */
export function escortTotal(map: EscortMap, flags: ScriptFlags): number {
  let n = 0;
  for (const g of map.escort?.groups ?? []) if (groupWalks(g, flags)) n += g.count;
  return n;
}

/** Whether refugee group `g` walks under the run's story `flags` (its `when`, if any). */
export function groupWalks(g: Pick<CompiledRefugeeGroup, 'when'>, flags: ScriptFlags): boolean {
  return g.when === null || flags[g.when.flag] === g.when.eq;
}

/**
 * At createSim: the groups that don't walk under the run's flags are marked released, so a
 * `spawnAllies` for one does nothing, and the run's total (`state.refugeeTotal`) leaves them out.
 */
export function gateRefugeeGroups(state: SimState, map: EscortMap, flags: ScriptFlags): void {
  const groups = map.escort?.groups ?? [];
  for (let i = 0; i < groups.length; i++) {
    if (!groupWalks(groups[i]!, flags)) state.refugeesReleased[i] = true; // i < length
  }
  state.refugeeTotal = escortTotal(map, flags);
}

/**
 * `setObjective` (a script action): the map is now `objective`, its meter labeled `meterLabel`
 * (default: the objective's own, `defaultMeterLabel`). Emits ObjectiveChanged; a no-op when
 * nothing changes.
 */
export function setObjective(
  state: SimState,
  objective: ObjectiveKind,
  meterLabel: MeterLabel | undefined,
): void {
  const label = meterLabel ?? defaultMeterLabel(objective);
  if (state.objective === objective && state.meterLabel === label) return;
  state.objective = objective;
  state.meterLabel = label;
  emit(state, { type: 'ObjectiveChanged', objective, meterLabel: label });
}

/**
 * `spawnAllies` (a script action): releases refugee group `groupId` onto its route, in a line
 * from its start (see the header), Pebble in its middle. Each emits AllySpawned. Counts the
 * group's refugees in `stats.refugeesSpawned`. A group is released once (`refugeesReleased`): a
 * second release does nothing. Validation guarantees the group exists; a map without escort
 * data spawns nothing.
 */
export function spawnRefugees(state: SimState, map: EscortMap, groupId: string): void {
  const escort = map.escort;
  if (escort === null) return;
  const index = escort.groups.findIndex((g) => g.id === groupId);
  const g = escort.groups[index];
  if (g === undefined || state.refugeesReleased[index] === true) return;
  state.refugeesReleased[index] = true;
  for (let i = 0; i < g.count; i++) spawnOne(state, g, index, -i * g.spacingTiles, false);
  if (g.withPebble) spawnOne(state, g, index, (-(g.count - 1) * g.spacingTiles) / 2, true);
  state.stats.refugeesSpawned += g.count;
}

function spawnOne(
  state: SimState,
  g: CompiledRefugeeGroup,
  groupIndex: number,
  dist: number,
  pebble: boolean,
): void {
  const a = poolAlloc(state.allies, ALLY_BLANK, takeUid(state));
  a.kind = 'refugee';
  a.mode = 'route';
  a.vulnerability = pebble ? 'never' : 'hush';
  a.route = g.route;
  a.dist = dist;
  a.seg = pointAt(g.route, dist, a, 0);
  a.group = groupIndex;
  a.speedTilesPerTick = g.speedTilesPerTick;
  a.pebble = pebble;
  emit(state, { type: 'AllySpawned', uid: a.uid, kind: 'refugee', x: a.x, y: a.y });
}

/** Whether refugee `a` is on the field (filed in past its route's start). */
export function onField(a: Pick<Ally, 'dist'>): boolean {
  return a.dist >= 0;
}

/** A refugee reached the safe exit: evacuated (Pebble: not counted), and gone from the map. */
export function evacuate(state: SimState, a: Ally): void {
  if (!a.pebble) state.stats.evacuated++;
  emit(state, { type: 'RefugeeEvacuated', uid: a.uid, pebble: a.pebble });
  poolKill(state.allies, a);
  emit(state, { type: 'AllyRemoved', uid: a.uid });
}

/**
 * Books a lost refugee (hushed on the road by enemy `enemyUid`, or one sheltered at the exit taken
 * by it): `stats.refugeesLost` + 1, its group's loss (`group`: its index in the escort's groups;
 * −1 for one taken at the exit), RefugeeLost, and Perfect forfeited.
 */
export function loseRefugee(
  state: SimState,
  uid: number,
  cause: 'hushed' | 'exit',
  enemyUid: number,
  group = -1,
): void {
  state.stats.refugeesLost++;
  if (group >= 0 && group < state.stats.lostByGroup.length) state.stats.lostByGroup[group]!++;
  emit(state, { type: 'RefugeeLost', uid, cause, enemyUid });
  bookRefugeeLost(state);
}

/**
 * An enemy reached its route's end while the map is an Escort or a Holdout (movement; a Holdout's
 * route ends are its doors, T605): the exit rule (see the header). `cost` is its leak cost as the
 * core would take it (0: leak-free; null: a boss). Emits EnemyLeaked with leak 0, then, if it
 * takes a sheltered refugee, RefugeeLost `exit`. Returns whether the leak went to the exit (false:
 * neither now, so the core takes it).
 */
export function leakAtExit(
  state: SimState,
  e: Pick<Enemy, 'uid' | 'def'>,
  cost: number | null,
): boolean {
  const def = e.def;
  // A Holdout's doors take the same rule (T605; sim/objectives.ts).
  if ((state.objective !== 'escort' && state.objective !== 'holdout') || def === null) return false;
  emit(state, { type: 'EnemyLeaked', uid: e.uid, enemy: def.id, leak: 0 });
  if (cost !== null && cost > 0 && state.stats.evacuated > 0) {
    state.stats.evacuated--;
    loseRefugee(state, 0, 'exit', e.uid);
  }
  return true;
}

/** Whether a boss that leaked this tick reached an Escort's exit: the map is lost (cleanup). */
export function bossAtExit(
  state: DeepReadonly<Pick<SimState, 'objective'>>,
  e: Pick<Enemy, 'def'>,
): boolean {
  return state.objective === 'escort' && e.def !== null && e.def.boss !== null;
}

/** Rounding slack for `maxLostPct × total` (0.55 × 20 is 11.000000000000002 in floats). */
const PCT_EPS = 1e-9;

/**
 * The run's loss limit (the header's "Defeat"; the HUD's pips read it): the map's `maxLost`, else
 * ⌈`maxLostPct` × `state.refugeeTotal`⌉ (at least 1), else null (no limit).
 */
export function escortMaxLost(
  state: DeepReadonly<Pick<SimState, 'refugeeTotal'>>,
  map: Pick<CompiledMapDef<IdSpace>, 'maxLost' | 'maxLostPct'>,
): number | null {
  if (map.maxLost !== null) return map.maxLost;
  if (map.maxLostPct === null) return null;
  const n = Math.ceil(map.maxLostPct * state.refugeeTotal - PCT_EPS);
  return n > 1 ? n : 1;
}

/** Whether an Escort has lost its limit of refugees (cleanup: defeat; D138). */
export function escortLost(
  state: DeepReadonly<Pick<SimState, 'objective' | 'stats' | 'refugeeTotal'>>,
  map: Pick<CompiledMapDef<IdSpace>, 'maxLost' | 'maxLostPct'>,
): boolean {
  if (state.objective !== 'escort') return false;
  const max = escortMaxLost(state, map);
  return max !== null && state.stats.refugeesLost >= max;
}

/** Refugees (Pebble included) still walking or filing in: victory waits for none (cleanup). */
export function refugeesOnRoad(state: DeepReadonly<Pick<SimState, 'allies'>>): number {
  const pool = state.allies;
  let n = 0;
  for (let i = 0; i < pool.used; i++) {
    const a = pool.items[i]!; // i < used ≤ items.length
    if (a.alive && a.group >= 0) n++;
  }
  return n;
}

/**
 * Refugees not yet safe or lost, spawned or not (Pebble not counted): the `refugeesRemaining`
 * trigger's count. Only falls. 0 on a map without escort data.
 */
export function refugeesRemaining(
  state: DeepReadonly<Pick<SimState, 'stats' | 'refugeeTotal'>>,
  map: EscortMap,
): number {
  if (map.escort === null) return 0;
  const left = state.refugeeTotal - state.stats.evacuated - state.stats.refugeesLost;
  return left > 0 ? left : 0;
}

/**
 * The story flags a run takes when it sets none for a flag that gates a refugee group (T605): that
 * flag's first `flagVariants` value, so the group's door is open (an unset flag gates every group
 * out: A3M3's `door_choice`, a Holdout with no refugees). The balance harness's runs and a dev
 * battle with no save start from these (`flags` laid over them). Empty when no group is gated.
 */
export function gatedFlagDefaults(
  map: Pick<CompiledMapDef<IdSpace>, 'escort' | 'builds'>,
  flags: ScriptFlags = {},
): ScriptFlags {
  const out: Partial<Record<keyof ScriptFlags, NonNullable<ScriptFlags[keyof ScriptFlags]>>> = {};
  for (const g of map.escort?.groups ?? []) {
    const flag = g.when?.flag;
    if (flag === undefined || flags[flag] !== undefined || out[flag] !== undefined) continue;
    const first = map.builds.flagVariants[flag]?.[0];
    if (first !== undefined) out[flag] = first;
  }
  return { ...out, ...flags };
}
