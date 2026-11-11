// dev_bearers (T706; devM7.ts): bearers and script groups end to end, and their rules one at a
// time. As W2 starts the bearers walk home to the west-edge door while three Motes come out of the
// vats behind them: each one hushed costs the asset 1 (AssetHit, a refugee lost, Perfect gone),
// each one home counts in `bearersHome` with no meter change. Cut the Feed (both `feed_*` wreckage
// lines cleared before W3) shrinks nothing on its own: W3's surge is a script group the map sends
// `when` the objective isn't done, and `objectiveCompleted` cues its line. The militia post is
// manned under `convoy` only. The smoke flow (smoke/bearers.spec.ts) counts on all of it.
import { describe, expect, it } from 'vitest';
import { battleConfig } from '../../app/battleSetup.ts';
import { compileContent } from '../../content/compile.ts';
import type { CompiledMapDef } from '../../content/compiled.ts';
import type { IdSpace, MapDef, RawContent } from '../../content/types.ts';
import { validate } from '../../content/validate.ts';
import {
  createBuildExecutor,
  createSim,
  gatedFlagDefaults,
  runHeadless,
  type Sim,
  type SimConfig,
  type SimEvent,
} from '../../sim/index.ts';
import { bearersCarried, bearerTotal, postManned } from '../../sim/bearers.ts';
import {
  clearedInTime,
  evaluateCondition,
  settledCondition,
  type ConditionContext,
} from '../../sim/conditions.ts';
import { refugeesRemaining } from '../../sim/escort.ts';
import { createState } from '../../sim/state.ts';
import { flagGatedGround } from '../views/flagDressing.ts';
import { DEV_CONTENT, type DevIds } from './devBattle.ts';
import { bearersMap } from './devM7.ts';

const MAP = 'dev_bearers';

function config(over: Partial<SimConfig<IdSpace>> = {}): SimConfig<IdSpace> {
  return { ...battleConfig(MAP, 1), ...over };
}

/** dev_bearers with `patch` laid over it, compiled into a config (the rest of DEV_CONTENT kept). */
function patched(patch: Partial<MapDef<DevIds>>, over: Partial<SimConfig<IdSpace>> = {}) {
  const maps: { readonly [id: string]: MapDef<DevIds> } = {
    ...DEV_CONTENT.maps,
    dev_bearers: { ...bearersMap, ...patch },
  };
  const raw: RawContent<IdSpace> = { ...DEV_CONTENT, maps };
  return config({ content: compileContent(raw), ...over });
}

/** Steps `sim` (par's executor when given, else W1 called) until `until` or the end; its events. */
function play(
  sim: Sim<IdSpace>,
  opts: { par?: boolean; until?: () => boolean; beforeTick?: () => void } = {},
): Tagged[] {
  const exec = opts.par === true ? createBuildExecutor(sim, sim.map.builds.parBuild) : null;
  if (exec === null) sim.enqueue({ type: 'callWave' });
  const all: Tagged[] = [];
  const out: SimEvent<IdSpace>[] = [];
  for (let i = 0; i < 60 * 300 && sim.state.outcome === 'playing'; i++) {
    if (opts.until?.() === true) break;
    exec?.beforeTick();
    opts.beforeTick?.();
    sim.step();
    out.length = 0;
    sim.drainEvents(out);
    for (const e of out) all.push({ ...e, tick: sim.state.tick - 1 });
  }
  return all;
}

/** An event with the tick it was emitted on. */
type Tagged = SimEvent<IdSpace> & { readonly tick: number };
const ofType = <T extends Tagged['type']>(events: readonly Tagged[], type: T) =>
  events.filter((e): e is Extract<Tagged, { type: T }> => e.type === type);

