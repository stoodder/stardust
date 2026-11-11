// T305c: Escort (design/maps.md § 5.2; sim/escort.ts). Unit tests drive the systems directly on
// fx_map's road (9 tiles, (0,0) → (5,4), its core the safe exit) with the live Mote; whole-sim
// tests run the script actions and triggers, victory and defeat.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { CompiledContent } from '../content/compiled.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import {
  HUSH_TELL_SEC,
  REFUGEE_GROUP_SIZE,
  REFUGEE_SPACING_TILES,
  REFUGEE_SPEED_TILES_PER_SEC,
} from '../content/rules.ts';
import type { IdSpace, MapDef } from '../content/types.ts';
import { secToTicks } from '../shared/time.ts';
import { SIM_FIXTURE, fixtureConfig, type FixtureIds } from './__fixtures__/sim.ts';
import { RUNNER, spawn } from './__fixtures__/combat.ts';
import { applyDamage } from './combat/damage.ts';
import { enemyAbilities } from './enemyAbilities/index.ts';
import type { Ally } from './entities.ts';
import {
  escortLost,
  escortMaxLost,
  refugeesOnRoad,
  refugeesRemaining,
  setObjective,
  spawnRefugees,
} from './escort.ts';
import type { SimEvent } from './events.ts';
import { createSim } from './sim.ts';
import { createState, type SimState } from './state.ts';
import { allies } from './systems/allies.ts';
import { cleanup } from './systems/cleanup.ts';
import { movement } from './systems/movement.ts';
import { createScratch, type TickContext } from './tick.ts';

const LIVE = compileContent(RAW_CONTENT);
const MOTE = LIVE.enemies.mote;
const BOSS = LIVE.enemies.chitterbloom;
const SRC = { kind: 'ability', slot: 1 } as const;

/** fx_map's road ends on its core at (5, 4): the safe exit. */
const ESCORT: Partial<MapDef<FixtureIds, 'fx_map'>> = {
  objective: 'escort',
  maxLost: 2,
  markers: { rock: [0, 2], gate: [5, 4] },
  safeExit: 'gate',
  refugees: { g1: { route: 'a', withPebble: true }, g2: { route: 'a', count: 2 } },
};

function content(over: Partial<MapDef<FixtureIds, 'fx_map'>> = {}): CompiledContent<FixtureIds> {
  const fx = SIM_FIXTURE.maps.fx_map;
  return compileContent({ ...SIM_FIXTURE, maps: { fx_map: { ...fx, ...ESCORT, ...over } } });
}

const C = content();
const MAP = C.maps.fx_map;
const ROAD = MAP.routes.a!; // fx_map has route a

function setup(): { state: SimState; ctx: TickContext } {
  const config = { ...fixtureConfig({ content: C }) } as const;
  return {
    state: createState(MAP, 1),
    ctx: { content: C, map: MAP, config, scratch: createScratch() },
  };
}

/** One tick of the systems an escort touches (the hush, enemies' moves, refugees', cleanup). */
function tick(state: SimState, ctx: TickContext, n = 1): void {
  for (let i = 0; i < n; i++) {
    enemyAbilities(state, ctx);
    movement(state, ctx);
    allies(state, ctx);
    cleanup(state, ctx);
    state.tick++;
  }
}

function events<T extends SimEvent<IdSpace>['type']>(
  state: SimState,
  type: T,
): Extract<SimEvent<IdSpace>, { type: T }>[] {
  return state.events.filter((e): e is Extract<SimEvent<IdSpace>, { type: T }> => e.type === type);
}

function refugees(state: SimState): Ally[] {
  return state.allies.items.filter((a) => a.alive && a.group >= 0);
}

