// The choir (design/maps.md § 5.5, Phase 1; T804; its rules' one home). A map's `choir` data
// (MapDef.choir; only a `choir` map has one) puts the finale's walkers on its road:
// - **The column.** createSim sizes it (`initChoir`): the base `singers`, plus or minus each flag
//   group that holds under the run's story flags (warren +4, convoy −2), plus Old Thrum when his
//   gate holds (`spared_quiet_wave`). That is the run's choir (`state.choir.singers`, Pebble not
//   counted), all singing at the start (`voices`, `stats.voicesMin`). On the first tick the choir
//   system spawns it as allies of mode `choir` (group −1: never refugees) at the road's core end:
//   Pebble (kind `singer`, `pebble`) leading, Thrum (kind `thrum`) beside her, the singers, and the
//   Returned (kind `bearer`, `count` of them when `stardust_choice = returned`) behind. Pebble,
//   Thrum and the Returned are never hushed (`vulnerability: 'never'`); the Returned are not
//   Voices.
// - **The walk.** The choir walks its road (`choir.route`, a ground path) from its core end back
//   toward its spawn, once wave 1 has started, at the choir's `pace`: `state.choir.dist` is how far
//   the leader has walked, `x`/`y` where she stands. The column files behind her
//   CHOIR_SPACING_TILES apart in this order: the singers still singing, the Returned, the hushed.
//   Each member moves toward its place at up to CHOIR_CATCHUP_MUL × the pace (so the column closes
//   up behind a hushed singer, and the hushed singer drifts back through it to the tail); one held
//   in a hush tell stands. She stops for good at the road's point nearest the
//   `stopAt` marker (`arrived`: the Halls mouth).
// - **Paced to the waves** (`walkWaves`, T820; fin_m01: 18). With it, she walks no further than
//   wave ÷ `walkWaves` of the way to her stop once that wave has started (`legCap`: a leg a wave,
//   walked at her pace as the wave starts, all the way from wave `walkWaves` on). The cap is a
//   ceiling, not a schedule: halted mid-leg, she finishes it when free, and a whole leg behind
//   she walks on into the next. At a leg's end she waits (`waiting`, `waitTicks`): not halted, no
//   halt scan, no ChoirHalted, still singing (render tells waiting from halted by this flag). So
//   the beats keep time with the waves whatever the countdowns (Story, early calls, Rush Hour).
// - **The halt rule.** While she walks, the choir halts while a Hollow unit walking the ground
//   within reach (not burrowed, Phased or leaving) is within `haltTiles` ahead of her: on her
//   road, 0–`haltTiles` route tiles toward its spawn; on another ground route, within `haltTiles`
//   in a straight line and not behind her (where roads merge). Flyers never halt it. ChoirHalted
//   fires as it halts and walks on; `haltTicks` counts the ticks spent halted. The scan walks the
//   enemy pool and allocates nothing.
// - **Hushed singers.** A singing singer is hushable like a refugee (enemyAbilities/hush.ts; a
//   Maw's gather hushes one too, gather.ts): when the tell lands it is kept, not removed
//   (`hushSinger`): it stops singing (`vulnerability: 'never'`, so it can't be hushed again),
//   trails at the back, and Voices falls by 1 (SingerHushed; `stats.voicesMin`). The Hollow unit
//   turns Heavy as for any hush. A hushed singer forfeits Perfect ("no singer hushed"; a leak on
//   a choir map forfeits nothing by itself: sim/medals.ts). `recoverSingers` (Dawn: song.ts
//   `restAll` calls it) has every hushed singer sing again; `stats.voicesMin` keeps the score.
// - **Defeat** (cleanup): fewer than the run's floor still singing (`choirLost`): the map's
//   choir's `maxHushed` allowance (the run's choir − it; T821), else the map's `minVoices`, or
//   ⌈`minVoicesPct` × the run's choir⌉ (at least 1; `minVoicesOf`). **Victory**
//   also waits for the leader to arrive (`choirWalking`).
// - **The song's circles** (`songCircles`, `inSong`; T805 lays to rest inside them, render draws
//   them): with a `song`, a circle round the leader of radius `baseRadius` × (`silentPct` +
//   (1 − `silentPct`) × voices ÷ choir), + Thrum's `radiusBonus` while he walks; and one of
//   `auraRadius` round each Returned bearer. None without a song.
// - **`choirAt`** (the `{ choirAt }` trigger): the leader has reached a marker: `stopAt` is
//   `arrived`; any other marker, she has walked past the road's point nearest it.
// Runs after the allies and bearers (tick.ts).
import type { CompiledChoir, CompiledMapDef, CompiledRoute } from '../content/compiled.ts';
import { CHOIR_CATCHUP_MUL, CHOIR_SPACING_TILES } from '../content/rules.ts';
import type { AllyKind, FlagValue, IdSpace, ScriptFlagId } from '../content/types.ts';
import type { DeepReadonly } from '../shared/types.ts';
import type { ScriptFlags } from './config.ts';
import { outOfReach } from './enemyAbilities/layers.ts';
import { ALLY_BLANK, type Ally } from './entities.ts';
import { bookRefugeeLost } from './medals.ts';
import { pointAt, segmentAt } from './path.ts';
import { poolAlloc } from './pool.ts';
import { emit, takeUid, type SimState } from './state.ts';
import type { TickContext } from './tick.ts';

