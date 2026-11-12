// The Unsung (design/enemies.md § 6, *How the Unsung runs*; T808): the finale's boss phase kinds
// that boss.ts hands here, and its `layToRest` ending. Its numbers are data
// (content/enemies/unsung.ts); the split without a merge is bossSplit.ts/bossMerge.ts's, the HP
// floor bossPhases.ts's, and the rest it feeds song.ts's.
// - **Held by the song** (a `layToRest` boss and its split's parts, every tick, its invulnerability
//   included): while the song sings (script phase 2) and it stands inside a song circle (choir.ts
//   `inSong`), it holds still: it came for the choir, and the song keeps it at the circle's edge.
//   As Voices fall the circle shrinks and it walks on until it is inside again, so it creeps closer
//   as the choir is hushed. Its fight is at the Halls mouth, and its damage there feeds the song.
// - **Laid to rest** (`layToRest`, every tick, whatever its phase): once the song's countdown has
//   completed (`restPoints` at `restTarget`, p = 1), the boss joins the song: BossEnded
//   `layToRest`, then LaidToRest (0 points: it scores nothing, as `restAll`), and it is gone (marked
//   leaving and removed, so cleanup books it to its wave and nothing else: no kill, no leak, no
//   bounty). It never ends by HP (its last phase's floor holds it).
// - **The dig toward the choir** (a phase's `burrow` with `burrowTo: 'choir'`; phase 3): boss.ts's
//   dig rules (the first BOSS_BURROW_GAP_SEC into the phase and after each surfacing; the last
//   BOSS_ABILITY_TELL_SEC of the wait its tell; an interrupt or a Truthlight Mark in the tell
//   cancels it and the gap restarts; Lulled holds the wait), but as it digs in it picks the middle
//   of the singing column (the middle singing singer, else the leader) and the point of its route
//   nearest them, and underground it travels there at an even pace through the dig's first part
//   (its own pace and every status set aside), then lies under them for its last
//   BOSS_ABILITY_TELL_SEC (the surfacing tell: the ground churns under the singers). It surfaces
//   there and hushes the nearest singing singer within BOSS_SURFACE_HUSH_TILES (the choir's hush:
//   kept, trailing, Voices −1; a singer already in a Hollow unit's tell is passed over).
//   **Driven back:** up among the singers, the song drives it back at once to where it dug in (the
//   song's edge, `digFromDist`; D156), so it never stands in the column drawing the towers' fire
//   while the adds walk past it into the singers (BossSurfaced's `at` is where it came up).
//   **Dug out:** a burrow answer's hit underground (the Scuttle Den's swarm, Underfoot; damage.ts
//   `reachesBurrowed`) takes its HP below what it dug in with, and on the next tick it surfaces
//   where it is, short of the singers, hushing no one (BossSurfaced `dugOut`). Either way the dig
//   is spent. With no choir on the map it surfaces where it dug.
// - **Phasing in a phase** (a phase's `phase`; phase 3): the Phased cycle (phase.ts's rule, its tell
//   at least BOSS_MIN_TELL_SEC). The two never overlap: the cycle holds while the boss is dug in or
//   telling a dig, and a dig's wait holds while it is Phased or telling a phase.
// - **Adds** (a phase's `adds`; the Song's Silencers): `count` of `enemy` (the run's scaled def)
//   every `everyTicks`, born in the boss's wave at the start of its route (they walk in from where
//   it rose, past the choir). The first comes one period into the phase; the last
//   BOSS_ABILITY_TELL_SEC of each wait is the call's tell; an interrupt in it cancels the call and
//   restarts the wait; Lulled holds the wait (the hangar's rules). BossAdds.
// Allocation-free but for its events.
import type { CompiledBossPhase, CompiledMapDef, CompiledRoute } from '../../content/compiled.ts';
import { BOSS_ABILITY_TELL_SEC, BOSS_SURFACE_HUSH_TILES } from '../../content/rules.ts';
import type { IdSpace, WaveTag } from '../../content/types.ts';
import { secToTicks } from '../../shared/time.ts';
import { hushSinger, inSong, isChoirSinger } from '../choir.ts';
import type { Ally, Enemy } from '../entities.ts';
import { pointAt, type Point } from '../path.ts';
import { poolKill } from '../pool.ts';
import { SONG_PHASE } from '../song.ts';
import { emit, type SimState } from '../state.ts';
import { cooldownHeld, evadeBlocked, isInterrupted } from '../systems/status.ts';
import type { TickContext } from '../tick.ts';
import { BOSS_BURROW_GAP_TICKS } from './bossPhases.ts';
import { spawnBrood } from './brood.ts';
import { phaseStep, phaseTelling } from './phase.ts';

