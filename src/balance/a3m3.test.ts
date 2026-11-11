// A3M3's tuning and its beats (T622, T660; act3.md § A3M3). A Holdout: judged on Evacuated % against
// its 50% floor, outside the monotonic chain (balance/holdout.ts). As tuned (36 refugees through
// either door), par holds 25/36 (69.4%) through the convoy's door and 27/36 (75.0%) through the
// warren's, the design's ≈70. Its losses are all the doomed escalation's: the Undertows that come
// down the rifts behind Bricks in W11–W13 (two, then three, then three: no build holds them all),
// each taking one of the sheltered (two hush the convoy on its road). Without its casts (Suppressing
// Fire on the east rift's W4 Motes, the W8 cluster at the choke, and the rift Undertows of W11–W12)
// it ends at 66.7. Both alts reach the floor through both doors (Den + Zapcoil + Skyhook + Lookout
// 58.3 / 63.9; Den + Prism + Harpoon + Zapcoil 61.1 / 66.7). Without air the Moths take the
// sheltered (22.2 / 27.8); without splash, Mindspikes where par's Thumpers stand first lose people
// to W10's packed cluster (four / three: the doom's preview, a wave splash holds, D143), then the
// doomed waves' clusters flood the choke past Bricks (25.0 / 30.6); doing nothing loses. Air and
// splash are the map's required counters; burrowing is intel (map.ts `softExempt`): A3M3
// introduces the Undertow and doom-scripts it, and the burrowed exam is the finale's (D141, T604c).
//
// The revocation window (A3M2's Clean Exit could take the Rivet, the Thumper, the Sprinkler or the
// Skyhook; content/validateRevocation.ts checks the counter guarantee statically): each build is run
// with the class the cue took swapped for the Rivet the player kept, through both doors. The alts
// (neither carries a Thumper) still reach the floor, and so does par unless the cue took its
// Thumper: Rivets in its place make it a no-splash build, which leaks in W10 and falls in the doom
// (13.9 / 19.4). That player's briefing says so (Bricks: "Bring something that chains."), and a
// plain Zapcoil wherever par builds a Thumper holds W10 and the floor (52.8 / 61.1; D143), with or
// without Head Start (a3m3Protocols.test.ts: the map's 770 credits include Head Start's tenth, so
// an inert Bulkhead in the slot costs nothing). No-air and no-splash stay under the floor.
//
// The Seer's Lantern probe (T568; report-only, like A2M6's D138 probes): par with the Lantern in
// the Prism's place holds 25/36 / 27/36, a match for par, so it is no trap; Truthlight there, bought
// with par's upgrades from W8 on, lands only in W11 and holds 21 / 23 (its 360 credits don't pay
// back before the doom, whose Undertows nothing else is placed to kill once marked). In the
// Mindspike's place the Lantern falls under the floor (12 / 14): the Mindspike is what kills the
// Undertows, and the Lantern's 4 Psionic/s doesn't.
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
import type { CompiledBuild, CompiledBuildStep, CompiledContent } from '../content/compiled.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { GridPos, TowerId, WaveGroup } from '../content/types.ts';
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

/** `build` with every `from` (its loadout slot and each build of it) swapped for `to`. */
function swapClass(build: CompiledBuild, from: TowerId, to: TowerId): CompiledBuild {
  if (from === to || !build.loadout.includes(from)) return build;
  return {
    ...build,
    loadout: build.loadout.map((t) => (t === from ? to : t)),
    steps: build.steps.map((s) =>
      s.kind === 'build' && s.tower === from ? { ...s, tower: to } : s,
    ),
  };
}

/** `build` with `taken` (the class A3M2 took) swapped for the Rivet the player kept. */
const withoutClass = (build: CompiledBuild, taken: TowerId): CompiledBuild =>
  swapClass(build, taken, 'rivet');

