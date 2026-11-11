// A3M5's tuning (T721; act3.md § A3M5, As tuned). Par wins at 7/12 bearers (58.3%, the lower of
// the asset and the core's 16/22): the act's difficulty peak, under A3M4's 63.6. The asset pays for
// the hunts out of the sluice (W13's biggest group and W15's last), the core for the vats' surges.
// "Shareholder Value" (3800 HP, D146 addendum) is driven off a few tiles short of the core after
// all three of its phases. No-splash loses in W10's surge; no-armor in the W14 platform, having
// already paid for the W11 Liability column in W12; jam is exempt from #5/#6 (D146 addendum) and
// pinned in a3m5Jam.test.ts. Both alts, Story, and alwaysCallEarly win.
//
// The beats: the bearer groups walk as W5, W9, W13 and W15 start (Kip opens the vats at W5); the
// platform walks in W14 and its three cues play the tick after each phase begins; W15's countdown
// waits for it to be driven off; its plates land on the four crash markers, never a pad par uses.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { CompiledBuild } from '../content/compiled.ts';
import { PADS } from '../content/maps/a3_m05/builds.ts';
import { BEARER_WAVES } from '../content/maps/a3_m05/map.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { TICK_HZ, one, runA3m5, type A3m5Run } from './__fixtures__/a3m5.ts';
import { runMap } from './harness.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

const content = compileContent(RAW_CONTENT);
const map = content.maps.a3_m05;
const PAR_ASSET = 7;
const PAR_CORE = 16;
/** The platform's route length (A2M4's road): where it would leak. */
const ROAD_TILES = 38;

/** The beats every winning reference run lands (act3.md § A3M5). */
export function expectBeats(r: A3m5Run, label: string): void {
  expect(r.outcome, label).toBe('won');
  const start = (w: number): number => one(r, `WaveStarted ${w}`);
  // Each bearer group walks as its wave starts.
  const walks = r.at.BearerSpawned ?? [];
  for (const [w] of BEARER_WAVES) {
    expect(walks.filter((t) => t === start(w)).length, `${label}: W${w}'s bearers`).toBeGreaterThan(0);
  }
  expect(walks.every((t) => BEARER_WAVES.some(([w]) => t === start(w))), label).toBe(true);
  // The platform: three phases inside W14, each cue the tick after its phase begins.
  const cues = ['a3_m05_cue_sv_spawn', 'a3_m05_cue_takeover', 'a3_m05_cue_jettison'];
  let last = start(14);
  for (const [i, cue] of cues.entries()) {
    const phase = one(r, `BossPhase ${i + 1}`);
    expect(phase, `${label}: phase ${i + 1}`).toBeGreaterThanOrEqual(last);
    expect(one(r, `ScriptCue ${cue}`), `${label}: ${cue}`).toBe(phase + 1);
    last = phase;
  }
  // Driven off before the core, and W15's countdown waits for it.
  const ended = one(r, 'BossEnded');
  expect(ended, label).toBeGreaterThan(last);
  expect(r.droveOffAt!, label).toBeLessThan(ROAD_TILES);
  expect(one(r, 'CountdownStarted 15'), label).toBeGreaterThanOrEqual(ended);
  // The plates land on the crash site.
  expect(r.plates.toSorted(), label).toEqual(['crash_1', 'crash_2', 'crash_3', 'crash_4']);
}