/** HP below what it dug in with by more than this: dug out (float slack, as bossPhases's). */
const HP_EPS = 1e-9;

/** Every boss ability's tell (boss.ts's BOSS_ABILITY_TELL_TICKS; not imported: boss.ts imports this). */
const BOSS_ABILITY_TELL_TICKS = secToTicks(BOSS_ABILITY_TELL_SEC);

/** Where adds are born: the boss's wave and tags, at the start of its route (module scratch). */
const addsAt: {
  wave: number;
  tags: readonly WaveTag[];
  route: CompiledRoute | null;
  dist: number;
} = { wave: 0, tags: [], route: null, dist: 0 };

/** Whether boss phase `p` has a kind this module runs (boss.ts hands it here). */
export function isUnsungPhase(p: CompiledBossPhase): boolean {
  return p.burrowTo !== null || p.adds !== null || p.phase !== null;
}

/** Whether `e` is a `layToRest` boss or one of its split's parts (the Unsung's). */
export function laidToRestBySong(e: Pick<Enemy, 'def' | 'splitFrom'>): boolean {
  const def = e.splitFrom ?? e.def;
  return def !== null && def.boss !== null && def.boss.ending === 'layToRest';
}

/** Held by the song (see the header): a `layToRest` boss or part inside a circle holds still. */
export function songHold(state: SimState, ctx: TickContext, e: Enemy): void {
  if (state.phase !== SONG_PHASE || e.burrowed || !laidToRestBySong(e)) return;
  if (inSong(state, ctx.map, e.x, e.y)) e.paceMul = 0;
}

/**
 * The `layToRest` ending: once the song's countdown is complete the boss joins it and is gone.
 * Returns whether it did (boss.ts then stops).
 */
export function layToRestStep(state: SimState, boss: Enemy): boolean {
  if (!(state.restTarget > 0 && state.restPoints >= state.restTarget)) return false;
  layBossToRest(state, boss);
  return true;
}

/** Lays a live boss to rest (see the header). */
export function layBossToRest(state: SimState, boss: Enemy): void {
  if (!boss.alive || boss.leaving) return;
  const id = boss.def!.id; // a boss has a def
  emit(state, { type: 'BossEnded', uid: boss.uid, enemy: id, how: 'layToRest' });
  emit(state, { type: 'LaidToRest', uid: boss.uid, at: [boss.x, boss.y], points: 0 });
  boss.burrowed = false;
  boss.phased = false;
  boss.digToDist = -1;
  boss.leaving = true; // gone, not killed or leaked: cleanup books it to its wave alone
  poolKill(state.enemies, boss);
}

/**
 * One tick of a boss phase this module runs (after its invulnerability; boss.ts): its phasing,
 * its dig toward the choir, and its adds.
 */
export function unsungStep(
  state: SimState,
  ctx: TickContext,
  boss: Enemy,
  p: CompiledBossPhase,
): void {
  const ph = p.phase;
  if (ph !== null && !boss.burrowed && !digTelling(boss, p)) phaseStep(state, boss, ph);
  else if (ph === null && boss.phased) boss.phased = false;
  const phasing = ph !== null && (boss.phased || phaseTelling(boss, ph));
  if (p.burrow !== null && p.burrowTo !== null) {
    if (boss.burrowed) underground(state, boss);
    else if (!phasing) digWait(state, ctx, boss, p.burrow.durationTicks);
  }
  if (p.adds !== null && !phasing) addsStep(state, ctx, boss, p.adds);
}

/** Whether the boss is telling a dig this tick (its wait's last BOSS_ABILITY_TELL_TICKS). */
function digTelling(boss: Enemy, p: CompiledBossPhase): boolean {
  return (
    p.burrow !== null &&
    !boss.burrowed &&
    boss.abilityCount > 0 &&
    boss.abilityTicks > 0 &&
    boss.abilityTicks <= BOSS_ABILITY_TELL_TICKS
  );
}

/** The wait before a dig, its tell, and the dig itself (boss.ts's dig rules). */
function digWait(state: SimState, ctx: TickContext, boss: Enemy, durationTicks: number): void {
  if (boss.abilityCount <= 0 || boss.abilityTicks <= 0) return;
  if (boss.abilityTicks > BOSS_ABILITY_TELL_TICKS && cooldownHeld(boss)) return; // Lulled
  const left = --boss.abilityTicks;
  if (left <= BOSS_ABILITY_TELL_TICKS && evadeBlocked(boss)) {
    boss.abilityTicks = BOSS_BURROW_GAP_TICKS; // cancelled; the gap restarts
    return;
  }
  if (left > 0) return;
  boss.burrowed = true;
  boss.abilityTicks = durationTicks;
  boss.digHp = boss.hp;
  boss.digFromDist = boss.dist;
  boss.digToDist = choirDist(state, ctx.map, boss);
  boss.paceMul = 0;
}

