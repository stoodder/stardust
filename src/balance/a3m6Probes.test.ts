// A3M6's builds off the reference profile (T722). The Flak Curtain alt (T501c-M6; A3M2 had no air):
// `hooks` with its gate Skyhook made Flak Curtain at W12, on the reference profile plus the
// Skyhook's specs, which the reference doesn't buy. And the Lantern probe on the Black Budget
// Operatives (T660b → T760, report-only): par with a Seer's Lantern where its Lookout stands (and
// as Truthlight from W12), on the reference profile plus the Lantern and its specs; its numbers
// as tuned are in act3.md § A3M6 (*As tuned*), for T760's curve report; it asserts only that it runs.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { CompiledBuild, CompiledBuildStep } from '../content/compiled.ts';
import { flakAlt, PADS } from '../content/maps/a3_m06/builds.ts';
import { REFUGEES } from '../content/maps/a3_m06/map.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { BuildStep, ScriptedBuild } from '../content/types.ts';
import { secToTicks } from '../shared/time.ts';
import { createBuildExecutor, createSim, runHeadless, type SimEvent } from '../sim/index.ts';
import { flagsFor, marginOf } from './checks.ts';
import { referenceRunProfile, runConfig } from './profile.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

const content = compileContent(RAW_CONTENT);
const map = content.maps.a3_m06;
/** The harness's default flags: the convoy (the militia's posts manned). */
const FLAGS = flagsFor('par', map) ?? {};

/** A build step as the content compiler shapes it (the kinds these builds use). */
function compileStep(st: BuildStep): CompiledBuildStep {
  const wave = st.wave;
  if ('build' in st) return { wave, kind: 'build', tower: st.build, tile: st.tile };
  if ('upgrade' in st) return { wave, kind: 'upgrade', tile: st.upgrade };
  if ('specialize' in st) return { wave, kind: 'specialize', tile: st.specialize, spec: st.spec };
  if ('ability' in st) {
    const when = st.when;
    return {
      wave,
      kind: 'ability',
      slot: st.ability,
      target: st.target ?? null,
      when:
        when === undefined
          ? 'asap'
          : when === 'waveStart'
            ? when
            : { afterTicks: secToTicks(when.afterSec) },
    };
  }
  throw new Error(`a test-level build step this helper doesn't compile: ${JSON.stringify(st)}`);
}

/** `b` compiled by hand, on the map's slot 1. */
const compiled = (b: ScriptedBuild): CompiledBuild => ({
  loadout: b.loadout,
  companion: null,
  technicianAbility: map.builds.referenceProfile.technicianAbility,
  callEarly: false,
  steps: b.steps.map(compileStep),
});

/** Par with a Lantern where its Lookout stands; `truthlight`: made Truthlight at W12. */
function lanternPar(truthlight: boolean): CompiledBuild {
  const par = map.builds.parBuild;
  const steps = par.steps.map((s) =>
    s.kind === 'build' && s.tower === 'lookout' ? { ...s, tower: 'lantern' as const } : s,
  );
  const spec: CompiledBuildStep = { wave: 12, kind: 'specialize', tile: PADS.ROOF_W, spec: 'b' };
  return {
    ...par,
    loadout: par.loadout.map((t) => (t === 'lookout' ? 'lantern' : t)),
    steps: truthlight ? [...steps, spec].toSorted((a, b) => a.wave - b.wave) : steps,
  };
}

/**
 * Runs `build` on the reference profile plus `extraSpecs` (the sim doesn't check a loadout against a
 * license); what it shelters and leaks.
 */
function play(build: CompiledBuild, extraSpecs: readonly ('skyhook' | 'lantern')[]) {
  const ref = referenceRunProfile(map, content);
  const profile = { ...ref, specs: [...ref.specs, ...extraSpecs] };
  const sim = createSim(runConfig(content, map, build, profile, 1, FLAGS));
  const exec = createBuildExecutor(sim, build);
  const out: SimEvent[] = [];
  let operatives = 0;
  while (sim.state.outcome === 'playing' && sim.state.tick < 60 * 60 * 30) {
    exec.beforeTick();
    sim.step();
    out.length = 0;
    sim.drainEvents(out);
    for (const e of out) if (e.type === 'EnemyLeaked' && e.enemy === 'blackbudget') operatives++;
  }
  return { outcome: sim.state.outcome, sheltered: sim.state.stats.evacuated, operatives, profile };
}

describe('A3M6 off the reference profile', { timeout: HARNESS_TEST_TIMEOUT_MS }, () => {
  it('lets the Flak Curtain alt win ≥ 20% (T501c-M6)', () => {
    const b = compiled(flakAlt());
    const { profile } = play(b, ['skyhook']);
    const r = runHeadless(runConfig(content, map, b, profile, 1, FLAGS), b);
    expect(r.outcome).toBe('won');
    expect(marginOf(r)).toBeGreaterThanOrEqual(20);
    expect(r.steps.filter((st) => st.error !== null).map((st) => [st.index, st.error])).toEqual([]);
    // The spec landed.
    expect(r.steps.some((st) => st.kind === 'specialize' && st.error === null)).toBe(true);
  });

  it('reports the Lantern and Truthlight on the Operatives (report-only, T760)', () => {
    const rows = [
      ['Lantern', play(lanternPar(false), ['lantern'])],
      ['Truthlight', play(lanternPar(true), ['lantern'])],
    ] as const;
    for (const [name, r] of rows) {
      expect(['won', 'lost'], name).toContain(r.outcome);
      expect(r.sheltered, name).toBeLessThanOrEqual(REFUGEES);
      expect(r.operatives, name).toBeGreaterThanOrEqual(0);
    }
  });
});
