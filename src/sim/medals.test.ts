// Medals (T202c): Victory, Perfect Core with medal-exempt leaks, the Challenge (judged at the win
// tick, or forfeited the moment it breaks), the MedalProgress events, and the save ids.
import { describe, expect, it } from 'vitest';
import type { CompiledContent, CompiledMapDef } from '../content/compiled.ts';
import { compileContent } from '../content/compile.ts';
import type { IdSpace, MapDef, RawContent, WaveTag } from '../content/types.ts';
import { WALKER, placeTower, spawn } from './__fixtures__/combat.ts';
import { FIXTURE_CONTENT, SIM_FIXTURE, fixtureConfig } from './__fixtures__/sim.ts';
import type { SimConfig } from './config.ts';
import type { SimEvent } from './events.ts';
import { runHeadless } from './headless.ts';
import { earnedMedalIds, mapMedalIds, medalId } from './medals.ts';
import { poolKill } from './pool.ts';
import { createState, type SimState } from './state.ts';
import { cleanup } from './systems/cleanup.ts';
import { createScratch, type TickContext } from './tick.ts';

const RAW: RawContent<IdSpace> = SIM_FIXTURE;

/** fx_map patched, with or without its Challenge, on the campaign or off it. */
function contentWith(
  over: Partial<MapDef<IdSpace>>,
  { challenge = true, campaign = true }: { challenge?: boolean; campaign?: boolean } = {},
): CompiledContent<IdSpace> {
  const { medals, ...rest } = RAW.maps.fx_map!;
  const keep = challenge && medals !== undefined ? { medals } : {};
  const fx: MapDef<IdSpace> = { ...rest, ...keep, ...over };
  return compileContent({ ...RAW, maps: { fx_map: fx }, campaign: campaign ? RAW.campaign : [] });
}

function setup(content: CompiledContent<IdSpace> = FIXTURE_CONTENT): {
  state: SimState;
  ctx: TickContext;
  map: CompiledMapDef<IdSpace>;
} {
  const map = content.maps.fx_map!;
  const base: SimConfig<IdSpace> = fixtureConfig();
  const config = { ...base, content };
  return {
    state: createState(map, 1),
    ctx: { content, map, config, scratch: createScratch() },
    map,
  };
}

/** Every wave started and emptied: the next cleanup wins the map. */
function allResolvable(state: SimState): void {
  state.schedule.startTick.fill(0);
  state.schedule.remaining.fill(0);
}

/** An enemy that leaked this tick (movement leaves it dead at its route's end). */
function leak(state: SimState, map: CompiledMapDef<IdSpace>, tags: readonly WaveTag[] = []): void {
  const road = map.routes.a!;
  const e = spawn(state, WALKER, { route: road, dist: road.lengthTiles, tags });
  poolKill(state.enemies, e);
}

const medalEvents = (state: SimState): SimEvent<IdSpace>[] =>
  state.events.filter(
    (e) => e.type === 'MedalProgress' || e.type === 'MapWon' || e.type === 'MapLost',
  );

