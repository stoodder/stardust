// System 2: waves. Runs the wave schedule (design/core-loop.md § 2.1): the setup phase before
// wave 1, each wave's spawning, and the countdown before the next, which starts once a wave has
// finished spawning (waves overlap). Also home of the callWave command (§ 2.4): starting wave 1,
// and calling the next wave early for a bonus. Resolution (WaveCleared, the clear bonus) is
// cleanup's, once the tick's deaths and leaks are in.
//
// The run's wave modifiers apply here (D032): `countdown` stretches or cuts every countdown, and
// `enemyStat` scales each unit's def as it spawns (`runWaveModifiers`), so status, movement,
// damage, and render all read the scaled numbers through `e.def` with no per-system change.
import type { CompiledEnemyDef, CompiledPulse, CompiledWave } from '../../content/compiled.ts';
import {
  CHECKPOINT_EVERY_WAVES,
  CHECKPOINTS_FROM_ACT,
  EARLY_CALL_COOLDOWN_SHARE,
} from '../../content/rules.ts';
import type { Act, IdSpace, ObjectiveKind } from '../../content/types.ts';
import type { EnemyStat, Modifier, SimConfig } from '../config.ts';
import type { RejectReason } from '../commands.ts';
import { callWaveBonus, earn, nextWaveIsQuiet } from '../economy.ts';
import { ENEMY_BLANK } from '../entities.ts';
import { countTags } from '../fireControl.ts';
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
    spawnDue(state, wave, s.waveTicks, runWaveModifiers(ctx.config).enemies);
    if (s.waveTicks >= wave.lastSpawnTicks) finishSpawning(state, ctx);
    else s.waveTicks++;
  } else if (s.phase === 'held' && !bossFightOn(state)) {
    beginCountdown(state, ctx, ctx.map.waves[state.wave]!); // held ⇒ a next wave exists
  }
}

/**
 * Whether a boss fight is on: a live boss that hasn't started leaving (its BossEnded). A boss that
 * leaked or left is off the map, so that ends its fight too.
 */
function bossFightOn(state: SimState): boolean {
  const pool = state.enemies;
  for (let i = 0; i < pool.used; i++) {
    const e = pool.items[i]!; // i < used ≤ items.length
    if (e.alive && !e.leaving && e.def !== null && e.def.boss !== null) return true;
  }
  return false;
}

/**
 * The callWave command: starts wave 1 from the setup phase (free), or the next wave during a
 * countdown, paying the early-call bonus and cutting ability cooldowns. Its first spawns land in
 * this tick's waves system (or the next tick's, when applied while paused). A Quiet Wave is never
 * called early (`quietWave`), and a wave waiting for the boss can't be called (`waveInProgress`).
 */
