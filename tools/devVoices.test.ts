// T804: the finale's choir (design/maps.md § 5.5; sim/choir.ts, its rules' home), on dev_voices
// (devM8.ts), and the harness's Voices margin (#2; balance/checks.ts `marginOf`). Unit tests drive
// the choir system on dev_voices's road (8 tiles, the Halls (6,0) at the spawn end, the colony's
// gate (6,7) at the core end; the `halls` marker beside (6,1), so the leader stops 6 tiles up);
// whole-sim runs cover the hush, defeat, victory, determinism, and the halts' share.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../src/content/compile.ts';
import type { CompiledEnemyDef, CompiledMapDef, CompiledRoute } from '../src/content/compiled.ts';
import { CHOIR_SPACING_TILES } from '../src/content/rules.ts';
import type { IdSpace } from '../src/content/types.ts';
import type { CompiledContent } from '../src/content/compiled.ts';
import { fakeResult } from '../src/balance/__fixtures__/harness.ts';
import { marginOf } from '../src/balance/checks.ts';
import { marginChain, runMap } from '../src/balance/harness.ts';
import { HARNESS_GATES, refusedFeatures } from '../src/balance/refusals.ts';
import { parBand } from '../src/balance/rules.ts';
import { DEV_CONTENT } from '../src/render/__fixtures__/devBattle.ts';
import { spawn } from '../src/sim/__fixtures__/combat.ts';
import {
  choir,
  choirAt,
  choirLost,
  choirSize,
  hushSinger,
  initChoir,
  inSong,
  isHushedSinger,
  minVoicesOf,
  recoverSingers,
  songCircles,
  songRadius,
} from '../src/sim/choir.ts';
import type { ScriptFlags, SimConfig } from '../src/sim/config.ts';
import type { Ally } from '../src/sim/entities.ts';
import type { SimEvent } from '../src/sim/events.ts';
import { createBuildExecutor, runHeadless } from '../src/sim/headless.ts';
import { bookLeak } from '../src/sim/medals.ts';
import { createSim } from '../src/sim/sim.ts';
import { createState, type SimState } from '../src/sim/state.ts';
import { createScratch, type TickContext } from '../src/sim/tick.ts';

const DEV = compileContent(DEV_CONTENT);
const MAPS: Readonly<Record<string, CompiledMapDef<IdSpace>>> = DEV.maps;
const MAP = MAPS.dev_voices!;
const CHOIR = MAP.choir!;
const ROAD = CHOIR.route;
const MOTE = DEV.enemies.mote;
const PACE = CHOIR.paceTilesPerTick;
const SONG = {
  baseRadius: 2.5,
  silentPct: 0.6,
  restTarget: 40,
  restPerTick: 0.01,
  restPerBossHp: 0,
  multipliers: [],
  scatter: { reformTicks: 240, hpPct: 0.5 },
} as const;
const WITH_SONG: CompiledMapDef<IdSpace> = { ...MAP, song: SONG };

const WARREN: ScriptFlags = { door_choice: 'warren' };
const CONVOY: ScriptFlags = { door_choice: 'convoy' };
const SPARED: ScriptFlags = { spared_quiet_wave: true };
const RETURNED: ScriptFlags = { stardust_choice: 'returned' };

function config(flags: ScriptFlags = {}): SimConfig<IdSpace> {
  return {
    content: DEV,
    mapId: 'dev_voices',
    seed: 1,
    loadout: MAP.builds.parBuild.loadout,
    companion: null,
    modifiers: [],
    difficulty: 'standard',
    abilities: {
      slot1: MAP.builds.referenceProfile.technicianAbility,
      slot2: null,
      slot2State: 'none',
    },
    specsUnlocked: [],
    scriptFlags: flags,
  };
}

function setup(
  flags: ScriptFlags = {},
  map: CompiledMapDef<IdSpace> = MAP,
): { state: SimState; ctx: TickContext } {
  const state = createState(map, 1);
  initChoir(state, map, flags);
  return { state, ctx: { content: DEV, map, config: config(flags), scratch: createScratch() } };
}

