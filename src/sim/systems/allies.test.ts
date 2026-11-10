// The allies system (T207a): ally posts spawn on tick 0, fire at the nearest enemy in range like a
// hitscan tower, never target `quiet_wave`, `youngling`, or `fleeing` units (D005), are never
// hurt, and book their kills as `{ kind: 'ally', uid }`. A post at fx_map's `rock` marker (0,2):
// its center (0.5, 2.5) is 2 tiles from the path tile (2,2), which is route distance 4.
import { describe, expect, it } from 'vitest';
import type { CompiledAllyPost, CompiledMapDef } from '../../content/compiled.ts';
import { compileContent } from '../../content/compile.ts';
import type { IdSpace } from '../../content/types.ts';
import { enemyDef, MAP, setup, spawn, WALKER } from '../__fixtures__/combat.ts';
import { fixtureConfig, SIM_FIXTURE, type FixtureIds } from '../__fixtures__/sim.ts';
import type { SimEvent } from '../events.ts';
import { runHeadless } from '../headless.ts';
import { createSim } from '../sim.ts';
import { allies, allyMayTarget, removeAlly } from './allies.ts';

const POST: CompiledAllyPost = {
  kind: 'bricks',
  post: 'rock',
  tile: [0, 2],
  attack: {
    type: 'kinetic',
    damage: 8,
    periodTicks: 30,
    rangeTiles: 3,
    rangeSq: 9,
    hitsGround: true,
    hitsAir: true,
  },
  block: null,
};

/** A bare state on fx_map with `posts`. */
function withPosts(posts: readonly CompiledAllyPost[] = [POST]) {
  const s = setup();
  const map: CompiledMapDef<IdSpace> = { ...MAP, allies: posts };
  return { state: s.state, ctx: { ...s.ctx, map } };
}
type Run = ReturnType<typeof withPosts>;

function tickAllies(s: Run, n: number): void {
  for (let i = 0; i < n; i++) {
    allies(s.state, s.ctx);
    s.state.tick++;
  }
}
const attacks = (events: readonly SimEvent<IdSpace>[]) =>
  events.filter(
    (e): e is Extract<SimEvent<IdSpace>, { type: 'AllyAttacked' }> => e.type === 'AllyAttacked',
  );

describe('spawning', () => {
  it('spawns each post on tick 0 at its marker tile, never hurt, once', () => {
    const s = withPosts();
    tickAllies(s, 3);
    expect(s.state.allies.live).toBe(1);
    const a = s.state.allies.items[0]!;
    expect(a).toMatchObject({
      alive: true,
      kind: 'bricks',
      mode: 'post',
      vulnerability: 'never',
      x: 0.5,
      y: 2.5,
      damage: 8,
      damageType: 'kinetic',
      periodTicks: 30,
      rangeSq: 9,
      health: 1,
    });
    expect(s.state.events).toEqual([
      { type: 'AllySpawned', uid: a.uid, kind: 'bricks', x: 0.5, y: 2.5 },
    ]);
  });

  it('spawns nothing on a map with no posts', () => {
    const s = withPosts([]);
    tickAllies(s, 2);
    expect(s.state.allies.live).toBe(0);
    expect(s.state.events).toEqual([]);
  });
});

describe('attacks', () => {
  it('fires at the nearest enemy in range through the damage pipeline', () => {
    const s = withPosts();
    const far = spawn(s.state, WALKER, { dist: 2 }); // (2.5, 0.5): √8 away
    const near = spawn(s.state, WALKER, { dist: 4 }); // (2.5, 2.5): 2 away
    tickAllies(s, 1);
    const a = s.state.allies.items[0]!;
    expect(near.hp).toBe(WALKER.hp - 8);
    expect(far.hp).toBe(WALKER.hp);
    expect(a.targetUid).toBe(near.uid);
    expect(attacks(s.state.events)).toEqual([
      {
        type: 'AllyAttacked',
        uid: a.uid,
        targetUid: near.uid,
        x: 0.5,
        y: 2.5,
        targetX: 2.5,
        targetY: 2.5,
      },
    ]);
  });

  it('breaks ties by the lowest uid, and its range is inclusive', () => {
    const s = withPosts([{ ...POST, attack: { ...POST.attack, rangeSq: 8 } }]);
    const first = spawn(s.state, WALKER, { dist: 2 }); // exactly √8 away
    const twin = spawn(s.state, WALKER, { dist: 2 });
    tickAllies(s, 1);
    expect(first.hp).toBe(WALKER.hp - 8);
    expect(twin.hp).toBe(WALKER.hp);
  });

  it('ignores enemies out of range and layers it does not hit', () => {
    const s = withPosts([{ ...POST, attack: { ...POST.attack, hitsAir: false } }]);
    const out = spawn(s.state, WALKER, { dist: 9 }); // the core, (5.5, 4.5)
    const flyer = spawn(s.state, enemyDef('fx_flyer', { layer: 'air' }), { dist: 4 });
    tickAllies(s, 1);
    expect(out.hp).toBe(WALKER.hp);
    expect(flyer.hp).toBe(WALKER.hp);
    expect(attacks(s.state.events)).toEqual([]);
    expect(s.state.allies.items[0]!.targetUid).toBe(0);
  });

  it('fires every periodTicks while it has a target, and stays ready without one', () => {
    const s = withPosts();
    const tank = spawn(s.state, enemyDef('fx_tank', { hp: 1000 }), { dist: 4 });
    tickAllies(s, 61); // ticks 0, 30, 60
    expect(attacks(s.state.events)).toHaveLength(3);
    expect(tank.hp).toBe(1000 - 24);
    // With nothing in range, the next enemy is shot the tick it shows up.
    const idle = withPosts();
    tickAllies(idle, 45);
    spawn(idle.state, WALKER, { dist: 4 });
    tickAllies(idle, 1);
    expect(attacks(idle.state.events)).toHaveLength(1);
  });

  it("books its kills to the ally, so the bounty and the kill count land as a tower's", () => {
    const s = withPosts();
    const e = spawn(s.state, WALKER, { dist: 4 }); // 30 HP: four shots
    const credits = s.state.credits;
    tickAllies(s, 91);
    expect(e.alive).toBe(false);
    const died = s.state.events.find(
      (ev): ev is Extract<SimEvent<IdSpace>, { type: 'EnemyDied' }> => ev.type === 'EnemyDied',
    );
    expect(died?.killer).toEqual({ kind: 'ally', uid: s.state.allies.items[0]!.uid });
    expect(s.state.credits).toBe(credits + WALKER.bounty);
  });
});

