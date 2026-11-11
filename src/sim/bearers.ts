// Bearers (design/maps.md § 5.2, § 5.4; act3.md § A3M5; T706): Brood Haulers carrying the vats'
// unsung dead home. A bearer group is a refugee group of `kind: 'bearer'` (`MapDef.refugees`) on a
// Protect map whose asset has `bearers` (validateM7.ts [bearers]): the asset meter is the bearers
// too. The rules:
// - **They walk as refugees** (sim/escort.ts): `spawnAllies` releases the group onto its route
//   (A3M5's back route out of the plant), in a line, at the refugees' pace, filing in from its
//   start; systems/allies.ts walks them, and the Hollow hush them (or a Maw gathers them) under the
//   refugees' rules (enemyAbilities/hush.ts, gather.ts). Towers and abilities never touch them.
// - **A hushed bearer costs the asset 1** (`chargeBearer`, from escort.ts `loseRefugee`): the
//   meter drops by 1 (never below 0) with AssetHit (the hushing unit's), and AssetLost as it
//   reaches 0, which loses the map (cleanup). It is also a refugee lost (`stats.refugeesLost`, its
//   group's `lostByGroup`, RefugeeLost `hushed`), so Perfect (core and asset untouched) goes with
//   it.
// - **Home.** A bearer that reaches its route's end (its group's exit, a door home on a core tile
//   of its own at the band's edge) is home: `stats.bearersHome` + 1, BearerHome, and it leaves the
//   map. No meter changes: the asset meter only falls, and nothing is Evacuated. The bearers system
//   runs after the allies system walks them (tick.ts) and takes home every bearer standing at its
//   route's end (escort.ts `evacuate` leaves a bearer there for it).
// - **Victory** waits for the bearers on the road like any refugee (cleanup `refugeesOnRoad`), and
//   `refugeesRemaining` counts a bearer home as safe.
// - **The Results line** (A3M5's "Carried: {n} of {total}", T712) reads `stats.bearersHome` of
//   the run's bearers (`bearerTotal`).
// Flag-gated ally posts (`AllyPostDef.when`, A3M6's militia under `convoy`) are manned only when
// their gate holds (`postManned`; systems/allies.ts spawns the posts).
import type { CompiledAllyPost, CompiledMapDef } from '../content/compiled.ts';
import type { IdSpace } from '../content/types.ts';
import type { ScriptFlags } from './config.ts';
import { poolKill } from './pool.ts';
import { emit, type SimState } from './state.ts';
import type { TickContext } from './tick.ts';

/** Takes home every bearer standing at its route's end (see the header). */
export function bearers(state: SimState, ctx: TickContext): void {
  const groups = ctx.map.escort?.groups;
  if (groups === undefined) return;
  const pool = state.allies;
  for (let i = 0; i < pool.used; i++) {
    const a = pool.items[i]!; // i < used ≤ items.length
    const route = a.route;
    if (!a.alive || a.kind !== 'bearer' || route === null || a.dist < route.lengthTiles) continue;
    state.stats.bearersHome++;
    emit(state, { type: 'BearerHome', uid: a.uid, group: groups[a.group]?.id ?? '' });
    poolKill(pool, a);
    emit(state, { type: 'AllyRemoved', uid: a.uid });
  }
}

/**
 * An ally lost on the road (escort.ts `loseRefugee`): if it was a bearer, the asset pays 1 (see the
 * header). `allyUid` is the lost ally's (still in its pool slot this tick), `enemyUid` the unit
 * that hushed or gathered it.
 */
export function chargeBearer(state: SimState, allyUid: number, enemyUid: number): void {
  const a = findSlot(state.allies, allyUid);
  if (a === null || a.kind !== 'bearer') return;
  const left = state.asset;
  const lost = left > 0 ? 1 : 0;
  state.asset = left - lost;
  const e = findSlot(state.enemies, enemyUid);
  if (e !== null && e.def !== null) {
    emit(state, { type: 'AssetHit', uid: e.uid, enemy: e.def.id, lost, x: a.x, y: a.y });
  }
  if (lost > 0 && state.asset === 0) emit(state, { type: 'AssetLost' });
}

/** The pool item with `uid`, alive or killed this tick (still in its slot), or null. */
function findSlot<T extends { readonly uid: number }>(
  pool: { readonly used: number; readonly items: readonly T[] },
  uid: number,
): T | null {
  if (uid === 0) return null;
  for (let i = 0; i < pool.used; i++) {
    const item = pool.items[i]!; // i < used ≤ items.length
    if (item.uid === uid) return item;
  }
  return null;
}

/** The run's bearers: every bearer group that walks under its flags (the Results line's total). */
export function bearerTotal(
  map: Pick<CompiledMapDef<IdSpace>, 'escort'>,
  flags: ScriptFlags,
): number {
  let n = 0;
  for (const g of map.escort?.groups ?? []) {
    if (g.kind === 'bearer' && (g.when === null || flags[g.when.flag] === g.when.eq)) n += g.count;
  }
  return n;
}

/**
 * A3M5's counter line's data (T712's "Carried: {n} of {total}" on Results): the run's bearers home
 * and lost of its total, or null on a map with none.
 */
export function bearersCarried(
  state: {
    readonly stats: { readonly bearersHome: number; readonly lostByGroup: readonly number[] };
  },
  map: Pick<CompiledMapDef<IdSpace>, 'escort'>,
  flags: ScriptFlags,
): { readonly home: number; readonly lost: number; readonly total: number } | null {
  const total = bearerTotal(map, flags);
  if (total === 0) return null;
  let lost = 0;
  const groups = map.escort?.groups ?? [];
  for (let i = 0; i < groups.length; i++) {
    if (groups[i]!.kind === 'bearer') lost += state.stats.lostByGroup[i] ?? 0; // i < length
  }
  return { home: state.stats.bearersHome, lost, total };
}

/** Whether ally post `post` is manned under the run's story flags (its `when`, if any). */
export function postManned(post: Pick<CompiledAllyPost, 'when'>, flags: ScriptFlags): boolean {
  return post.when === null || flags[post.when.flag] === post.when.eq;
}
