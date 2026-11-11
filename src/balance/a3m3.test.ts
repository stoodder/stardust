// A3M3's tuning and its beats (T622; act3.md § A3M3). A Holdout: judged on Evacuated % against its
// 50% floor, outside the monotonic chain (balance/holdout.ts). As tuned (36 refugees through either
// door), par holds 27/36 (75.0%) through the convoy's door and 29/36 (80.6%) through the warren's.
// Its losses are the doomed escalation's: the Undertows that come down the rifts behind Bricks in
// W11–W13 (no build holds them all) and a Moth in W13, each taking one of the sheltered. Without its
// casts (Suppressing Fire on the east rift's W4 Motes, the W8 cluster at the choke, and the rift
// Undertows of W11–W12) it ends at 72.2. Both alts reach the floor through both doors (Den + Zapcoil
// + Skyhook + Lookout 55.6 / 61.1; Den + Prism + Harpoon + Zapcoil 52.8 / 58.3). Without air the
// Moths take the sheltered (30.6 / 30.6); without splash the Mote clusters of W2, W8, W11 and W13
// flood the choke past Bricks (25.0 / 25.0); doing nothing loses.
//
// **The burrowed exam is red until T604c.** Without a burrowed answer (a Harpoon where par's Dens
// stand) the build holds 77.8 / 83.3: a Harpoon out-damages a Scuttle Den on the Undertows even with
// the Den's burrowed DoT (towers.md § 7, ×2.5), because Bricks holds a surfaced Undertow still in the
// Harpoon's range. T604c (the Den's identity pass) owns the fix; these tests assert the check like
// any other, so they fail until it lands (D141 addendum: no skip, no pending marker).
//
// The revocation window (A3M2's Clean Exit could take the Rivet, the Thumper, the Sprinkler or the
// Skyhook; content/validateRevocation.ts checks the counter guarantee statically): each build is run
// with the class the cue took swapped for the Rivet the player kept, through both doors. The alts
// and par still reach the floor; no-air and no-splash stay under it.
//
// The beats (act3.md § A3M3, Waves): every wave from W2 is `noCall`, so the waves start on fixed
// ticks; the groups walk out as W1, W4, W7, W9 and W10 start, the last as W14's countdown opens (once
// W13 has finished spawning); QUILL's vitals cue plays as W13 starts, where Bricks's timeline puts him
// at 25%; the name tag is cued as W10's countdown opens; and the last refugee of the last group
// reaches the door on the tick before W14 starts, so the road is empty, W14 starts, and the SEAL
// fires (cue and forced input) on one tick, with Bricks on his 5% floor and nothing of W14 spawned;
// the press ends the map won. Every Standard reference run lands that tick exactly (par, both alts,
// both doors, the revoked classes, and par with any enemy kind shifted ±0.2 s). Story's countdowns
// are half again as long, so there the road empties during W14's countdown, before the SEAL.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { CompiledBuild, CompiledContent } from '../content/compiled.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { TowerId, WaveGroup } from '../content/types.ts';
import { createBuildExecutor, createSim, runHeadless, type SimEvent } from '../sim/index.ts';
import { bothWays, delay, shiftedContent } from './__fixtures__/shifts.ts';
import { buildFor, runMap } from './harness.ts';
import { fullCatalogProfile, referenceRunProfile, runConfig } from './profile.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

const content = compileContent(RAW_CONTENT);
const TICK_HZ = 60;
const WAVES = 14;
const DOORS = ['convoy', 'warren'] as const;
type Door = (typeof DOORS)[number];
/** The classes A3M2's Clean Exit could take (its reference loadout's Everglow classes). */
const REVOCABLE = ['rivet', 'thumper', 'sprinkler', 'skyhook'] as const;
/** The waves whose start releases a group (the last group's is W14's countdown). */
const GROUP_WAVES = [1, 4, 7, 9, 10] as const;

/** `build` with `taken` (the class A3M2 took) swapped for the Rivet the player kept. */
function withoutClass(build: CompiledBuild, taken: TowerId): CompiledBuild {
  if (taken === 'rivet' || !build.loadout.includes(taken)) return build;
  return {
    ...build,
    loadout: build.loadout.map((t) => (t === taken ? 'rivet' : t)),
    steps: build.steps.map((s) =>
      s.kind === 'build' && s.tower === taken ? { ...s, tower: 'rivet' } : s,
    ),
  };
}