/** `n` ticks of the choir system alone. */
function tick(state: SimState, ctx: TickContext, n = 1): void {
  for (let i = 0; i < n; i++) {
    choir(state, ctx);
    state.tick++;
  }
}

/** The live choir members, in pool order. */
function members(state: SimState): Ally[] {
  const out: Ally[] = [];
  for (let i = 0; i < state.allies.used; i++) {
    const a = state.allies.items[i]!;
    if (a.alive && a.mode === 'choir') out.push(a);
  }
  return out;
}

function events<T extends SimEvent<IdSpace>['type']>(
  state: SimState,
  type: T,
): Extract<SimEvent<IdSpace>, { type: T }>[] {
  return state.events.filter((e): e is Extract<SimEvent<IdSpace>, { type: T }> => e.type === type);
}

/** The leader's road position (from its spawn end). */
const leadPos = (state: SimState): number => ROAD.lengthTiles - state.choir.dist;

/** The choir 300 ticks up the road (1.75 tiles), its events cleared. */
function walking(): { state: SimState; ctx: TickContext } {
  const s = setup();
  s.state.wave = 1;
  tick(s.state, s.ctx, 300);
  s.state.events.length = 0;
  return s;
}

/** The choir 900 ticks up the road (5.25 tiles), its column filed out. */
function onRoad(flags: ScriptFlags = {}): { state: SimState; ctx: TickContext } {
  const s = setup(flags);
  s.state.wave = 1;
  tick(s.state, s.ctx, 900);
  return s;
}

describe('the run’s choir', () => {
  it('is the base singers, ± the flag groups, + Thrum (Pebble not counted); its floor ⌈40%⌉', () => {
    const rows = [
      [{}, 10, 4],
      [WARREN, 14, 6],
      [CONVOY, 8, 4],
      [SPARED, 11, 5],
      [{ ...WARREN, ...SPARED }, 15, 6],
      [RETURNED, 10, 4], // the Returned are not Voices
    ] as const;
    for (const [flags, size, floor] of rows) {
      const { state } = setup(flags);
      expect(choirSize(CHOIR, flags), JSON.stringify(flags)).toBe(size);
      expect([state.choir.singers, state.choir.voices, state.stats.voicesMin]).toEqual([
        size,
        size,
        size,
      ]);
      expect(minVoicesOf(state, MAP), JSON.stringify(flags)).toBe(floor);
    }
  });

  it('takes the map’s minVoices as is; no floor without a choir', () => {
    const { state } = setup();
    expect(minVoicesOf(state, { ...MAP, minVoices: 7, minVoicesPct: null })).toBe(7);
    expect(minVoicesOf(state, { ...MAP, choir: null })).toBeNull();
    expect(choirLost(state, { ...MAP, choir: null })).toBe(false);
  });

  it('spawns on tick 0 at the road’s core end: Pebble, Thrum, the singers, the Returned', () => {
    const { state, ctx } = setup({ ...SPARED, ...RETURNED });
    tick(state, ctx);
    const m = members(state);
    expect(m.map((a) => [a.kind, a.pebble, a.vulnerability])).toEqual([
      ['singer', true, 'never'],
      ['thrum', false, 'never'],
      ...Array.from({ length: 10 }, () => ['singer', false, 'hush']),
      ['bearer', false, 'never'],
      ['bearer', false, 'never'],
    ]);
    for (const a of m) {
      expect([a.route, a.dist, a.group, a.x, a.y]).toEqual([ROAD, ROAD.lengthTiles, -1, 6.5, 7.5]);
    }
    expect(events(state, 'AllySpawned')).toHaveLength(14);
    expect(state.choir).toMatchObject({ x: 6.5, y: 7.5, dist: 0, stopDist: 6, thrum: true });
  });

  it('spawns no Thrum unless spared and no Returned unless returned', () => {
    const { state, ctx } = setup({ spared_quiet_wave: false, stardust_choice: 'none' });
    tick(state, ctx);
    expect(members(state).map((a) => a.kind)).toEqual(Array(11).fill('singer'));
  });
});