describe('dev_bearers: the bearers (T706)', () => {
  it('par wins, the same every time; the bearers home count, one hushed costs the asset 1', () => {
    const par = config().content.maps[MAP]!.builds.parBuild;
    const a = runHeadless(config(), par);
    const b = runHeadless(config(), par);
    expect(b.hash).toBe(a.hash);
    expect(a.outcome).toBe('won');
    expect(a.violations).toEqual([]);
    expect(a.objectives).toEqual(['done']);
  });

  it('a hushed bearer: AssetHit 1 by its Mote, a refugee lost, Perfect gone; home: no meter change', () => {
    const sim = createSim(config());
    const events = play(sim);
    expect(sim.state.outcome).toBe('lost');
    const hushed = ofType(events, 'Hushed').filter((e) => e.victimAlly === 'bearer');
    const hits = ofType(events, 'AssetHit');
    expect(hushed.length).toBe(3);
    // Each hush costs 1, by the Mote that hushed, on its tick; nothing else hit the asset.
    expect(hits.map((h) => [h.tick, h.uid, h.lost])).toEqual(hushed.map((h) => [h.tick, h.uid, 1]));
    const home = ofType(events, 'BearerHome');
    expect(home.map((e) => e.group)).toEqual(['bearers', 'bearers', 'bearers']);
    expect(sim.state.stats).toMatchObject({ bearersHome: 3, refugeesLost: 3, evacuated: 0 });
    expect(sim.state.stats.lostByGroup).toEqual([3]);
    expect(sim.state.medals.perfectCore).toBe('forfeited');
    // Home changes no meter: the asset was 6 − 3 at each homecoming.
    for (const e of home) {
      const before = hits.filter((h) => h.tick <= e.tick).length;
      expect(before).toBe(3);
    }
    expect(ofType(events, 'RefugeeEvacuated')).toEqual([]);
    expect(bearerTotal(sim.map, sim.config.scriptFlags)).toBe(6);
    expect(bearersCarried(sim.state, sim.map, sim.config.scriptFlags)).toEqual({
      home: 3,
      lost: 3,
      total: 6,
    });
  });

  it('every bearer hushed empties the asset: the map is lost (AssetLost)', () => {
    // Integrity 3 with three hushes: the third loses the map on its tick.
    const map = { ...bearersMap.asset!, integrity: 3 };
    const sim = createSim(patched({ asset: map }));
    const events = play(sim);
    const lost = ofType(events, 'AssetLost');
    expect(lost).toHaveLength(1);
    expect(ofType(events, 'MapLost')[0]?.tick).toBe(lost[0]!.tick);
    expect(sim.state.asset).toBe(0);
  });

  it('victory waits for the bearers, and refugeesRemaining counts the ones home as safe', () => {
    const sim = createSim(config());
    play(sim, { par: true, until: () => sim.state.stats.bearersHome >= 2 });
    const left = refugeesRemaining(sim.state, sim.map);
    const s = sim.state.stats;
    expect(left).toBe(6 - s.bearersHome - s.refugeesLost);
    expect(left).toBeGreaterThan(0);
  });
});

describe('dev_bearers: Cut the Feed and the surge (T706)', () => {
  it('cleared in time: the objective is done, its cue the tick after, and no surge', () => {
    const sim = createSim(config());
    const events = play(sim, { par: true });
    const done = ofType(events, 'ObjectiveProgress');
    expect(done.map((e) => e.status)).toEqual(['done']);
    const cue = ofType(events, 'ScriptCue').find((e) => e.cueId === 'dev_bearers_feed_cut');
    expect(cue?.tick).toBe(done[0]!.tick + 1);
    expect(ofType(events, 'ScriptGroupSpawned')).toEqual([]);
  });

  it('not cleared: W3 starts with the surge, counted in W3; the objective fails on that tick', () => {
    const sim = createSim(config());
    const events = play(sim);
    const w3 = ofType(events, 'WaveStarted').find((e) => e.wave === 3)!;
    expect(ofType(events, 'ScriptGroupSpawned').map((e) => [e.tick, e.id])).toEqual([
      [w3.tick, 'surge'],
    ]);
    expect(ofType(events, 'ObjectiveProgress').map((e) => [e.tick, e.status])).toEqual([
      [w3.tick, 'failed'],
    ]);
    // Six Motes on road `a`, 0.3 s apart from W3's start, each in W3; W3's own ten beside them.
    const surge = ofType(events, 'EnemySpawned').filter((e) => e.wave === 3);
    expect(surge).toHaveLength(16);
    expect(sim.state.scriptGroupsSpawned).toEqual(['surge']);
    expect(sim.state.scriptGroupWave).toEqual([3]);
  });

  it('the last line cleared on the tick W3 starts counts: no surge (objectiveDone reads live)', () => {
    // One line in W1; the other from W3's countdown, and W3 called on the tick the drone finishes
    // it (commands apply first, then the wreckage system, then the triggers).
    const sim = createSim(config());
    sim.enqueue({ type: 'clear', tile: [11, 0] });
    play(sim, { until: () => sim.state.schedule.countdownWave === 3 });
    expect(sim.state.wreckage.cleared).toHaveLength(1);
    sim.enqueue({ type: 'clear', tile: [11, 7] });
    const out: SimEvent<IdSpace>[] = [];
    while (sim.state.wave < 3) {
      if (sim.state.wreckage.progressTicks === 359) sim.enqueue({ type: 'callWave' });
      sim.step();
      sim.drainEvents(out);
    }
    expect(sim.state.schedule.startTick[2]).toBe(sim.state.tick - 1);
    expect(sim.state.wreckage.cleared).toHaveLength(2);
    expect(out.filter((e) => e.type === 'WreckageCleared')).toHaveLength(1);
    expect(sim.state.scriptGroupsSpawned).toEqual([]);
    expect(out.filter((e) => e.type === 'ObjectiveProgress')).toEqual([
      { type: 'ObjectiveProgress', id: 'cut_the_feed', status: 'done' },
    ]);
  });

  it('the surge binds to W3 under shifts: called early, it still walks in as W3 starts', () => {
    const sim = createSim(config());
    const events = play(sim, {
      beforeTick: () => {
        if (sim.state.schedule.phase === 'countdown') sim.enqueue({ type: 'callWave' });
      },
    });
    const w3 = ofType(events, 'WaveStarted').find((e) => e.wave === 3)!;
    expect(w3.early).toBe(true);
    expect(ofType(events, 'ScriptGroupSpawned').map((e) => e.tick)).toEqual([w3.tick]);
  });
});

