// A3M4's tuning is robust where it matters (T720). As tuned, par wins at 14/22 (63.6%), the Defend
// chain after A3M2's 63.6 (act3.md § A3M4): its losses are W10's Hollow surge and W16's three
// Silencer packs. The warren's par (Gloop for the junction Rivet, a Mindspike under the Moths'
// lane) wins at 59.1, and both C1 branches play the same (the Choir is owned either way). The
// jam exam is cumulative (A3M4 is jam's teach map: `teachMap`, D146 addendum): no-jam (par with a
// Prism where its Choir stands, no Reboot) loses in W16, at least 10 points under par; no-armor
// and no-air lose by W11 (both in W6). Both alts win; Story wins; alwaysCallEarly wins.
//
// Jamming must be felt: par sees jams land in its Silencer waves (1 s on the towers in its Choir's
// aura, 4 s outside it) and never more than 25% of its towers at once (#10), but doesn't earn Keep
// the Lights On; a Reboot held for each pack's later tells earns it, and par with its Choir where
// the Silencers reach it (the lazy build) forfeits it.
//
// The beats (act3.md § A3M4): QUILL's "please hold fire" plays in W7's countdown (a `noCall`
// wave, so it always runs whole), then Gerald flies the mail chute as W7 starts, ahead of its
// drones, and is out of the hall before W8's countdown opens ("DELIVERY: COMPLETE."); every build
// holds fire for him, so par earns Signature: Received. Both rifts crack as W13 starts and open as
// W14 does, and nothing walks one before. They land in par, both alts, the warren, Story,
// alwaysCallEarly, and par with any group shifted ±0.2 s (where it stays in the band and no-jam
// still loses).
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { CompiledBuild, CompiledContent } from '../content/compiled.ts';
import { PADS } from '../content/maps/a3_m04/builds.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { WaveGroup } from '../content/types.ts';
import { createBuildExecutor, createSim, runHeadless, type SimEvent } from '../sim/index.ts';
import { bothWays, delay, shiftedContent } from './__fixtures__/shifts.ts';
import { flagsFor, marginOf } from './checks.ts';
import { buildFor, runMap } from './harness.ts';
import { referenceRunProfile, runConfig } from './profile.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

const content = compileContent(RAW_CONTENT);
const TICK_HZ = 60;
const WAVES = 16;
/** Par's integrity left, of 22 (Reinforced Core 2). */
const PAR_INTEGRITY = 14;
/** The waves that send Silencers. */
const SILENCER_WAVES = [4, 6, 9, 10, 12, 13, 14, 15, 16];

/** Runs build `label` (a harness label) on `c` to its end. */
function run(c: CompiledContent, label: string, build?: CompiledBuild) {
  const map = c.maps.a3_m04;
  const b = build ?? buildFor(label, map, c)!;
  const flags = flagsFor(label, map) ?? {};
  const story = label.endsWith('@story');
  const profile = referenceRunProfile(map, c, story ? 'story' : 'standard', undefined, flags);
  return runHeadless(runConfig(c, map, b, profile, 1, flags), b);
}

/** What one run shows of the map's beats. */
interface Beats {
  readonly outcome: string;
  readonly integrity: number;
  /** Each event's ticks by key: `WaveStarted N`, `CountdownStarted N`, `Gerald`, and so on. */
  readonly at: Readonly<Record<string, readonly number[]>>;
  /** The first spawn tick on each rift lane. */
  readonly firstOnRift: Readonly<Record<string, number>>;
  /** Jams landed per wave. */
  readonly jamsByWave: Readonly<Record<number, number>>;
  readonly neutralHits: number;
}

/** Plays `label` on `c` to its end, logging the beats. */
function beats(
  c: CompiledContent,
  label: string,
  difficulty: 'standard' | 'story' = 'standard',
): Beats {
  const map = c.maps.a3_m04;
  const build = buildFor(label, map, c)!;
  const flags = flagsFor(label, map) ?? {};
  const sim = createSim(
    runConfig(c, map, build, referenceRunProfile(map, c, difficulty, undefined, flags), 1, flags),
  );
  const exec = createBuildExecutor(sim, build);
  const st = sim.state;
  const out: SimEvent[] = [];
  const at: Record<string, number[]> = {};
  const firstOnRift: Record<string, number> = {};
  const jamsByWave: Record<number, number> = {};
  let neutralHits = 0;
  const push = (key: string): void => {
    (at[key] ??= []).push(st.tick);
  };
  while (st.outcome === 'playing' && st.tick < 60 * 60 * 30) {
    exec.beforeTick();
    sim.step();
    out.length = 0;
    sim.drainEvents(out);
    for (const e of out) {
      if (e.type === 'WaveStarted') push(`WaveStarted ${e.wave}`);
      else if (e.type === 'CountdownStarted') push(`CountdownStarted ${e.wave}`);
      else if (e.type === 'RiftOpening' || e.type === 'RiftOpened') push(`${e.type} ${e.route}`);
      else if (e.type === 'NeutralExited') push('GeraldOut');
      else if (e.type === 'NeutralHit') neutralHits++;
      else if (e.type === 'TowerJammed') jamsByWave[st.wave] = (jamsByWave[st.wave] ?? 0) + 1;
      else if (e.type === 'EnemySpawned') {
        if (e.enemy === 'gerald') push('Gerald');
        if (e.route.startsWith('rift_')) firstOnRift[e.route] ??= st.tick;
      }
    }
  }
  return { outcome: st.outcome, integrity: st.integrity, at, firstOnRift, jamsByWave, neutralHits };
}

