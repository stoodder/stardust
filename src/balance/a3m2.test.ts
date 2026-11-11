// A3M2's tuning is robust where it matters (T621). As tuned, par wins at 14/22 (63.6%), the Defend
// chain after A2M6's 72.7 (act3.md § A3M2): the Clean Exit takes its Rivets 12 s into W7, the refund
// rebuilds as a Harpoon and two Mindspikes, and its only leaks are W12's hasted rush (thirteen
// drones; Emergency Bulkhead takes the first five), so it earns Back on Your Feet. Without its
// casts (Orbital Strike before the cue, Suppressing Fire on W14's rush) it ends at 45.5. Without
// armor the drone columns walk through and the map is lost in W8; without splash the packed Mote
// packs of W2 and W4 take it in W4. Both alts win (100 each), the cue taking the Sprinkler and the
// Rivets; par wins with the cue forced onto its Thumper (77.3); the Crane alt (T501c-M6) wins on
// the reference profile plus the Crane's specs; Story wins; alwaysCallEarly wins (54.5).
//
// The beats (act3.md § A3M2): the Clean Exit runs once, 12 s into W7 while its drone column is still
// spawning (so an early W8 call can't skip it, and it lands the same under alwaysCallEarly), with
// the class revoked, Orbital Strike revoked and QUILL's lockout on the same tick; QUILL's leak line
// for each wave from W8 is cued as that wave's countdown opens (once the wave before has finished
// spawning); the west rift cracks as W1 starts and opens as W2 starts, the east rift as W9 and W10
// start, and nothing walks a rift before it opens; Sterling's shuttle lifts during W12's spawn
// window. Every reference run lands them, and so does par with every drone, Expediter, Mote or
// Fracture group shifted ±0.2 s, where par holds 13–15 of 22 (inside the band).
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { CompiledBuild, CompiledBuildStep, CompiledContent } from '../content/compiled.ts';
import { CRANE_ALT } from '../content/maps/a3_m02/builds.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { BuildStep, WaveGroup } from '../content/types.ts';
import { secToTicks } from '../shared/time.ts';
import { createBuildExecutor, createSim, runHeadless, type SimEvent } from '../sim/index.ts';
import { bothWays, delay, shiftedContent } from './__fixtures__/shifts.ts';
import { flagsFor, marginOf } from './checks.ts';
import { buildFor, runMap } from './harness.ts';
import { referenceRunProfile, runConfig } from './profile.ts';
import { revokeClassOf } from './revokeChecks.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

const content = compileContent(RAW_CONTENT);
const TICK_HZ = 60;
const WAVES = 15;
/** Par's integrity left, of 22 (Reinforced Core 2). */
const PAR_INTEGRITY = 14;
/** The Clean Exit's moment: this long into W7 (map.ts `clean_exit`). */
const CUE_SEC = 12;
/** The waves whose countdown carries QUILL's leak line. */
const LEAK_WAVES = [8, 9, 10, 11, 12, 13, 14, 15] as const;

/** Every group of `enemy`, in every wave, `d` s later. */
const allOf = (enemy: string, d: number) =>
  Object.fromEntries(
    Array.from({ length: WAVES }, (_, i) => [i + 1, delay((g: WaveGroup) => g.enemy === enemy, d)]),
  );

/** The compound shifts, each run both ways (`s` = ±1). */
const SHIFTS = {
  'every drone group': (s: number) => allOf('compliance', 0.2 * s),
  'every Expediter group': (s: number) => allOf('expediter', 0.2 * s),
  'every Mote group': (s: number) => allOf('mote', 0.2 * s),
  'every Fracture group': (s: number) => allOf('fracture', 0.2 * s),
} as const;

/** What one run shows of the map's beats. */
interface Beats {
  readonly outcome: string;
  readonly integrity: number;
  /** Each event's ticks by key: `WaveStarted N`, `CountdownStarted N`, cue ids, and so on. */
  readonly at: Readonly<Record<string, readonly number[]>>;
  /** Each wave's last scheduled spawn tick (1-based): its start plus `lastSpawnTicks`. */
  readonly lastSpawn: readonly number[];
  /** The first spawn tick on each rift lane. */
  readonly firstOnRift: Readonly<Record<string, number>>;
  /** What the cue revoked: the class, the abilities, and the modifiers it turned on. */
  readonly revoked: readonly string[];
}

