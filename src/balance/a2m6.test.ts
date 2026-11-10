// A2M6's tuning is robust where it matters (T522, T560). As tuned, par wins at 16/22 (72.7%) on every
// seed, holding every wave and losing all six in W14, where the last Rift Moth flock comes in full dark
// with everything else and par's east-wall Skyhook is still tier 2 (so par never earns Before the
// Dark; Story does). Ves'thara's Stillness on
// W9's tight flock, frozen over the merge beside the watchtower's Prism, is worth W9 whole: without
// the cast four Moths get through. Each no-counter build loses: without splash, W6–W7's clusters
// drown it by W7 (act2.md: by W9); without air, the Rift Moths fly over it by W10. Both alts win
// (50, 45.5); so does the Seeker Swarm alt (31.8), which runs here on the reference profile plus
// the Skyhook's specs because the reference never owns them (D137; campaign.md § 4.9). The
// Sunlance/Resonance probe (par with the Prism's Sunlance and a Resonance Zapcoil) wins at 72.7,
// level with par and still leaking in W14: it doesn't trivialize the late surges. The dark
// reaches full as W11 starts, so Goldie's W12 radio line plays in full dark (a countdown opens once
// the previous wave finishes spawning, D135) in every reference run and under every shift. The
// flocks make W14 noisy (±0.2 s moves par between 15 and 16 of 22), so the shifts ask every
// harness check to pass, par in the band, rather than one integrity. Par sits at 16/22, not the
// curve's 68 (15/22): one integrity lower, a shift would drop it to 14/22 (63.6), out of the band. The waves and builds are
// documented in docs/story/campaign/act2.md § A2M6.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { CompiledBuild, CompiledBuildStep, CompiledContent } from '../content/compiled.ts';
import { SEEKER_ALT, SUNLANCE_PROBE } from '../content/maps/a2_m06/builds.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { BuildStep, ScriptedBuild, TowerId, WaveGroup } from '../content/types.ts';
import {
  createBuildExecutor,
  createSim,
  runHeadless,
  type HeadlessResult,
  type SimEvent,
} from '../sim/index.ts';
import { bothWays, delay, judgeShift, shiftedContent } from './__fixtures__/shifts.ts';
import { buildFor, runMap } from './harness.ts';
import { referenceRunProfile, runConfig, type RunProfile } from './profile.ts';
import { secToTicks } from '../shared/time.ts';
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
  'W6’s, W7’s, W11’s and W14’s Mote clusters': (s: number) => ({
    6: delay(isMote, 0.2 * s),
    7: delay(isMote, 0.2 * s),
    11: delay(isMote, 0.2 * s),
    14: delay(isMote, 0.2 * s),
  }),
} as const;

/** A build step as the content compiler shapes it (compileBuilds.ts; the kinds these builds use). */
function compileStep(s: BuildStep): CompiledBuildStep {
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
            : { afterTicks: secToTicks(when.afterSec) },
    };
  }
  throw new Error(`a test-level build step this helper doesn't compile: ${JSON.stringify(s)}`);
}

/** A test-level build (D137) compiled by hand: its steps as the content compiler shapes them. */
function compileTestBuild(b: ScriptedBuild): CompiledBuild {
  return {
    loadout: b.loadout,
    companion: null,
    technicianAbility: content.maps.a2_m06.builds.referenceProfile.technicianAbility,
    callEarly: false,
    steps: b.steps.map(compileStep),
  };
}

/** The par Rivet's pad: the pocket inside the wall beside the west gate's road (builds.ts). */
const POCKET_W = [7, 4] as const;

/**
 * Par with its fourth slot, the pocket's Rivet, swapped for `tower` (same pad, same waves), and
 * from W12 that tower's spec `spec` if given: what a player who brings Xenotech's new tower to
 * Sundown gets (D138: report-only probes).
 */
function parWith(tower: TowerId, spec: 'a' | 'b' | null): CompiledBuild {
  const par = content.maps.a2_m06.builds.parBuild;
  const steps: CompiledBuildStep[] = par.steps.map((st) =>
    st.kind === 'build' && st.tower === 'rivet' ? { ...st, tower } : st,
  );
  if (spec !== null) {
    steps.push({ wave: 11, kind: 'upgrade', tile: POCKET_W });
    steps.push({ wave: 12, kind: 'specialize', tile: POCKET_W, spec });
  }
  return { ...par, loadout: par.loadout.map((t) => (t === 'rivet' ? tower : t)), steps };
}

/** The test-level builds, with the specs each needs on top of the reference profile. */
const TEST_LEVEL: Readonly<Record<string, { build: CompiledBuild; specs: readonly TowerId[] }>> = {
  seeker: { build: compileTestBuild(SEEKER_ALT), specs: ['skyhook'] },
  sunlance: { build: compileTestBuild(SUNLANCE_PROBE), specs: ['prism'] },
  mindspike: { build: parWith('mindspike', null), specs: [] },
  echo: { build: parWith('mindspike', 'a'), specs: ['mindspike'] },
  dread: { build: parWith('mindspike', 'b'), specs: ['mindspike'] },
  lantern: { build: parWith('lantern', null), specs: [] },
  allseeing: { build: parWith('lantern', 'a'), specs: ['lantern'] },
  truthlight: { build: parWith('lantern', 'b'), specs: ['lantern'] },
};

/** The build `label` on `c`: a harness label, or a test-level build's name. */
function buildOf(c: CompiledContent, label: string): CompiledBuild {
  const t = TEST_LEVEL[label];
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
  const t = TEST_LEVEL[label];
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

  it('makes Stillness worth W9: the cast freezes the flock, and without it Moths get through', () => {
    const b = beats(content, 'par');
    expect(b.stillness.map((s) => s.wave)).toEqual([9]);
    expect(b.stillness[0]!.frozen).toBeGreaterThanOrEqual(6);
    const bare = run('parNoAbilities').result!;
    expect(bare.waves[8]!.integrityLost).toBeGreaterThan(0);
    expect(bare.integrity).toBeLessThan(PAR_INTEGRITY);
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
    // 16/22 (72.7): level with par, still leaking in W14 (the surges come as crowds; a Sunlance
    // spends its ramp on one target at a time, and Resonance's bonus is against shields only).
    expect(probe.integrity).toBe(PAR_INTEGRITY);
    expect(probe.waves[13]!.integrityLost).toBeGreaterThan(0);
  });

  it('PROBE', () => {
    for (const label of ['mindspike', 'echo', 'dread', 'lantern', 'allseeing', 'truthlight']) {
      const r = runOn(content, label);
      process.stderr.write(`PROBE ${label} ${JSON.stringify([r.outcome, r.integrity, r.maxIntegrity, r.waves.map((w) => w.integrityLost).join(','), r.steps.filter((x) => x.error !== null).map((x) => x.error), r.medals])}\n`);
    }
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
    'passes every harness check, par in the band, and keeps Goldie’s line in full dark with %s shifted %s',
    (_name, _way, patches) => {
      const c = shiftedContent('a2_m06', patches);
      const { failed, par } = judgeShift(c, 'a2_m06');
      expect(failed).toEqual([]);
      expect(par.result!.integrity).toBeGreaterThanOrEqual(15);
      expectFullDarkForGoldie(c, 'par');
    },
  );
});