/** A song circle (`songCircles`): its centre and radius, in tiles. */
export interface SongCircle {
  x: number;
  y: number;
  r: number;
}

/** Arrival slack (tiles), as movement's. */
const EPS = 1e-9;

type Gate = { readonly flag: ScriptFlagId; readonly eq: FlagValue };

function holds(g: Gate, flags: ScriptFlags): boolean {
  return flags[g.flag] === g.eq;
}

/** The run's choir under its flags: base singers, its flag groups, and Thrum (Pebble not counted). */
export function choirSize(
  c: Pick<CompiledChoir, 'singers' | 'groups' | 'thrum'>,
  flags: ScriptFlags,
): number {
  let n = c.singers;
  for (const g of c.groups) if (holds(g.when, flags)) n += g.singers;
  if (c.thrum !== null && holds(c.thrum.when, flags)) n++;
  return n;
}

/** The road position (from its spawn) nearest tile `tile`'s centre. */
function nearestRoutePos(route: CompiledRoute, tile: readonly [number, number]): number {
  const px = tile[0] + 0.5;
  const py = tile[1] + 0.5;
  const { xs, ys, cumLenTiles: cum } = route;
  let best = 0;
  let bestD2 = Number.POSITIVE_INFINITY;
  for (let i = 0; i + 1 < xs.length; i++) {
    const x0 = xs[i]!; // i + 1 < length
    const y0 = ys[i]!;
    const dx = xs[i + 1]! - x0;
    const dy = ys[i + 1]! - y0;
    const len2 = dx * dx + dy * dy;
    let t = len2 > 0 ? ((px - x0) * dx + (py - y0) * dy) / len2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = x0 + dx * t - px;
    const ey = y0 + dy * t - py;
    const d2 = ex * ex + ey * ey;
    if (d2 < bestD2 - EPS) {
      bestD2 = d2;
      best = cum[i]! + ((cum[i + 1] ?? cum[i]!) - cum[i]!) * t;
    }
  }
  return best;
}

/** How far the leader walks (from the road's core end) to stand beside `tile`. */
function walkTo(route: CompiledRoute, tile: readonly [number, number]): number {
  return route.lengthTiles - nearestRoutePos(route, tile);
}

/** At createSim: the run's choir, all singing, its leader at the road's core end (see the header). */
export function initChoir(
  state: SimState,
  map: Pick<CompiledMapDef<IdSpace>, 'choir'>,
  flags: ScriptFlags,
): void {
  const c = map.choir;
  if (c === null) return;
  const ch = state.choir;
  ch.singers = choirSize(c, flags);
  ch.voices = ch.singers;
  ch.thrum = c.thrum !== null && holds(c.thrum.when, flags);
  ch.stopDist = walkTo(c.route, c.stopTile);
  ch.dist = 0;
  ch.halted = false;
  ch.arrived = ch.stopDist <= EPS;
  ch.haltTicks = 0;
  pointAt(c.route, c.route.lengthTiles, ch, 0);
  state.stats.voicesMin = ch.singers;
}

