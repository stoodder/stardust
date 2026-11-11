// Script groups (design/maps.md § 5.3; story-runtime.md § Map scripts; T706): wave groups a map
// keeps aside by id (`MapDef.scriptGroups`) for a `spawnWave` action to send in (A3M5's W10 surge
// when Cut the Feed isn't done). The rules:
// - **When.** A group's spawn clock starts on the tick the action runs (an event's, in the
//   triggers system; an objective's `onComplete`, which runs in cleanup, starts it on the next
//   tick). Its i-th unit (0-based) spawns `delay + i × interval` into that clock, as a wave group's
//   does, at the end of the triggers system: before movement, as a wave's spawns are. The same
//   group may be sent more than once (an event with `once: false`); each send walks in full.
// - **Which wave.** Its units count in the wave then running (`state.wave`; wave 1 before the
//   first starts), or, when that wave has already resolved (a build phase), in the next one, so a
//   wave never resolves while a script group is still to walk in. The action books the group's
//   count to that wave's remaining at once; each unit carries that wave (its leaks, its tags).
//   Sent after the last wave has resolved (the map is then only waiting on refugees), it counts
//   in the last wave and doesn't hold the win.
// - **Units** spawn exactly as a wave's (systems/waves.ts `spawn`: the run's `enemyStat`
//   modifiers, the group's tags), with EnemySpawned. The action emits ScriptGroupSpawned.
// - **Validation** ([script-group], validateM7.ts): every `spawnWave` names a group and every
//   group is spawned; a group counts toward its map's threat intel and soft-trait share
//   (validateThreats.ts).
import type { CompiledMapDef } from '../content/compiled.ts';
import type { IdSpace } from '../content/types.ts';
import { emit, type SimState } from './state.ts';
import type { TickContext } from './tick.ts';
import { runWaveModifiers, spawn } from './systems/waves.ts';

type ScriptGroupMap = Pick<CompiledMapDef<IdSpace>, 'scriptGroups' | 'waves'>;

/**
 * `spawnWave` (a script action): sends script group `id` in, its clock starting at `firstTick`
 * (see the header). Validation guarantees the group exists; an unknown one sends nothing.
 */
export function spawnScriptGroup(
  state: SimState,
  map: ScriptGroupMap,
  id: string,
  firstTick: number,
): void {
  const g = map.scriptGroups[id];
  if (g === undefined) return;
  const s = state.schedule;
  let wave = state.wave > 0 ? state.wave : 1;
  if (s.resolved[wave - 1] === true && wave < map.waves.length) wave++;
  state.scriptGroupsSpawned.push(id);
  state.scriptGroupStart.push(firstTick);
  state.scriptGroupWave.push(wave);
  s.remaining[wave - 1]! += g.count; // 1 ≤ wave ≤ waves.length
  emit(state, { type: 'ScriptGroupSpawned', id });
}

/** Spawns every script-group unit due this tick (the triggers system, after its events). */
export function scriptGroupSpawns(state: SimState, ctx: TickContext): void {
  const sent = state.scriptGroupsSpawned;
  if (sent.length === 0) return;
  const groups = ctx.map.scriptGroups;
  let scaled: ReturnType<typeof runWaveModifiers>['enemies'] | null = null;
  for (let i = 0; i < sent.length; i++) {
    const g = groups[sent[i]!]!; // i < length; spawnScriptGroup sent only known groups
    const k = state.tick - state.scriptGroupStart[i]! - g.delayTicks; // index-aligned
    if (k < 0) continue;
    let n: number;
    if (g.intervalTicks > 0) {
      if (k % g.intervalTicks !== 0 || k / g.intervalTicks >= g.count) continue;
      n = 1;
    } else if (k === 0) n = g.count;
    else continue;
    scaled ??= runWaveModifiers(ctx.config).enemies;
    const wave = state.scriptGroupWave[i]!; // index-aligned
    for (let j = 0; j < n; j++) spawn(state, wave, g, scaled);
  }
}
