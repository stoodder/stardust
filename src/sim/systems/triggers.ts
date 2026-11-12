// System 3: triggers. Evaluates map-script triggers and runs their actions (story-runtime.md
// § Map scripts), in the map's event order. What runs: wave-phase triggers (`countdown`, `start`,
// `cleared`, and `afterTicks` into a wave), `tick`, the boss triggers (`bossHpPct`: a live boss,
// of that id if named, at or below that share of its HP; `bossPhase`: a live boss in that phase
// or a later one), and `wreckageCleared` (the drone cleared the wreckage under that marker; T400a:
// A2M1's crew logs), and `interacted` (T409: a clickable world object was interacted with, by
// click or by fallback; sim/clickables.ts), `refugeesRemaining` (T305c: at most that many
// refugees not yet safe or lost; sim/escort.ts), `forcedInputResolved` (T605: that forced
// input was pressed; sim/forcedInput.ts), and `objectiveCompleted` (T706: that optional objective
// settled `done`; cleanup settles it, so it fires on the next tick's triggers, like a wave's
// `cleared`), guarded by an optional `when` condition
// (sim/conditions.ts), with the actions `unlockTowerClass` (what `towerUnlockWave` compiles to),
// `cue`, `grantCredits`, `bossEnd` (`driveOff`, `retreat`, or `pivot`: every live boss starts that
// ending now, whatever its HP; enemyAbilities/bossPhases.ts, pivot.ts), `standDown` (T506: every
// live hostile unit of a faction stands down; enemyAbilities/pivot.ts), `setClickable` (T409), and
// the Escort's `setObjective` and `spawnAllies` (T305c; sim/escort.ts), and the Holdout's
// `forceInput` (T605: the SEAL; sim/forcedInput.ts) and `endMap` (T605: the map ends as won, on
// the tick it runs; sim/objectives.ts `endMap`, from an event only), and A3M2's Clean Exit (T606;
// sim/revoke.ts): `revokeTowerClass` and `revokeAbility` (from an event only: they read the run's
// loadout and slots) and `setModifier` (QUILL's lockout, the hidden preview), and `spawnWave`
// (T706: a script group walks in; sim/scriptGroups.ts, whose units spawn at the end of this
// system, after the events), and `openTile` (T707: a decor marker's tile opens, to anything but a
// buildable tile; sim/openTile.ts). The finale's parts (T800a) dispatch to their slots
// (sim/choir.ts, song.ts, phases.ts, timers.ts, echo.ts, revoke.ts) and stay refused until the
// task SCRIPT_GATES names fills each; T806's run: the triggers `choirAt` (the choir's leader has
// passed a marker; with `afterWave`, once that wave has cleared too: T820), `timerFull`, and `{ phase, afterSec }` (the script phase reached, that long
// after it began), and the actions `setPhase`, `checkpoint`, `setLighting`, `startTimer`, and
// `setTimerRate` (sim/phases.ts, sim/timers.ts); T807's: `restoreTowerClass` (from an event only)
// and `lockAbility` (a phase lock; `setPhase` ends it as the phase rises) in sim/revoke.ts, and
// `spawnEcho` (from an event only; sim/echo.ts). A pivot's event runs the
// objective switch and the refugees beside it, in its action order. Before the events,
// each clickable marker's fallback trigger is checked: reached, the sim interacts with it itself
// (`byFallback`), so its `interacted` events fire on this same pass; and on a map whose conditions
// use `cleared` (T706), each wave that started since the last pass records how many wreckage tiles
// the drone had cleared by then (`state.wreckageAtWave`; sim/conditions.ts). createSim refuses a map that
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
import { evaluateCondition, usesCleared, wreckageClearedAt } from '../conditions.ts';
import { earn } from '../economy.ts';
import { refugeesRemaining, setObjective, spawnRefugees } from '../escort.ts';
import { forcedInputResolved, requestForcedInput } from '../forcedInput.ts';
import { endMap } from '../objectives.ts';
import { startBossEnding } from '../enemyAbilities/bossPhases.ts';
import { standDown } from '../enemyAbilities/pivot.ts';
import { revokeAbility, revokeTowerClass, setScriptModifier } from '../revoke.ts';
import { scriptGroupSpawns, spawnScriptGroup } from '../scriptGroups.ts';
import { isBuildableTile } from '../grid.ts';
import { openTile } from '../openTile.ts'; // T707
// The finale's slots (T800a; each filled by the task named in SCRIPT_GATES).
import { choirAt } from '../choir.ts';
import { spawnEcho } from '../echo.ts';
import { phaseReached, scriptCheckpoint, setLighting, setPhase } from '../phases.ts';
import { endPhaseLocks, lockAbility, restoreTowerClass } from '../revoke.ts';
import { restAll, restProgress } from '../song.ts';
import { setTimerRate, startTimer, timerFull } from '../timers.ts';
import { emit, type SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';

export function triggers(state: SimState, ctx: TickContext): void {
  if (mapUsesCleared(ctx.map)) recordWreckageAtWave(state);
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
      // The finale's context actions (T800a slots): the restore (T807), the echo (T807), Dawn's
      // laying to rest (T805).
      else if ('restoreTowerClass' in action) restoreTowerClass(state, ctx);
      else if ('spawnEcho' in action) spawnEcho(state, ctx, action.spawnEcho);
      else if ('restAll' in action) restAll(state, ctx);
      else runScriptAction(state, action, ctx.map);
    }
    if (state.outcome !== 'playing') return; // endMap: nothing after it runs
  }
  scriptGroupSpawns(state, ctx);
}