/** One tick of the choir: spawn (tick 0), the halt rule, the leader's walk, the column. */
export function choir(state: SimState, ctx: TickContext): void {
  const c = ctx.map.choir;
  if (c === null) return;
  if (state.tick === 0) spawnChoir(state, c, ctx.config.scriptFlags);
  const ch = state.choir;
  const route = c.route;
  if (!ch.arrived && state.wave >= 1) {
    // Paced to the waves (`walkWaves`; T820): this wave's leg ends at `cap`. Waiting there isn't a
    // halt, so the halt scan doesn't run.
    const cap = legCap(c, ch.stopDist, state.wave);
    const waiting = ch.dist >= cap - EPS;
    const halted = !waiting && hollowAhead(state, c, route.lengthTiles - ch.dist);
    if (halted !== ch.halted) {
      ch.halted = halted;
      emit(state, { type: 'ChoirHalted', on: halted });
    }
    ch.waiting = waiting;
    if (halted) {
      ch.haltTicks++;
    } else if (waiting) {
      ch.waitTicks++;
    } else {
      const next = ch.dist + c.paceTilesPerTick;
      ch.dist = next < cap ? next : cap;
      if (ch.dist >= ch.stopDist - EPS) {
        ch.dist = ch.stopDist;
        ch.arrived = true;
        ch.waiting = false;
      }
    }
  }
  const lead = route.lengthTiles - ch.dist;
  pointAt(route, lead, ch, 0);
  walkColumn(state, c, lead);
}

/**
 * How far the leader may have walked once wave `wave` has started (`walkWaves`; T820): wave ÷
 * `walkWaves` of the way to her stop, all of it from that wave on; the whole way when unpaced.
 */
export function legCap(
  c: Pick<CompiledChoir, 'walkWaves'>,
  stopDist: number,
  wave: number,
): number {
  const n = c.walkWaves ?? 0;
  if (n <= 0 || wave >= n) return stopDist;
  return (stopDist * wave) / n;
}

/** Spawns the column at the road's core end (tick 0; see the header). */
function spawnChoir(state: SimState, c: CompiledChoir, flags: ScriptFlags): void {
  const end = c.route.lengthTiles;
  spawnMember(state, c, end, 'singer', true);
  if (state.choir.thrum) spawnMember(state, c, end, 'thrum', false);
  const singing = state.choir.singers - (state.choir.thrum ? 1 : 0);
  for (let i = 0; i < singing; i++) spawnMember(state, c, end, 'singer', false);
  const r = c.returned;
  if (r !== null && holds(r.when, flags)) {
    for (let i = 0; i < r.count; i++) spawnMember(state, c, end, 'bearer', false);
  }
}

function spawnMember(
  state: SimState,
  c: CompiledChoir,
  pos: number,
  kind: AllyKind,
  pebble: boolean,
): void {
  const a = poolAlloc(state.allies, ALLY_BLANK, takeUid(state));
  a.kind = kind;
  a.mode = 'choir';
  a.vulnerability = kind === 'singer' && !pebble ? 'hush' : 'never';
  a.route = c.route;
  a.dist = pos;
  a.seg = pointAt(c.route, pos, a, 0);
  a.speedTilesPerTick = c.paceTilesPerTick;
  a.pebble = pebble;
  emit(state, { type: 'AllySpawned', uid: a.uid, kind, x: a.x, y: a.y });
}

/** Whether `a` is one of the choir's singers (not Pebble, Thrum, or the Returned). */
export function isChoirSinger(a: Pick<Ally, 'alive' | 'mode' | 'kind' | 'pebble'>): boolean {
  return a.alive && a.mode === 'choir' && a.kind === 'singer' && !a.pebble;
}

/** Whether `a` is a hushed singer (stopped singing, trailing at the back). */
export function isHushedSinger(
  a: Pick<Ally, 'alive' | 'mode' | 'kind' | 'pebble' | 'vulnerability'>,
): boolean {
  return isChoirSinger(a) && a.vulnerability === 'never';
}

/**
 * Walks every member toward its place behind the leader at road position `lead` (see the
 * header). Two passes over the pool, no allocation.
 */
