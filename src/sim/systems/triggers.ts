// System 3: triggers. Evaluates map-script triggers and runs their actions (story-runtime.md
// § Map scripts), in the map's event order. What runs: wave-phase triggers (`countdown`, `start`,
// `cleared`, and `afterTicks` into a wave), `tick`, the boss triggers (`bossHpPct`: a live boss,
// of that id if named, at or below that share of its HP; `bossPhase`: a live boss in that phase
// or a later one), and `wreckageCleared` (the drone cleared the wreckage under that marker; T400a:
// A2M1's crew logs), and `interacted` (T409: a clickable world object was interacted with, by
// click or by fallback; sim/clickables.ts), `refugeesRemaining` (T305c: at most that many
// refugees not yet safe or lost; sim/escort.ts), and `forcedInputResolved` (T605: that forced
// input was pressed; sim/forcedInput.ts), guarded by an optional `when` condition
// (sim/conditions.ts), with the actions `unlockTowerClass` (what `towerUnlockWave` compiles to),
// `cue`, `grantCredits`, `bossEnd` (`driveOff`, `retreat`, or `pivot`: every live boss starts that
// ending now, whatever its HP; enemyAbilities/bossPhases.ts, pivot.ts), `standDown` (T506: every
// live hostile unit of a faction stands down; enemyAbilities/pivot.ts), `setClickable` (T409), and
// the Escort's `setObjective` and `spawnAllies` (T305c; sim/escort.ts), and the Holdout's
// `forceInput` (T605: the SEAL; sim/forcedInput.ts) and `endMap` (T605: the map ends as won, on
// the tick it runs; sim/objectives.ts `endMap`, from an event only), and A3M2's Clean Exit (T606;
// sim/revoke.ts): `revokeTowerClass` and `revokeAbility` (from an event only: they read the run's
// loadout and slots) and `setModifier` (QUILL's lockout, the hidden preview). A pivot's event runs the
// objective switch and the refugees beside it, in its action order. Before the events,
// each clickable marker's fallback trigger is checked: reached, the sim interacts with it itself
// (`byFallback`), so its `interacted` events fire on this same pass. createSim refuses a map that
// uses anything else
// (unsupportedScript below, which names the task that lifts each part: SCRIPT_GATES), so a run never
// silently skips part of its script.
//
// Every supported trigger is monotonic (once reached it stays reached), so each event fires at
// most once whatever its `once` says: an event fires on the first tick its trigger is reached. A
// boss's HP only falls and its phase only rises, and a boss leaving the map is still live until
// it's gone (at least a tick after its ending starts), so no boss threshold is ever skipped.
// A wave's `cleared` is reached in cleanup, so it fires on the next tick's triggers. `when` is
// judged once, on that tick: if it doesn't hold then, the event is spent without running.
import type {
  CompiledMapDef,
  CompiledScriptAction,
  CompiledScriptTrigger,
} from '../../content/compiled.ts';
import type { IdSpace } from '../../content/types.ts';
import { interact, setClickable } from '../clickables.ts';
import { evaluateCondition, wreckageClearedAt } from '../conditions.ts';
import { earn } from '../economy.ts';
import { refugeesRemaining, setObjective, spawnRefugees } from '../escort.ts';
import { forcedInputResolved, requestForcedInput } from '../forcedInput.ts';
import { endMap } from '../objectives.ts';
import { startBossEnding } from '../enemyAbilities/bossPhases.ts';
import { standDown } from '../enemyAbilities/pivot.ts';
import { revokeAbility, revokeTowerClass, setScriptModifier } from '../revoke.ts';
import { emit, type SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';

export function triggers(state: SimState, ctx: TickContext): void {
  clickFallbacks(state, ctx);
  const events = ctx.map.events;
  const fired = state.scriptFired;
  for (let i = 0; i < events.length; i++) {
    if (fired[i] === true) continue;
    const ev = events[i]!; // i < length
    if (!reached(state, ctx, ev.on)) continue;
    fired[i] = true;
    if (ev.when !== null && !evaluateCondition(ev.when, state, ctx)) continue;
    for (let a = 0; a < ev.actions.length; a++) {
      const action = ev.actions[a]!; // a < length
      // The Holdout's end (T605) settles the medals, and a revocation (T606) reads the run's
      // loadout and slots, so they need the whole context.
      if ('endMap' in action) endMap(state, ctx);
      else if ('revokeTowerClass' in action) revokeTowerClass(state, ctx, action);
      else if ('revokeAbility' in action) revokeAbility(state, ctx.config, action.revokeAbility);
      else runScriptAction(state, action, ctx.map);
    }
    if (state.outcome !== 'playing') return; // endMap: nothing after it runs
  }
}

/**
 * Each clickable marker whose fallback trigger is reached is interacted with (`byFallback`), in
 * the order the markers turned clickable. A fallback set by an action this pass is checked from
 * the next tick.
 */
function clickFallbacks(state: SimState, ctx: TickContext): void {
  const fallbacks = state.clickFallback;
  for (let i = 0; i < fallbacks.length; i++) {
    const on = fallbacks[i]!; // i < length
    if (on === null || !reached(state, ctx, on)) continue;
    interact(state, state.clickable[i]!, true); // index-aligned with clickFallback
    i--; // interact removed entry i
  }
}

function reached(state: SimState, ctx: TickContext, on: CompiledScriptTrigger<IdSpace>): boolean {
  if ('tick' in on) return state.tick >= on.tick;
  if ('wave' in on) {
    const s = state.schedule;
    const w = on.wave;
    const phase = on.phase;
    if (phase === 'countdown') return s.countdownWave >= w;
    if (phase === 'start') return state.wave >= w;
    if (phase === 'cleared') return s.resolved[w - 1] === true;
    const start = s.startTick[w - 1] ?? -1;
    return start >= 0 && state.tick - start >= phase.afterTicks;
  }
  if ('bossHpPct' in on) return bossReached(state, on.boss ?? null, on.bossHpPct, 0);
  if ('bossPhase' in on) return bossReached(state, null, 2, on.bossPhase);
  if ('wreckageCleared' in on) return wreckageClearedAt(state, ctx.map, on.wreckageCleared);
  if ('interacted' in on) return state.interacted.includes(on.interacted);
  if ('refugeesRemaining' in on) {
    return ctx.map.escort !== null && refugeesRemaining(state, ctx.map) <= on.refugeesRemaining;
  }
  if ('forcedInputResolved' in on) return forcedInputResolved(state, on.forcedInputResolved);
  return false; // refused by createSim (unsupportedScript)
}

/** Whether a live boss (of id `boss`, if not null) is at or below `hpPct` and in phase ≥ `phase`. */
function bossReached(state: SimState, boss: string | null, hpPct: number, phase: number): boolean {
  const pool = state.enemies;
  for (let i = 0; i < pool.used; i++) {
    const e = pool.items[i]!; // i < used ≤ items.length
    const def = e.def;
    if (!e.alive || def === null || def.boss === null) continue;
    if (boss !== null && def.id !== boss) continue;
    if (e.bossPhase >= phase && e.hp <= hpPct * def.hp + 1e-9) return true;
  }
  return false;
}

/** Runs one script action (an event's, or a completed objective's `onComplete`; sim/objectives.ts). */
export function runScriptAction(
  state: SimState,
  action: CompiledScriptAction<IdSpace>,
  map: Pick<CompiledMapDef<IdSpace>, 'escort'>,
): void {
  if ('unlockTowerClass' in action) {
    const idx = state.lockedTowers.indexOf(action.unlockTowerClass);
    if (idx < 0) return;
    state.lockedTowers.splice(idx, 1);
    emit(state, { type: 'TowerClassUnlocked', tower: action.unlockTowerClass });
  } else if ('cue' in action) {
    emit(state, { type: 'ScriptCue', cueId: action.cue });
  } else if ('grantCredits' in action) {
    earn(state, action.grantCredits);
  } else if ('bossEnd' in action) {
    const how = action.bossEnd;
    const pool = state.enemies;
    for (let i = 0; i < pool.used; i++) {
      const e = pool.items[i]!; // i < used ≤ items.length
      if (e.alive && e.def !== null && e.def.boss !== null) startBossEnding(state, e, how);
    }
  } else if ('standDown' in action) {
    standDown(state, action.standDown);
  } else if ('setClickable' in action) {
    const { marker, on, fallback } = action.setClickable;
    setClickable(state, marker, on, fallback);
  } else if ('setObjective' in action) {
    setObjective(state, action.setObjective, action.meterLabel);
  } else if ('spawnAllies' in action) {
    spawnRefugees(state, map, action.spawnAllies);
  } else if ('forceInput' in action) {
    requestForcedInput(state, action.forceInput.id);
  } else if ('setModifier' in action) {
    setScriptModifier(state, action.setModifier, action.on);
  }
  // `endMap`, `revokeTowerClass`, and `revokeAbility` run in triggers() (they need the tick's
  // context); anything else is refused by createSim (unsupportedScript).
}

/**
 * The task that runs each map-script trigger and action the sim doesn't run yet (keyed by the
 * part's key; every `bossEnd` runs since T506's pivot). Like FEATURE_GATES, each task deletes its
 * own rows when it lands, and a part not listed here waits for a later milestone.
 */
export const SCRIPT_GATES: Readonly<Record<string, string>> = Object.freeze({
  // Triggers (D141). `objectiveCompleted` waits for A3M5 (M7); the finale's rest (M8).
  objectiveCompleted: 'M7',
  restProgressPct: 'M8',
  // Actions (D141). M6's Clean Exit (revocations, QUILL's lockout) runs since T606.
  // M7: A3M5's opened tile (Shareholder Value's jettison) and a scripted wave.
  openTile: 'M7',
  spawnWave: 'M7',
  // M8, the finale: a lighting change at a script moment (Dawn; wave-paced light is map data,
  // `MapDef.lighting`, T410a, Sundown's darkness included, T505), the Phase 2 checkpoint (T305b
  // runs the wave checkpoints, not this action), the restored class after "Who's there?", and the
  // song's timers and phases.
  setLighting: 'M8',
  checkpoint: 'M8',
  restoreTowerClass: 'M8',
  startTimer: 'M8',
  setTimerRate: 'M8',
  setPhase: 'M8',
});

/** "not simulated yet", with the task that lifts it when SCRIPT_GATES names one. */
function notYet(key: string): string {
  const owner = SCRIPT_GATES[key];
  return owner === undefined ? 'is not simulated yet' : `is not simulated until ${owner}`;
}

/**
 * The map-script parts the sim can't run yet. createSim refuses a map whose events use any other
 * trigger or action, listing each one with the task that lifts it (SCRIPT_GATES), until it lands.
 * Every condition atom (`when`, the Challenge medal, objectives) is simulated; an objective's
 * `onComplete` actions are held to the same list as an event's (sim/objectives.ts runs them).
 */
export function unsupportedScript(map: CompiledMapDef<IdSpace>): string[] {
  const out: string[] = [];
  for (const ev of map.events) {
    unsupportedTrigger(ev.on, `event '${ev.id}': trigger`, out);
    for (const a of ev.actions) unsupportedAction(a, `event '${ev.id}'`, out);
  }
  for (const o of map.objectives) {
    for (const a of o.onComplete) {
      // The Holdout's end (T605) and the revocations (T606) run from a map event, never from an
      // objective.
      const eventOnly = FROM_EVENTS_ONLY.find((k) => k in a);
      if (eventOnly !== undefined) {
        out.push(`objective '${o.id}': action ${eventOnly} runs from map events only`);
      } else unsupportedAction(a, `objective '${o.id}'`, out);
    }
  }
  return out;
}

/** Actions an objective's `onComplete` can't run: they need the tick's context (triggers()). */
const FROM_EVENTS_ONLY = ['endMap', 'revokeTowerClass', 'revokeAbility'] as const;

function unsupportedTrigger(
  on: CompiledScriptTrigger<IdSpace>,
  where: string,
  out: string[],
): void {
  if (
    !('tick' in on) &&
    !('wave' in on) &&
    !('bossHpPct' in on) &&
    !('bossPhase' in on) &&
    !('wreckageCleared' in on) &&
    !('interacted' in on) &&
    !('refugeesRemaining' in on) &&
    !('forcedInputResolved' in on)
  ) {
    const key = Object.keys(on).join('/');
    out.push(`${where} ${key} ${notYet(key)}`);
  }
}

function unsupportedAction(a: CompiledScriptAction<IdSpace>, where: string, out: string[]): void {
  if ('setClickable' in a) {
    // Its fallback is a trigger like an event's (T409).
    const fallback = a.setClickable.fallback;
    if (fallback !== null) unsupportedTrigger(fallback, `${where}: setClickable fallback`, out);
  } else if (
    !('unlockTowerClass' in a) &&
    !('cue' in a) &&
    !('grantCredits' in a) &&
    !('bossEnd' in a) &&
    !('standDown' in a) &&
    !('setObjective' in a) &&
    !('spawnAllies' in a) &&
    !('forceInput' in a) &&
    !('endMap' in a) &&
    !('revokeTowerClass' in a) &&
    !('revokeAbility' in a) &&
    !('setModifier' in a)
  ) {
    // An action is named by its first key (`revokeTowerClass`, not its `refundPct` beside it).
    const key = Object.keys(a)[0] ?? '?';
    out.push(`${where}: action ${key} ${notYet(key)}`);
  }
}
