// The Leaving Song (design/maps.md § 5.5, Phase 2; T805): circles round the choir's leader and
// each of the Returned (`map.song`; sim/choir.ts `songCircles`/`inSong`, T804). The song acts only
// while the script phase is 2 (`state.phase`, D154); Phase 1 kills behave as in Act III.
// - **Laid to rest:** a Hollow unit killed inside a circle (`inSong` where it fell) adds its
//   `restValue` × the run's multiplier to `state.restPoints` (`LaidToRest`;
//   `stats.restedKills`). Its kill is booked as any other (bounty, kill stats, `EnemyDied`).
// - **Scattered:** one killed outside every circle counts in `stats.scatteredKills`. The first
//   time, it scatters (`Scattered`): the slot is made live again at 0 HP, drifts back
//   SCATTER_DRIFT_TILES along its route at once, and lies out of play (layers.ts: untargetable
//   and out of reach; movement: speed 0; enemyAbilities: no abilities) for `scatter.reformTicks`,
//   then re-forms at `scatter.hpPct` of its max HP (`Reformed`). It stays in its wave all along,
//   so the wave isn't resolved while a scattered unit waits. Its second death pays no bounty
//   (combat/damage.ts) and is for good, inside the song or out.
// - **A whole boss** never dies by damage (bossPhases.ts); a split boss's part (bossSplit.ts) is
//   laid to rest inside like a unit, and outside it falls for good (it never scatters: the boss
//   bar's parts are T808's). Damage a boss takes is summed on it (`Enemy.songDamage`, by
//   combat/damage.ts on a song map, the hit's damage after armor even where a floor holds its HP),
//   and while it stands inside a circle each point adds `restPerBossHp` × the multiplier.
// - **The trickle:** every Phase 2 tick adds `restPerTick` × the multiplier, so a Phase 2 with no
//   kills still ends (the countdown can't stall).
// - **The multiplier** (C4): the first of `song.multipliers` whose flag has its value, else ×1. It
//   scales every source (kills, the boss's damage, the trickle), so the phase's length moves by
//   exactly the ratio (Keep ×1.25 the anchor; Purge 1.25× as long, Rewrite 0.83×).
// - The rest points stop at `restTarget` (p = 1). `restProgressPct` triggers read
//   `restProgress` on the next tick's triggers.
// - `restAll` (Dawn's action; map events only) lays every live Hollow unit to rest, a scattered
//   one too, for no points and no kill: `LaidToRest` with 0 points, gone (marked leaving, so
//   cleanup books it to its wave and nothing else). A whole boss is left to its `layToRest`
//   ending (T808). It is Dawn's action, so it also wakes every hushed singer (`recoverSingers`:
//   Voices is the whole choir again, while `stats.voicesMin` keeps the run's score) and emits
//   DawnBroke (T821).
// Runs after the projectiles, before cleanup (tick.ts): every kill of the tick is dead and not yet
// released, so this pass sees them all. Allocation-free except its events.
import type { CompiledEnemyDef, CompiledSong } from '../content/compiled.ts';
import { SCATTER_DRIFT_TILES } from '../content/rules.ts';
import type { ScriptFlags } from './config.ts';
import { inSong, recoverSingers } from './choir.ts';
import { isSplitBorn } from './enemyAbilities/bossSplit.ts';
import { wasKilled } from './enemyAbilities/split.ts';
import type { Enemy } from './entities.ts';
import { pointAt, type Point } from './path.ts';
import { poolKill } from './pool.ts';
import { emit, type SimState } from './state.ts';
import type { TickContext } from './tick.ts';

/** The script phase the song acts in (D154: Phase 2, the Unsung). */
export const SONG_PHASE = 2;

const at: Point = { x: 0, y: 0 };

