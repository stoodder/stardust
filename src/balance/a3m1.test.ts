// A3M1's tuning is robust where it matters (T620). As tuned, par wins at 16/24 Evacuated (66.7%, the
// Escort chain after A2M5's 75; act3.md § A3M1) on the reference branch (`cleared`: Old Thrum's
// group doesn't walk) and at 20/30 (66.7%) when she was spared, her group losing two to the east
// rift's Motes in W10. Par's eight are the Moths it can't stop (one in W8, two in W13, four in
// W14's flock) and one refugee the W9 east-rift Maw gathers out of Bramble's column, so par earns
// neither Nothing Gathered nor The Matriarch's Young. Without splash, the Mote clusters walk
// through and the map is lost by W9; without air, the Rift Moths of W5, W8 and W9 take the
// sheltered from the gate and it is lost in W9 too. Both alts win (62.5 and 70.8), Story wins,
// and alwaysCallEarly wins (W2 and W6, the rift openings, can't be called early, so their cracks
// run a whole build phase).
//
// The beats (act3.md § A3M1, Waves): each group walks out as its wave starts (W1, W5, W9 Bramble's
// column, W10 Old Thrum's if spared, W14); the north rift cracks as W1 starts and opens as W2
// starts, the east rift as W5 and W6 start, and nothing walks a rift before it opens; Ves'thara's
// Maw cue plays as the first Maw spawns (W4); both W9 Maws come while Bramble's column is on the
// road; and the map is won only once the road is empty, so the Leaving Song (before Results;
// story/a3m1Scenes.test.ts) plays after the last group is out. Every reference run lands them, and
// so does par with every Mote, Moth, Maw or Fracture group shifted ±0.2 s, where it stays at 16 of
// 24 (20 or 21 of 30 spared).
//
// The loss cap is a share of who walks (`maxLostPct: 0.53`, D143): 13 of 24, 16 of 30, so the spared
// branch's slack is never thinner than the cleared one's (par: 5 short of the cap cleared, 6 spared).
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { CompiledContent } from '../content/compiled.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { WaveGroup } from '../content/types.ts';
import { createBuildExecutor, createSim, type SimEvent } from '../sim/index.ts';
import { escortMaxLost } from '../sim/escort.ts';
import { bothWays, delay, shiftedContent } from './__fixtures__/shifts.ts';
import { flagsFor } from './checks.ts';
import { buildFor, runMap } from './harness.ts';
import { referenceRunProfile, runConfig } from './profile.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

const content = compileContent(RAW_CONTENT);
const TICK_HZ = 60;
/** The waves whose start releases a refugee group (W10's only when Old Thrum was spared). */
const GROUP_WAVES = [1, 5, 9, 10, 14] as const;

/** Every group of `enemy`, in every wave, `d` s later. */
const allOf = (enemy: string, d: number) =>
  Object.fromEntries(
    Array.from({ length: 14 }, (_, i) => [i + 1, delay((g: WaveGroup) => g.enemy === enemy, d)]),
  );

/** The compound shifts, each run both ways (`s` = ±1). */
const SHIFTS = {
  'every Mote group': (s: number) => allOf('mote', 0.2 * s),
  'every Rift Moth group': (s: number) => allOf('riftmoth', 0.2 * s),
  'every Maw': (s: number) => allOf('maw', 0.2 * s),
  'every Fracture group': (s: number) => allOf('fracture', 0.2 * s),
} as const;

/** What one run shows of the escort and the map's beats. */
interface Beats {
  readonly outcome: string;
  readonly evacuated: number;
  readonly total: number;
  /** Each event's ticks by key: `WaveStarted N`, `RiftOpening <lane>`, cue ids, and so on. */
  readonly at: Readonly<Record<string, readonly number[]>>;
  /** The ticks refugees were released on, with how many each. */
  readonly released: ReadonlyMap<number, number>;
  /** The first spawn tick on each rift lane. */
  readonly firstOnRift: Readonly<Record<string, number>>;
  /** Spawn ticks of W9's Maws. */
  readonly w9Maws: readonly number[];
  /** The tick the last of Bramble's column was evacuated or lost. */
  readonly brambleGone: number;
}