/** Maps whose conditions use `cleared` (compiled maps are frozen, so once per map). */
const USES_CLEARED = new WeakMap<object, boolean>();

function mapUsesCleared(map: CompiledMapDef<IdSpace>): boolean {
  let v = USES_CLEARED.get(map);
  if (v === undefined) {
    v =
      map.events.some((e) => e.when !== null && usesCleared(e.when)) ||
      map.objectives.some((o) => usesCleared(o.condition)) ||
      (map.medals !== null && usesCleared(map.medals.challenge.condition)) ||
      map.lockedAbilities.some((l) => usesCleared(l.when));
    USES_CLEARED.set(map, v);
  }
  return v;
}

/**
 * Each wave started since the last pass records the drone's count of cleared tiles (the
 * `cleared` atom's "before wave N"). The wreckage system runs before the waves, so a tile cleared
 * on a wave's starting tick counts as before it.
 */
function recordWreckageAtWave(state: SimState): void {
  const at = state.wreckageAtWave;
  while (at.length < state.wave) at.push(state.wreckage.cleared.length);
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
  if ('objectiveCompleted' in on) return objectiveDoneNow(state, ctx.map, on.objectiveCompleted);
  // The finale (T800a slots; refused until their tasks: SCRIPT_GATES).
  if ('restProgressPct' in on) return restProgress(state) >= on.restProgressPct;
  if ('choirAt' in on) {
    // With `afterWave`, the later of the choir at the marker and that wave cleared (T820).
    const w = on.afterWave;
    if (w !== undefined && state.schedule.resolved[w - 1] !== true) return false;
    return choirAt(state, ctx.map, on.choirAt);
  }
  if ('timerFull' in on) return timerFull(state, ctx.map, on.timerFull);
  if ('phase' in on) return phaseReached(state, on.phase, on.afterTicks);
  if ('echoArrived' in on) return state.echoesArrived.includes(on.echoArrived); // T821
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

/** Whether the map's objective `id` has settled `done` (the `objectiveCompleted` trigger). */
function objectiveDoneNow(state: SimState, map: CompiledMapDef<IdSpace>, id: string): boolean {
  const i = map.objectives.findIndex((o) => o.id === id);
  return i >= 0 && state.objectives[i] === 'done';
}

/**
 * Runs one script action (an event's, or a completed objective's `onComplete`; sim/objectives.ts).
 * `firstTick` is when a `spawnWave` group's clock starts: this tick from an event, the next from
 * an `onComplete` (cleanup runs after this tick's spawns; sim/scriptGroups.ts).
 */
export function runScriptAction(
  state: SimState,
  action: CompiledScriptAction<IdSpace>,
  map: Pick<CompiledMapDef<IdSpace>, 'escort' | 'scriptGroups' | 'waves' | 'timers'>,
  firstTick: number = state.tick,
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
  } else if ('spawnWave' in action) {
    spawnScriptGroup(state, map, action.spawnWave, firstTick);
  } else if ('openTile' in action) {
    openTile(state, action.openTile, action.to); // T707 (sim/openTile.ts)
  } else if ('setPhase' in action) {
    const was = state.phase;
    setPhase(state, action.setPhase); // T806 (sim/phases.ts)
    if (state.phase !== was) endPhaseLocks(state); // T807: a phase lock ends with its phase
  } else if ('checkpoint' in action) {
    scriptCheckpoint(state, action.checkpoint); // T806
  } else if ('setLighting' in action) {
    setLighting(state, action.setLighting); // T806
  } else if ('startTimer' in action) {
    startTimer(state, map, action.startTimer); // T806 (sim/timers.ts)
  } else if ('setTimerRate' in action) {
    setTimerRate(state, map, action.setTimerRate.timer, action.setTimerRate.pct); // T806
  } else if ('lockAbility' in action) {
    lockAbility(state, action.lockAbility, action.on); // T807 (sim/revoke.ts)
  }
  // `endMap`, `revokeTowerClass`, `revokeAbility`, `restoreTowerClass`, `spawnEcho`, and
  // `restAll` run in triggers() (they need the tick's context); anything else is refused by
  // createSim (unsupportedScript).
}