/** Evacuated % of `label`'s build (optionally without a class) through `door`. */
function evacuatedPct(
  label: string,
  door: Door,
  taken: TowerId = 'rivet',
  catalog: 'reference' | 'full' = 'reference',
): number {
  const map = content.maps.a3_m03;
  const build = withoutClass(buildFor(label, map, content)!, taken);
  const profile =
    catalog === 'full' ? fullCatalogProfile(map, content) : referenceRunProfile(map, content);
  const r = runHeadless(runConfig(content, map, build, profile, 1, { door_choice: door }), build);
  expect(r.forcedInputs, label).toEqual(['seal']);
  return (100 * r.stats.evacuated) / r.escortTotal;
}

/** What one run shows of the map's beats (every tick is the event's own: the step it fired in). */
interface Beats {
  readonly outcome: string;
  readonly evacuated: number;
  readonly total: number;
  /** Each event's ticks by key: `WaveStarted N`, `Countdown N`, cue ids, `Seal`, `Held`. */
  readonly at: Readonly<Record<string, readonly number[]>>;
  /** Refugee releases: tick → how many. */
  readonly released: ReadonlyMap<number, number>;
  /** The tick the last group's last refugee was through (evacuated or lost on the road). */
  readonly lastThrough: number;
  /** Whether the whole last group was evacuated (none hushed on the road). */
  readonly lastAllEvacuated: boolean;
  /** Bricks's health as each wave started (index = wave − 1). */
  readonly healthAt: readonly number[];
  /** Units W14 spawned (never any). */
  readonly w14Spawned: number;
  readonly ticks: number;
}

/** Plays `build` on `c` to its end through `door`, logging the beats. */
function beats(
  c: CompiledContent,
  build: CompiledBuild,
  door: Door,
  difficulty: 'standard' | 'story' = 'standard',
): Beats {
  const map = c.maps.a3_m03;
  const cfg = runConfig(c, map, build, referenceRunProfile(map, c, difficulty), 1, {
    door_choice: door,
  });
  const sim = createSim(cfg);
  const exec = createBuildExecutor(sim, build);
  const st = sim.state;
  const out: SimEvent[] = [];
  const at: Record<string, number[]> = {};
  const released = new Map<number, number>();
  const healthAt: number[] = [];
  const push = (key: string, tick: number): void => {
    (at[key] ??= []).push(tick);
  };
  const lastGroup = new Set<number>();
  let releases = 0;
  let lastRelease = -1;
  let lastThrough = -1;
  let lastHushed = 0;
  let w14Spawned = 0;
  const bricks = (): number =>
    st.allies.items.find((a) => a.alive && a.kind === 'bricks')?.health ?? 1;
  while (st.outcome === 'playing' && st.tick < TICK_HZ * 60 * 30) {
    const tick = st.tick;
    const health = bricks();
    exec.beforeTick();
    sim.step();
    out.length = 0;
    sim.drainEvents(out);
    for (const e of out) {
      if (e.type === 'WaveStarted') {
        push(`WaveStarted ${e.wave}`, tick);
        healthAt[e.wave - 1] = health;
      } else if (e.type === 'CountdownStarted') push(`Countdown ${e.wave}`, tick);
      else if (e.type === 'ScriptCue') push(e.cueId, tick);
      else if (e.type === 'ForcedInputRequested') push('Seal', tick);
      else if (e.type === 'MapWon') push('Held', tick);
      else if (e.type === 'EnemySpawned' && e.wave === WAVES) w14Spawned++;
      else if (e.type === 'AllySpawned' && e.kind === 'refugee') {
        if (tick !== lastRelease) releases++;
        lastRelease = tick;
        released.set(tick, (released.get(tick) ?? 0) + 1);
        if (releases === GROUP_WAVES.length + 1) lastGroup.add(e.uid);
      } else if (
        e.type === 'RefugeeLost' &&
        e.cause !== 'exit' &&
        lastGroup.has(e.uid) &&
        lastGroup.size > 1
      ) {
        lastHushed++;
        lastGroup.delete(e.uid);
      } else if (
        (e.type === 'RefugeeEvacuated' || (e.type === 'RefugeeLost' && e.cause !== 'exit')) &&
        lastGroup.delete(e.uid) &&
        lastGroup.size === 0
      ) {
        lastThrough = tick;
        if (e.type === 'RefugeeLost') lastHushed++;
      }
    }
  }
  return {
    outcome: st.outcome,
    evacuated: st.stats.evacuated,
    total: st.refugeeTotal,
    at,
    released,
    lastThrough,
    lastAllEvacuated: lastHushed === 0,
    healthAt,
    w14Spawned,
    ticks: st.tick,
  };
}

