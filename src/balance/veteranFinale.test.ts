// Veteran modifiers on the finale (T860, with T820's walkWaves ruling: the procession keeps wave
// time, not clock time). Every modifier that changes the clock (Rush Hour's countdowns −50%, Double
// Time's +20% enemy speed, and both at once) still lands FIN's beats: the memorial cue in W9, and
// Phase 2 ("Retry from the Halls") at the later of W18 cleared and the choir at the Halls mouth.
// Runs par until Phase 2 starts (W19 waits for it: `inPhase`, T821).
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { CompiledContent } from '../content/compiled.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { veteranGrants, type VeteranModifierId } from '../meta/veteran.ts';
import { createBuildExecutor, createSim, type SimEvent } from '../sim/index.ts';
import { flagsFor } from './checks.ts';
import { buildFor } from './harness.ts';
import { referenceRunProfile, runConfig } from './profile.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

const TICK_HZ = 60;

interface Beats {
  readonly outcome: string;
  readonly memorialWave: number | null;
  readonly w18ClearedTick: number;
  readonly arrivedTick: number;
  readonly phase2Tick: number;
  readonly checkpoint: { readonly label: string | undefined; readonly wave: number } | null;
}

/** Plays par on `c`'s fin_m01 under `mods` (`story`: on Story) until Phase 2 starts. */
function beats(
  c: CompiledContent,
  mods: readonly VeteranModifierId[],
  difficulty: 'standard' | 'story' = 'standard',
): Beats {
  const map = c.maps.fin_m01;
  const build = buildFor('par', map, c)!;
  const flags = flagsFor('par', map) ?? {};
  const profile = referenceRunProfile(map, c, difficulty, undefined, flags);
  const cfg = runConfig(c, map, build, profile, 1, flags);
  const extra = mods.flatMap((m) => veteranGrants(m).modifiers);
  const sim = createSim({ ...cfg, modifiers: [...cfg.modifiers, ...extra] });
  const exec = createBuildExecutor(sim, build);
  const st = sim.state;
  const out: SimEvent[] = [];
  let memorialWave: number | null = null;
  let w18ClearedTick = -1;
  let arrivedTick = -1;
  let phase2Tick = -1;
  let checkpoint: Beats['checkpoint'] = null;
  while (st.outcome === 'playing' && st.tick < TICK_HZ * 60 * 40 && phase2Tick < 0) {
    exec.beforeTick();
    sim.step();
    out.length = 0;
    sim.drainEvents(out);
    for (const e of out) {
      if (e.type === 'WaveCleared' && e.wave === 18) w18ClearedTick = st.tick;
      else if (e.type === 'PhaseChanged' && e.phase === 2) phase2Tick = st.tick;
      else if (e.type === 'CheckpointReached' && e.label !== undefined) {
        checkpoint = { label: e.label, wave: e.wave };
      } else if (e.type === 'ScriptCue' && e.cueId === 'fin_m01_cue_memorial') {
        memorialWave = st.wave;
      }
    }
    if (arrivedTick < 0 && st.choir.arrived) arrivedTick = st.tick;
  }
  return { outcome: st.outcome, memorialWave, w18ClearedTick, arrivedTick, phase2Tick, checkpoint };
}

describe(
  'veteran modifiers keep the finale’s beats (walkWaves)',
  {
    timeout: HARNESS_TEST_TIMEOUT_MS * 3,
  },
  () => {
    const c = compileContent(RAW_CONTENT);
    const cases: readonly (readonly VeteranModifierId[])[] = [
      ['rush_hour'],
      ['double_time'],
      ['rush_hour', 'double_time'],
    ];
    for (const mods of cases) {
      it(`${mods.join(' + ')}: the memorial in W9, Phase 2 at the Halls after W18`, () => {
        // Story keeps par alive under the faster Hollow, so the beats are what's tested.
        const b = beats(c, mods, mods.includes('double_time') ? 'story' : 'standard');
        expect(b.outcome).toBe('playing');
        expect(b.memorialWave).toBe(9);
        expect(b.w18ClearedTick).toBeGreaterThan(0);
        expect(b.arrivedTick).toBeGreaterThan(0);
        expect(b.phase2Tick).toBe(Math.max(b.w18ClearedTick, b.arrivedTick) + 1);
        // A labelled checkpoint's wave is the last wave started (W18; W19 waits for Phase 2).
        expect(b.checkpoint).toEqual({ label: 'halls', wave: 18 });
      });
    }
  },
);