/** The beats every reference run lands (act3.md § A3M4). */
function expectBeats(b: Beats, label: string): void {
  const one = (k: string): number => {
    expect(b.at[k], `${label}: ${k}`).toHaveLength(1);
    return b.at[k]![0]!;
  };
  expect(b.outcome, label).toBe('won');
  const start = (w: number): number => one(`WaveStarted ${w}`);
  // QUILL's warning in W7's countdown (a2_m04_w07 plays as it opens), then Gerald as W7 starts.
  expect(one('CountdownStarted 7'), label).toBeLessThan(start(7));
  expect(one('Gerald'), label).toBe(start(7));
  // He delivers before W8's countdown opens, where his status line plays.
  const out = one('GeraldOut');
  expect(out, label).toBeGreaterThan(start(7));
  expect(out, label).toBeLessThan(one('CountdownStarted 8'));
  expect(b.neutralHits, `${label}: Gerald hit`).toBe(0);
  // The rifts crack as W13 starts and open as W14 does; nothing walks one before.
  for (const r of ['rift_w', 'rift_e']) {
    expect(one(`RiftOpening ${r}`), label).toBe(start(13));
    expect(one(`RiftOpened ${r}`), label).toBe(start(14));
    expect(b.firstOnRift[r]!, label).toBeGreaterThanOrEqual(start(14));
  }
}

/** Every group of `enemy`, in every wave, `d` s later. */
const allOf = (enemy: string, d: number) =>
  Object.fromEntries(
    Array.from({ length: WAVES }, (_, i) => [i + 1, delay((g: WaveGroup) => g.enemy === enemy, d)]),
  );

/** The compound shifts, each run both ways (`s` = ±1). */
const SHIFTS = {
  'every drone group': (s: number) => allOf('compliance', 0.2 * s),
  'every Expediter group': (s: number) => allOf('expediter', 0.2 * s),
  'every Liability group': (s: number) => allOf('liability', 0.2 * s),
  'every Silencer group': (s: number) => allOf('silencer', 0.2 * s),
  'every Rift Moth group': (s: number) => allOf('riftmoth', 0.2 * s),
  'every Mote group': (s: number) => allOf('mote', 0.2 * s),
  'every Fracture group': (s: number) => allOf('fracture', 0.2 * s),
} as const;