describe('the walk', () => {
  it('waits for wave 1, then walks at its pace to the Halls mouth and stays', () => {
    const { state, ctx } = setup();
    tick(state, ctx, 30);
    expect(state.choir.dist).toBe(0);
    state.wave = 1;
    tick(state, ctx, 10);
    expect(state.choir.dist).toBeCloseTo(10 * PACE, 9);
    expect(state.choir.y).toBeCloseTo(7.5 - 10 * PACE, 9);
    const ticks = Math.ceil(6 / PACE);
    tick(state, ctx, ticks - 11);
    expect(state.choir.arrived).toBe(false);
    tick(state, ctx);
    expect(state.choir).toMatchObject({ arrived: true, dist: 6, x: 6.5, y: 1.5 });
    expect(choirAt(state, MAP, 'halls')).toBe(true);
    tick(state, ctx, 100);
    expect(state.choir.dist).toBe(6);
  });

  it('files the column CHOIR_SPACING_TILES apart behind the leader, Thrum beside her', () => {
    const { state, ctx } = setup({ ...SPARED, ...RETURNED });
    state.wave = 1;
    tick(state, ctx, 900);
    const lead = leadPos(state);
    const m = members(state);
    expect(m[0]!.dist).toBe(lead);
    expect(m[1]!.dist).toBe(lead); // Thrum
    for (let i = 2; i < m.length; i++) {
      expect(m[i]!.dist, `rank ${i - 1}`).toBeCloseTo(lead + (i - 1) * CHOIR_SPACING_TILES, 9);
    }
  });

  it('reaches a marker beside the road once the leader walks past its nearest point', () => {
    const { state } = setup();
    const map = { ...MAP, markers: { ...MAP.markers, mid: [5, 4] as const } };
    state.choir.dist = 2.99;
    expect(choirAt(state, map, 'mid')).toBe(false);
    state.choir.dist = 3;
    expect(choirAt(state, map, 'mid')).toBe(true);
    expect(choirAt(state, map, 'nowhere')).toBe(false);
    expect(choirAt(state, { ...map, choir: null }, 'mid')).toBe(false);
  });
});

describe('the halt rule', () => {
  const AIR: CompiledEnemyDef = Object.freeze({ ...MOTE, id: 'air_mote', layer: 'air' as const });
  const SKITTER = DEV.enemies.nibbler;

  it('halts while a Hollow unit on its road is 0–haltTiles ahead, and walks on after', () => {
    const { state, ctx } = walking();
    const e = spawn(state, MOTE, { route: ROAD, dist: leadPos(state) - 1.4 });
    const at = state.choir.dist;
    tick(state, ctx, 5);
    expect(state.choir).toMatchObject({ halted: true, dist: at, haltTicks: 5 });
    expect(events(state, 'ChoirHalted')).toEqual([{ type: 'ChoirHalted', on: true }]);
    e.dist = leadPos(state) + 0.2; // it walked past her
    tick(state, ctx);
    expect(state.choir.halted).toBe(false);
    expect(state.choir.dist).toBeCloseTo(at + PACE, 9);
    expect(events(state, 'ChoirHalted').map((x) => x.on)).toEqual([true, false]);
  });

  it('walks on past one further than haltTiles, a flyer, a burrowed one, or no Hollow', () => {
    const cases: [string, (s: SimState) => void][] = [
      ['too far', (s) => void spawn(s, MOTE, { route: ROAD, dist: leadPos(s) - 1.6 })],
      ['a flyer', (s) => void spawn(s, AIR, { route: ROAD, dist: leadPos(s) - 0.5 })],
      [
        'burrowed',
        (s) => void (spawn(s, MOTE, { route: ROAD, dist: leadPos(s) - 0.5 }).burrowed = true),
      ],
      ['Skitterkin', (s) => void spawn(s, SKITTER, { route: ROAD, dist: leadPos(s) - 0.5 })],
    ];
    for (const [name, place] of cases) {
      const { state, ctx } = walking();
      place(state);
      tick(state, ctx);
      expect(state.choir.halted, name).toBe(false);
    }
  });

  it('on another ground route: within haltTiles in a straight line and not behind her', () => {
    const other: CompiledRoute = { ...ROAD, id: 'b' };
    const { state, ctx } = walking();
    const ahead = spawn(state, MOTE, { route: other, dist: 0 });
    ahead.x = state.choir.x + 1;
    ahead.y = state.choir.y - 0.5; // up the road (toward its spawn) and to the side
    tick(state, ctx);
    expect(state.choir.halted).toBe(true);
    ahead.y = state.choir.y + 0.5; // behind her
    tick(state, ctx);
    expect(state.choir.halted).toBe(false);
  });

  it('stays cheap in the hot loop: 90k halt-scan ticks among 40 Hollow units well under #13', () => {
    // The scan and the column walk create no objects, arrays, or closures (by construction: plain
    // loops over the pools, numbers in place); this pins their cost against the 2 s run budget.
    const { state, ctx } = walking();
    for (let i = 0; i < 40; i++) spawn(state, MOTE, { route: ROAD, dist: i * 0.1 });
    const start = performance.now();
    for (let i = 0; i < 90_000; i++) {
      state.choir.dist = (i % 3) * 0.5; // halted and walking in turn
      choir(state, ctx);
    }
    // Wall time, generous for a loaded machine: about 0.1 s alone.
    expect(performance.now() - start).toBeLessThan(1500);
    expect(state.allies.used).toBe(11); // nothing spawned past tick 0
  });
});

