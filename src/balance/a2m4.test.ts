// A2M4's tuning is robust where it matters (T520). As tuned, par wins at 16/21 (76.2%) on every seed,
// its five lost in W12 (three Lightwings over the vats and a Veilwalker), and earns Nothing Unseen:
// its Lookout on the cleared intake hopper reveals every Veilwalker before Intake B. Detection is
// new here (the teach map), and each no-counter build loses by W8: blind, the Veilwalkers walk
// through (W3, W7, W8); without Energy or Soaked, W7's Glimmers and Veilwalkers; without splash,
// W7's clusters. Both alts win (47.6, 61.9), and so does the Crane alt, which runs here on the
// reference profile plus the Crane's license because the reference never owns the Crane (D137;
// campaign.md § 4.9), so it can't be an `altBuilds` entry. The truth scene binds to W4's clear,
// which lands in W5's long build phase with nothing on the field in every run that doesn't call
// waves early (a countdown opens as the wave before it finishes spawning, D135). With W8's and
// W12's Lightwings and the vats' surges shifted ±0.2 s together, par holds at 16/21 and the scene's
// window holds. The waves and builds are documented in docs/story/campaign/act2.md § A2M4.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { CompiledContent } from '../content/compiled.ts';
import { CRANE_ALT } from '../content/maps/a2_m04/builds.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { RawContent, WaveGroup } from '../content/types.ts';
import {
  createBuildExecutor,
  createSim,
  runHeadless,
  type HeadlessResult,
  type SimEvent,
} from '../sim/index.ts';
import { both, bothWays, delay, shiftedContent } from './__fixtures__/shifts.ts';
import { buildFor, runMap } from './harness.ts';
import { referenceRunProfile, runConfig } from './profile.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

const content = compileContent(RAW_CONTENT);
const PAR_INTEGRITY = 16;
const TRUTH = 'a2_m04_scene_truth';

const isLightwing = (g: WaveGroup): boolean => g.enemy === 'lightwing';
const isSurge = (g: WaveGroup): boolean => g.route === 'vats';

/** The compound shift, run both ways (`s` = ±1). */
const SHIFTS = {
  'W8’s and W12’s Lightwings and the vats’ surges': (s: number) => ({
    8: delay(isLightwing, 0.2 * s),
    10: delay(isSurge, 0.2 * s),
    12: both(delay(isLightwing, 0.2 * s), delay(isSurge, 0.2 * s)),
  }),
} as const;

/** The live content with the Crane alt as an alt build, on the reference profile + the Crane. */
function withCraneAlt(): CompiledContent {
  const raw = RAW_CONTENT.maps.a2_m04;
  const profile = raw.referenceProfile;
  const map = {
    ...raw,
    referenceProfile: { ...profile, towers: [...profile.towers, 'crane' as const] },
    altBuilds: { ...raw.altBuilds, crane_yard: CRANE_ALT },
  };
  const next: RawContent = { ...RAW_CONTENT, maps: { ...RAW_CONTENT.maps, a2_m04: map } };
  return compileContent(next);
}

/** One headless run of the build `label` on `c` (seed 1, the reference profile). */
function runOn(c: CompiledContent, label: string): HeadlessResult {
  const map = c.maps.a2_m04;
  const build = buildFor(label, map, c)!;
  return runHeadless(runConfig(c, map, build, referenceRunProfile(map, c), 1), build);
}

/** Where the truth scene's cue lands in a run of `label` on `c`: its wave, phase, and the field. */
function truthBeat(
  c: CompiledContent,
  label: string,
  difficulty: 'standard' | 'story' = 'standard',
) {
  const map = c.maps.a2_m04;
  const build = buildFor(label, map, c)!;
  const sim = createSim(runConfig(c, map, build, referenceRunProfile(map, c, difficulty), 1));
  const exec = createBuildExecutor(sim, build);
  const st = sim.state;
  const out: SimEvent[] = [];
  const cues: { wave: number; phase: string; countdown: number; alive: number }[] = [];
  while (st.outcome === 'playing') {
    exec.beforeTick();
    sim.drainEvents(out);
    out.length = 0;
    sim.step();
    sim.drainEvents(out);
    for (const e of out) {
      if (e.type !== 'ScriptCue' || e.cueId !== TRUTH) continue;
      let alive = 0;
      for (let i = 0; i < st.enemies.used; i++) if (st.enemies.items[i]!.alive) alive++;
      cues.push({
        wave: st.wave,
        phase: st.schedule.phase,
        countdown: st.schedule.countdownWave,
        alive,
      });
    }
    out.length = 0;
  }
  return cues;
}

