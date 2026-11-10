// A2M3's tuning is robust where it matters (T422, T460). As tuned, par wins at 16/21 (76.2%) on every
// seed, its five lost late: three Lightwings in W9's big Aelari wave (before its Cloudburst lands)
// and two Motes in W11. Its click on the Peeker's rock lands 1.2 s into W5's countdown. A player
// who holds fire on every runner group still wins at 12/21 (57.1%, near the band's floor: mercy may
// cost integrity, never most of it, D121): only W5's and W8's two Motes chasing the slow runners
// get through while the hold lasts, and W10–W11's Zoomers outrun theirs. That player sets
// `held_fire_second_look`; par and the Spare runners filter don't. Each no-counter build loses by
// W8; the all-Zapcoil alt earns Clear Skies. With W9's Lightwings and the runners' chasers shifted
// ±0.2 s together (the Lightwings ±1 s, and W5, W7, W9, and W11 as a whole, checked in T422; the
// chasers ±0.5 s in T460), par holds at 16/21 and the hold-fire run at 12/21. The waves and builds
// are documented in docs/story/campaign/act2.md § A2M3.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { WaveGroup } from '../content/types.ts';
import { COUNTDOWN } from '../content/maps/a2_m03/waves.ts';
import { secToTicks } from '../shared/time.ts';
import { runHeadless, type HeadlessResult } from '../sim/index.ts';
import { bothWays, delay, shiftedContent } from './__fixtures__/shifts.ts';
import { buildFor, runMap } from './harness.ts';
import { referenceRunProfile, runConfig } from './profile.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

const content = compileContent(RAW_CONTENT);
const PAR_INTEGRITY = 16;
/** The hold-fire run's integrity: 57.1%, near the band's floor (D121). */
const HELD_INTEGRITY = 12;

/** The small Mote groups that chase the runners down the road (W5, W8, W10, W11). */
const isChaser = (g: WaveGroup): boolean =>
  g.enemy === 'mote' && g.route === 'road' && g.count <= 4;
const isLightwing = (g: WaveGroup): boolean => g.enemy === 'lightwing';

/** The compound shift, run both ways (`s` = ±1). */
const SHIFTS = {
  'W9’s Lightwings and the runners’ chasers': (s: number) => ({
    5: delay(isChaser, 0.2 * s),
    8: delay(isChaser, 0.2 * s),
    9: delay(isLightwing, 0.2 * s),
    10: delay(isChaser, 0.2 * s),
    11: delay(isChaser, 0.2 * s),
  }),
} as const;

/** One headless run of the build `label` on `c` (seed 1, the reference profile). */
function runOn(c: typeof content, label: string): HeadlessResult {
  const map = c.maps.a2_m03;
  const build = buildFor(label, map, c)!;
  return runHeadless(runConfig(c, map, build, referenceRunProfile(map, c), 1), build);
}

// Each test re-runs a whole map's harness (or its par): seconds, not milliseconds.
describe('A2M3 balance', { timeout: HARNESS_TEST_TIMEOUT_MS }, () => {
  const report = runMap(content, 'a2_m03', { seeds: 1 });
  const run = (build: string) => report.runs.find((r) => r.build === build && !r.repeat)!;
  const lostAt = (build: string): number => {
    const r = run(build).result!;
    expect(r.outcome).toBe('lost');
    return r.waves.findLastIndex((w) => w.spawned > 0) + 1;
  };

  it('passes every harness check as tuned, par at 16/21 with its losses late', () => {
    expect(report.checks.filter((k) => !k.ok).map((k) => k.id)).toEqual([]);
    const par = run('par').result!;
    expect([par.integrity, par.maxIntegrity]).toEqual([PAR_INTEGRITY, 21]);
    expect(par.waves.map((w) => w.integrityLost)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 2]);
    // The rescue is par's own click in W5's build phase, as soon as its W4 Zapcoil is bought,
    // 1.2 s into the countdown (the rock lights as it begins; D134), and the fallback never fires.
    const click = par.steps.find((s) => s.kind === 'interact')!;
    expect(click.error).toBeNull();
    const countdownTick = par.waves[4]!.startTick - secToTicks(COUNTDOWN);
    expect(click.issuedTick - countdownTick).toBe(secToTicks(1.2));
  });

  it('lets a player who spares every runner win, and only that player sets the flag', () => {
    const held = run('holdFireWhile:fleeing').result!;
    expect(held.outcome).toBe('won');
    expect(held.integrity).toBe(HELD_INTEGRITY);
    // Only the slow runners' chasers get through while it holds (two each in W5 and W8).
    expect(held.waves.map((w) => w.integrityLost)).toEqual([0, 0, 0, 0, 2, 0, 0, 2, 3, 0, 2]);
    expect(run('spareFleeing').result!.integrity).toBe(PAR_INTEGRITY);
  });

  it('makes shields, air, and splash the answers: each no-counter build loses by W8', () => {
    for (const c of ['shield', 'air', 'splash']) {
      expect(lostAt(`noCounter:${c}`)).toBeLessThanOrEqual(8);
    }
  });

  it('leaves Clear Skies to a build that holds the air: the all-Zapcoil alt earns it', () => {
    expect(run('par').result!.medals.challenge).not.toBe('earned');
    expect(run('alt:coil_and_shell').result!.medals.challenge).toBe('earned');
  });

  it.each(bothWays(SHIFTS))(
    'holds par at 16/21 and the hold-fire run at 12/21 with %s shifted %s',
    (_name, _way, patches) => {
      const c = shiftedContent('a2_m03', patches);
      const got = [runOn(c, 'par').integrity, runOn(c, 'holdFireWhile:fleeing').integrity];
      expect(got).toEqual([PAR_INTEGRITY, HELD_INTEGRITY]);
    },
  );
});