describe('refugees (route allies)', () => {
  it('spawn a group in a line from the route start, Pebble in its middle, uncounted', () => {
    const { state } = setup();
    spawnRefugees(state, MAP, 'g1');
    const rs = refugees(state);
    expect(rs.map((a) => [a.dist, a.pebble, a.vulnerability])).toEqual([
      ...Array.from({ length: REFUGEE_GROUP_SIZE }, (_, i) => [
        -i * REFUGEE_SPACING_TILES,
        false,
        'hush',
      ]),
      [(-(REFUGEE_GROUP_SIZE - 1) * REFUGEE_SPACING_TILES) / 2, true, 'never'],
    ]);
    expect(rs.every((a) => a.kind === 'refugee' && a.mode === 'route' && a.group === 0)).toBe(true);
    // Filing in: all at the route's start until they walk onto it.
    expect(rs.every((a) => a.x === ROAD.xs[0] && a.y === ROAD.ys[0])).toBe(true);
    expect(state.stats.refugeesSpawned).toBe(REFUGEE_GROUP_SIZE);
    expect(events(state, 'AllySpawned').map((e) => e.kind)).toEqual(
      Array.from({ length: REFUGEE_GROUP_SIZE + 1 }, () => 'refugee'),
    );
    spawnRefugees(state, MAP, 'g2');
    expect(state.stats.refugeesSpawned).toBe(REFUGEE_GROUP_SIZE + 2);
    expect(refugees(state).filter((a) => a.group === 1)).toHaveLength(2);
    expect(state.refugeesReleased).toEqual([true, true]);
  });

  it('release a group once: a second spawnAllies for it does nothing (D138)', () => {
    const { state } = setup();
    expect(state.refugeesReleased).toEqual([false, false]);
    spawnRefugees(state, MAP, 'g2');
    const before = state.allies.used;
    state.events.length = 0;
    spawnRefugees(state, MAP, 'g2');
    expect([state.allies.used, state.stats.refugeesSpawned, state.events]).toEqual([before, 2, []]);
  });

  it('walk at 0.7 tiles/s, 0.6 apart, and are evacuated at the safe exit (Pebble uncounted)', () => {
    const { state, ctx } = setup();
    spawnRefugees(state, MAP, 'g1');
    tick(state, ctx, 300);
    const step = REFUGEE_SPEED_TILES_PER_SEC / 60;
    const rs = refugees(state).filter((a) => !a.pebble);
    expect(rs[0]!.dist).toBeCloseTo(300 * step, 9);
    for (let i = 1; i < rs.length; i++) {
      expect(rs[i - 1]!.dist - rs[i]!.dist).toBeCloseTo(REFUGEE_SPACING_TILES, 9);
    }
    // The first reaches the exit after 9 tiles at 0.7 tiles/s.
    const leadUid = rs[0]!.uid;
    const first = Math.ceil(ROAD.lengthTiles / step - 1e-6);
    tick(state, ctx, first - 1 - 300);
    expect(state.stats.evacuated).toBe(0);
    tick(state, ctx);
    expect(state.stats.evacuated).toBe(1);
    expect(events(state, 'RefugeeEvacuated')).toEqual([
      { type: 'RefugeeEvacuated', uid: leadUid, pebble: false },
    ]);
    tick(state, ctx, 600);
    expect(state.stats.evacuated).toBe(REFUGEE_GROUP_SIZE);
    expect(events(state, 'RefugeeEvacuated').filter((e) => e.pebble)).toHaveLength(1);
    expect(events(state, 'AllyRemoved')).toHaveLength(REFUGEE_GROUP_SIZE + 1);
    expect(refugeesOnRoad(state)).toBe(0);
    expect(state.medals.perfectCore).toBe('open');
  });
});

/** A refugee of g1 on the road at `dist` (the group spawned, the rest moved off the road). */
function oneRefugee(state: SimState, dist: number): Ally {
  spawnRefugees(state, MAP, 'g1');
  const rs = refugees(state);
  for (const a of rs.slice(1)) a.dist = -99; // still filing in: out of reach
  const a = rs[0]!;
  a.dist = dist;
  a.seg = 0;
  return a;
}