// Each test re-runs a whole map's harness (or a few runs): seconds, not milliseconds.
describe('A3M4 balance', { timeout: HARNESS_TEST_TIMEOUT_MS }, () => {
  const report = runMap(content, 'a3_m04', { seeds: 1 });
  const rec = (build: string) => report.runs.find((r) => r.build === build && !r.repeat)!;

  it(`passes every harness check as tuned, par at ${PAR_INTEGRITY}/22 earning Signature: Received`, () => {
    expect(report.checks.filter((k) => !k.ok).map((k) => k.id)).toEqual([]);
    const par = rec('par').result!;
    expect(par.outcome).toBe('won');
    expect(rec('par').marginPct).toBeCloseTo((PAR_INTEGRITY / 22) * 100, 5);
    // Gerald never hit (Hold Fire on his pass): the objective is done.
    expect(par.stats.neutralHits).toBe(0);
    expect(par.objectives).toEqual(['done']);
    // Par holds every wave before W10's surge.
    expect(par.waves.slice(0, 9).every((w) => w.leaked === 0)).toBe(true);
    // The jam check for jam's teach map is #5 alone (#6 is skipped there, D146 addendum).
    expect(report.checks.some((k) => k.id === '6' && k.subject === 'noCounter:jam')).toBe(false);
  });

  it('loses without jam answers in W16, ≥ 10 points under par; without armor or air by W11', () => {
    const noJam = rec('noCounter:jam').result!;
    expect(noJam.outcome).toBe('lost');
    expect(noJam.lostAtWave).toBe(16);
    expect(rec('par').marginPct - rec('noCounter:jam').marginPct).toBeGreaterThanOrEqual(10);
    for (const c of ['armor', 'air']) {
      const r = rec(`noCounter:${c}`).result!;
      expect(r.outcome, c).toBe('lost');
      expect(r.lostAtWave, c).toBeLessThanOrEqual(11);
    }
    expect(rec('none').result!.outcome).toBe('lost');
  });

  it('wins both alts, Story, and alwaysCallEarly (within par + 10)', () => {
    for (const alt of ['alt:beam_and_flak', 'alt:den_and_lookout']) {
      expect(rec(alt).result!.outcome, alt).toBe('won');
      expect(rec(alt).marginPct, alt).toBeGreaterThanOrEqual(20);
    }
    expect(rec('par@story').result!.outcome).toBe('won');
    const early = rec('alwaysCallEarly');
    expect(early.result!.outcome).toBe('won');
    expect(early.marginPct).toBeLessThanOrEqual(rec('par').marginPct + 10);
  });

  it('plays every door × C1 cell in band with Signature: Received (warren: Gloop for the Rivet)', () => {
    const map = content.maps.a3_m04;
    for (const door of ['convoy', 'warren']) {
      for (const spared of [false, true]) {
        const label = `flags:door_choice=${door},spared_quiet_wave=${String(spared)}`;
        const build = buildFor(label, map, content)!;
        expect(build.loadout, label).toContain(door === 'warren' ? 'gloop' : 'rivet');
        const r = run(content, label);
        expect(r.outcome, label).toBe('won');
        expect(marginOf(r), label).toBeGreaterThanOrEqual(50);
        expect(marginOf(r), label).toBeLessThanOrEqual(70);
        expect(r.stats.neutralHits, label).toBe(0);
        expect(r.stats.jamOverLimitTicks, label).toBe(0);
      }
    }
  });

  it('makes jamming felt: par sees jams in its Silencer waves, ≤ 25% at once (#10)', () => {
    const b = beats(content, 'par');
    for (const w of SILENCER_WAVES.filter((x) => x >= 6)) {
      expect(b.jamsByWave[w] ?? 0, `W${w}`).toBeGreaterThan(0);
    }
    const par = rec('par').result!;
    expect(par.stats.jammedTowerTicks).toBeGreaterThan(0);
    expect(par.stats.jamOverLimitTicks).toBe(0);
    // Par doesn't earn Keep the Lights On (two jams overlap twice).
    expect(par.stats.jammedPeak).toBe(2);
    expect(par.medals.challenge).toBe('forfeited');
  });

  it('keeps Keep the Lights On earnable but not automatic', () => {
    const map = content.maps.a3_m04;
    const par = map.builds.parBuild;
    // A Reboot held for each pack's later tells (W10 at 29 s, W16 at 21 s) earns it.
    const held = {
      ...par,
      steps: par.steps.map((s) => {
        if (s.kind !== 'ability') return s;
        const sec = s.wave === 10 ? 29 : s.wave === 16 ? 21 : null;
        return sec === null ? s : { ...s, when: { afterTicks: sec * TICK_HZ } };
      }),
    };
    const careful = run(content, 'par', held);
    expect(careful.outcome).toBe('won');
    expect(careful.stats.jammedPeak).toBe(1);
    expect(careful.medals.challenge).toBe('earned');
    // The lazy build: the Choir at the junction, where the Silencers reach it (its jams take its
    // aura down with it).
    const lazy = {
      ...par,
      steps: par.steps.map((s) => {
        if (s.kind === 'build' && s.tower === 'choir') return { ...s, tile: PADS.J_NW };
        if (s.kind === 'upgrade' && s.tile[0] === PADS.HALL_W[0] && s.tile[1] === PADS.HALL_W[1]) {
          return { ...s, tile: PADS.J_NW };
        }
        return s;
      }),
    };
    const r = run(content, 'par', lazy);
    expect(r.stats.jammedPeak).toBeGreaterThan(1);
    expect(r.medals.challenge).toBe('forfeited');
  });

  it('runs about twelve minutes at 1× (Act III: 12–16)', () => {
    const minutes = rec('par').result!.ticks / (TICK_HZ * 60);
    expect(minutes).toBeGreaterThan(12);
    expect(minutes).toBeLessThan(16);
  });

  it('lands every beat in par, both alts, the warren, Story and alwaysCallEarly', () => {
    for (const label of [
      'par',
      'alt:beam_and_flak',
      'alt:den_and_lookout',
      'flag:door_choice=warren',
      'alwaysCallEarly',
    ]) {
      expectBeats(beats(content, label), label);
    }
    expectBeats(beats(content, 'par', 'story'), 'par@story');
  });

  it.each(bothWays(SHIFTS))(
    'wins par, loses no-jam, and lands every beat with %s shifted %s',
    (_name, _way, patches) => {
      const c = shiftedContent('a3_m04', patches);
      const b = beats(c, 'par');
      expect(b.integrity).toBeGreaterThanOrEqual(11); // ≥ 50%: the band's floor
      expectBeats(b, 'par');
      expect(run(c, 'noCounter:jam').outcome).toBe('lost');
    },
  );
});