/** Plays `label` (a harness run label) on `c` to its end, logging the beats. */
function beats(
  c: CompiledContent,
  label: string,
  difficulty: 'standard' | 'story' = 'standard',
): Beats {
  const map = c.maps.a3_m02;
  const build = buildFor(label, map, c)!;
  const flags = flagsFor(label, map) ?? {};
  const forced = build.loadout.find((t) => t === revokeClassOf(label));
  const cfg = runConfig(c, map, build, referenceRunProfile(map, c, difficulty), 1, flags);
  const sim = createSim(forced === undefined ? cfg : { ...cfg, revokeClass: forced });
  const exec = createBuildExecutor(sim, build);
  const st = sim.state;
  const out: SimEvent[] = [];
  const at: Record<string, number[]> = {};
  const lastSpawn: number[] = [];
  const firstOnRift: Record<string, number> = {};
  const revoked: string[] = [];
  const push = (key: string): void => {
    (at[key] ??= []).push(st.tick);
  };
  while (st.outcome === 'playing' && st.tick < 60 * 60 * 30) {
    exec.beforeTick();
    sim.step();
    out.length = 0;
    sim.drainEvents(out);
    for (const e of out) {
      if (e.type === 'WaveStarted') {
        push(`WaveStarted ${e.wave}`);
        lastSpawn[e.wave] = st.tick + map.waves[e.wave - 1]!.lastSpawnTicks;
      } else if (e.type === 'CountdownStarted') push(`CountdownStarted ${e.wave}`);
      else if (e.type === 'RiftOpening' || e.type === 'RiftOpened') push(`${e.type} ${e.route}`);
      else if (e.type === 'ScriptCue') push(e.cueId);
      else if (e.type === 'MapWon' || e.type === 'MapLost') push(e.type);
      else if (e.type === 'ClassRevoked') {
        push('ClassRevoked');
        revoked.push(e.tower);
      } else if (e.type === 'AbilityRevoked') {
        push('AbilityRevoked');
        revoked.push(e.ability);
      } else if (e.type === 'ModifierChanged' && e.on) {
        push('ModifierChanged');
        revoked.push(e.modifier);
      } else if (e.type === 'EnemySpawned') {
        if (e.route.startsWith('rift_')) firstOnRift[e.route] ??= st.tick;
      }
    }
  }
  return { outcome: st.outcome, integrity: st.integrity, at, lastSpawn, firstOnRift, revoked };
}

/** The beats every reference run lands (act3.md § A3M2), the cue taking `cls`. */
function expectBeats(b: Beats, label: string, cls: string): void {
  const one = (k: string): number => {
    expect(b.at[k], `${label}: ${k}`).toHaveLength(1);
    return b.at[k]![0]!;
  };
  expect(b.outcome, label).toBe('won');
  const start = (w: number): number => one(`WaveStarted ${w}`);
  // The Clean Exit: 12 s into W7, inside its spawn window, everything on one tick.
  const cue = one('a3_m02_cue_revoke');
  expect(cue - start(7), label).toBe(CUE_SEC * TICK_HZ);
  expect(cue, label).toBeLessThan(b.lastSpawn[7]!);
  for (const k of ['ClassRevoked', 'AbilityRevoked', 'ModifierChanged']) {
    expect(one(k), `${label}: ${k}`).toBe(cue);
  }
  expect(b.revoked, label).toEqual([cls, 'orbital_strike', 'quillLockout']);
  // QUILL's leaks: each wave's line as its countdown opens, once the wave before is all out.
  for (const w of LEAK_WAVES) {
    const id = `a3_m02_cue_leak_w${String(w).padStart(2, '0')}`;
    const opens = one(`CountdownStarted ${w}`);
    expect(one(id), `${label}: ${id}`).toBe(opens);
    expect(opens, `${label}: ${id}`).toBeGreaterThan(cue);
    expect(opens, `${label}: W${w} countdown`).toBeGreaterThanOrEqual(b.lastSpawn[w - 1]!);
    expect(opens, `${label}: W${w} countdown`).toBeLessThan(start(w));
  }
  // The rifts crack as the wave before theirs starts and open as theirs does.
  expect(one('RiftOpening rift_w'), label).toBe(start(1));
  expect(one('RiftOpened rift_w'), label).toBe(start(2));
  expect(one('RiftOpening rift_e'), label).toBe(start(9));
  expect(one('RiftOpened rift_e'), label).toBe(start(10));
  expect(b.firstOnRift.rift_w!, label).toBeGreaterThanOrEqual(start(2));
  expect(b.firstOnRift.rift_e!, label).toBeGreaterThanOrEqual(start(10));
  // Sterling's shuttle lifts while W12 is still coming in.
  const shuttle = one('a3_m02_cue_shuttle');
  expect(shuttle, label).toBeGreaterThan(start(12));
  expect(shuttle, label).toBeLessThan(b.lastSpawn[12]!);
}

/** A build step as the content compiler shapes it (compileBuilds.ts; the kinds CRANE_ALT uses). */
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

/**
 * The Crane alt (T501c-M6; D137) compiled by hand: the reference profile owns neither the Crane nor
 * its specs, so it can't be an `altBuilds` entry; it runs on the reference profile plus the
 * Crane's specs (the sim doesn't check a loadout against a license).
 */