describe('script groups (T706; sim/scriptGroups.ts)', () => {
  it('from an onComplete: its clock starts the tick after, counted in the wave then running', () => {
    const [cut] = bearersMap.objectives!;
    const sim = createSim(
      patched({
        // Sent as the feed is cut (in W1) instead of at W3.
        objectives: [{ ...cut!, onComplete: [{ spawnWave: 'surge' }] }],
        events: bearersMap.events!.filter((e) => e.id !== 'surge'),
      }),
    );
    const events = play(sim, { par: true });
    const done = ofType(events, 'ObjectiveProgress')[0]!;
    expect(ofType(events, 'ScriptGroupSpawned').map((e) => e.tick)).toEqual([done.tick]);
    const surge = ofType(events, 'EnemySpawned')
      .filter((e) => e.tick > done.tick)
      .slice(0, 6);
    expect(surge.map((e) => e.tick - done.tick)).toEqual([1, 19, 37, 55, 73, 91]);
    expect(surge.every((e) => e.wave === 1)).toBe(true);
    expect(sim.state.scriptGroupWave).toEqual([1]);
    expect(sim.state.outcome).toBe('won');
  });

  it('sent in a build phase it counts in the next wave, which waits for its last unit', () => {
    const sim = createSim(
      patched({
        events: [
          ...bearersMap.events!.filter((e) => e.id !== 'surge'),
          { id: 'surge', on: { wave: 1, phase: 'cleared' }, actions: [{ spawnWave: 'surge' }] },
        ],
      }),
    );
    const events = play(sim, { par: true });
    const w1 = ofType(events, 'WaveCleared').find((e) => e.wave === 1)!;
    const sent = ofType(events, 'ScriptGroupSpawned')[0]!;
    expect(sent.tick).toBe(w1.tick + 1);
    expect(sim.state.scriptGroupWave).toEqual([2]);
    const surge = ofType(events, 'EnemySpawned')
      .filter((e) => e.tick >= sent.tick)
      .slice(0, 6);
    expect(surge.every((e) => e.wave === 2)).toBe(true);
    // W2 resolves only once the surge (its units, wave 2) is gone too.
    const uids = new Set(surge.map((e) => e.uid));
    const gone = events
      .filter((e) => (e.type === 'EnemyDied' || e.type === 'EnemyLeaked') && uids.has(e.uid))
      .map((e) => e.tick);
    expect(gone).toHaveLength(6);
    const w2 = ofType(events, 'WaveCleared').find((e) => e.wave === 2);
    expect(w2?.tick).toBeGreaterThanOrEqual(Math.max(...gone));
  });

  it('holds its wave open until its last unit is gone, and spawns under the run’s enemyStat', () => {
    const sim = createSim(
      config({ modifiers: [{ kind: 'enemyStat', stat: 'hp', pct: 0.5, source: 'test' }] }),
    );
    const events = play(sim, { until: () => sim.state.scriptGroupsSpawned.length > 0 });
    const remaining = sim.state.schedule.remaining[2]!;
    // W3's own ten and the surge's six, less any already gone.
    expect(remaining).toBeGreaterThanOrEqual(6);
    play(sim, { until: () => sim.state.tick > sim.state.schedule.startTick[2]! + 100 });
    const hp = sim.state.enemies.items.filter((e) => e.alive && e.wave === 3).map((e) => e.def!.hp);
    expect(new Set(hp)).toEqual(new Set([sim.config.content.enemies.mote!.hp * 1.5]));
    expect(events.length).toBeGreaterThan(0);
  });
});

