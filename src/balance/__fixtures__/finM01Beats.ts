// FIN Phase 1's beats as one run shows them (balance/finM01*.test.ts; T820): the waves' starts,
// the choir's walk (its arrival at the Halls mouth, its halts and waits), the memorial cue, W18's
// clear, Phase 2's start with its checkpoint and the Bore stopped, the Voices, and the Waymarks.
// `withStandInW19` appends a stand-in W19 (one Mote, never called, five minutes' countdown) so the
// run outlives W18 and the choir's arrival and Phase 2's event can fire before T821's waves exist
// (`untilPhase2` stops the run there); `rushHour` plays the veteran countdowns
// (−50%), `@story` Story.
import { compileContent } from '../../content/compile.ts';
import type { CompiledBuild, CompiledContent } from '../../content/compiled.ts';
import { RAW_CONTENT } from '../../content/registry.ts';
import type { RawContent } from '../../content/types.ts';
import { createBuildExecutor, createSim, type SimEvent } from '../../sim/index.ts';
import { flagsFor } from '../checks.ts';
import { buildFor } from '../harness.ts';
import { referenceRunProfile, runConfig } from '../profile.ts';

export const TICK_HZ = 60;

export interface FinM01Beats {
  readonly outcome: string;
  readonly ticks: number;
  /** The last wave started when the run ended (a loss's wave). */
  readonly wave: number;
  readonly voices: number;
  readonly singers: number;
  /** Ticks the choir spent halted, and waiting at a leg's end, before it arrived. */
  readonly haltTicks: number;
  readonly waitTicks: number;
  /** The tick the leader reached the Halls mouth (−1: never). */
  readonly arrivedTick: number;
  /** The tick W18 cleared (−1: never). */
  readonly w18ClearedTick: number;
  /** The tick Phase 2 began (−1: never), and its checkpoint's label and wave. */
  readonly phase2Tick: number;
  readonly checkpoint: { readonly label: string | undefined; readonly wave: number } | null;
  /** The Bore's rate and fill (whole %) once Phase 2 began. */
  readonly boreRateAtPhase2: number;
  readonly borePct: number;
  /** The memorial cue: the wave it played in and how far into that wave (s). */
  readonly memorial: { readonly wave: number; readonly sec: number } | null;
  readonly waveStartTick: readonly number[];
  /** The Waymarks objective's standing. */
  readonly waymarks: string;
}

/** The content with a stand-in W19 on fin_m01 (see the header). */
export function withStandInW19(): CompiledContent {
  const raw = RAW_CONTENT.maps.fin_m01;
  const w19 = {
    countdownSec: 300,
    noCall: true as const,
    groups: [{ enemy: 'mote' as const, count: 1, route: 'halls' }],
  };
  const maps = { ...RAW_CONTENT.maps, fin_m01: { ...raw, waves: [...raw.waves, w19] } };
  return compileContent({ ...RAW_CONTENT, maps } as RawContent);
}

/** Plays `label` (a harness label; `@story` for Story) on fin_m01 in `c`, logging its beats. */
export function finM01Beats(
  c: CompiledContent,
  label: string,
  opts: {
    readonly rushHour?: boolean;
    readonly build?: CompiledBuild;
    readonly untilPhase2?: boolean;
  } = {},
): FinM01Beats {
  const map = c.maps.fin_m01;
  const story = label.endsWith('@story');
  const base = story ? label.slice(0, -'@story'.length) : label;
  const build = opts.build ?? buildFor(base, map, c)!;
  const flags = flagsFor(base, map) ?? {};
  const profile = referenceRunProfile(map, c, story ? 'story' : 'standard', undefined, flags);
  const cfg = runConfig(c, map, build, profile, 1, flags);
  const rush = { kind: 'countdown', pct: -0.5, source: 'veteran:rush_hour' } as const;
  const sim = createSim(
    opts.rushHour === true ? { ...cfg, modifiers: [...cfg.modifiers, rush] } : cfg,
  );
  const exec = createBuildExecutor(sim, build);
  const st = sim.state;
  const out: SimEvent[] = [];
  const waveStartTick: number[] = [];
  let arrivedTick = -1;
  let w18ClearedTick = -1;
  let phase2Tick = -1;
  let checkpoint: FinM01Beats['checkpoint'] = null;
  let boreRateAtPhase2 = -1;
  let memorial: FinM01Beats['memorial'] = null;
  let haltTicks = 0;
  let waitTicks = 0;
  const stop = (): boolean => opts.untilPhase2 === true && phase2Tick >= 0 && boreRateAtPhase2 >= 0;
  while (st.outcome === 'playing' && st.tick < TICK_HZ * 60 * 40 && !stop()) {
    exec.beforeTick();
    sim.step();
    out.length = 0;
    sim.drainEvents(out);
    for (const e of out) {
      if (e.type === 'WaveStarted') waveStartTick[e.wave - 1] = st.tick;
      else if (e.type === 'WaveCleared' && e.wave === 18) w18ClearedTick = st.tick;
      else if (e.type === 'PhaseChanged' && e.phase === 2) {
        phase2Tick = st.tick;
        boreRateAtPhase2 = -2; // read after this tick's actions (below)
      } else if (e.type === 'CheckpointReached' && e.label !== undefined) {
        checkpoint = { label: e.label, wave: e.wave };
      } else if (e.type === 'ScriptCue' && e.cueId === 'fin_m01_cue_memorial') {
        const start = waveStartTick[st.wave - 1] ?? st.tick;
        memorial = { wave: st.wave, sec: (st.tick - start) / TICK_HZ };
      }
    }
    if (boreRateAtPhase2 === -2) boreRateAtPhase2 = st.timers[0]!.ratePct;
    if (arrivedTick < 0 && st.choir.arrived) {
      arrivedTick = st.tick;
      haltTicks = st.choir.haltTicks;
      waitTicks = st.choir.waitTicks;
    }
  }
  if (arrivedTick < 0) {
    haltTicks = st.choir.haltTicks;
    waitTicks = st.choir.waitTicks;
  }
  return {
    outcome: st.outcome,
    ticks: st.tick,
    wave: st.wave,
    voices: st.choir.voices,
    singers: st.choir.singers,
    haltTicks,
    waitTicks,
    arrivedTick,
    w18ClearedTick,
    phase2Tick,
    checkpoint,
    boreRateAtPhase2,
    borePct: st.stats.boreProgress,
    memorial,
    waveStartTick,
    waymarks: String(st.objectives[0]),
  };
}