export function song(state: SimState, ctx: TickContext): void {
  const rules = ctx.map.song;
  if (rules === null) return;
  const live = state.phase === SONG_PHASE;
  const mul = restMultiplier(rules, ctx.config.scriptFlags);
  const pool = state.enemies;
  for (let i = 0; i < pool.used; i++) {
    const e = pool.items[i]!; // i < used ≤ items.length
    const def = e.def;
    if (e.uid === 0 || def === null) continue;
    if (e.alive) {
      if (e.scatterTicks > 0 && --e.scatterTicks === 0) reform(state, e, def, rules);
      if (e.songDamage > 0) {
        if (live && inSong(state, ctx.map, e.x, e.y)) {
          addRest(state, e.songDamage * rules.restPerBossHp * mul);
        }
        e.songDamage = 0;
      }
      continue;
    }
    if (!live || def.faction !== 'hollow' || !wasKilled(e)) continue;
    if (def.boss !== null && !isSplitBorn(e)) continue; // a whole boss never dies by damage
    if (inSong(state, ctx.map, e.x, e.y)) {
      const points = def.restValue * mul;
      addRest(state, points);
      state.stats.restedKills++;
      emit(state, { type: 'LaidToRest', uid: e.uid, at: [e.x, e.y], points });
    } else {
      state.stats.scatteredKills++;
      if (!e.scatteredOnce && def.boss === null) scatter(state, e, rules);
    }
  }
  if (live) addRest(state, rules.restPerTick * mul);
}

/** The run's rest multiplier (C4): the first of `multipliers` whose flag holds, else 1. */
export function restMultiplier(
  rules: Pick<CompiledSong, 'multipliers'>,
  flags: ScriptFlags,
): number {
  const list = rules.multipliers;
  for (let i = 0; i < list.length; i++) {
    const m = list[i]!; // i < length
    if (flags[m.flag] === m.value) return m.mul;
  }
  return 1;
}

/** The countdown's progress p, 0–1 (the `restProgressPct` trigger). */
export function restProgress(state: Pick<SimState, 'restPoints' | 'restTarget'>): number {
  return state.restTarget > 0 ? Math.min(1, state.restPoints / state.restTarget) : 0;
}

/** Whether `e` is scattered: out of play until it re-forms (layers.ts, movement, abilities). */
export function isScattered(e: Pick<Enemy, 'scatterTicks'>): boolean {
  return e.scatterTicks > 0;
}

/**
 * Sums a boss's damage for the song (combat/damage.ts, on a hit a boss takes): read and cleared
 * by song() each tick. Only on a song map (a run with a rest target), so other maps' state is
 * untouched.
 */
export function songBossHit(state: SimState, boss: Enemy, damage: number): void {
  if (state.restTarget > 0 && damage > 0) boss.songDamage += damage;
}

/**
 * Dawn (the `restAll` action): lays every live Hollow unit to rest (a whole boss is T808's), wakes
 * every hushed singer (choir.ts `recoverSingers`), and emits DawnBroke (T821).
 */
export function restAll(state: SimState, _ctx: TickContext): void {
  recoverSingers(state);
  emit(state, { type: 'DawnBroke' });
  const pool = state.enemies;
  for (let i = 0; i < pool.used; i++) {
    const e = pool.items[i]!; // i < used ≤ items.length
    const def = e.def;
    if (!e.alive || def === null || def.faction !== 'hollow') continue;
    if (def.boss !== null && !isSplitBorn(e)) continue;
    emit(state, { type: 'LaidToRest', uid: e.uid, at: [e.x, e.y], points: 0 });
    e.scatterTicks = 0;
    e.leaving = true; // gone, not killed or leaked: cleanup books it to its wave alone
    poolKill(pool, e);
  }
}

function addRest(state: SimState, points: number): void {
  const next = state.restPoints + points;
  state.restPoints = next < state.restTarget ? next : state.restTarget;
}

/**
 * A unit killed outside the song scatters (the first time): live again at 0 HP, out of play, and
 * SCATTER_DRIFT_TILES back along its route, until it re-forms.
 */
function scatter(state: SimState, e: Enemy, rules: CompiledSong): void {
  emit(state, { type: 'Scattered', uid: e.uid, at: [e.x, e.y] });
  e.alive = true; // the slot was killed this tick and isn't released yet (pool.ts lifecycle)
  state.enemies.live++;
  e.hp = 0;
  e.scatteredOnce = true;
  e.scatterTicks = rules.scatter.reformTicks > 0 ? rules.scatter.reformTicks : 1;
  const route = e.route;
  if (route !== null) {
    const back = e.dist - SCATTER_DRIFT_TILES;
    e.dist = back > 0 ? back : 0;
    e.seg = pointAt(route, e.dist, at, 0);
    e.x = at.x;
    e.y = at.y;
  }
}

/** A scattered unit re-forms at `scatter.hpPct` of its max HP (its absorbs' HP included). */
function reform(state: SimState, e: Enemy, def: CompiledEnemyDef, rules: CompiledSong): void {
  e.hp = rules.scatter.hpPct * (def.hp + e.bonusMaxHp);
  emit(state, { type: 'Reformed', uid: e.uid });
}