/** The beats every reference run lands (see the header); `exact`: the SEAL's tick, Standard. */
function expectBeats(b: Beats, label: string, exact = true): void {
  const one = (k: string): number => {
    expect(b.at[k], `${label}: ${k}`).toHaveLength(1);
    return b.at[k]![0]!;
  };
  const start = (w: number): number => one(`WaveStarted ${w}`);
  expect(b.outcome, label).toBe('won');
  expect(b.total, label).toBe(36);
  // Six groups of six: as W1, W4, W7, W9 and W10 start, and the last as W14's countdown opens.
  expect([...b.released.keys()], label).toEqual([
    ...GROUP_WAVES.map(start),
    one(`Countdown ${WAVES}`),
  ]);
  expect([...b.released.values()], label).toEqual(Array.from({ length: 6 }, () => 6));
  // The name tag as W10's countdown opens; QUILL's vitals as W13 starts, Bricks at 25%.
  expect(one('a3_m03_cue_name_tag'), label).toBe(one('Countdown 10'));
  expect(one('a3_m03_cue_vitals'), label).toBe(start(13));
  expect(b.healthAt[12], label).toBeCloseTo(0.25, 6);
  // Near full through W10, then falling (D141: the timeline only).
  expect(Math.min(...b.healthAt.slice(0, 10)), label).toBeGreaterThanOrEqual(0.9);
  // The SEAL: W14 starts, its cue plays and the input is forced on one tick, Bricks on his floor,
  // nothing of W14 spawned; the press ends the map, held.
  const w14 = start(WAVES);
  expect(one('a3_m03_cue_seal'), label).toBe(w14);
  expect(one('Seal'), label).toBe(w14);
  expect(b.healthAt[WAVES - 1], label).toBe(0.05);
  expect(b.w14Spawned, label).toBe(0);
  expect(one('Held'), label).toBeGreaterThan(w14);
  // The last group is through as W14 starts: its last refugee reaches the door on the tick before
  // (the SEAL's tick freezes everything after the triggers, so that is the last tick it can).
  expect(b.lastThrough, label).toBeGreaterThan(one(`Countdown ${WAVES}`));
  expect(b.lastThrough, label).toBeLessThan(w14);
  if (exact && b.lastAllEvacuated) expect(b.lastThrough, label).toBe(w14 - 1);
}

const par = (c: CompiledContent = content): CompiledBuild => buildFor('par', c.maps.a3_m03, c)!;
const build = (label: string): CompiledBuild => buildFor(label, content.maps.a3_m03, content)!;

/** Every group of `enemy`, in every wave, `d` s later. */
const allOf = (enemy: string, d: number) =>
  Object.fromEntries(
    Array.from({ length: WAVES }, (_, i) => [i + 1, delay((g: WaveGroup) => g.enemy === enemy, d)]),
  );

/** The compound shifts, each run both ways (`s` = ±1). */
const SHIFTS = {
  'every Mote group': (s: number) => allOf('mote', 0.2 * s),
  'every Undertow group': (s: number) => allOf('undertow', 0.2 * s),
  'every Rift Moth group': (s: number) => allOf('riftmoth', 0.2 * s),
  'every Maw and Fracture': (s: number) => ({
    ...allOf('maw', 0.2 * s),
    ...Object.fromEntries(
      Array.from({ length: WAVES }, (_, i) => [
        i + 1,
        delay((g: WaveGroup) => g.enemy === 'maw' || g.enemy === 'fracture', 0.2 * s),
      ]),
    ),
  }),
} as const;