describe('hushed singers', () => {
  it('stop singing, can’t be hushed again, fall back to the tail, and cost Voices', () => {
    const { state, ctx } = onRoad();
    const m = members(state);
    const first = m[1]!;
    expect(hushSinger(state, first)).toBe(true);
    expect(isHushedSinger(first)).toBe(true);
    expect([first.alive, first.vulnerability, state.choir.voices, state.stats.voicesMin]).toEqual([
      true,
      'never',
      9,
      9,
    ]);
    expect(hushSinger(state, first)).toBe(false);
    expect(hushSinger(state, m[0]!)).toBe(false); // Pebble
    expect(events(state, 'SingerHushed')).toEqual([{ type: 'SingerHushed', uid: first.uid }]);
    expect(state.medals.perfectCore).toBe('forfeited');
    // It drifts back through the column to the tail as the column closes up.
    const at = first.dist;
    tick(state, ctx);
    expect(first.dist).toBeGreaterThan(at);
    tick(state, ctx, 600);
    const lead = leadPos(state);
    const singing = members(state).filter((a) => a.kind === 'singer' && a.vulnerability === 'hush');
    expect(first.dist).toBeCloseTo(lead + 10 * CHOIR_SPACING_TILES, 9);
    for (const a of singing) expect(a.dist).toBeLessThan(first.dist);
  });

  it('never include Thrum or the Returned', () => {
    const { state } = onRoad({ ...SPARED, ...RETURNED });
    for (const a of members(state)) {
      if (a.kind !== 'singer' || a.pebble) expect(hushSinger(state, a), a.kind!).toBe(false);
    }
    expect(state.choir.voices).toBe(11);
  });

  it('recover at Dawn: every one sings again', () => {
    const { state } = onRoad();
    for (const a of members(state).slice(1, 4)) hushSinger(state, a);
    expect(state.choir.voices).toBe(7);
    recoverSingers(state);
    expect(state.choir.voices).toBe(10);
    expect(members(state).filter(isHushedSinger)).toEqual([]);
    expect(state.stats.voicesMin).toBe(7);
  });

  it('a leak on a choir map forfeits no Perfect by itself', () => {
    const { state } = setup();
    state.objective = 'choir';
    bookLeak(state, spawn(state, MOTE, { route: ROAD }));
    expect(state.medals.perfectCore).toBe('open');
  });
});