describe('medals', () => {
  it('a win earns Victory, Perfect Core, and a Challenge that holds on the win tick', () => {
    const { state, ctx, map } = setup();
    placeTower(state, ctx.content.towers.fx_gun!, 1, 1); // fx_one_gun: a gun on the field
    allResolvable(state);
    cleanup(state, ctx);
    expect(state.outcome).toBe('won');
    expect(state.medals).toEqual({ victory: 'earned', perfectCore: 'earned', challenge: 'earned' });
    expect(medalEvents(state)).toEqual([
      { type: 'MedalProgress', medal: 'victory', status: 'earned' },
      { type: 'MedalProgress', medal: 'perfectCore', status: 'earned' },
      { type: 'MedalProgress', medal: 'challenge', status: 'earned' },
      { type: 'MapWon' },
    ]);
    expect(earnedMedalIds(state, map)).toEqual(['victory', 'perfect_core', 'fx_one_gun']);
  });

  it('a state Challenge that fails on the win tick is forfeited then, not before', () => {
    const { state, ctx } = setup();
    cleanup(state, ctx); // playing, no gun: a state atom stays open
    expect(state.medals.challenge).toBe('open');
    allResolvable(state);
    cleanup(state, ctx);
    expect(state.medals).toEqual({
      victory: 'earned',
      perfectCore: 'earned',
      challenge: 'forfeited',
    });
  });

  it('a counted leak forfeits Perfect Core at once; Victory still comes with the win', () => {
    const { state, ctx, map } = setup();
    leak(state, map);
    cleanup(state, ctx);
    expect(state.outcome).toBe('playing');
    expect(state.medals.perfectCore).toBe('forfeited');
    expect(medalEvents(state)).toEqual([
      { type: 'MedalProgress', medal: 'perfectCore', status: 'forfeited' },
    ]);
    expect(state.stats.medalExemptLeaks).toBe(0);
    state.events.length = 0;
    allResolvable(state);
    cleanup(state, ctx);
    expect(state.medals.victory).toBe('earned');
    expect(state.medals.perfectCore).toBe('forfeited');
    expect(medalEvents(state).filter((e) => e.type === 'MedalProgress')).toHaveLength(2); // V, C
  });

  it('medal-exempt leaks (quiet_wave, youngling, fleeing, medal_exempt) never break Perfect Core', () => {
    const { state, ctx, map } = setup();
    for (const tag of ['quiet_wave', 'youngling', 'fleeing', 'medal_exempt'] as const)
      leak(state, map, [tag]);
    cleanup(state, ctx);
    expect(state.stats.medalExemptLeaks).toBe(4);
    expect(state.medals.perfectCore).toBe('open');
    allResolvable(state);
    cleanup(state, ctx);
    expect(state.medals.perfectCore).toBe('earned');
  });

  it('a loss forfeits every open medal before MapLost', () => {
    const { state, ctx } = setup();
    state.integrity = 0;
    cleanup(state, ctx);
    expect(state.outcome).toBe('lost');
    expect(state.medals).toEqual({
      victory: 'forfeited',
      perfectCore: 'forfeited',
      challenge: 'forfeited',
    });
    expect(medalEvents(state).at(-1)).toEqual({ type: 'MapLost' });
    expect(medalEvents(state)).toHaveLength(4);
  });

  it('a run Challenge is forfeited the tick it breaks, and stays forfeited', () => {
    const content = contentWith({
      markers: { rock: [0, 2], post: [1, 2] },
      medals: {
        challenge: {
          id: 'fx_hold',
          name: 'Hold',
          description: 'No walker past the post.',
          condition: { not: { passedMarker: { marker: 'post', enemy: 'fx_walker' } } },
        },
      },
    });
    const { state, ctx, map } = setup(content);
    spawn(state, WALKER, { route: map.routes.a!, dist: 3 });
    cleanup(state, ctx);
    expect(state.medals.challenge).toBe('open');
    const e = spawn(state, WALKER, { route: map.routes.a!, dist: 5 });
    poolKill(state.enemies, e); // killed past the post: it went past
    cleanup(state, ctx);
    expect(state.medals.challenge).toBe('forfeited');
    expect(medalEvents(state)).toEqual([
      { type: 'MedalProgress', medal: 'challenge', status: 'forfeited' },
    ]);
    allResolvable(state);
    cleanup(state, ctx);
    expect(state.medals).toEqual({
      victory: 'earned',
      perfectCore: 'earned',
      challenge: 'forfeited',
    });
    expect(earnedMedalIds(state, map)).toEqual(['victory', 'perfect_core']);
  });

  it('a map without a Challenge leaves it open and offers two medals', () => {
    const content = contentWith({}, { challenge: false, campaign: false }); // none required
    const { state, ctx, map } = setup(content);
    allResolvable(state);
    cleanup(state, ctx);
    expect(state.medals.challenge).toBe('open');
    expect(mapMedalIds(map)).toEqual(['victory', 'perfect_core']);
    expect(medalId(map, 'challenge')).toBeNull();
    expect(earnedMedalIds(state, map)).toEqual(['victory', 'perfect_core']);
    expect(mapMedalIds(FIXTURE_CONTENT.maps.fx_map)).toEqual([
      'victory',
      'perfect_core',
      'fx_one_gun',
    ]);
  });

  it('a headless run reports the final medals, deterministically', () => {
    const build = FIXTURE_CONTENT.maps.fx_map.builds.parBuild;
    const a = runHeadless(fixtureConfig(), build);
    const b = runHeadless(fixtureConfig(), build);
    expect(a.medals).toEqual(b.medals);
    expect(a.hash).toBe(b.hash);
    expect(a.medals.victory).toBe(a.outcome === 'won' ? 'earned' : 'forfeited');
    if (a.outcome === 'won') expect(a.medals.challenge).toBe('earned'); // par builds a gun
  });
});