/**
 * The task that runs each map-script trigger and action the sim doesn't run yet (keyed by the
 * part's key; every `bossEnd` runs since T506's pivot). Like FEATURE_GATES, each task deletes its
 * own rows when it lands, and a part not listed here waits for a later milestone.
 */
export const SCRIPT_GATES: Readonly<Record<string, string>> = Object.freeze({
  // Triggers (D141, D146, D154). A3M5's `objectiveCompleted` runs since T706; the finale's choir
  // at a marker (`choirAt`, sim/choir.ts), a full timer (`timerFull`), and a script phase
  // (`phase`) since T806, the song's rest progress (`restProgressPct`, sim/song.ts) since T805, and
  // Thrum's echo at the song (`echoArrived`, sim/echo.ts) since T821.
  // Actions (D141, D146, D154). M6's Clean Exit (revocations, QUILL's lockout) runs since T606,
  // M7's script groups (`spawnWave`) since T706, opened tiles (`openTile`) since T707. The
  // finale's phases, timers, a lighting set at a script moment (Dawn; wave-paced light is map
  // data, `MapDef.lighting`), and the Phase 2 checkpoint run since T806 (sim/phases.ts,
  // sim/timers.ts), and the restored class after "Who's there?", the phase-scoped ability lock,
  // and Thrum's echo since T807 (sim/revoke.ts, sim/echo.ts). Dawn's laying every Hollow unit to
  // rest (`restAll`) runs since T805.
});

/** "not simulated yet", with the task that lifts it when SCRIPT_GATES names one. */
function notYet(key: string): string {
  const owner = SCRIPT_GATES[key];
  return owner === undefined ? 'is not simulated yet' : `is not simulated until ${owner}`;
}

/**
 * The map-script parts the sim can't run yet. createSim refuses a map whose events use any other
 * trigger or action, listing each one with the task that lifts it (SCRIPT_GATES), until it lands.
 * Every condition atom (`when`, the Challenge medal, objectives, ability locks) is simulated (M7's
 * `cleared` since T706); an objective's `onComplete` actions are held to the same list as an
 * event's (sim/objectives.ts runs them).
 */
export function unsupportedScript(map: CompiledMapDef<IdSpace>): string[] {
  const out: string[] = [];
  for (const ev of map.events) {
    unsupportedTrigger(ev.on, `event '${ev.id}': trigger`, out);
    for (const a of ev.actions) unsupportedAction(a, `event '${ev.id}'`, out);
  }
  for (const o of map.objectives) {
    for (const a of o.onComplete) {
      // The Holdout's end (T605), the revocations (T606), and the finale's restore, echo, and
      // Dawn (T800a) run from a map event, never from an objective.
      const eventOnly = FROM_EVENTS_ONLY.find((k) => k in a);
      if (eventOnly !== undefined) {
        out.push(`objective '${o.id}': action ${eventOnly} runs from map events only`);
      } else unsupportedAction(a, `objective '${o.id}'`, out);
    }
  }
  return out;
}

/** Actions an objective's `onComplete` can't run: they need the tick's context (triggers()). */
const FROM_EVENTS_ONLY = [
  'endMap',
  'revokeTowerClass',
  'revokeAbility',
  // The finale's (T800a slots).
  'restoreTowerClass',
  'spawnEcho',
  'restAll',
] as const;

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
    !('forcedInputResolved' in on) &&
    !('objectiveCompleted' in on) &&
    !('choirAt' in on) && // T806
    !('timerFull' in on) && // T806
    !('phase' in on) && // T806
    !('restProgressPct' in on) && // T805 (sim/song.ts)
    !('echoArrived' in on) // T821 (sim/echo.ts)
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
  } else if ('openTile' in a) {
    // T707 opens a tile nothing builds on (sim/openTile.ts); a buildable one waits for M8.
    if (isBuildableTile(a.to)) {
      out.push(`${where}: action openTile to buildable '${a.to}' is not simulated`);
    }
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
    !('setModifier' in a) &&
    !('spawnWave' in a) &&
    !('setPhase' in a) && // T806 (sim/phases.ts)
    !('checkpoint' in a) &&
    !('setLighting' in a) &&
    !('startTimer' in a) && // T806 (sim/timers.ts)
    !('setTimerRate' in a) &&
    !('restAll' in a) && // T805 (sim/song.ts; map events only, FROM_EVENTS_ONLY)
    !('restoreTowerClass' in a) && // T807 (sim/revoke.ts; map events only)
    !('lockAbility' in a) &&
    !('spawnEcho' in a) // T807 (sim/echo.ts; map events only)
  ) {
    // An action is named by its first key (`revokeTowerClass`, not its `refundPct` beside it).
    const key = Object.keys(a)[0] ?? '?';
    out.push(`${where}: action ${key} ${notYet(key)}`);
  }
}