describe('the hush on refugees', () => {
  it('holds both still for the tell, then the refugee is lost and the Mote turns Heavy', () => {
    const { state, ctx } = setup();
    const r = oneRefugee(state, 3.3);
    allies(state, ctx); // places it (and walks it one step)
    const at = r.dist;
    const m = spawn(state, MOTE, { dist: at - 0.3 });
    m.hp = 5;
    tick(state, ctx);
    expect(events(state, 'HushStarted')).toEqual([
      { type: 'HushStarted', uid: m.uid, enemy: 'mote', victim: r.uid, x: r.x, y: r.y },
    ]);
    expect([m.hushUid, r.hushUid]).toEqual([r.uid, m.uid]);
    const tell = secToTicks(HUSH_TELL_SEC);
    tick(state, ctx, tell - 1);
    expect([r.alive, r.dist, m.dist]).toEqual([true, at, at - 0.3]);
    const rUid = r.uid;
    const [rx, ry] = [r.x, r.y];
    tick(state, ctx);
    expect(r.alive).toBe(false);
    expect(events(state, 'Hushed')).toEqual([
      {
        type: 'Hushed',
        uid: m.uid,
        enemy: 'mote',
        victim: rUid,
        victimEnemy: null,
        victimAlly: 'refugee',
        x: rx,
        y: ry,
      },
    ]);
    expect(events(state, 'RefugeeLost')).toEqual([
      { type: 'RefugeeLost', uid: rUid, cause: 'hushed', enemyUid: m.uid },
    ]);
    expect([m.heavy, m.hp, state.stats.refugeesLost]).toEqual([true, MOTE.hp, 1]);
    expect(state.medals.perfectCore).toBe('forfeited');
  });

  it('never takes Pebble or a refugee still filing in', () => {
    const { state, ctx } = setup();
    spawnRefugees(state, MAP, 'g1');
    const rs = refugees(state);
    const pebble = rs.find((a) => a.pebble)!;
    for (const a of rs) a.dist = a === pebble ? 4 : -0.1;
    allies(state, ctx);
    spawn(state, MOTE, { dist: pebble.dist - 0.2 });
    spawn(state, MOTE, { dist: 0.15 }); // right behind the line still filing in
    enemyAbilities(state, ctx);
    expect(events(state, 'HushStarted')).toEqual([]);
  });

  it('lets the refugee walk on when its Hollow unit dies during the tell', () => {
    const { state, ctx } = setup();
    const r = oneRefugee(state, 3);
    allies(state, ctx);
    const m = spawn(state, MOTE, { dist: r.dist - 0.2 });
    tick(state, ctx, 5);
    expect(r.hushUid).toBe(m.uid);
    applyDamage(state, m, 999, 'kinetic', SRC);
    const at = r.dist;
    tick(state, ctx, 2);
    expect(r.hushUid).toBe(0);
    expect(r.dist).toBeGreaterThan(at);
    expect(state.stats.refugeesLost).toBe(0);
  });

  it('matches enemy and refugee victims in one nearest-first pass', () => {
    const { state, ctx } = setup();
    const r = oneRefugee(state, 3);
    allies(state, ctx);
    const runner = spawn(state, RUNNER, { dist: r.dist + 0.1, tags: ['fleeing'] });
    const m = spawn(state, MOTE, { dist: r.dist - 0.3 });
    enemyAbilities(state, ctx);
    // The refugee is 0.3 away, the runner 0.4: the Mote takes the nearer.
    expect(m.hushUid).toBe(r.uid);
    expect(runner.hushUid).toBe(0);
  });
});

