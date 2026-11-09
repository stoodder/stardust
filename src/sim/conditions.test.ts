// Conditions (T202c): every atom's value now, which atoms settle early and how, the combinators'
// three-valued logic, and the passedMarker latch (route distance, exempt units, dying units).
import { describe, expect, it } from 'vitest';
import type { CompiledContent } from '../content/compiled.ts';
import { compileContent } from '../content/compile.ts';
import type { ConditionDef, IdSpace, RawContent } from '../content/types.ts';
import { RUNNER, WALKER, placeTower, spawn } from './__fixtures__/combat.ts';
import { SIM_FIXTURE } from './__fixtures__/sim.ts';
import {
  ANY_ENEMY,
  evaluateCondition,
  isMedalExempt,
  markerPassedTick,
  markerRouteDist,
  settledCondition,
  trackConditions,
  type ConditionContext,
} from './conditions.ts';
import type { SimConfig } from './config.ts';
import { poolKill } from './pool.ts';
import { createState, type SimState } from './state.ts';

type C = ConditionDef<IdSpace>;

/** fx_map with a `post` marker beside the road's corner at (2,2), route distance 4. */
const RAW: RawContent<IdSpace> = {
  ...SIM_FIXTURE,
  maps: {
    fx_map: {
      ...SIM_FIXTURE.maps.fx_map,
      markers: { rock: [0, 2], post: [1, 2] },
      medals: {
        challenge: {
          id: 'fx_hold_the_post',
          name: 'Hold the Post',
          description: 'No walker gets past the post.',
          condition: { not: { passedMarker: { marker: 'post', enemy: 'fx_walker' } } },
        },
      },
    },
  },
  links: {
    crossfire: {
      id: 'crossfire',
      name: 'Fixture Crossfire',
      partners: [
        { tower: 'fx_gun', bonuses: [{ stat: 'rate', pct: 0.1 }] },
        { tower: 'fx_mortar', bonuses: [{ stat: 'rate', pct: 0.1 }] },
      ],
    },
  },
};
const CONTENT: CompiledContent<IdSpace> = compileContent(RAW);
const MAP = CONTENT.maps.fx_map!;
const GUN = CONTENT.towers.fx_gun!;
const MORTAR = CONTENT.towers.fx_mortar!;
const ROAD = MAP.routes.a!;

function setup(flags: SimConfig<IdSpace>['scriptFlags'] = {}): {
  state: SimState;
  ctx: ConditionContext;
} {
  return {
    state: createState(MAP, 1),
    ctx: { content: CONTENT, config: { scriptFlags: flags } },
  };
}

const now = (c: C, s: SimState, ctx: ConditionContext): boolean => evaluateCondition(c, s, ctx);
const settled = (c: C, s: SimState, ctx: ConditionContext): boolean | null =>
  settledCondition(c, s, ctx);

describe('condition atoms', () => {
  it('stat: a run counter against gte/lte; settles false past lte, true at gte without lte', () => {
    const { state, ctx } = setup();
    const atMost2: C = { stat: 'integrityLost', lte: 2 };
    const atLeast3: C = { stat: 'towersBuilt', gte: 3 };
    const band: C = { stat: 'abilityUses', gte: 1, lte: 2 };
    expect([now(atMost2, state, ctx), settled(atMost2, state, ctx)]).toEqual([true, null]);
    expect([now(atLeast3, state, ctx), settled(atLeast3, state, ctx)]).toEqual([false, null]);
    state.stats.integrityLost = 3;
    state.stats.towersBuilt = 3;
    state.stats.abilityUses = 2;
    expect([now(atMost2, state, ctx), settled(atMost2, state, ctx)]).toEqual([false, false]);
    expect([now(atLeast3, state, ctx), settled(atLeast3, state, ctx)]).toEqual([true, true]);
    // In the band now, but another use would leave it: still open.
    expect([now(band, state, ctx), settled(band, state, ctx)]).toEqual([true, null]);
  });

  it('towers: live towers by id and faction, judged now (never settles early)', () => {
    const { state, ctx } = setup();
    const gun = placeTower(state, GUN, 1, 1);
    placeTower(state, MORTAR, 3, 1);
    expect(now({ towers: { tower: 'fx_gun' }, gte: 1 }, state, ctx)).toBe(true);
    expect(now({ towers: {}, gte: 2, lte: 2 }, state, ctx)).toBe(true);
    expect(now({ towers: { faction: GUN.faction }, gte: 1 }, state, ctx)).toBe(true);
    expect(now({ towers: { faction: 'aelari' }, lte: 0 }, state, ctx)).toBe(true);
    expect(settled({ towers: { tower: 'fx_gun' }, gte: 1 }, state, ctx)).toBeNull();
    poolKill(state.towers, gun); // sold: dead towers don't count
    expect(now({ towers: { tower: 'fx_gun' }, gte: 1 }, state, ctx)).toBe(false);
  });

  it('linkActive: a pair of that link is active now', () => {
    const { state, ctx } = setup();
    expect(now({ linkActive: 'crossfire' }, state, ctx)).toBe(false);
    state.linkPairs.push(0, 1, 2); // crossfire is link 0
    expect(now({ linkActive: 'crossfire' }, state, ctx)).toBe(true);
    expect(settled({ linkActive: 'crossfire' }, state, ctx)).toBeNull();
  });

  it('tagRatio: leaked or killed ÷ spawned; false when none spawned', () => {
    const { state, ctx } = setup();
    const c: C = { tagRatio: { tag: 'quiet_wave', of: 'leaked', gte: 0.75 } };
    expect(now(c, state, ctx)).toBe(false);
    state.stats.tagSpawned.quiet_wave = 4;
    state.stats.tagLeaked.quiet_wave = 3;
    expect(now(c, state, ctx)).toBe(true);
    expect(now({ tagRatio: { tag: 'quiet_wave', of: 'killed', gte: 0.25 } }, state, ctx)).toBe(
      false,
    );
    expect(settled(c, state, ctx)).toBeNull();
  });

  it('flag: equals the config value; an unset flag never matches; settled from the start', () => {
    const { state, ctx } = setup({ door_choice: 'warren' });
    expect(now({ flag: 'door_choice', eq: 'warren' }, state, ctx)).toBe(true);
    expect(settled({ flag: 'door_choice', eq: 'convoy' }, state, ctx)).toBe(false);
    expect(now({ flag: 'spared_quiet_wave', eq: false }, state, ctx)).toBe(false);
  });
});

