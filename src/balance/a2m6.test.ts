// A2M6's tuning is robust where it matters (T522). As tuned, par wins at 16/22 (72.7%) on every seed,
// holding every wave to the last and losing all six in W14, where the biggest Rift Moth flock comes
// in full dark with everything else (so par never earns Before the Dark; Story does). Ves'thara's
// Stillness on that flock is par's margin: without its casts par falls to 50. Each no-counter build
// loses: without splash, W6–W7's clusters drown it by W7 (by W9, act2.md); without air, the Rift
// Moths fly over it by W10. Both alts win (54.5, 54.5); so do the Seeker Swarm alt (45.5), which
// runs here on the reference profile plus the Skyhook's specs because the reference never owns
// them (D137; campaign.md § 4.9), and the Sunlance/Resonance probe (81.8, inside the band: it does
// not trivialize the late surges). The dark reaches full as W11 starts, so Goldie's W12 radio line
// plays in full dark (a countdown opens once the previous wave finishes spawning, D135) in every
// reference run and under every shift. The waves and builds are documented in
// docs/story/campaign/act2.md § A2M6.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { CompiledBuild, CompiledBuildStep, CompiledContent } from '../content/compiled.ts';
import { SEEKER_ALT, SUNLANCE_PROBE } from '../content/maps/a2_m06/builds.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { BuildStep, ScriptedBuild, WaveGroup } from '../content/types.ts';
import {
  createBuildExecutor,
  createSim,
  runHeadless,
  type HeadlessResult,
  type SimEvent,
} from '../sim/index.ts';
import { bothWays, delay, shiftedContent } from './__fixtures__/shifts.ts';
import { buildFor, runMap } from './harness.ts';
import { referenceRunProfile, runConfig, type RunProfile } from './profile.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

const content = compileContent(RAW_CONTENT);
const PAR_INTEGRITY = 16;
const MAX_INTEGRITY = 22;

const isMoth = (g: WaveGroup): boolean => g.enemy === 'riftmoth';
const isMote = (g: WaveGroup): boolean => g.enemy === 'mote';

/** The compound shifts, each run both ways (`s` = ±1). */
const SHIFTS = {
  'W9’s and W14’s Rift Moth flocks': (s: number) => ({
    9: delay(isMoth, 0.2 * s),
    14: delay(isMoth, 0.2 * s),
  }),
  'W6’s, W7’s and W14’s Mote clusters': (s: number) => ({
    6: delay(isMote, 0.2 * s),
    7: delay(isMote, 0.2 * s),
    14: delay(isMote, 0.2 * s),
  }),
} as const;

/** A test-level build (D137) compiled by hand: its steps as the content compiler shapes them. */
function compileTestBuild(b: ScriptedBuild): CompiledBuild {
  const step = (s: BuildStep): CompiledBuildStep => {
    const wave = s.wave;
    if ('build' in s) return { wave, kind: 'build', tower: s.build, tile: s.tile };
    if ('upgrade' in s) return { wave, kind: 'upgrade', tile: s.upgrade };
    if ('specialize' in s) return { wave, kind: 'specialize', tile: s.specialize, spec: s.spec };
    if ('ability' in s) {
      const when = s.when;
      return {
        wave,
        kind: 'ability',
        slot: s.ability,
        target: s.target ?? null,
        when:
          when === undefined
            ? 'asap'
            : when === 'waveStart'
              ? when
              : { afterTicks: Math.round(when.afterSec * 60) },
      };
    }
    throw new Error(`a test-level build step this helper doesn't compile: ${JSON.stringify(s)}`);
  };
  return {
    loadout: b.loadout,
    companion: null,
    technicianAbility: content.maps.a2_m06.builds.referenceProfile.technicianAbility,
    callEarly: false,
    steps: b.steps.map(step),
  };
}

/** The test-level builds, with the specs each needs on top of the reference profile. */
const TEST_LEVEL = {
  seeker: { build: compileTestBuild(SEEKER_ALT), specs: ['skyhook'] },
  sunlance: { build: compileTestBuild(SUNLANCE_PROBE), specs: ['prism'] },
} as const;

/** The build `label` on `c`: a harness label, or a test-level build's name. */
function buildOf(c: CompiledContent, label: string): CompiledBuild {
  const t = TEST_LEVEL[label as keyof typeof TEST_LEVEL];
  if (t !== undefined) return t.build;
  return buildFor(label, c.maps.a2_m06, c)!;
}

/** The reference profile for `label` (a test-level build adds its specs), on `difficulty`. */
function profileOf(
  c: CompiledContent,
  label: string,
  difficulty: 'standard' | 'story' = 'standard',
): RunProfile {
  const p = referenceRunProfile(c.maps.a2_m06, c, difficulty);
  const t = TEST_LEVEL[label as keyof typeof TEST_LEVEL];
  return t === undefined ? p : { ...p, specs: [...p.specs, ...t.specs] };
}

/** One headless run of `label` on `c` (seed 1). */
function runOn(c: CompiledContent, label: string): HeadlessResult {
  const map = c.maps.a2_m06;
  const build = buildOf(c, label);
  return runHeadless(runConfig(c, map, build, profileOf(c, label), 1), build);
}

/**
 * The darkness each time a build phase opens in a run of `label` on `c` (wave → dark), and each
 * Stillness cast's wave and how many units it froze.
 */