describe('the exit rule', () => {
  it('an enemy at the exit takes one sheltered refugee, never integrity', () => {
    const { state, ctx } = setup();
    state.stats.refugeesSpawned = 6;
    state.stats.evacuated = 2;
    const m = spawn(state, MOTE, { dist: ROAD.lengthTiles - 0.01 });
    m.heavy = true; // a Heavy one too
    movement(state, ctx);
    expect([state.stats.evacuated, state.stats.refugeesLost, state.integrity]).toEqual([
      1,
      1,
      MAP.coreIntegrity,
    ]);
    expect(events(state, 'EnemyLeaked')).toEqual([
      { type: 'EnemyLeaked', uid: m.uid, enemy: 'mote', leak: 0 },
    ]);
    expect(events(state, 'RefugeeLost')).toEqual([
      { type: 'RefugeeLost', uid: 0, cause: 'exit', enemyUid: m.uid },
    ]);
    cleanup(state, ctx);
    expect(state.stats.heavyLeaks).toBe(1); // still a leak for the conditions
    expect(state.medals.perfectCore).toBe('forfeited');
  });

  it('takes no one when nobody is sheltered yet, or when the unit is leak-free', () => {
    const { state, ctx } = setup();
    spawn(state, MOTE, { dist: ROAD.lengthTiles - 0.01 });
    movement(state, ctx);
    state.stats.evacuated = 1;
    state.stats.refugeesSpawned = 1;
    spawn(state, RUNNER, { dist: ROAD.lengthTiles - 0.01, tags: ['fleeing'] });
    movement(state, ctx);
    cleanup(state, ctx);
    expect([state.stats.evacuated, state.stats.refugeesLost]).toEqual([1, 0]);
    expect(state.integrity).toBe(MAP.coreIntegrity);
    // A leak while the map is an Escort forfeits nothing by itself.
    expect(state.medals.perfectCore).toBe('open');
  });

  it('a boss at the exit loses the map', () => {
    const { state, ctx } = setup();
    spawn(state, BOSS, { dist: ROAD.lengthTiles - 0.001 });
    movement(state, ctx);
    cleanup(state, ctx);
    expect(state.outcome).toBe('lost');
    expect(events(state, 'MapLost')).toHaveLength(1);
  });

  it('only while the map is an Escort: before a pivot the core takes the leak', () => {
    const { state, ctx } = setup();
    state.objective = 'defend';
    spawn(state, MOTE, { dist: ROAD.lengthTiles - 0.01 });
    movement(state, ctx);
    cleanup(state, ctx);
    expect(state.integrity).toBe(MAP.coreIntegrity - MOTE.leak);
    expect(state.medals.perfectCore).toBe('forfeited');
  });
});

/** The loss limit of a map with `maxLostPct` over a run of `refugeeTotal` refugees. */
function pct(maxLostPct: number, refugeeTotal: number): number | null {
  return escortMaxLost({ refugeeTotal }, { maxLost: null, maxLostPct });
}

describe('defeat and victory', () => {
  it('losing maxLost refugees loses the map (every pip full)', () => {
    const { state, ctx } = setup();
    state.stats.refugeesLost = 1;
    expect(escortLost(state, MAP)).toBe(false);
    cleanup(state, ctx);
    expect(state.outcome).toBe('playing');
    state.stats.refugeesLost = 2;
    expect(escortLost(state, MAP)).toBe(true);
    cleanup(state, ctx);
    expect(state.outcome).toBe('lost');
    // Not while the map isn't an Escort (yet), and never without a maxLost.
    expect(escortLost({ ...state, objective: 'defend' }, MAP)).toBe(false);
    expect(escortLost(state, { maxLost: null, maxLostPct: null })).toBe(false);
  });

  it("maxLostPct: the limit is the share of the run's refugees, rounded up (D143 R7)", () => {
    // A3M1's 0.53: 13 of 24, 16 of 30 (lost ≥ ⌈pct × total⌉ ⇔ lost ≥ pct × total).
    expect([pct(0.53, 24), pct(0.53, 30)]).toEqual([13, 16]);
    expect(pct(0.5, 24)).toBe(12); // exact: no rounding up past it
    expect(pct(0.55, 20)).toBe(11); // 11.000000000000002 in floats
    expect(pct(1, 7)).toBe(7);
    expect([pct(0.01, 6), pct(0.5, 0)]).toEqual([1, 1]); // never 0: never lost before a loss
    expect(escortMaxLost({ refugeeTotal: 30 }, { maxLost: 4, maxLostPct: null })).toBe(4);
    expect(escortMaxLost({ refugeeTotal: 30 }, { maxLost: null, maxLostPct: null })).toBeNull();
    // Defeat at the limit, on the map's run total (fx_map's escort walks 6 + 2 refugees: ⌈0.3 × 8⌉ = 3).
    const { maxLost: _given, ...noMax } = ESCORT;
    const fx = SIM_FIXTURE.maps.fx_map;
    const map = compileContent({
      ...SIM_FIXTURE,
      maps: { fx_map: { ...fx, ...noMax, maxLostPct: 0.3 } },
    }).maps.fx_map;
    expect([map.maxLost, map.maxLostPct]).toEqual([null, 0.3]);
    const { state } = setup();
    expect(state.refugeeTotal).toBe(8);
    state.stats.refugeesLost = 2;
    expect(escortLost(state, map)).toBe(false);
    state.stats.refugeesLost = 3;
    expect(escortLost(state, map)).toBe(true);
  });

  it('victory waits for the road to empty', () => {
    const { state, ctx } = setup();
    state.schedule.startTick = MAP.waves.map(() => 0);
    state.schedule.remaining = MAP.waves.map(() => 0);
    spawnRefugees(state, MAP, 'g2');
    cleanup(state, ctx);
    expect(state.outcome).toBe('playing');
    for (let i = 0; i < 2000 && state.outcome === 'playing'; i++) tick(state, ctx);
    expect(state.outcome).toBe('won');
    expect(state.stats.evacuated).toBe(2);
    expect(state.medals.perfectCore).toBe('earned');
  });
});