describe('A3M5 balance', { timeout: HARNESS_TEST_TIMEOUT_MS }, () => {
  const report = runMap(content, 'a3_m05', { seeds: 1 });
  const rec = (build: string) => report.runs.find((r) => r.build === build && !r.repeat)!;

  it('passes every harness check as tuned, par at 7/12 bearers (core 16/22), Cut the Feed', () => {
    expect(report.checks.filter((k) => !k.ok).map((k) => `${k.id} ${k.subject}`)).toEqual([]);
    const par = rec('par').result!;
    expect(par.outcome).toBe('won');
    expect(rec('par').marginPct).toBeCloseTo((PAR_ASSET / 12) * 100, 5);
    expect(par.integrity).toBe(PAR_CORE);
    expect(par.objectives).toEqual(['done']);
    // The jam exemption: #5 and #6 don't run for no-jam (a3m5Jam.test.ts pins it).
    expect(report.checks.some((k) => k.subject.startsWith('noCounter:jam') && k.id !== '5')).toBe(
      false,
    );
    expect(map.builds.counterExemptions.map((x) => x.counter)).toEqual(['jam']);
  });

  it('loses without splash in W10, without armor at the platform after paying for W11', () => {
    const splash = rec('noCounter:splash').result!;
    expect([splash.outcome, splash.lostAtWave]).toEqual(['lost', 10]);
    const armor = rec('noCounter:armor').result!;
    expect([armor.outcome, armor.lostAtWave]).toEqual(['lost', 14]);
    // The W11 column (four Liabilities, two Associates) has cost it by the end of W12.
    const r = runA3m5(content, 'noCounter:armor');
    expect(r.startOf[13]!.integrity).toBeLessThan(r.startOf[11]!.integrity);
    expect(r.stats.leaksByEnemy.liability ?? 0).toBeGreaterThan(0);
    expect(rec('none').result!.outcome).toBe('lost');
  });

  it('wins both alts (≥ 20%), Story (≥ par), and alwaysCallEarly (≤ par + 10)', () => {
    for (const alt of ['alt:rivet_sproing', 'alt:beams']) {
      expect(rec(alt).result!.outcome, alt).toBe('won');
      expect(rec(alt).marginPct, alt).toBeGreaterThanOrEqual(20);
    }
    expect(rec('par@story').result!.outcome).toBe('won');
    expect(rec('par@story').marginPct).toBeGreaterThanOrEqual(rec('par').marginPct);
    const early = rec('alwaysCallEarly');
    expect(early.result!.outcome).toBe('won');
    expect(early.marginPct).toBeLessThanOrEqual(rec('par').marginPct + 10);
    // Par's casts matter (Stillness on W13's hunt; the W14 Reboot and Stillness).
    expect(rec('parNoAbilities').marginPct).toBeLessThan(rec('par').marginPct);
  });

  it('runs 12–18 minutes at 1× (Act III), about 13½', () => {
    const minutes = rec('par').result!.ticks / (TICK_HZ * 60);
    expect(minutes).toBeGreaterThan(12);
    expect(minutes).toBeLessThan(18);
    const story = rec('par@story').result!.ticks / (TICK_HZ * 60);
    expect(story).toBeLessThan(18);
  });

  it('lands every beat in par, both alts, Story and alwaysCallEarly', () => {
    for (const label of ['par', 'alt:rivet_sproing', 'alt:beams', 'alwaysCallEarly']) {
      expectBeats(runA3m5(content, label), label);
    }
    expectBeats(runA3m5(content, 'par', { difficulty: 'story' }), 'par@story');
  });

  it("drives the platform off after all three phases, a few tiles short of the core", () => {
    const r = runA3m5(content, 'par');
    expect(r.droveOffAt!).toBeGreaterThan(30);
    expect(r.droveOffAt!).toBeLessThan(ROAD_TILES);
    // The plates never land on a pad any reference build uses.
    const used = new Set<string>();
    const builds: CompiledBuild[] = [
      map.builds.parBuild,
      ...Object.values(map.builds.altBuilds),
      ...Object.values(map.builds.noCounterBuilds),
      ...map.builds.referenceProfileByFlag.flatMap((c) => (c.parBuild === null ? [] : [c.parBuild])),
    ];
    for (const b of builds) {
      for (const s of b.steps) if (s.kind === 'build') used.add(`${s.tile[0]},${s.tile[1]}`);
    }
    for (const m of ['crash_1', 'crash_2', 'crash_3', 'crash_4']) {
      const [c, row] = map.markers[m]!;
      expect(used.has(`${c},${row}`), m).toBe(false);
      expect(map.tiles[row * map.cols + c], m).toBe('.');
    }
    expect(Object.values(PADS).length).toBe(20);
  });
});

describe('A3M5 Cut the Feed', { timeout: HARNESS_TEST_TIMEOUT_MS }, () => {
  it('shrinks W10 by its surge group when the feed is cut (par), and QUILL says so', () => {
    const cut = runA3m5(content, 'par');
    const par = map.builds.parBuild;
    const uncut: CompiledBuild = {
      ...par,
      steps: par.steps.filter(
        (s) => !(s.kind === 'clear' && s.tile[1] === 0), // the feed lines lie on row 0
      ),
    };
    const open = runA3m5(content, 'par', { build: uncut });
    // Done before W10 starts, with its cue; the surge never walks.
    expect(one(cut, 'Objective cut_the_feed done')).toBeLessThan(one(cut, 'WaveStarted 10'));
    expect(cut.cues).toContain('a3_m05_cue_feed_cut');
    expect(cut.at['ScriptGroupSpawned feed_surge']).toBeUndefined();
    // Not cut: it fails as W10 starts, and the surge walks in then (ten more Motes in W10).
    expect(open.cues).not.toContain('a3_m05_cue_feed_cut');
    expect(one(open, 'ScriptGroupSpawned feed_surge')).toBe(one(open, 'WaveStarted 10'));
    expect(open.spawnedByWave[10]! - cut.spawnedByWave[10]!).toBe(10);
    expect(open.outcome).toBe('won');
  });
});