describe('the song’s circles', () => {
  it('the leader’s radius grows with the singers singing, + Thrum’s bonus', () => {
    const { state } = setup();
    expect(songRadius(state, WITH_SONG)).toBeCloseTo(2.5, 9);
    state.choir.voices = 5;
    expect(songRadius(state, WITH_SONG)).toBeCloseTo(2.5 * (0.6 + 0.4 * 0.5), 9);
    state.choir.voices = 0;
    expect(songRadius(state, WITH_SONG)).toBeCloseTo(1.5, 9);
    const spared = setup(SPARED).state;
    expect(songRadius(spared, WITH_SONG)).toBeCloseTo(3, 9);
    expect(songRadius(state, MAP)).toBe(0); // no song
  });

  it('one round the leader, one of auraRadius round each Returned; none without a song', () => {
    const { state, ctx } = setup(RETURNED, WITH_SONG);
    state.wave = 1;
    tick(state, ctx, 900);
    const circles = songCircles(state, WITH_SONG);
    const bearers = members(state).filter((a) => a.kind === 'bearer');
    expect(circles.map((c) => ({ ...c }))).toEqual([
      { x: state.choir.x, y: state.choir.y, r: 2.5 },
      ...bearers.map((a) => ({ x: a.x, y: a.y, r: 1 })),
    ]);
    const again = songCircles(state, WITH_SONG);
    expect(again).toBe(circles); // the reused buffer
    expect(songCircles(state, MAP)).toHaveLength(0);
    expect(inSong(state, WITH_SONG, state.choir.x + 2.5, state.choir.y)).toBe(true);
    expect(inSong(state, WITH_SONG, state.choir.x + 2.6, state.choir.y)).toBe(false);
    const b = bearers[1]!; // 4.8 tiles behind the leader: only its own aura reaches round it
    expect(inSong(state, WITH_SONG, b.x + 1, b.y)).toBe(true);
    expect(inSong(state, WITH_SONG, b.x + 1.1, b.y)).toBe(false);
    expect(inSong(state, MAP, state.choir.x, state.choir.y)).toBe(false);
  });
});

describe('dev_voices in the whole sim', () => {
  const par = MAP.builds.parBuild;
  const noSplash = MAP.builds.noCounterBuilds.splash!;

  it('par walks the choir to the Halls with every voice and wins', () => {
    const r = runHeadless(config(), par);
    expect([r.outcome, r.voices, r.choirSize, r.stats.voicesMin, r.violations]).toEqual([
      'won',
      10,
      10,
      10,
      [],
    ]);
    expect(r.objective).toBe('choir');
  });

  it('without its splash the Motes hush singers until too few sing: lost', () => {
    const r = runHeadless(config(), noSplash);
    expect(r.outcome).toBe('lost');
    expect(r.voices).toBe(3); // the first under ⌈40% × 10⌉ = 4
  });

  it('undefended, each singer is hushed once, kept on the road, until the map is lost', () => {
    const sim = createSim(config());
    const out: SimEvent<IdSpace>[] = [];
    sim.enqueue({ type: 'callWave' });
    while (sim.state.outcome === 'playing') sim.step();
    sim.drainEvents(out);
    const hushed = out.filter((e) => e.type === 'SingerHushed').map((e) => e.uid);
    expect(new Set(hushed).size).toBe(hushed.length);
    expect(hushed.length).toBe(10 - sim.state.choir.voices);
    const hushes = out.filter((e) => e.type === 'Hushed');
    expect(hushes.every((e) => e.victimAlly === 'singer')).toBe(true);
    expect(out.filter((e) => e.type === 'AllyRemoved')).toEqual([]);
    expect(out.at(-1)).toEqual({ type: 'MapLost' });
    expect(sim.state.choir.voices).toBe(3);
  });

  it('is deterministic under every choir flag', () => {
    for (const flags of [{}, WARREN, CONVOY, { ...SPARED, ...RETURNED }]) {
      const a = runHeadless(config(flags), par);
      const b = runHeadless(config(flags), par);
      expect(a.hash, JSON.stringify(flags)).toBe(b.hash);
      expect(a.outcome, JSON.stringify(flags)).toBe('won');
    }
  });

  it('par’s halts are short: ≤ 25% of the walk on this one-road map, none over 5 s', () => {
    const sim = createSim(config());
    const exec = createBuildExecutor(sim, par);
    const out: SimEvent<IdSpace>[] = [];
    let since = -1;
    let longest = 0;
    let walkTicks = 0;
    while (sim.state.outcome === 'playing' && !sim.state.choir.arrived) {
      exec.beforeTick();
      sim.step();
      walkTicks++;
      out.length = 0;
      sim.drainEvents(out);
      for (const e of out) {
        if (e.type !== 'ChoirHalted') continue;
        if (e.on) since = sim.state.tick;
        else longest = Math.max(longest, sim.state.tick - since);
      }
    }
    expect(sim.state.choir.arrived).toBe(true);
    // dev_voices sends its Motes straight down the choir's one road (FIN's par pins ≤ 15% of
    // Phase 1: T820/T821); here 297 of 1,326 ticks, the longest 236 (a 10-Mote stream).
    expect(sim.state.choir.haltTicks / walkTicks).toBeLessThanOrEqual(0.25);
    expect(longest).toBeLessThanOrEqual(5 * 60);
  });
});

