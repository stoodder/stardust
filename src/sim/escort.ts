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
// - **An enemy at the exit** (while the map is an Escort): it follows them in and hushes one
//   refugee already sheltered there (`evacuated` − 1, `refugeesLost` + 1, RefugeeLost `exit`), a
//   Heavy unit too; a leak-free unit (fleeing, youngling) takes no one, and with nobody sheltered
//   yet it takes no one. It costs no integrity (EnemyLeaked with leak 0, so the leak barks still
//   see it). **A boss at the exit loses the map** (cleanup; enemies.md § 6).
// - **Defeat** also comes when the lost count reaches the map's `maxLost` (`escortLost`): every pip
//   of the HUD's lost row full is the map lost (D138).
// - **Perfect** on an Escort is "no refugee lost": a lost refugee forfeits Perfect Core, and a leak
//   while the map is an Escort doesn't by itself (sim/medals.ts). Pebble never counts.
// - **Victory** waits for the road to empty: every wave resolved and no refugee still walking
//   (cleanup; `refugeesOnRoad`).
// - **The meter** is Evacuated: `evacuated` of the map's `escort.total` (Pebble not counted);
//   `refugeesRemaining` (total − evacuated − lost: the ones not yet safe or lost, spawned or not)
//   only falls, so its script trigger is monotonic like every other.
// T506's pivot (`standDown`, the Ward, `bossEnd: 'pivot'`) runs `setObjective` and `spawnAllies`
// from the same script as any other map.
import type { CompiledMapDef, CompiledRefugeeGroup } from '../content/compiled.ts';
import type { IdSpace, MeterLabel, ObjectiveKind } from '../content/types.ts';
import type { DeepReadonly } from '../shared/types.ts';
import { ALLY_BLANK, type Ally, type Enemy } from './entities.ts';
import { bookRefugeeLost } from './medals.ts';
import { pointAt } from './path.ts';
import { poolAlloc, poolKill } from './pool.ts';
import { defaultMeterLabel, emit, takeUid, type SimState } from './state.ts';

type EscortMap = Pick<CompiledMapDef<IdSpace>, 'escort'>;

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
 * group's refugees in `stats.refugeesSpawned`. Validation guarantees the group exists; a map
 * without escort data spawns nothing.
 */
export function spawnRefugees(state: SimState, map: EscortMap, groupId: string): void {
  const escort = map.escort;
  if (escort === null) return;
  const index = escort.groups.findIndex((g) => g.id === groupId);
  const g = escort.groups[index];
  if (g === undefined) return;
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
 * by it): `stats.refugeesLost` + 1, RefugeeLost, and Perfect forfeited.
 */
export function loseRefugee(
  state: SimState,
  uid: number,
  cause: 'hushed' | 'exit',
  enemyUid: number,
): void {
  state.stats.refugeesLost++;
  emit(state, { type: 'RefugeeLost', uid, cause, enemyUid });
  bookRefugeeLost(state);
}

/**
 * An enemy reached its route's end while the map is an Escort (movement): the exit rule (see the
 * header). `cost` is its leak cost as the core would take it (0: leak-free; null: a boss). Emits
 * EnemyLeaked with leak 0, then, if it takes a sheltered refugee, RefugeeLost `exit`. Returns
 * whether the leak went to the exit (false: not an Escort now, so the core takes it).
 */
export function leakAtExit(
  state: SimState,
  e: Pick<Enemy, 'uid' | 'def'>,
  cost: number | null,
): boolean {
  const def = e.def;
  if (state.objective !== 'escort' || def === null) return false;
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

/** Whether an Escort has lost its `maxLost` refugees (cleanup: defeat; D138). */
export function escortLost(
  state: DeepReadonly<Pick<SimState, 'objective' | 'stats'>>,
  map: Pick<CompiledMapDef<IdSpace>, 'maxLost'>,
): boolean {
  return (
    state.objective === 'escort' && map.maxLost !== null && state.stats.refugeesLost >= map.maxLost
  );
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
  state: DeepReadonly<Pick<SimState, 'stats'>>,
  map: EscortMap,
): number {
  if (map.escort === null) return 0;
  const left = map.escort.total - state.stats.evacuated - state.stats.refugeesLost;
  return left > 0 ? left : 0;
}

/** The Evacuated meter as a share of the map's refugees, 0–1 (0 without escort data). */
export function evacuatedShare(
  state: DeepReadonly<Pick<SimState, 'stats'>>,
  map: EscortMap,
): number {
  const total = map.escort?.total ?? 0;
  return total > 0 ? state.stats.evacuated / total : 0;
}