/**
 * Par as the player whose Thumper the Clean Exit took and who took Bricks's briefing advice
 * ("Bring something that chains."): a Zapcoil wherever par builds a Thumper, nothing else changed.
 */
const zapcoilSwap = (): CompiledBuild =>
  swapClass(buildFor('par', content.maps.a3_m03, content)!, 'thumper', 'zapcoil');

/** `label`'s build (optionally without a class), or `build` itself, played through `door`. */
function play(
  label: string | CompiledBuild,
  door: Door,
  taken: TowerId = 'rivet',
  catalog: 'reference' | 'full' = 'reference',
) {
  const map = content.maps.a3_m03;
  const at = typeof label === 'string' ? label : 'build';
  const base = typeof label === 'string' ? buildFor(label, map, content)! : label;
  const build = withoutClass(base, taken);
  const profile =
    catalog === 'full' ? fullCatalogProfile(map, content) : referenceRunProfile(map, content);
  const r = runHeadless(runConfig(content, map, build, profile, 1, { door_choice: door }), build);
  expect(r.forcedInputs, at).toEqual(['seal']);
  return r;
}

/** The refugees `wave`'s units cost a run. */
const lostIn = (r: ReturnType<typeof play>, wave: number): number =>
  r.waves[wave - 1]!.refugeesLost;