function beats(c: CompiledContent, label: string, difficulty: 'standard' | 'story' = 'standard') {
  const map = c.maps.a2_m06;
  const build = buildOf(c, label);
  const sim = createSim(runConfig(c, map, build, profileOf(c, label, difficulty), 1));
  const exec = createBuildExecutor(sim, build);
  const st = sim.state;
  const out: SimEvent[] = [];
  const darkAtCountdown: Record<number, number> = {};
  const stillness: { wave: number; frozen: number }[] = [];
  const read = (): void => {
    for (const e of out) {
      if (e.type === 'CountdownStarted') darkAtCountdown[e.wave] = st.dark;
      if (e.type === 'StasisArea') stillness.push({ wave: st.wave, frozen: e.frozen });
    }
    out.length = 0;
  };
  while (st.outcome === 'playing') {
    exec.beforeTick();
    sim.drainEvents(out);
    read();
    sim.step();
    sim.drainEvents(out);
    read();
  }
  return { outcome: st.outcome, darkAtCountdown, stillness };
}

/** W12's radio (Goldie's "Lights out in Dome 3") opens with W12's build phase: full dark then. */
function expectFullDarkForGoldie(c: CompiledContent, label: string, difficulty?: 'story'): void {
  const b = beats(c, label, difficulty);
  expect(b.darkAtCountdown[12], label).toBe(1);
  // Dusk through W3's build phase, then deeper each wave: never full before W11 has started.
  expect(b.darkAtCountdown[4], label).toBe(0);
  expect(b.darkAtCountdown[11], label).toBeLessThan(1);
}

// Each test re-runs a whole map's harness (or a few runs): seconds, not milliseconds.
describe('A2M6 balance', { timeout: HARNESS_TEST_TIMEOUT_MS }, () => {
  const report = runMap(content, 'a2_m06', { seeds: 1 });
  const run = (build: string) => report.runs.find((r) => r.build === build && !r.repeat)!;

  it('passes every harness check as tuned, par at 16/22 with its losses in W14', () => {
    expect(report.checks.filter((k) => !k.ok).map((k) => k.id)).toEqual([]);
    const par = run('par').result!;
    expect([par.integrity, par.maxIntegrity]).toEqual([PAR_INTEGRITY, MAX_INTEGRITY]);
    expect(par.waves.map((w) => w.integrityLost)).toEqual([
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6,
    ]);
    // Par leaks in the last three waves, so it never earns Before the Dark.
    expect(par.medals.challenge).not.toBe('earned');
  });

  it('makes Stillness par’s margin: both casts freeze Rift Moths, and par falls without them', () => {
    const b = beats(content, 'par');
    expect(b.stillness.map((s) => s.wave)).toEqual([9, 14]);
    for (const s of b.stillness) expect(s.frozen).toBeGreaterThan(0);
    expect(run('parNoAbilities').result!.integrity).toBeLessThan(PAR_INTEGRITY);
  });

  it('makes splash and air the answers: no-splash loses by W9, no-air by W10', () => {
    const splash = run('noCounter:splash').result!;
    expect(splash.outcome).toBe('lost');
    expect(splash.lostAtWave).toBeLessThanOrEqual(9);
    const air = run('noCounter:air').result!;
    expect(air.outcome).toBe('lost');
    expect(air.lostAtWave).toBeLessThanOrEqual(10);
    expect(air.stats.leaksByEnemy.riftmoth).toBeGreaterThanOrEqual(15);
  });

  it('lets both alts win, and the Seeker Swarm alt wins on the Skyhook’s specs', () => {
    for (const alt of ['alt:coil_and_soak', 'alt:shells_and_slow']) {
      expect(run(alt).marginPct, alt).toBeGreaterThanOrEqual(20);
    }
    // D137: the Seeker Swarm alt is a test-level build (the reference never owns Skyhook specs).
    const seeker = runOn(content, 'seeker');
    expect(seeker.outcome).toBe('won');
    expect((100 * seeker.integrity) / seeker.maxIntegrity).toBeGreaterThanOrEqual(20);
    expect(seeker.steps.every((s) => s.error === null)).toBe(true);
  });

  it('keeps a Sunlance/Resonance build inside the band: it doesn’t trivialize the late surges', () => {
    const probe = runOn(content, 'sunlance');
    expect(probe.outcome).toBe('won');
    expect(probe.steps.every((s) => s.error === null)).toBe(true);
    // 18/22 (81.8): above par, still under the band's top, and still leaking in W14.
    expect(probe.integrity).toBe(18);
    expect(probe.waves[13]!.integrityLost).toBeGreaterThan(0);
  });

  it('wins on Story with every medal, Before the Dark included', () => {
    const story = run('par@story').result!;
    expect(story.outcome).toBe('won');
    expect(story.integrity).toBe(story.maxIntegrity);
    expect(story.medals.challenge).toBe('earned');
  });

  it('plays Goldie’s W12 line in full dark in every reference run', () => {
    for (const label of [
      'par',
      'alt:coil_and_soak',
      'alt:shells_and_slow',
      'alwaysCallEarly',
      'seeker',
      'sunlance',
    ]) {
      expectFullDarkForGoldie(content, label);
    }
    expectFullDarkForGoldie(content, 'par', 'story');
  });

  it.each(bothWays(SHIFTS))(
    'holds par at 16/22 and Goldie’s line in full dark with %s shifted %s',
    (_name, _way, patches) => {
      const c = shiftedContent('a2_m06', patches);
      expect(runOn(c, 'par').integrity).toBe(PAR_INTEGRITY);
      expectFullDarkForGoldie(c, 'par');
    },
  );
});