/** W5's build phase, hands free: the cue fires once, W4 the last wave started, nothing alive. */
const IN_W5_BUILD_PHASE = [{ wave: 4, phase: 'countdown', countdown: 5, alive: 0 }];

// Each test re-runs a whole map's harness (or its par): seconds, not milliseconds.
describe('A2M4 balance', { timeout: HARNESS_TEST_TIMEOUT_MS }, () => {
  const report = runMap(content, 'a2_m04', { seeds: 1 });
  const run = (build: string) => report.runs.find((r) => r.build === build && !r.repeat)!;

  it('passes every harness check as tuned, par at 16/21 with its losses in W12', () => {
    expect(report.checks.filter((k) => !k.ok).map((k) => k.id)).toEqual([]);
    const par = run('par').result!;
    expect([par.integrity, par.maxIntegrity]).toEqual([PAR_INTEGRITY, 21]);
    expect(par.waves.map((w) => w.integrityLost)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5]);
    // Par clears both intake hoppers (Intake Manifest) and reveals every Veilwalker in the yard.
    expect(par.objectives).toEqual(['done']);
    expect(par.medals.challenge).toBe('earned');
  });

  it('makes detection, shields, and splash the answers: each no-counter build loses by W8', () => {
    for (const c of ['detection', 'shield', 'splash']) {
      const r = run(`noCounter:${c}`).result!;
      expect(r.outcome, c).toBe('lost');
      expect(r.lostAtWave, c).toBeLessThanOrEqual(8);
    }
    // Blind, the Veilwalkers walk through unrevealed: no Nothing Unseen without a detector.
    const blind = run('noCounter:detection').result!;
    expect(blind.stats.leaksByEnemy.veilwalker).toBeGreaterThanOrEqual(8);
    expect(blind.medals.challenge).not.toBe('earned');
  });

  it('lets both alts win, and the Crane alt wins and clears the intake wreckage', () => {
    for (const alt of ['alt:watch_and_shell', 'alt:coil_and_shell']) {
      expect(run(alt).marginPct, alt).toBeGreaterThanOrEqual(20);
    }
    // D137: the Crane alt is a test-level build (the reference profile never owns the Crane).
    const crane = runOn(withCraneAlt(), 'alt:crane_yard');
    expect(crane.outcome).toBe('won');
    expect((100 * crane.integrity) / crane.maxIntegrity).toBeGreaterThanOrEqual(20);
    expect(crane.objectives).toEqual(['done']);
    expect(crane.steps.every((s) => s.error === null)).toBe(true);
  });

  it('wins on Story with every medal', () => {
    const story = run('par@story').result!;
    expect(story.outcome).toBe('won');
    expect(story.integrity).toBe(story.maxIntegrity);
  });

  it("plays the truth scene in W5's build phase, on W4's clear, in every run that reaches it", () => {
    // Every harness run that doesn't call waves early clears W4 before W5 starts (W5's long build
    // phase), so the scene opens with nothing on the field and W5 still to come.
    for (const r of report.runs) {
      if (r.repeat || r.result === null || r.build === 'alwaysCallEarly') continue;
      if ((r.result.lostAtWave ?? Infinity) < 5) continue; // doing nothing loses in W2
      const [w4, w5] = [r.result.waves[3]!, r.result.waves[4]!];
      expect(w4.clearedTick, r.build).toBeGreaterThan(0);
      expect(w4.clearedTick, r.build).toBeLessThan(w5.startTick);
    }
    // The cue itself, as the sim fires it: par, both alts, Story, and the Crane alt.
    for (const label of ['par', 'alt:watch_and_shell', 'alt:coil_and_shell', 'spareFleeing']) {
      expect(truthBeat(content, label), label).toEqual(IN_W5_BUILD_PHASE);
    }
    expect(truthBeat(content, 'par', 'story'), 'Story').toEqual(IN_W5_BUILD_PHASE);
    expect(truthBeat(withCraneAlt(), 'alt:crane_yard'), 'crane').toEqual(IN_W5_BUILD_PHASE);
  });

  it.each(bothWays(SHIFTS))(
    'holds par at 16/21 and the truth scene in its build phase with %s shifted %s',
    (_name, _way, patches) => {
      const c = shiftedContent('a2_m04', patches);
      expect(runOn(c, 'par').integrity).toBe(PAR_INTEGRITY);
      expect(truthBeat(c, 'par')).toEqual(IN_W5_BUILD_PHASE);
    },
  );
});