const CRANE: CompiledBuild = {
  loadout: CRANE_ALT.loadout,
  companion: null,
  technicianAbility: content.maps.a3_m02.builds.referenceProfile.technicianAbility,
  callEarly: false,
  steps: CRANE_ALT.steps.map(compileStep),
};

// Each test re-runs a whole map's harness (or its par): seconds, not milliseconds.
describe('A3M2 balance', { timeout: HARNESS_TEST_TIMEOUT_MS }, () => {
  const report = runMap(content, 'a3_m02', { seeds: 1 });
  const run = (build: string) => report.runs.find((r) => r.build === build && !r.repeat)!;

  it(`passes every harness check as tuned, par at ${PAR_INTEGRITY}/22 with the cue taking the Rivet`, () => {
    expect(report.checks.filter((k) => !k.ok).map((k) => k.id)).toEqual([]);
    const par = run('par').result!;
    expect(par.outcome).toBe('won');
    expect(run('par').marginPct).toBeCloseTo((PAR_INTEGRITY / 22) * 100, 5);
    expect(par.revoked).toEqual({ towers: ['rivet'], abilities: ['orbital_strike'] });
    // Par's leaks are the late drone rushes (W12, W14, W15); W8–W9 hold, so it earns Back on
    // Your Feet.
    const leaks = par.waves.map((w) => w.leaked);
    expect(leaks.slice(0, 11).every((n) => n === 0)).toBe(true);
    expect(par.medals.challenge).toBe('earned');
  });

  it('loses without armor and without splash by W10, and doing nothing loses', () => {
    for (const c of ['armor', 'splash']) {
      const r = run(`noCounter:${c}`).result!;
      expect(r.outcome, c).toBe('lost');
      expect(r.lostAtWave, c).toBeLessThanOrEqual(10);
    }
    expect(run('none').result!.outcome).toBe('lost');
  });

  it('survives losing any class it could lose: an alt for each, and par with its Thumper taken', () => {
    const cases = [
      ['alt:coil_and_beam', 'sprinkler'],
      ['alt:beam_and_spike', 'rivet'],
      ['revoke:thumper', 'thumper'],
      ['revoke:rivet', 'rivet'],
    ] as const;
    for (const [label, cls] of cases) {
      const r = run(label);
      expect(r.result!.outcome, label).toBe('won');
      expect(r.result!.revoked.towers, label).toEqual([cls]);
      expect(r.marginPct, label).toBeGreaterThanOrEqual(20);
    }
    expect(run('par@story').result!.outcome).toBe('won');
  });

  it('lets the Crane alt win (T501c-M6): Magnet Crane slams the drones, the cue takes the Thumper', () => {
    const map = content.maps.a3_m02;
    const ref = referenceRunProfile(map, content);
    const profile = { ...ref, specs: [...ref.specs, 'crane' as const] };
    const r = runHeadless(runConfig(content, map, CRANE, profile, 1), CRANE);
    expect(r.outcome).toBe('won');
    expect(r.revoked.towers).toEqual(['thumper']);
    expect(marginOf(r)).toBeGreaterThanOrEqual(20);
    expect(r.steps.filter((st) => st.error !== null)).toEqual([]);
  });

  it('runs about fourteen minutes at 1× (Act III: 12–18)', () => {
    const minutes = run('par').result!.ticks / (TICK_HZ * 60);
    expect(minutes).toBeGreaterThan(12);
    expect(minutes).toBeLessThan(18);
  });

  it('never lets the rift waves be called early (W2, W10): their cracks run a whole build phase', () => {
    expect(content.maps.a3_m02.waves.map((w) => w.noCall)).toEqual(
      Array.from({ length: WAVES }, (_, i) => i === 1 || i === 9),
    );
  });

  it('lands every beat in par, both alts, Story, alwaysCallEarly and each revoked class', () => {
    const runs = [
      ['par', 'rivet'],
      ['alt:coil_and_beam', 'sprinkler'],
      ['alt:beam_and_spike', 'rivet'],
      ['alwaysCallEarly', 'rivet'],
      ['revoke:thumper', 'thumper'],
    ] as const;
    for (const [label, cls] of runs) expectBeats(beats(content, label), label, cls);
    expectBeats(beats(content, 'par', 'story'), 'par@story', 'rivet');
  });

  it.each(bothWays(SHIFTS))(
    'holds par in the band and every beat with %s shifted %s',
    (_name, _way, patches) => {
      const c = shiftedContent('a3_m02', patches);
      const b = beats(c, 'par');
      expect(b.integrity).toBeGreaterThanOrEqual(13);
      expect(b.integrity).toBeLessThanOrEqual(15);
      expectBeats(b, 'par', 'rivet');
    },
  );
});