describe('the `cleared` atom (T706)', () => {
  const map: CompiledMapDef<IdSpace> = config().content.maps[MAP]!;
  const ctx: ConditionContext = { content: config().content, config: config(), map };
  const c = { cleared: ['feed_1', 'feed_2'], byWave: 3 } as const;
  const feed1 = 11; // (11, 0)
  const feed2 = 7 * map.cols + 11;

  function at(wave: number, cleared: number[], atWave: number[] = []) {
    const state = createState(map, 1);
    state.wave = wave;
    state.wreckage.cleared.push(...cleared);
    state.wreckageAtWave.push(...atWave);
    return state;
  }

  it('before its wave: open until all are cleared, then true and settled', () => {
    expect(settledCondition(c, at(2, [feed1]), ctx)).toBeNull();
    expect(evaluateCondition(c, at(2, [feed1]), ctx)).toBe(false);
    expect(settledCondition(c, at(2, [feed2, feed1]), ctx)).toBe(true);
  });

  it('from its wave on: the drone’s count as it started decides; a later clear is too late', () => {
    // Both cleared, but the second after W3 started (2 cleared then would count; 1 doesn't).
    expect(evaluateCondition(c, at(3, [feed1, feed2], [0, 0, 1]), ctx)).toBe(false);
    expect(settledCondition(c, at(3, [feed1, feed2], [0, 0, 1]), ctx)).toBe(false);
    expect(settledCondition(c, at(3, [feed1, feed2], [0, 1, 2]), ctx)).toBe(true);
    expect(settledCondition(c, at(4, [feed1], [0, 1, 1, 1]), ctx)).toBe(false);
    // Unrecorded (the wave started this tick, before the triggers): the count now.
    expect(clearedInTime(at(3, [feed1, feed2]), map, c.cleared, 3)).toBe(true);
  });

  it('objectiveDone reads an open objective whose condition has settled', () => {
    const state = at(2, [feed1, feed2]);
    expect(state.objectives).toEqual(['open']);
    expect(evaluateCondition({ objectiveDone: 'cut_the_feed' }, state, ctx)).toBe(true);
    expect(settledCondition({ objectiveDone: 'cut_the_feed' }, at(2, [feed1]), ctx)).toBeNull();
    expect(settledCondition({ objectiveDone: 'cut_the_feed' }, at(3, [], [0, 0, 0]), ctx)).toBe(
      false,
    );
  });
});

/** Militia posts manned on tick 0 of a dev_bearers run under `flags`. */
function militiaManned(flags: SimConfig<IdSpace>['scriptFlags']): number {
  const sim = createSim(config({ scriptFlags: flags }));
  sim.step();
  return sim.state.allies.items.filter((a) => a.alive && a.kind === 'militia').length;
}

describe('flag-gated posts and dressing (T706)', () => {
  it('the militia is manned under convoy only; an unset flag takes the first variant', () => {
    expect(militiaManned({ door_choice: 'convoy' })).toBe(1);
    expect(militiaManned({ door_choice: 'warren' })).toBe(0);
    expect(militiaManned({})).toBe(0);
    const map = config().content.maps[MAP]!;
    expect(gatedFlagDefaults(map)).toEqual({ door_choice: 'convoy' });
    expect(postManned(map.allies[0]!, { door_choice: 'warren' })).toBe(false);
  });

  it('a gated dressing layer and decor marker show only under their flag', () => {
    const map = config().content.maps[MAP]!;
    expect(flagGatedGround(map, { door_choice: 'convoy' })).toBe(map);
    const warren = flagGatedGround(map, { door_choice: 'warren' });
    expect(warren.dressing).toEqual([]);
    expect(Object.keys(warren.markers)).not.toContain('banner');
    expect(Object.keys(warren.markers)).toContain('militia_post');
  });
});

/** The errors of rule `rule` validating dev_bearers with `patch` laid over it. */
function errors(patch: Partial<MapDef<DevIds>>, rule: string): string[] {
  const raw: RawContent<IdSpace> = {
    ...DEV_CONTENT,
    maps: { dev_bearers: { ...bearersMap, ...patch } },
  };
  return validate(raw).filter((e) => e.startsWith(`[${rule}] `));
}

describe('validation: a script group is part of the map’s threat (T706)', () => {
  it('its traits are threat intel the map must list', () => {
    const scriptGroups = { surge: { enemy: 'puffwing' as const, count: 2, route: 'sky' } };
    expect(errors({ scriptGroups }, 'threat-intel')).toEqual([
      '[threat-intel] maps.dev_bearers.threatIntel: missing flying (in the waves)',
    ]);
  });
});