/** Evacuated % of `label`'s build (optionally without a class) through `door`. */
function evacuatedPct(
  label: string | CompiledBuild,
  door: Door,
  taken: TowerId = 'rivet',
  catalog: 'reference' | 'full' = 'reference',
): number {
  const r = play(label, door, taken, catalog);
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

/**
 * The Lantern probe (T568, report-only): par with its `from` tower swapped for the Seer's Lantern on
 * the same pad and upgrades. With `truthlight`, par's upgrades from W8 on go instead to the
 * Lantern's tier 3 (W7) and Truthlight (W8; it lands once the credits are in).
 */
function lanternProbe(from: TowerId, truthlight: boolean): CompiledBuild {
  const p = par();
  const pad = p.steps.find((st) => st.kind === 'build' && st.tower === from)!;
  const tile: GridPos = pad.kind === 'build' ? pad.tile : [0, 0];
  const on = (t: GridPos): boolean => t[0] === tile[0] && t[1] === tile[1];
  const steps: CompiledBuildStep[] = [];
  for (const st of p.steps) {
    if (st.kind === 'build' && st.tower === from) steps.push({ ...st, tower: 'lantern' });
    else if (truthlight && st.kind === 'upgrade' && !on(st.tile) && st.wave >= 8) continue;
    else steps.push(st);
  }
  if (truthlight) {
    const at = steps.findIndex((st) => st.wave >= 8);
    const ranks = steps.filter((st) => st.kind === 'upgrade' && on(st.tile)).length;
    const buy: CompiledBuildStep[] = [
      ...Array.from({ length: 2 - ranks }, (): CompiledBuildStep => ({
        wave: 7,
        kind: 'upgrade',
        tile,
      })),
      { wave: 8, kind: 'specialize', tile, spec: 'b' },
    ];
    steps.splice(at, 0, ...buy);
  }
  return { ...p, loadout: p.loadout.map((t) => (t === from ? 'lantern' : t)), steps };
}
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

  it('passes every harness check', () => {
    expect(failing).toEqual([]);
  });

  it('requires air and splash only: the Undertows are intel (softExempt)', () => {
    const m = content.maps.a3_m03;
    expect(m.requiredCounters).toEqual(['air', 'splash']);
    expect(Object.keys(m.builds.noCounterBuilds).toSorted()).toEqual(['air', 'splash']);
  });

  it('holds par at 25/36 through the convoy and 27/36 through the warren', () => {
    const p = run('par').result!;
    expect([p.outcome, p.stats.evacuated, p.escortTotal, p.forcedInputs]).toEqual([
      'won',
      25,
      36,
      ['seal'],
    ]);
    expect(run('flag:door_choice=warren').result!.stats.evacuated).toBe(27);
    // Every loss is the doom's (W11–W13): it holds every wave before.
    expect(p.waves.slice(0, 10).every((w) => w.refugeesLost === 0)).toBe(true);
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
    'with the Clean Exit having taken the %s: the alts hold, no-air and no-splash fall, both doors',
    (taken) => {
      for (const door of DOORS) {
        const at = `${taken}, ${door}`;
        // Par holds unless the class was its splash: Rivets in the Thumpers' place hold no cluster.
        const parPct = evacuatedPct('par', door, taken);
        if (taken === 'thumper') expect(parPct, at).toBeLessThan(50);
        else expect(parPct, at).toBeGreaterThanOrEqual(65);
        for (const alt of ['alt:coils', 'alt:no_everglow']) {
          expect(evacuatedPct(alt, door, taken), `${alt} ${at}`).toBeGreaterThanOrEqual(50);
        }
        for (const nc of ['noCounter:air', 'noCounter:splash']) {
          expect(evacuatedPct(nc, door, taken), `${nc} ${at}`).toBeLessThan(50);
        }
      }
    },
  );

  it('holds the floor with a plain Zapcoil-for-Thumper swap of par, through both doors (D143)', () => {
    for (const door of DOORS) {
      expect(evacuatedPct(zapcoilSwap(), door), door).toBeGreaterThanOrEqual(50);
    }
  });

  // The doom's preview (D143 R4c): W10's packed cluster is where a build without splash first
  // loses people, so the player can tell a build's failure from the doom before the doom comes.
  it('shows a no-splash build leaking in W10, a holdable wave that splash holds', () => {
    for (const door of DOORS) {
      for (const label of ['par', 'alt:coils', 'alt:no_everglow']) {
        expect(lostIn(play(label, door), 10), `${label} ${door}`).toBe(0);
      }
      expect(lostIn(play(zapcoilSwap(), door), 10), `zapcoil swap ${door}`).toBe(0);
      expect(
        lostIn(play('noCounter:splash', door), 10),
        `no-splash ${door}`,
      ).toBeGreaterThanOrEqual(2);
      expect(
        lostIn(play('par', door, 'thumper'), 10),
        `par, Rivets ${door}`,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it('keeps no-air and no-splash under the floor with the full catalog, through either door', () => {
    for (const door of DOORS) {
      for (const nc of ['noCounter:air', 'noCounter:splash']) {
        expect(evacuatedPct(nc, door, 'rivet', 'full'), `${nc} ${door}`).toBeLessThan(50);
      }
    }
  });

  // The Lantern probe's numbers are in the header; the probe only asserts that each run plays its
  // script whole to the SEAL and that the Lantern in the Prism's place is no trap (the floor).
  it('reports the Lantern probe: in the Prism’s place it holds the floor, Truthlight too', () => {
    const map = content.maps.a3_m03;
    const ref = referenceRunProfile(map, content);
    const profile = { ...ref, specs: [...ref.specs, 'lantern' as const] };
    const probes = {
      prism: lanternProbe('prism', false),
      truthlight: lanternProbe('prism', true),
      mindspike: lanternProbe('mindspike', false),
    };
    for (const [name, b] of Object.entries(probes)) {
      for (const door of DOORS) {
        const r = runHeadless(runConfig(content, map, b, profile, 1, { door_choice: door }), b);
        const at = `${name} ${door}`;
        expect(r.forcedInputs, at).toEqual(['seal']);
        expect(
          r.steps.every((st) => st.error === null && st.issuedTick >= 0),
          at,
        ).toBe(true);
        if (name !== 'mindspike') {
          expect((100 * r.stats.evacuated) / r.escortTotal, at).toBeGreaterThanOrEqual(50);
        }
      }
    }
  });

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
        expect(b.evacuated, door).toBeGreaterThanOrEqual(24);
        expectBeats(b, `par ${door}`);
      }
    },
  );
});