describe('the targeting filter (D005: allies never target quiet-wave, youngling, or fleeing units)', () => {
  it('skips exempt units even when they are nearest, and holds when only they are in range', () => {
    for (const tag of ['quiet_wave', 'youngling', 'fleeing'] as const) {
      const s = withPosts();
      const spared = spawn(s.state, WALKER, { dist: 4, tags: [tag] });
      tickAllies(s, 31);
      expect(spared.hp, tag).toBe(WALKER.hp);
      expect(attacks(s.state.events), tag).toEqual([]);
      const fair = spawn(s.state, WALKER, { dist: 2 });
      tickAllies(s, 1);
      expect(fair.hp, tag).toBe(WALKER.hp - 8);
      expect(spared.hp, tag).toBe(WALKER.hp);
    }
  });

  it('medal_exempt alone is fair game', () => {
    expect(allyMayTarget(['medal_exempt'])).toBe(true);
    expect(allyMayTarget([])).toBe(true);
    expect(allyMayTarget(['medal_exempt', 'fleeing'])).toBe(false);
  });
});

describe('removal', () => {
  it('removeAlly frees the ally and emits AllyRemoved', () => {
    const s = withPosts();
    tickAllies(s, 1);
    const a = s.state.allies.items[0]!;
    removeAlly(s.state, a);
    removeAlly(s.state, a); // twice is harmless
    expect(s.state.allies.live).toBe(0);
    expect(s.state.events.filter((e) => e.type === 'AllyRemoved')).toEqual([
      { type: 'AllyRemoved', uid: a.uid },
    ]);
  });
});

/** The sim fixture with Bricks at the `rock` post, compiled from map data. */
const POSTED = compileContent({
  ...SIM_FIXTURE,
  maps: {
    fx_map: {
      ...SIM_FIXTURE.maps.fx_map,
      allies: [
        {
          kind: 'bricks',
          post: 'rock',
          attack: {
            type: 'kinetic',
            damage: 8,
            ratePerSec: 2,
            rangeTiles: 3,
            targets: { ground: true, air: true },
          },
        },
      ],
    },
  },
});

/** Steps the posted fixture: the first step, then 20 s of W1. */
function postedRun(seed: number) {
  const sim = createSim(fixtureConfig({ content: POSTED, seed }));
  const out: SimEvent<FixtureIds>[] = [];
  sim.step();
  sim.drainEvents(out);
  expect(out.filter((e) => e.type === 'AllySpawned')).toHaveLength(1);
  sim.enqueue({ type: 'callWave' });
  for (let i = 0; i < 1200; i++) sim.step();
  sim.drainEvents(out);
  return { sim, out };
}

describe('through the sim', () => {
  it('compiles a post from map data', () => {
    expect(POSTED.maps.fx_map.allies).toEqual([POST]);
  });

  it('spawns on the first step, kills enemies, and stays deterministic', () => {
    const a = postedRun(5);
    const kills = a.out.filter((e) => e.type === 'EnemyDied' && e.killer.kind === 'ally');
    expect(kills.length).toBeGreaterThan(0);
    expect(a.sim.hash()).toBe(postedRun(5).sim.hash());
  });

  it('a headless run with the post reports no invariant violations', () => {
    const cfg = fixtureConfig({ content: POSTED });
    const result = runHeadless(cfg, POSTED.maps.fx_map.builds.parBuild);
    expect(result.violations).toEqual([]);
  });
});