/** Plays `label` (a harness run label) on `c` to its end, logging the beats. */
function beats(
  c: CompiledContent,
  label: string,
  difficulty: 'standard' | 'story' = 'standard',
): Beats {
  const map = c.maps.a3_m01;
  const build = buildFor(label, map, c)!;
  const flags = flagsFor(label, map) ?? {};
  const sim = createSim(
    runConfig(c, map, build, referenceRunProfile(map, c, difficulty), 1, flags),
  );
  const exec = createBuildExecutor(sim, build);
  const st = sim.state;
  const out: SimEvent[] = [];
  const at: Record<string, number[]> = {};
  const released = new Map<number, number>();
  const firstOnRift: Record<string, number> = {};
  const w9Maws: number[] = [];
  const push = (key: string): void => {
    (at[key] ??= []).push(st.tick);
  };
  // Bramble's column is the third group released: its refugees' uids.
  const brambleUids = new Set<number>();
  let releases = 0;
  let lastRelease = -1;
  let brambleGone = -1;
  while (st.outcome === 'playing' && st.tick < 60 * 60 * 30) {
    exec.beforeTick();
    sim.step();
    out.length = 0;
    sim.drainEvents(out);
    for (const e of out) {
      if (e.type === 'WaveStarted') push(`WaveStarted ${e.wave}`);
      else if (e.type === 'RiftOpening' || e.type === 'RiftOpened') push(`${e.type} ${e.route}`);
      else if (e.type === 'ScriptCue') push(e.cueId);
      else if (e.type === 'MapWon' || e.type === 'MapLost') push(e.type);
      else if (
        e.type === 'RefugeeEvacuated' ||
        (e.type === 'RefugeeLost' && e.cause === 'hushed')
      ) {
        // Off the road: out of the gate, or hushed or gathered on the way (one taken at the gate
        // was already out).
        push('RefugeeDone');
        if (brambleUids.has(e.uid)) {
          brambleUids.delete(e.uid);
          if (brambleUids.size === 0) brambleGone = st.tick;
        }
      } else if (e.type === 'AllySpawned' && e.kind === 'refugee') {
        if (st.tick !== lastRelease) releases++;
        lastRelease = st.tick;
        released.set(st.tick, (released.get(st.tick) ?? 0) + 1);
        if (releases === 3) brambleUids.add(e.uid);
      } else if (e.type === 'EnemySpawned') {
        if (e.route.startsWith('rift_')) firstOnRift[e.route] ??= st.tick;
        if (e.enemy === 'maw') {
          push('maw');
          if (e.wave === 9) w9Maws.push(st.tick);
        }
      }
    }
  }
  return {
    outcome: st.outcome,
    evacuated: st.stats.evacuated,
    total: st.refugeeTotal,
    at,
    released,
    firstOnRift,
    w9Maws,
    brambleGone,
  };
}

/** The beats every reference run lands (act3.md § A3M1, Waves). */
function expectBeats(b: Beats, label: string, spared: boolean): void {
  const one = (k: string): number => {
    expect(b.at[k], `${label}: ${k}`).toHaveLength(1);
    return b.at[k]![0]!;
  };
  expect(b.outcome, label).toBe('won');
  const start = (w: number): number => one(`WaveStarted ${w}`);
  // Each group walks out as its wave starts, six at a time; Old Thrum's only if she was spared.
  const waves = GROUP_WAVES.filter((w) => spared || w !== 10);
  expect([...b.released.keys()], label).toEqual(waves.map(start));
  expect([...b.released.values()], label).toEqual(waves.map(() => 6));
  expect(b.total, label).toBe(waves.length * 6);
  // The rifts crack as the wave before theirs starts (the north rift's W1, the east rift's W5)
  // and open as theirs does (W2, W6); nothing walks one before it opens.
  expect(one('RiftOpening rift_n'), label).toBe(start(1));
  expect(one('RiftOpened rift_n'), label).toBe(start(2));
  expect(one('RiftOpening rift_e'), label).toBe(start(5));
  expect(one('RiftOpened rift_e'), label).toBe(start(6));
  expect(b.firstOnRift.rift_n!, label).toBeGreaterThanOrEqual(start(2));
  expect(b.firstOnRift.rift_e!, label).toBeGreaterThanOrEqual(start(6));
  // Ves'thara's Maw line plays as the first Maw spawns (W4; within the shifts' 0.2 s).
  const firstMaw = b.at.maw![0]!;
  expect(firstMaw, label).toBeGreaterThan(start(4));
  expect(firstMaw, label).toBeLessThan(start(5));
  expect(Math.abs(one('a3_m01_cue_maw') - firstMaw), label).toBeLessThanOrEqual(0.2 * TICK_HZ);
  // Both W9 Maws come while Bramble's column is still on the road.
  expect(b.w9Maws, label).toHaveLength(2);
  for (const t of b.w9Maws) expect(t, label).toBeLessThan(b.brambleGone);
  // The map is won only once the road is empty (the last group out after W14 starts), so the
  // Leaving Song, which plays as the win ends, comes after every refugee is safe or lost.
  const won = one('MapWon');
  const done = b.at.RefugeeDone!;
  expect(done, label).toHaveLength(b.total);
  expect(done.at(-1)!, label).toBeLessThanOrEqual(won);
  expect(done.at(-1)!, label).toBeGreaterThan(start(14));
}

