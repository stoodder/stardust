// System 2: waves. Runs the wave schedule (design/core-loop.md § 2.1): the setup phase before
// wave 1, each wave's spawning, and the countdown before the next, which starts once a wave has
// finished spawning (waves overlap). Also home of the callWave command (§ 2.4): starting wave 1,
// and calling the next wave early for a bonus. Resolution (WaveCleared, the clear bonus) is
// cleanup's, once the tick's deaths and leaks are in.
import type { CompiledWave } from '../../content/compiled.ts';
import { EARLY_CALL_COOLDOWN_SHARE } from '../../content/rules.ts';
import type { IdSpace } from '../../content/types.ts';
import type { RejectReason } from '../commands.ts';
import { callWaveBonus, earn } from '../economy.ts';
import { ENEMY_BLANK } from '../entities.ts';
import { placeOnRoute } from '../path.ts';
import { poolAlloc } from '../pool.ts';
import { emit, takeUid, type SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';
import { reduceAbilityCooldowns } from './abilities.ts';

export function waves(state: SimState, ctx: TickContext): void {
  const s = state.schedule;
  if (s.phase === 'countdown') {
    s.countdownTicks--;
    if (s.countdownTicks <= 0) startWave(state, false, 0);
  }
  if (s.phase === 'spawning') {
    const wave = ctx.map.waves[state.wave - 1]!; // spawning ⇒ 1 ≤ wave ≤ waves.length
    spawnDue(state, wave, s.waveTicks);
    if (s.waveTicks >= wave.lastSpawnTicks) finishSpawning(state, ctx);
    else s.waveTicks++;
  }
}

/**
 * The callWave command: starts wave 1 from the setup phase (free), or the next wave during a
 * countdown, paying the early-call bonus and cutting ability cooldowns. Its first spawns land in
 * this tick's waves system (or the next tick's, when applied while paused).
 */
export function callWave(state: SimState, ctx: TickContext): RejectReason | null {
  const s = state.schedule;
  switch (s.phase) {
    case 'setup':
      startWave(state, false, 0);
      return null;
    case 'countdown': {
      const bonus = callWaveBonus(state, ctx.map);
      reduceAbilityCooldowns(state, Math.round(EARLY_CALL_COOLDOWN_SHARE * s.countdownTicks));
      earn(state, bonus);
      startWave(state, true, bonus);
      return null;
    }
    case 'spawning':
      return 'waveInProgress';
    case 'done':
      return 'noWavesLeft';
    default:
      return s.phase satisfies never;
  }
}

/** Starts the next wave: its spawn clock begins at 0 this tick. */
function startWave(state: SimState, early: boolean, bonus: number): void {
  const s = state.schedule;
  state.wave++;
  s.phase = 'spawning';
  s.waveTicks = 0;
  s.countdownTicks = 0;
  s.countdownTotalTicks = 0;
  s.startTick[state.wave - 1] = state.tick;
  if (state.wave > s.countdownWave) s.countdownWave = state.wave; // wave 1 has no countdown
  emit(state, { type: 'WaveStarted', wave: state.wave, early, bonus });
}

/** Spawning is done: the next wave's countdown begins, or the schedule is done. */
function finishSpawning(state: SimState, ctx: TickContext): void {
  const s = state.schedule;
  const next = ctx.map.waves[state.wave]; // the wave after the current one, if any
  if (next === undefined) {
    s.phase = 'done';
    return;
  }
  s.phase = 'countdown';
  s.countdownTicks = next.countdownTicks;
  s.countdownTotalTicks = next.countdownTicks;
  s.countdownWave = next.number;
  emit(state, { type: 'CountdownStarted', wave: next.number, ticks: next.countdownTicks });
}

/**
 * Spawns every unit due at `t` ticks into the wave: group g's i-th unit (0-based) spawns at
 * `delay + i × interval`. Groups spawn in parallel, in their authored order within a tick.
 */
function spawnDue(state: SimState, wave: CompiledWave<IdSpace>, t: number): void {
  const groups = wave.groups;
  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi]!; // gi < length
    const k = t - g.delayTicks;
    if (k < 0) continue;
    if (g.intervalTicks > 0) {
      if (k % g.intervalTicks !== 0 || k / g.intervalTicks >= g.count) continue;
      spawn(state, wave.number, g);
    } else if (k === 0) {
      for (let i = 0; i < g.count; i++) spawn(state, wave.number, g);
    }
  }
}

function spawn(state: SimState, wave: number, g: CompiledWave<IdSpace>['groups'][number]): void {
  const def = g.enemy;
  const e = poolAlloc(state.enemies, ENEMY_BLANK, takeUid(state));
  e.def = def;
  e.wave = wave;
  e.tags = g.tags;
  e.hp = def.hp;
  e.shieldHp = def.shield === null ? 0 : def.shield.hp;
  e.spawnTick = state.tick;
  placeOnRoute(e, g.route, 0);
  emit(state, { type: 'EnemySpawned', uid: e.uid, enemy: def.id, route: g.route.id, wave });
}
