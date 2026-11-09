// System 3: triggers. Evaluates map-script triggers and runs their actions (story-runtime.md
// § Map scripts), in the map's event order. What runs: wave-phase triggers (`countdown`, `start`,
// `cleared`, and `afterTicks` into a wave) and `tick`, guarded by an optional `when` condition
// (sim/conditions.ts), with the actions `unlockTowerClass` (what `towerUnlockWave` compiles to),
// `cue`, and `grantCredits`. createSim refuses a map that uses anything else (unsupportedScript
// below), so a run never silently skips part of its script.
//
// Every supported trigger is monotonic (once reached it stays reached), so each event fires at
// most once whatever its `once` says: an event fires on the first tick its trigger is reached.
// A wave's `cleared` is reached in cleanup, so it fires on the next tick's triggers. `when` is
// judged once, on that tick: if it doesn't hold then, the event is spent without running.
import type {
  CompiledMapDef,
  CompiledScriptAction,
  CompiledScriptTrigger,
} from '../../content/compiled.ts';
import type { IdSpace } from '../../content/types.ts';
import { evaluateCondition } from '../conditions.ts';
import { earn } from '../economy.ts';
import { emit, type SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';

export function triggers(state: SimState, ctx: TickContext): void {
  const events = ctx.map.events;
  const fired = state.scriptFired;
  for (let i = 0; i < events.length; i++) {
    if (fired[i] === true) continue;
    const ev = events[i]!; // i < length
    if (!reached(state, ev.on)) continue;
    fired[i] = true;
    if (ev.when !== null && !evaluateCondition(ev.when, state, ctx)) continue;
    for (let a = 0; a < ev.actions.length; a++) run(state, ev.actions[a]!); // a < length
  }
}

function reached(state: SimState, on: CompiledScriptTrigger<IdSpace>): boolean {
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
  return false; // refused by createSim (unsupportedScript)
}

function run(state: SimState, action: CompiledScriptAction<IdSpace>): void {
  if ('unlockTowerClass' in action) {
    const idx = state.lockedTowers.indexOf(action.unlockTowerClass);
    if (idx < 0) return;
    state.lockedTowers.splice(idx, 1);
    emit(state, { type: 'TowerClassUnlocked', tower: action.unlockTowerClass });
  } else if ('cue' in action) {
    emit(state, { type: 'ScriptCue', cueId: action.cue });
  } else if ('grantCredits' in action) {
    earn(state, action.grantCredits);
  }
  // Anything else is refused by createSim (unsupportedScript).
}

/**
 * The map-script parts the sim can't run yet. createSim refuses a map whose events use any other
 * trigger or action, or that has optional objectives (Objective Intel, M3), listing each one,
 * until its task lands. Every condition atom (`when`, the Challenge medal) is simulated.
 */
export function unsupportedScript(map: CompiledMapDef<IdSpace>): string[] {
  const out: string[] = [];
  for (const o of map.objectives) {
    out.push(`objective '${o.id}': optional objectives are not simulated until M3`);
  }
  for (const ev of map.events) {
    const on = ev.on;
    if (!('tick' in on) && !('wave' in on)) {
      out.push(`event '${ev.id}': trigger ${Object.keys(on).join('/')} is not simulated yet`);
    }
    for (const a of ev.actions) {
      if (!('unlockTowerClass' in a) && !('cue' in a) && !('grantCredits' in a)) {
        out.push(`event '${ev.id}': action ${Object.keys(a).join('/')} is not simulated yet`);
      }
    }
  }
  return out;
}