// Each test re-runs a whole map's harness (or its par): seconds, not milliseconds.
describe('A3M1 balance', { timeout: HARNESS_TEST_TIMEOUT_MS }, () => {
  const report = runMap(content, 'a3_m01', { seeds: 1 });
  const run = (build: string) => report.runs.find((r) => r.build === build && !r.repeat)!;

  it('passes every harness check as tuned, par at 16/24 Evacuated (20/30 spared)', () => {
    expect(report.checks.filter((k) => !k.ok).map((k) => k.id)).toEqual([]);
    const par = run('par').result!;
    expect([par.outcome, par.stats.evacuated, par.escortTotal, par.stats.refugeesLost]).toEqual([
      'won',
      16,
      24,
      8,
    ]);
    // Its eight: a Moth in W8, the gathered refugee in W9, two Moths in W13, four in W14.
    expect(par.waves.map((w) => w.refugeesLost)).toEqual([
      0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 2, 4,
    ]);
    expect(par.stats.refugeesGathered).toBe(1);
    expect(par.medals.challenge).not.toBe('earned');
    // The Matriarch's Young: the gathered refugee was Bramble's.
    expect(par.objectives).toEqual(['failed']);
    const spared = run('flag:spared_quiet_wave=true').result!;
    expect([spared.outcome, spared.stats.evacuated, spared.escortTotal]).toEqual(['won', 20, 30]);
    expect(run('flag:spared_quiet_wave=false').result!.stats.evacuated).toBe(16);
  });

  it('scales its loss cap with who walks: 13 of 24, 16 of 30, the spared slack no thinner', () => {
    const map = content.maps.a3_m01;
    const capOf = (total: number): number => escortMaxLost({ refugeeTotal: total }, map)!;
    expect([capOf(24), capOf(30)]).toEqual([13, 16]);
    const slack = (build: string): number => {
      const r = run(build).result!;
      return capOf(r.escortTotal) - r.stats.refugeesLost;
    };
    expect(slack('flag:spared_quiet_wave=false')).toBe(5);
    expect(slack('flag:spared_quiet_wave=true')).toBeGreaterThanOrEqual(
      slack('flag:spared_quiet_wave=false'),
    );
  });

  it('loses without splash and without air by W9, and doing nothing loses', () => {
    for (const c of ['splash', 'air']) {
      const r = run(`noCounter:${c}`).result!;
      expect(r.outcome, c).toBe('lost');
      expect(r.lostAtWave, c).toBeLessThanOrEqual(9);
    }
    // Without air, the Moths take the sheltered at the gate: every one of them leaks.
    const air = run('noCounter:air').result!;
    expect(air.stats.leaksByEnemy.riftmoth).toBeGreaterThanOrEqual(10);
    expect(run('none').result!.outcome).toBe('lost');
  });

  it('lets both alts win, and Story win', () => {
    for (const alt of ['alt:rivets', 'alt:soak_and_coil']) {
      const r = run(alt);
      expect(r.result!.outcome, alt).toBe('won');
      expect(r.marginPct, alt).toBeGreaterThanOrEqual(50);
    }
    expect(run('par@story').result!.outcome).toBe('won');
  });

  it('runs about twelve minutes at 1× (Act III: 12–18)', () => {
    const minutes = run('par').result!.ticks / (TICK_HZ * 60);
    expect(minutes).toBeGreaterThan(11.5);
    expect(minutes).toBeLessThan(18);
  });

  it('never lets the rift waves be called early (W2, W6): their cracks run a whole build phase', () => {
    expect(content.maps.a3_m01.waves.map((w) => w.noCall)).toEqual(
      Array.from({ length: 14 }, (_, i) => i === 1 || i === 5),
    );
  });

  it('lands every beat in par, both alts, Story and alwaysCallEarly, spared or not', () => {
    for (const label of ['par', 'alt:rivets', 'alt:soak_and_coil', 'alwaysCallEarly']) {
      expectBeats(beats(content, label), label, false);
    }
    expectBeats(beats(content, 'par', 'story'), 'par@story', false);
    expectBeats(beats(content, 'flag:spared_quiet_wave=true'), 'spared', true);
  });

  it.each(bothWays(SHIFTS))(
    'holds par in the band (15–16 of 24) and every beat with %s shifted %s',
    (_name, _way, patches) => {
      const c = shiftedContent('a3_m01', patches);
      const b = beats(c, 'par');
      expect(b.evacuated).toBeGreaterThanOrEqual(15);
      expect(b.evacuated).toBeLessThanOrEqual(16);
      expectBeats(b, 'par', false);
      const s = beats(c, 'flag:spared_quiet_wave=true');
      expect(s.evacuated).toBeGreaterThanOrEqual(15);
      expect(s.evacuated).toBeLessThanOrEqual(21);
      expectBeats(s, 'spared', true);
    },
  );
});