/** A tick underground: dug out, or the travel, then the surfacing tell, then up. */
function underground(state: SimState, boss: Enemy): void {
  boss.paceMul = 0; // it travels by its dig, not its pace
  if (boss.hp < boss.digHp - HP_EPS) {
    surface(state, boss, true);
    return;
  }
  const route = boss.route;
  const travel = boss.abilityTicks - BOSS_ABILITY_TELL_TICKS; // travel ticks left, this one in
  if (travel > 0 && boss.digToDist >= 0 && route !== null) {
    boss.dist += (boss.digToDist - boss.dist) / travel;
    boss.seg = pointAt(route, boss.dist, boss, 0);
  }
  if (--boss.abilityTicks <= 0) surface(state, boss, false);
}

/** Up again (see the header): the dig is spent; among the singers, one is hushed. */
function surface(state: SimState, boss: Enemy, dugOut: boolean): void {
  boss.burrowed = false;
  boss.abilityCount--;
  boss.abilityTicks = boss.abilityCount > 0 ? BOSS_BURROW_GAP_TICKS : 0;
  const arrived = boss.digToDist >= 0;
  boss.digToDist = -1;
  const hushed = dugOut || !arrived ? 0 : hushNearest(state, boss);
  emit(state, { type: 'BossSurfaced', uid: boss.uid, at: [boss.x, boss.y], dugOut, hushed });
  // Up among the singers, the song drives it back to its edge, where it dug in (D156): it never
  // stands in the column, drawing every tower's fire while the adds walk past it.
  const from = boss.digFromDist;
  boss.digFromDist = -1;
  const route = boss.route;
  if (!dugOut && arrived && from >= 0 && route !== null) {
    boss.dist = from;
    boss.seg = pointAt(route, from, boss, 0);
  }
}

/** Hushes the nearest singing singer within BOSS_SURFACE_HUSH_TILES of the boss; its uid, or 0. */
function hushNearest(state: SimState, boss: Enemy): number {
  const r2 = BOSS_SURFACE_HUSH_TILES * BOSS_SURFACE_HUSH_TILES;
  const pool = state.allies;
  let best: Ally | null = null;
  let bestD2 = r2;
  for (let i = 0; i < pool.used; i++) {
    const a = pool.items[i]!; // i < used ≤ items.length
    if (!singing(a) || a.hushUid !== 0) continue;
    const dx = a.x - boss.x;
    const dy = a.y - boss.y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= bestD2 && (best === null || d2 < bestD2 || a.uid < best.uid)) {
      best = a;
      bestD2 = d2;
    }
  }
  if (best === null || !hushSinger(state, best)) return 0;
  return best.uid;
}

/** Whether `a` is a choir singer still singing. */
function singing(a: Ally): boolean {
  return isChoirSinger(a) && a.vulnerability === 'hush';
}

/**
 * Where on the boss's route a dig toward the choir comes up: the point nearest the middle singing
 * singer (by place in the column; the leader if none sings), or −1 with no choir on the map.
 */
export function choirDist(
  state: SimState,
  map: Pick<CompiledMapDef<IdSpace>, 'choir'>,
  boss: Enemy,
): number {
  const route = boss.route;
  if (map.choir === null || route === null) return -1;
  const mid = middleSinger(state);
  return mid === null
    ? routeDistNear(route, state.choir.x, state.choir.y)
    : routeDistNear(route, mid.x, mid.y);
}

/**
 * The middle singing singer of the column (its ⌊n/2⌋-th by place behind the leader, ties to the
 * lower uid), or null. Counts in place (a column is a handful), no allocation.
 */
function middleSinger(state: SimState): Ally | null {
  const pool = state.allies;
  let n = 0;
  for (let i = 0; i < pool.used; i++) if (singing(pool.items[i]!)) n++; // i < used
  if (n === 0) return null;
  const want = Math.floor(n / 2);
  for (let i = 0; i < pool.used; i++) {
    const a = pool.items[i]!; // i < used ≤ items.length
    if (!singing(a)) continue;
    let ahead = 0;
    for (let k = 0; k < pool.used; k++) {
      const b = pool.items[k]!; // k < used ≤ items.length
      if (b !== a && singing(b) && (b.dist < a.dist || (b.dist === a.dist && b.uid < a.uid))) {
        ahead++;
      }
    }
    if (ahead === want) return a;
  }
  return null;
}

