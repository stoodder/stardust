// System 3: triggers. Evaluates map-script triggers and runs their actions (story-runtime.md
// § Map scripts), in the map's event order. What M1 runs: wave-phase triggers (`countdown`,
// `start`, `cleared`, and `afterTicks` into a wave) and `tick`, with the actions
// `unlockTowerClass` (what `towerUnlockWave` compiles to), `cue`, and `grantCredits`. createSim
// refuses a map that uses anything else (SCRIPT_SUPPORT below), so a run never silently skips
// part of its script.
//
// Every supported trigger is monotonic (once reached it stays reached), so each event fires at
// most once whatever its `once` says: an event fires on the first tick its trigger is reached.
// A wave's `cleared` is reached in cleanup, so it fires on the next tick's triggers.
import type {
  CompiledMapDef,
  CompiledScriptAction,
  CompiledScriptTrigger,
} from '../../content/compiled.ts';
import type { IdSpace } from '../../content/types.ts';
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
 * The map-script parts M1 can run. createSim refuses a map whose events use anything else
 * (triggers, actions, or `when` conditions), listing each one, until its task lands.
 */
export function unsupportedScript(map: CompiledMapDef<IdSpace>): string[] {
  const out: string[] = [];
  for (const ev of map.events) {
    const on = ev.on;
    if (!('tick' in on) && !('wave' in on)) {
      out.push(`event '${ev.id}': trigger ${Object.keys(on).join('/')} is not simulated yet`);
    }
    if (ev.when !== null) out.push(`event '${ev.id}': 'when' conditions are not simulated yet`);
    for (const a of ev.actions) {
      if (!('unlockTowerClass' in a) && !('cue' in a) && !('grantCredits' in a)) {
        out.push(`event '${ev.id}': action ${Object.keys(a).join('/')} is not simulated yet`);
      }
    }
  }
  return out;
}