// ── The harness (#2): a Choir's margin is Voices % ──────────────────────────────────────────────

/** A choir run's result: `voices` the fewest singing (`stats.voicesMin`), `now` at the end. */
function choirResult(
  voices: number,
  size: number,
  outcome: 'won' | 'lost' = 'won',
  extra: { readonly now?: number; readonly base?: number } = {},
) {
  const r = fakeResult(outcome, 20);
  return {
    ...r,
    objective: 'choir' as const,
    voices: extra.now ?? voices,
    choirSize: size,
    choirBase: extra.base ?? 0,
    stats: { ...r.stats, voicesMin: voices },
  };
}

describe('the Choir margin (#2)', () => {
  it('is Voices % of the run’s choir at its lowest, 0 on a loss', () => {
    expect(marginOf(choirResult(10, 10))).toBe(100);
    expect(marginOf(choirResult(6, 15))).toBe(40);
    expect(marginOf(choirResult(6, 8, 'lost'))).toBe(0);
    expect(marginOf(choirResult(0, 0))).toBe(0);
    // Dawn wakes the hushed (T821): the margin is the low point, not the full choir at the end.
    expect(marginOf(choirResult(6, 15, 'won', { now: 15 }))).toBe(40);
  });

  it('with a hush allowance, is Voices % of the base choir: same hushes, same margin (T821)', () => {
    // fin_m01: base 20; the convoy's 16, the warren's 28, each with 9 hushed, all read 55%.
    expect(marginOf(choirResult(7, 16, 'won', { base: 20 }))).toBe(55);
    expect(marginOf(choirResult(11, 20, 'won', { base: 20 }))).toBe(55);
    expect(marginOf(choirResult(19, 28, 'won', { base: 20 }))).toBe(55);
    expect(marginOf(choirResult(19, 28, 'lost', { base: 20 }))).toBe(0);
  });

  it('is judged in the finale’s band, in the Escort chain, and no longer refused', () => {
    expect(HARNESS_GATES.choir).toBeNull();
    expect(parBand('finale', null)).toEqual({ lo: 40, hi: 60 });
    expect(marginChain(MAP)).toBe('escort');
    expect(refusedFeatures(MAP)).toEqual([]);
  });

  it('runs dev_voices: par and each choir flag value on Voices %, its no-splash build losing', () => {
    const content: CompiledContent<IdSpace> = DEV;
    const report = runMap(content, 'dev_voices', { seeds: 1 });
    const pct = (build: string): number | undefined =>
      report.runs.find((r) => r.build === build && !r.repeat)?.marginPct;
    expect(pct('par')).toBe(100);
    for (const b of [
      'flag:door_choice=warren',
      'flag:door_choice=convoy',
      'flag:spared_quiet_wave=true',
      'flag:stardust_choice=returned',
    ]) {
      expect(pct(b), b).toBe(100);
    }
    const noSplash = report.runs.find((r) => r.build === 'noCounter:splash' && !r.repeat)!;
    expect([noSplash.result?.outcome, noSplash.marginPct]).toEqual(['lost', 0]);
    // The tiny dev map is trivial for par (above the finale's band): #2 says so, on Voices.
    const band = report.checks.find((c) => c.id === '2');
    expect(band?.summary).toBe('100 / 100 / 100 (min / median / max), band 40–60');
    expect(band?.failures).toEqual([
      'seed 1: margin 100 is above the band top 60 (trivial for par)',
    ]);
  });
});