/** The distance along `route` (from its spawn) of its point nearest (x, y), in tiles. */
export function routeDistNear(route: CompiledRoute, x: number, y: number): number {
  const { xs, ys, cumLenTiles: cum } = route;
  let best = 0;
  let bestD2 = Number.POSITIVE_INFINITY;
  for (let i = 0; i + 1 < xs.length; i++) {
    const x0 = xs[i]!; // i + 1 < length
    const y0 = ys[i]!;
    const dx = xs[i + 1]! - x0;
    const dy = ys[i + 1]! - y0;
    const len2 = dx * dx + dy * dy;
    let t = len2 > 0 ? ((x - x0) * dx + (y - y0) * dy) / len2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = x0 + dx * t - x;
    const ey = y0 + dy * t - y;
    const d2 = ex * ex + ey * ey;
    if (d2 < bestD2 - 1e-12) {
      bestD2 = d2;
      best = cum[i]! + ((cum[i + 1] ?? cum[i]!) - cum[i]!) * t;
    }
  }
  return best;
}

/** The adds' wait, their call's tell, and the call (see the header). */
function addsStep(
  state: SimState,
  ctx: TickContext,
  boss: Enemy,
  adds: NonNullable<CompiledBossPhase['adds']>,
): void {
  if (boss.abilityTicks <= 0) {
    boss.abilityTicks = adds.everyTicks;
    return;
  }
  if (boss.abilityTicks > BOSS_ABILITY_TELL_TICKS && cooldownHeld(boss)) return; // Lulled
  const left = --boss.abilityTicks;
  if (left <= BOSS_ABILITY_TELL_TICKS && isInterrupted(boss)) {
    boss.abilityTicks = adds.everyTicks; // cancelled; the wait restarts
    return;
  }
  if (left > 0) return;
  addsAt.wave = boss.wave;
  addsAt.tags = boss.tags;
  addsAt.route = boss.route;
  addsAt.dist = 0;
  spawnBrood(state, ctx, adds.enemy, adds.count, addsAt);
  addsAt.route = null;
  boss.abilityTicks = adds.everyTicks;
  emit(state, { type: 'BossAdds', uid: boss.uid, enemy: adds.enemy, count: adds.count });
}

// ── What render reads ────────────────────────────────────────────────────────────────────────

/** The boss's current phase def, or null. */
function phaseOf(e: Readonly<Enemy>): CompiledBossPhase | null {
  const phases = e.def?.boss?.phases;
  return phases === undefined || e.bossPhase === 0 ? null : (phases[e.bossPhase - 1] ?? null);
}

/**
 * Where a boss digging toward the choir comes up (written to `out`), or false when it isn't
 * digging toward one: render marks the spot through the whole dig.
 */
export function digTarget(e: Readonly<Enemy>, out: Point): boolean {
  if (!e.alive || !e.burrowed || e.digToDist < 0 || e.route === null) return false;
  pointAt(e.route, e.digToDist, out, 0);
  return true;
}

/** Whether a boss dug in toward the choir is in its surfacing tell (under the singers). */
export function surfaceTelling(e: Readonly<Enemy>): boolean {
  return (
    e.alive &&
    e.burrowed &&
    e.digToDist >= 0 &&
    e.abilityTicks > 0 &&
    e.abilityTicks <= BOSS_ABILITY_TELL_TICKS
  );
}

/** Whether a boss is in its adds' call tell this tick (the Song's Silencers coming). */
export function addsCalling(e: Readonly<Enemy>): boolean {
  const p = phaseOf(e);
  return (
    e.alive &&
    !e.leaving &&
    p !== null &&
    p.adds !== null &&
    e.invulnerableTicks === 0 &&
    e.abilityTicks > 0 &&
    e.abilityTicks <= BOSS_ABILITY_TELL_TICKS
  );
}

/**
 * The song's rest progress (0–1) a `layToRest` boss's bar carries (its parts' too), or −1 for any
 * other unit: the countdown that ends its fight.
 */
export function bossRestProgress(
  state: Pick<SimState, 'restPoints' | 'restTarget'>,
  e: Pick<Enemy, 'def' | 'splitFrom'>,
): number {
  if (!laidToRestBySong(e)) return -1;
  if (!(state.restTarget > 0)) return 0;
  const p = state.restPoints / state.restTarget;
  return p < 1 ? p : 1;
}