export function callWave(state: SimState, ctx: TickContext): RejectReason | null {
  const s = state.schedule;
  if (s.phase !== 'setup' && nextWaveIsQuiet(state, ctx.map)) return 'quietWave';
  switch (s.phase) {
    case 'setup':
      startWave(state, false, 0);
      return null;
    case 'held':
      return 'waveInProgress';
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

/**
 * Spawning is done: the next wave's countdown begins, or it waits for the boss fight to end
 * (`countdownAfter: 'bossEnded'`; `held`), or the schedule is done.
 */
function finishSpawning(state: SimState, ctx: TickContext): void {
  const s = state.schedule;
  const next = ctx.map.waves[state.wave]; // the wave after the current one, if any
  if (next === undefined) {
    s.phase = 'done';
    return;
  }
  if (next.countdownAfter === 'bossEnded' && bossFightOn(state)) {
    s.phase = 'held';
    return;
  }
  beginCountdown(state, ctx, next);
}

/** The countdown before wave `next` begins (CountdownStarted; the `countdown` trigger). */
function beginCountdown(state: SimState, ctx: TickContext, next: CompiledWave<IdSpace>): void {
  const s = state.schedule;
  const ticks = countdownTicksFor(next.countdownTicks, runWaveModifiers(ctx.config).countdownPct);
  s.phase = 'countdown';
  s.countdownTicks = ticks;
  s.countdownTotalTicks = ticks;
  s.countdownWave = next.number;
  emit(state, { type: 'CountdownStarted', wave: next.number, ticks });
  // A retry checkpoint as the countdown to every 5th wave begins (core-loop.md § 2.12): the run
  // resumes from the state after this tick, in the build phase before that wave, so a retry can
  // rebuild before it walks in. The host records it (architecture.md § Checkpoints).
  if (checkpointAt(ctx.map, next.number)) {
    emit(state, { type: 'CheckpointReached', wave: next.number, tick: state.tick + 1 });
  }
}

/**
 * Whether the countdown to `wave` records a retry checkpoint (core-loop.md § 2.12): every
 * CHECKPOINT_EVERY_WAVES-th wave on a campaign act's map from CHECKPOINTS_FROM_ACT on, never on a
 * Holdout (it has no defeat to retry). The finale isn't counted in waves: its one checkpoint is a
 * script action at Phase 2 (still refused, `SCRIPT_GATES`).
 */
export function checkpointAt(
  map: { readonly act: Act; readonly objective: ObjectiveKind },
  wave: number,
): boolean {
  return (
    typeof map.act === 'number' &&
    map.act >= CHECKPOINTS_FROM_ACT &&
    map.objective !== 'holdout' &&
    wave > 1 &&
    wave % CHECKPOINT_EVERY_WAVES === 0
  );
}

/**
 * A countdown after the run's `countdown` modifiers (Story +50%, veteran Rush Hour −50%):
 * `round(ticks × (1 + Σ pct))`, at least 1 tick.
 */
export function countdownTicksFor(ticks: number, pct: number): number {
  if (pct === 0) return ticks;
  const out = Math.round(ticks * (1 + pct));
  return out > 1 ? out : 1;
}

/** A run's wave modifiers, summed once per config (`runWaveModifiers`). */
export interface WaveModifiers {
  /** Σ pct of the `countdown` modifiers. */
  readonly countdownPct: number;
  /** Σ pct of the `enemyStat` modifiers, per stat. */
  readonly enemyPct: Readonly<Record<EnemyStat, number>>;
  /** The scaled def each enemy spawns with, by id; empty when no `enemyStat` modifier applies. */
  readonly enemies: ReadonlyMap<string, CompiledEnemyDef>;
}

/** Per config (it's immutable for a run), so the sums and scaled defs are built once. */
const WAVE_MODIFIERS = new WeakMap<SimConfig<IdSpace>, WaveModifiers>();

/**
 * The run's wave modifiers. Throws a RangeError for an `enemyStat` total of −100% or less (a
 * unit with no HP or speed is a malformed config, not a difficulty).
 */
export function runWaveModifiers(cfg: SimConfig<IdSpace>): WaveModifiers {
  let out = WAVE_MODIFIERS.get(cfg);
  if (out === undefined) {
    out = waveModifiers(cfg.modifiers, Object.values(cfg.content.enemies));
    WAVE_MODIFIERS.set(cfg, out);
  }
  return out;
}

/** Sums the wave modifiers and scales every enemy def (`runWaveModifiers`, uncached). */
export function waveModifiers(
  modifiers: readonly Modifier<IdSpace>[],
  defs: readonly CompiledEnemyDef[],
): WaveModifiers {
  let countdownPct = 0;
  const enemyPct: Record<EnemyStat, number> = { hp: 0, shield: 0, speed: 0 };
  for (const m of modifiers) {
    if (m.kind === 'countdown') countdownPct += m.pct;
    else if (m.kind === 'enemyStat') enemyPct[m.stat] += m.pct;
  }
  for (const stat of ['hp', 'shield', 'speed'] as const) {
    if (enemyPct[stat] <= -1) {
      throw new RangeError(
        `enemyStat '${stat}' modifiers total ${enemyPct[stat]}; they must stay above -1`,
      );
    }
  }
  if (countdownPct <= -1) {
    throw new RangeError(`countdown modifiers total ${countdownPct}; they must stay above -1`);
  }
  const enemies = new Map<string, CompiledEnemyDef>();
  if (enemyPct.hp !== 0 || enemyPct.shield !== 0 || enemyPct.speed !== 0) {
    for (const def of defs) enemies.set(def.id, scaledEnemy(def, enemyPct));
  }
  return { countdownPct, enemyPct, enemies };
}

/**
 * An enemy def with its HP, shield (capacity and regeneration, so it refills in the same time, and
 * any shield pulse's amount, its own or a boss phase's, so a pulse restores the same share; T403),
 * and speed scaled by `1 + pct` (design/progression.md § 9 Story, § 6 Hardened Hides and Double
 * Time). HP stays fractional, as the damage pipeline's is.
 */
export function scaledEnemy(
  def: CompiledEnemyDef,
  pct: Readonly<Record<EnemyStat, number>>,
): CompiledEnemyDef {
  const shieldMul = 1 + pct.shield;
  const boss = def.boss;
  return Object.freeze({
    ...def,
    hp: def.hp * (1 + pct.hp),
    shield:
      def.shield === null
        ? null
        : Object.freeze({
            ...def.shield,
            hp: def.shield.hp * shieldMul,
            regenPerTick: def.shield.regenPerTick * shieldMul,
          }),
    pulse: scaledPulse(def.pulse, shieldMul),
    boss:
      boss === null || shieldMul === 1 || !boss.phases.some((p) => p.pulse !== null)
        ? boss
        : Object.freeze({
            ...boss,
            phases: Object.freeze(
              boss.phases.map((p) =>
                p.pulse === null
                  ? p
                  : Object.freeze({ ...p, pulse: scaledPulse(p.pulse, shieldMul) }),
              ),
            ),
          }),
    speedTilesPerTick: def.speedTilesPerTick * (1 + pct.speed),
  });
}

function scaledPulse(p: CompiledPulse | null, shieldMul: number): CompiledPulse | null {
  return p === null || shieldMul === 1 ? p : Object.freeze({ ...p, shield: p.shield * shieldMul });
}

/**
 * Spawns every unit due at `t` ticks into the wave: group g's i-th unit (0-based) spawns at
 * `delay + i × interval`. Groups spawn in parallel, in their authored order within a tick.
 */
function spawnDue(
  state: SimState,
  wave: CompiledWave<IdSpace>,
  t: number,
  scaled: ReadonlyMap<string, CompiledEnemyDef>,
): void {
  const groups = wave.groups;
  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi]!; // gi < length
    const k = t - g.delayTicks;
    if (k < 0) continue;
    if (g.intervalTicks > 0) {
      if (k % g.intervalTicks !== 0 || k / g.intervalTicks >= g.count) continue;
      spawn(state, wave.number, g, scaled);
    } else if (k === 0) {
      for (let i = 0; i < g.count; i++) spawn(state, wave.number, g, scaled);
    }
  }
}

function spawn(
  state: SimState,
  wave: number,
  g: CompiledWave<IdSpace>['groups'][number],
  scaled: ReadonlyMap<string, CompiledEnemyDef>,
): void {
  const def = scaled.size === 0 ? g.enemy : (scaled.get(g.enemy.id) ?? g.enemy);
  const e = poolAlloc(state.enemies, ENEMY_BLANK, takeUid(state));
  e.def = def;
  e.wave = wave;
  e.tags = g.tags;
  countTags(state.stats.tagSpawned, g.tags);
  e.hp = def.hp;
  e.shieldHp = def.shield === null ? 0 : def.shield.hp;
  e.spawnTick = state.tick;
  placeOnRoute(e, g.route, 0);
  emit(state, { type: 'EnemySpawned', uid: e.uid, enemy: def.id, route: g.route.id, wave });
}