function walkColumn(state: SimState, c: CompiledChoir, lead: number): void {
  const pool = state.allies;
  let singing = 0;
  let returned = 0;
  for (let i = 0; i < pool.used; i++) {
    const a = pool.items[i]!; // i < used ≤ items.length
    if (!a.alive || a.mode !== 'choir') continue;
    if (a.kind === 'bearer') returned++;
    else if (isChoirSinger(a) && a.vulnerability === 'hush') singing++;
  }
  const end = c.route.lengthTiles;
  const step = c.paceTilesPerTick * CHOIR_CATCHUP_MUL;
  let s = 0;
  let r = 0;
  let h = 0;
  for (let i = 0; i < pool.used; i++) {
    const a = pool.items[i]!; // i < used ≤ items.length
    if (!a.alive || a.mode !== 'choir') continue;
    let rank = 0;
    if (a.kind === 'bearer') rank = 1 + singing + r++;
    else if (isChoirSinger(a)) {
      rank = a.vulnerability === 'hush' ? 1 + s++ : 1 + singing + returned + h++;
    }
    let target = lead + rank * CHOIR_SPACING_TILES;
    if (target > end) target = end;
    if (rank === 0) {
      a.dist = lead; // Pebble, and Thrum beside her
    } else if (a.hushUid === 0 && a.dist !== target) {
      const d = target - a.dist;
      a.dist = d > step ? a.dist + step : d < -step ? a.dist - step : target;
    } else {
      continue;
    }
    a.seg = pointAt(c.route, a.dist, a, a.seg);
  }
}

/** Whether a Hollow unit is within the halt distance ahead of the leader at `lead` (the header). */
function hollowAhead(state: SimState, c: CompiledChoir, lead: number): boolean {
  const route = c.route;
  const halt = c.haltTiles;
  const halt2 = halt * halt;
  const seg = segmentAt(route, lead, 0);
  // Ahead is toward the road's spawn: back along its segment.
  const fx = route.xs[seg]! - (route.xs[seg + 1] ?? route.xs[seg]!); // seg ≤ last segment
  const fy = route.ys[seg]! - (route.ys[seg + 1] ?? route.ys[seg]!);
  const lx = state.choir.x;
  const ly = state.choir.y;
  const pool = state.enemies;
  for (let i = 0; i < pool.used; i++) {
    const e = pool.items[i]!; // i < used ≤ items.length
    const def = e.def;
    if (!e.alive || def === null || def.faction !== 'hollow' || def.layer !== 'ground') continue;
    if (outOfReach(e)) continue;
    if (e.route === route) {
      const d = lead - e.dist;
      if (d >= 0 && d <= halt) return true;
    } else {
      const dx = e.x - lx;
      const dy = e.y - ly;
      if (dx * dx + dy * dy <= halt2 && dx * fx + dy * fy >= 0) return true;
    }
  }
  return false;
}

/**
 * A Hollow unit's hush (or a Maw's gather) landed on ally `a`: if it is a singing singer it is
 * kept, hushed (see the header), and this returns true; otherwise false (the caller removes it).
 */
export function hushSinger(state: SimState, a: Ally): boolean {
  if (!isChoirSinger(a) || a.vulnerability !== 'hush') return false;
  a.vulnerability = 'never';
  a.hushUid = 0;
  const ch = state.choir;
  if (ch.voices > 0) ch.voices--;
  if (ch.voices < state.stats.voicesMin) state.stats.voicesMin = ch.voices;
  emit(state, { type: 'SingerHushed', uid: a.uid });
  bookRefugeeLost(state); // Perfect on a choir map: no singer hushed
  return true;
}

/** Dawn (song.ts `restAll`, T821): every hushed singer sings again, and Voices is the whole choir. */
export function recoverSingers(state: SimState): void {
  const pool = state.allies;
  for (let i = 0; i < pool.used; i++) {
    const a = pool.items[i]!; // i < used ≤ items.length
    if (!isHushedSinger(a)) continue;
    a.vulnerability = 'hush';
    state.choir.voices++;
  }
}

/** Rounding slack for `minVoicesPct × choir` (as escort.ts's). */
const PCT_EPS = 1e-9;

/**
 * The run's Voices floor: with the choir's `maxHushed` the run's choir − `maxHushed` (at least 1),
 * else the map's `minVoices`, else ⌈`minVoicesPct` × the run's choir⌉ (at least 1), else null (no
 * floor; a map without a choir).
 */
export function minVoicesOf(
  state: DeepReadonly<Pick<SimState, 'choir'>>,
  map: Pick<CompiledMapDef<IdSpace>, 'choir' | 'minVoices' | 'minVoicesPct'>,
): number | null {
  if (map.choir === null) return null;
  const k = map.choir.maxHushed;
  if (k !== null) {
    // A hush allowance (T821): the run's choir − maxHushed, so every flag cell has the same room.
    const n = state.choir.singers - k;
    return n > 1 ? n : 1;
  }
  if (map.minVoices !== null) return map.minVoices;
  if (map.minVoicesPct === null) return null;
  const n = Math.ceil(map.minVoicesPct * state.choir.singers - PCT_EPS);
  return n > 1 ? n : 1;
}