// Each test plays whole maps (or the harness's): seconds, not milliseconds.
describe('A3M3 balance', { timeout: HARNESS_TEST_TIMEOUT_MS }, () => {
  const report = runMap(content, 'a3_m03', { seeds: 1 });
  const run = (label: string) => report.runs.find((r) => r.build === label && !r.repeat)!;
  const failing = report.checks.filter((k) => !k.ok).map((k) => `#${k.id} ${k.title}`);

  it('passes every harness check but the burrowed exam', () => {
    expect(failing.filter((t) => !t.includes('noCounter:burrowed'))).toEqual([]);
  });

  // Red until T604c (the Den's identity pass): see the header.
  it('loses below the floor without a burrowed answer (#5, #6: T604c)', () => {
    expect(failing.filter((t) => t.includes('noCounter:burrowed'))).toEqual([]);
  });

  it('holds par at 27/36 through the convoy and 29/36 through the warren', () => {
    const p = run('par').result!;
    expect([p.outcome, p.stats.evacuated, p.escortTotal, p.forcedInputs]).toEqual([
      'won',
      27,
      36,
      ['seal'],
    ]);
    expect(run('flag:door_choice=warren').result!.stats.evacuated).toBe(29);
    // Much Obliged (≥ 60%) earned; Held the Door (≥ 85%, Perfect's slot) not.
    expect(p.medals).toMatchObject({ victory: 'earned', perfectCore: 'forfeited' });
    expect(p.medals.challenge).toBe('earned');
    // Its casts matter: without them it holds fewer.
    expect(run('parNoAbilities').marginPct).toBeLessThan(run('par').marginPct);
  });

  it('runs about twelve minutes at 1× (Act III: 12–18)', () => {
    const minutes = run('par').result!.ticks / (TICK_HZ * 60);
    expect(minutes).toBeGreaterThan(12);
    expect(minutes).toBeLessThan(18);
  });

  it('never lets a wave be called early (D141): every wave from W2 is noCall', () => {
    expect(content.maps.a3_m03.waves.map((w) => w.noCall)).toEqual(
      Array.from({ length: WAVES }, (_, i) => i > 0),
    );
  });

  it.each(REVOCABLE)(
    'with the Clean Exit having taken the %s: alts and par hold, no-air and no-splash fall, both doors',
    (taken) => {
      for (const door of DOORS) {
        const at = `${taken}, ${door}`;
        expect(evacuatedPct('par', door, taken), at).toBeGreaterThanOrEqual(65);
        for (const alt of ['alt:coils', 'alt:no_everglow']) {
          expect(evacuatedPct(alt, door, taken), `${alt} ${at}`).toBeGreaterThanOrEqual(50);
        }
        for (const nc of ['noCounter:air', 'noCounter:splash']) {
          expect(evacuatedPct(nc, door, taken), `${nc} ${at}`).toBeLessThan(50);
        }
      }
    },
  );

  it('keeps no-air and no-splash under the floor with the full catalog, through either door', () => {
    for (const door of DOORS) {
      for (const nc of ['noCounter:air', 'noCounter:splash']) {
        expect(evacuatedPct(nc, door, 'rivet', 'full'), `${nc} ${door}`).toBeLessThan(50);
      }
    }
  });

  // Red until T604c, like the harness check above.
  it.each(REVOCABLE)(
    'keeps no-burrowed under the floor with the Clean Exit having taken the %s (T604c)',
    (taken) => {
      for (const door of DOORS) {
        expect(evacuatedPct('noCounter:burrowed', door, taken), door).toBeLessThan(50);
      }
    },
  );

  it('lands the SEAL on W14’s first tick in every Standard reference run, both doors', () => {
    for (const door of DOORS) {
      for (const label of ['par', 'alt:coils', 'alt:no_everglow', 'alwaysCallEarly']) {
        expectBeats(beats(content, build(label), door), `${label} ${door}`);
      }
      for (const taken of REVOCABLE) {
        expectBeats(
          beats(content, withoutClass(par(), taken), door),
          `par without ${taken}, ${door}`,
        );
      }
    }
  });

  it('lands the SEAL on W14’s start under Story, the road empty before it', () => {
    for (const door of DOORS) {
      const b = beats(content, par(), door, 'story');
      expectBeats(b, `par@story ${door}`, false);
      expect(b.evacuated / b.total, door).toBeGreaterThanOrEqual(0.5);
    }
  });

  it.each(bothWays(SHIFTS))(
    'holds par over the floor and lands every beat with %s shifted %s',
    (_name, _way, patches) => {
      const c = shiftedContent('a3_m03', patches);
      for (const door of DOORS) {
        const b = beats(c, par(c), door);
        expect(b.evacuated, door).toBeGreaterThanOrEqual(25);
        expectBeats(b, `par ${door}`);
      }
    },
  );
});