describe('the script: setObjective, spawnAllies, refugeesRemaining', () => {
  it('setObjective relabels the meter (default: the objective’s own) and emits once', () => {
    const { state } = setup();
    state.objective = 'defend';
    state.meterLabel = 'integrity';
    setObjective(state, 'escort', undefined);
    expect([state.objective, state.meterLabel]).toEqual(['escort', 'evacuated']);
    setObjective(state, 'escort', undefined);
    setObjective(state, 'escort', 'sheltered');
    expect(events(state, 'ObjectiveChanged')).toEqual([
      { type: 'ObjectiveChanged', objective: 'escort', meterLabel: 'evacuated' },
      { type: 'ObjectiveChanged', objective: 'escort', meterLabel: 'sheltered' },
    ]);
  });

  it('a pivot map: Defend until the script makes it an Escort and releases the groups', () => {
    const pivot = content({
      objective: 'defend',
      events: [
        {
          id: 'pivot',
          on: { wave: 1, phase: 'start' },
          actions: [{ setObjective: 'escort' }, { spawnAllies: 'g2' }],
        },
        { id: 'one_left', on: { refugeesRemaining: 7 }, actions: [{ cue: 'fx_map_one_left' }] },
        { id: 'all_left', on: { refugeesRemaining: 0 }, actions: [{ cue: 'fx_map_none_left' }] },
      ],
    });
    const sim = createSim(fixtureConfig({ content: pivot }));
    expect([sim.state.objective, sim.state.meterLabel]).toEqual(['defend', 'integrity']);
    sim.enqueue({ type: 'callWave' });
    sim.step();
    expect([sim.state.objective, sim.state.meterLabel]).toEqual(['escort', 'evacuated']);
    expect(sim.state.stats.refugeesSpawned).toBe(2);
    const out: SimEvent<FixtureIds>[] = [];
    sim.drainEvents(out);
    expect(out.filter((e) => e.type === 'ObjectiveChanged')).toHaveLength(1);
    const cues: string[] = [];
    for (let i = 0; i < 60 * 60 && sim.state.outcome === 'playing'; i++) {
      sim.step();
      out.length = 0;
      sim.drainEvents(out);
      for (const e of out) if (e.type === 'ScriptCue') cues.push(e.cueId);
    }
    // 8 refugees (6 + 2), g1 never released: 7 left once one is safe; never 0.
    expect(cues).toContain('fx_map_one_left');
    expect(cues).not.toContain('fx_map_none_left');
    expect(refugeesRemaining(sim.state, pivot.maps.fx_map)).toBe(
      8 - sim.state.stats.evacuated - sim.state.stats.refugeesLost,
    );
  });
});