/** Whether fewer than the run's floor still sing (cleanup: defeat). */
export function choirLost(
  state: DeepReadonly<Pick<SimState, 'choir'>>,
  map: Pick<CompiledMapDef<IdSpace>, 'choir' | 'minVoices' | 'minVoicesPct'>,
): boolean {
  const floor = minVoicesOf(state, map);
  return floor !== null && state.choir.voices < floor;
}

/** Whether the choir is still on its walk (cleanup: victory waits for it to arrive). */
export function choirWalking(
  state: DeepReadonly<Pick<SimState, 'choir'>>,
  map: Pick<CompiledMapDef<IdSpace>, 'choir'>,
): boolean {
  return map.choir !== null && !state.choir.arrived;
}

/** Whether the choir's leader has reached `marker` (the `{ choirAt }` trigger; see the header). */
export function choirAt(
  state: DeepReadonly<Pick<SimState, 'choir'>>,
  map: Pick<CompiledMapDef<IdSpace>, 'choir' | 'markers'>,
  marker: string,
): boolean {
  const c = map.choir;
  if (c === null) return false;
  if (marker === c.stopAt) return state.choir.arrived;
  const tile = map.markers[marker];
  if (tile === undefined) return false;
  return state.choir.dist >= walkTo(c.route, tile) - EPS;
}

/** The leader's song radius in tiles (0 without a choir and a song; see the header). */
export function songRadius(
  state: DeepReadonly<Pick<SimState, 'choir'>>,
  map: Pick<CompiledMapDef<IdSpace>, 'choir' | 'song'>,
): number {
  const c = map.choir;
  const s = map.song;
  if (c === null || s === null) return 0;
  const ch = state.choir;
  const share = ch.singers > 0 ? ch.voices / ch.singers : 0;
  const bonus = ch.thrum && c.thrum !== null ? c.thrum.radiusBonus : 0;
  return s.baseRadius * (s.silentPct + (1 - s.silentPct) * share) + bonus;
}

/** The reused buffer `songCircles` fills. */
const CIRCLES: SongCircle[] = [];

function putCircle(n: number, x: number, y: number, r: number): number {
  const c = CIRCLES[n];
  if (c === undefined) CIRCLES.push({ x, y, r });
  else {
    c.x = x;
    c.y = y;
    c.r = r;
  }
  return n + 1;
}

/**
 * The song's circles now (see the header): the leader's first, then one per live Returned
 * bearer; empty without a choir and a song. Allocation-free once warm: the array and its circles
 * are a reused buffer, valid until the next call.
 */
export function songCircles(
  state: DeepReadonly<Pick<SimState, 'choir' | 'allies'>>,
  map: Pick<CompiledMapDef<IdSpace>, 'choir' | 'song'>,
): readonly SongCircle[] {
  let n = 0;
  const c = map.choir;
  if (c !== null && map.song !== null) {
    n = putCircle(n, state.choir.x, state.choir.y, songRadius(state, map));
    const aura = c.returned?.auraRadius ?? 0;
    const pool = state.allies;
    for (let i = 0; i < pool.used; i++) {
      const a = pool.items[i]!; // i < used ≤ items.length
      if (a.alive && a.mode === 'choir' && a.kind === 'bearer') n = putCircle(n, a.x, a.y, aura);
    }
  }
  CIRCLES.length = n;
  return CIRCLES;
}

/** Whether (`x`, `y`) lies inside a song circle (inclusive; allocation-free; `songCircles`). */
export function inSong(
  state: DeepReadonly<Pick<SimState, 'choir' | 'allies'>>,
  map: Pick<CompiledMapDef<IdSpace>, 'choir' | 'song'>,
  x: number,
  y: number,
): boolean {
  const c = map.choir;
  if (c === null || map.song === null) return false;
  const r = songRadius(state, map);
  let dx = x - state.choir.x;
  let dy = y - state.choir.y;
  if (dx * dx + dy * dy <= r * r) return true;
  const aura = c.returned?.auraRadius ?? 0;
  const a2 = aura * aura;
  const pool = state.allies;
  for (let i = 0; i < pool.used; i++) {
    const a = pool.items[i]!; // i < used ≤ items.length
    if (!a.alive || a.mode !== 'choir' || a.kind !== 'bearer') continue;
    dx = x - a.x;
    dy = y - a.y;
    if (dx * dx + dy * dy <= a2) return true;
  }
  return false;
}