describe('combinators', () => {
  it('all/any/not, with three-valued settling', () => {
    const { state, ctx } = setup({ door_choice: 'warren' });
    const yes: C = { flag: 'door_choice', eq: 'warren' };
    const no: C = { flag: 'door_choice', eq: 'convoy' };
    const open: C = { towers: {}, gte: 1 };
    expect(now({ all: [yes, { not: no }] }, state, ctx)).toBe(true);
    expect(now({ any: [no, open] }, state, ctx)).toBe(false);
    expect(settled({ all: [yes, open] }, state, ctx)).toBeNull();
    expect(settled({ all: [no, open] }, state, ctx)).toBe(false);
    expect(settled({ any: [yes, open] }, state, ctx)).toBe(true);
    expect(settled({ any: [no, open] }, state, ctx)).toBeNull();
    expect(settled({ not: { all: [yes, yes] } }, state, ctx)).toBe(false);
    expect(settled({ not: open }, state, ctx)).toBeNull();
  });
});

describe('passedMarker', () => {
  it("a marker's route distance is the closest route point's", () => {
    expect(markerRouteDist(ROAD, 1.5, 2.5)).toBeCloseTo(4, 9); // beside the corner tile (2,2)
    expect(markerRouteDist(ROAD, 0.5, 2.5)).toBeCloseTo(4, 9); // rock: (2,2) is still closest
    expect(markerRouteDist(ROAD, 5.5, 4.5)).toBeCloseTo(ROAD.lengthTiles, 9);
  });

  it('a route that doubles back past a marker: the later stretch counts', () => {
    const loop = {
      ...ROAD,
      xs: [0.5, 2.5, 0.5],
      ys: [0.5, 0.5, 0.5],
      cumLenTiles: [0, 2, 4],
      lengthTiles: 4,
    };
    expect(markerRouteDist(loop, 1.5, 1.5)).toBeCloseTo(3, 9);
  });

  it('latches the tick a unit of the kind first goes past, ignoring exempt units', () => {
    const { state, ctx } = setup();
    const c: C = { passedMarker: { marker: 'post', enemy: 'fx_walker' } };
    const fleeing = spawn(state, WALKER, { route: ROAD, dist: 5, tags: ['fleeing'] });
    const runner = spawn(state, RUNNER, { route: ROAD, dist: 6 });
    const walker = spawn(state, WALKER, { route: ROAD, dist: 4 }); // at the post, not past it
    state.tick = 10;
    trackConditions(state, MAP);
    expect(now(c, state, ctx)).toBe(false);
    expect(settled({ not: c }, state, ctx)).toBeNull();
    walker.dist = 4.01;
    poolKill(state.enemies, walker); // died this tick, past the post: still counts
    state.tick = 11;
    trackConditions(state, MAP);
    expect(markerPassedTick(state, 'post', 'fx_walker')).toBe(11);
    expect(now(c, state, ctx)).toBe(true);
    expect(settled({ not: c }, state, ctx)).toBe(false);
    state.tick = 12;
    trackConditions(state, MAP);
    expect(markerPassedTick(state, 'post', 'fx_walker')).toBe(11); // the first pass stays
    expect(isMedalExempt(fleeing.tags)).toBe(true);
    expect(isMedalExempt(runner.tags)).toBe(false);
  });

  it('without an enemy, any non-exempt unit counts (keyed ANY_ENEMY)', () => {
    const raw: RawContent<IdSpace> = {
      ...RAW,
      maps: {
        fx_map: {
          ...RAW.maps.fx_map!,
          events: [
            {
              id: 'past',
              on: { tick: 0 },
              when: { passedMarker: { marker: 'post' } },
              actions: [{ grantCredits: 1 }],
            },
          ],
        },
      },
    };
    const map = compileContent(raw).maps.fx_map!;
    const state = createState(map, 1);
    spawn(state, WALKER, { route: map.routes.a!, dist: 7, tags: ['youngling'] });
    trackConditions(state, map);
    expect(markerPassedTick(state, 'post', ANY_ENEMY)).toBe(-1);
    spawn(state, RUNNER, { route: map.routes.a!, dist: 7 });
    trackConditions(state, map);
    expect(markerPassedTick(state, 'post', ANY_ENEMY)).toBe(0);
    expect(markerPassedTick(state, 'post', 'fx_walker')).toBe(-1); // a young walker is exempt
  });
});
