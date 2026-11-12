import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import {
  FIXTURE_CONTENT,
  SIM_FIXTURE,
  fixtureConfig,
  fixtureSim,
  type FixtureIds,
} from './__fixtures__/sim.ts';
import type { Command } from './commands.ts';
import type { SimEvent } from './events.ts';
import { createSim } from './sim.ts';

type Cmd = Command<FixtureIds>;
type Ev = SimEvent<FixtureIds>;

const buildGun = (col: number, row: number): Cmd => ({
  type: 'build',
  tile: [col, row],
  tower: 'fx_gun',
});

function drain(sim: ReturnType<typeof fixtureSim>): Ev[] {
  const out: Ev[] = [];
  sim.drainEvents(out);
  return out;
}

function rejections(events: readonly Ev[]): string[] {
  return events.flatMap((e) => (e.type === 'CommandRejected' ? [e.reason] : []));
}

/** createSim's error message for a config with `over` applied; fails if it doesn't throw. */
function bad(over: Parameters<typeof fixtureConfig>[0]): string {
  try {
    createSim(fixtureConfig(over));
  } catch (e) {
    expect(e).toBeInstanceOf(RangeError);
    return String(e);
  }
  throw new Error('expected createSim to throw');
}

/** A fresh sim with `cmds` applied (as if paused), and the events they emitted. */
function applied(cmds: readonly Cmd[], over: Parameters<typeof fixtureSim>[0] = {}) {
  const sim = fixtureSim(over);
  for (const c of cmds) sim.enqueue(c);
  sim.applyPending();
  return { sim, events: drain(sim) };
}

describe('createSim', () => {
  it('starts at tick 0 in the setup phase with the map’s credits and integrity', () => {
    const sim = fixtureSim();
    const map = FIXTURE_CONTENT.maps.fx_map;
    expect(sim.state.tick).toBe(0);
    expect(sim.state.wave).toBe(0);
    expect(sim.state.outcome).toBe('playing');
    expect(sim.state.credits).toBe(map.startCredits);
    expect(sim.state.integrity).toBe(map.coreIntegrity);
    expect(sim.state.lockedTowers).toEqual(map.lockedTowersAtStart);
    expect(sim.state.towerAtTile).toHaveLength(map.cols * map.rows);
    expect(sim.map).toBe(map);
  });

  it('rejects invalid configs, listing every problem', () => {
    // @ts-expect-error -- an unknown map id is a type error too
    expect(bad({ mapId: 'nope' })).toMatch(/unknown map 'nope'/);
    expect(bad({ seed: -1 })).toMatch(/seed/);
    expect(bad({ seed: 1.5 })).toMatch(/seed/);
    expect(bad({ loadout: ['fx_gun', 'fx_gun'] })).toMatch(/appears twice/);
    expect(
      bad({ loadout: ['fx_gun', 'fx_mortar', 'fx_sprinkler', 'fx_gun', 'fx_mortar'] }),
    ).toMatch(/limit is 4/);
    expect(bad({ companion: 'bricks' })).toMatch(/companion 'bricks' needs a slot/);
    // Every FEATURE_GATES row is lifted since T808 (the Unsung's `layToRest` was the last); a gate
    // refusal's listing is sim/gates.test.ts's (with a gate table of its own).
    // @ts-expect-error -- an unknown tower id is a type error too
    expect(bad({ specsUnlocked: ['nope'] })).toMatch(/specsUnlocked: unknown tower 'nope'/);
    expect(bad({ specsUnlocked: ['fx_gun', 'fx_gun'] })).toMatch(/'fx_gun' appears twice/);
    expect(
      // @ts-expect-error -- an unknown ability id is a type error too
      bad({ abilities: { slot1: null, slot2: 'nope', slot2State: 'present' } }),
    ).toMatch(/abilities.slot2: unknown ability 'nope'/);
    // Compiled content can't have a waveless map (the validator refuses one); build it by hand.
    const waveless = { ...FIXTURE_CONTENT.maps.fx_map, waves: [] };
    expect(bad({ content: { ...FIXTURE_CONTENT, maps: { fx_map: waveless } } })).toMatch(
      /map 'fx_map' has no waves/,
    );
    const both = bad({ seed: -1, companion: 'bricks' });
    expect(both).toMatch(/seed/);
    expect(both).toMatch(/companion 'bricks' needs a slot/);
  });

  it('accepts a loadout of exactly 4 and an empty one', () => {
    expect(() => fixtureSim({ loadout: [] })).not.toThrow();
    expect(() =>
      fixtureSim({
        loadout: ['fx_gun', 'fx_mortar', 'fx_sprinkler'],
        abilities: { slot1: null, slot2: null, slot2State: 'none' },
      }),
    ).not.toThrow();
  });
});

describe('command timing', () => {
  it('enqueue applies at the start of the next tick, not before', () => {
    const sim = fixtureSim();
    sim.enqueue(buildGun(1, 1));
    expect(sim.state.towers.live).toBe(0);
    expect(sim.state.credits).toBe(200);
    expect(sim.state.pending).toHaveLength(1);
    sim.step();
    expect(sim.state.tick).toBe(1);
    expect(sim.state.pending).toHaveLength(0);
    expect(sim.state.towers.live).toBe(1);
    expect(sim.state.credits).toBe(100);
    expect(sim.state.towers.items[0]?.builtTick).toBe(0); // applied during tick 0
    expect(sim.state.commandLog).toEqual([{ tick: 0, cmd: buildGun(1, 1) }]);
  });

  it('applyPending applies at once without advancing time', () => {
    const sim = fixtureSim();
    sim.step();
    sim.step();
    sim.enqueue(buildGun(1, 1));
    sim.applyPending();
    expect(sim.state.tick).toBe(2);
    expect(sim.state.towers.live).toBe(1);
    expect(sim.state.towers.items[0]?.builtTick).toBe(2);
    expect(sim.state.commandLog).toEqual([{ tick: 2, cmd: buildGun(1, 1) }]);
    sim.applyPending(); // an empty queue is a no-op
    expect(sim.state.commandLog).toHaveLength(1);
  });

  it('applies commands first-in first-out', () => {
    const sim = fixtureSim();
    sim.enqueue(buildGun(1, 1));
    sim.enqueue(buildGun(1, 1));
    sim.step();
    const events = drain(sim);
    expect(events.map((e) => e.type)).toEqual(['TowerBuilt', 'CommandRejected']);
    expect(rejections(events)).toEqual(['tileOccupied']);
  });

  it('copies commands, so the caller can reuse its object', () => {
    const sim = fixtureSim();
    const tile: [number, number] = [1, 1];
    sim.enqueue({ type: 'build', tile, tower: 'fx_gun' });
    tile[0] = 2; // the path: building there would be rejected
    sim.step();
    expect(sim.state.towers.items[0]?.col).toBe(1);
  });

  it('rejects commands after the map has ended, and step() stops advancing', () => {
    const sim = fixtureSim();
    sim.step();
    // Tests only: the outcome is set by cleanup (T105b), which doesn't exist yet.
    Reflect.set(sim.state, 'outcome', 'lost');
    sim.enqueue(buildGun(1, 1));
    sim.step();
    expect(sim.state.tick).toBe(1);
    sim.applyPending();
    expect(rejections(drain(sim))).toEqual(['mapEnded']);
    expect(sim.state.towers.live).toBe(0);
  });
});

describe('command handlers (M1 subset)', () => {
  it('build: places the tower, spends tier 1’s cost, and emits TowerBuilt', () => {
    const { sim, events } = applied([buildGun(3, 2)]);
    const t = sim.state.towers.items[0];
    expect(t).toMatchObject({ alive: true, uid: 1, tier: 1, col: 3, row: 2, x: 3.5, y: 2.5 });
    expect(t?.def?.id).toBe('fx_gun');
    expect(t?.tierDef).toBe(FIXTURE_CONTENT.towers.fx_gun.tiers[0]);
    expect(t?.priority).toBe('first');
    expect(t?.invested).toBe(100);
    expect(t?.firstFiredTick).toBe(-1);
    expect(sim.state.towerAtTile[2 * 6 + 3]).toBe(0);
    expect(sim.state.stats).toMatchObject({ towersBuilt: 1, creditsSpent: 100 });
    expect(events).toEqual([
      { type: 'TowerBuilt', uid: 1, tower: 'fx_gun', tile: [3, 2], cost: 100 },
    ]);
  });

  it('build: rejects bad tiles, locked or foreign towers, and what you can’t afford', () => {
    const cases: [Cmd, string][] = [
      [buildGun(2, 0), 'notBuildable'], // path
      [buildGun(0, 1), 'notBuildable'], // decor
      [buildGun(4, 3), 'notBuildable'], // wreckage
      [buildGun(5, 4), 'notBuildable'], // core
      [buildGun(6, 0), 'invalidTile'],
      [buildGun(-1, 0), 'invalidTile'],
      [buildGun(1.5, 1), 'invalidTile'],
      [{ type: 'build', tile: [3, 1], tower: 'fx_mortar' }, 'towerLocked'],
      [{ type: 'build', tile: [3, 1], tower: 'fx_sprinkler' }, 'notInLoadout'],
    ];
    for (const [cmd, reason] of cases) {
      const { sim, events } = applied([cmd]);
      expect(rejections(events), JSON.stringify(cmd)).toEqual([reason]);
      expect(sim.state.credits).toBe(200);
    }
    const { sim, events } = applied([buildGun(1, 1), buildGun(3, 1), buildGun(4, 2)]);
    expect(rejections(events)).toEqual(['cantAfford']);
    expect(sim.state.credits).toBe(0);
    expect(sim.state.towers.live).toBe(2);
  });

  it('upgrade: tier by tier to 3, then maxTier; unknown uids are rejected', () => {
    const { sim, events } = applied([buildGun(1, 1), { type: 'upgrade', towerUid: 1 }]);
    expect(events.at(-1)).toEqual({ type: 'TowerUpgraded', uid: 1, tier: 2, cost: 80 });
    const t = sim.state.towers.items[0];
    expect(t?.tier).toBe(2);
    expect(t?.tierDef).toBe(FIXTURE_CONTENT.towers.fx_gun.tiers[1]);
    expect(t?.invested).toBe(180);
    expect(sim.state.credits).toBe(20);

    sim.enqueue({ type: 'upgrade', towerUid: 1 });
    sim.enqueue({ type: 'upgrade', towerUid: 99 });
    sim.applyPending();
    expect(rejections(drain(sim))).toEqual(['cantAfford', 'noSuchTower']);
  });

  it('upgrade: stops at tier 3', () => {
    const sim = createSim({
      ...fixtureConfig(),
      content: compileContent<FixtureIds>({
        ...SIM_FIXTURE,
        maps: { fx_map: { ...SIM_FIXTURE.maps.fx_map, startCredits: 1000 } },
      }),
    });
    sim.enqueue(buildGun(1, 1));
    sim.enqueue({ type: 'upgrade', towerUid: 1 });
    sim.enqueue({ type: 'upgrade', towerUid: 1 });
    sim.enqueue({ type: 'upgrade', towerUid: 1 });
    sim.applyPending();
    expect(rejections(drain(sim))).toEqual(['maxTier']);
    expect(sim.state.towers.items[0]?.tier).toBe(3);
    expect(sim.state.credits).toBe(1000 - 100 - 80 - 150);
  });

  it('targeting: sets the priority of towers that pick targets', () => {
    const { sim, events } = applied([
      buildGun(1, 1),
      { type: 'targeting', towerUid: 1, mode: 'strong' },
      { type: 'targeting', towerUid: 7, mode: 'last' },
    ]);
    expect(sim.state.towers.items[0]?.priority).toBe('strong');
    expect(rejections(events)).toEqual(['noSuchTower']);

    const pulse = applied(
      [
        { type: 'build', tile: [1, 1], tower: 'fx_sprinkler' },
        { type: 'targeting', towerUid: 1, mode: 'strong' },
      ],
      { loadout: ['fx_sprinkler'], content: unlockedContent() },
    );
    expect(rejections(pulse.events)).toEqual(['noTargeting']);
    expect(pulse.sim.state.towers.items[0]?.priority).toBeNull();
  });

  it('sell, callWave, and ability are live (economy.test.ts and waves.test.ts cover the rules)', () => {
    const { events } = applied([
      buildGun(1, 1),
      { type: 'sell', towerUid: 1 },
      { type: 'callWave' },
      { type: 'ability', slot: 1, target: [2, 2] },
    ]);
    expect(rejections(events)).toEqual([]);
    expect(events.map((e) => e.type)).toEqual([
      'TowerBuilt',
      'TowerSold',
      'WaveStarted',
      'AbilityUsed',
    ]);
  });
});

/** Fixture content with no towerUnlockWave, so every tower is available at the start. */
function unlockedContent() {
  const { towerUnlockWave: _locked, ...map } = SIM_FIXTURE.maps.fx_map;
  return compileContent<FixtureIds>({ ...SIM_FIXTURE, maps: { fx_map: map } });
}

describe('events', () => {
  it('accumulate across ticks and applyPending until drained, in emission order', () => {
    const sim = fixtureSim();
    sim.enqueue(buildGun(1, 1));
    sim.step();
    sim.enqueue({ type: 'upgrade', towerUid: 1 });
    sim.step();
    sim.enqueue({ type: 'callWave' });
    sim.applyPending();
    expect(drain(sim).map((e) => e.type)).toEqual(['TowerBuilt', 'TowerUpgraded', 'WaveStarted']);
  });

  it('drainEvents appends to `out`, empties the buffer, and a second drain gets nothing', () => {
    const sim = fixtureSim();
    sim.enqueue(buildGun(1, 1));
    sim.step();
    const out: Ev[] = [{ type: 'MapWon' }];
    sim.drainEvents(out);
    expect(out.map((e) => e.type)).toEqual(['MapWon', 'TowerBuilt']);
    expect(sim.state.events).toHaveLength(0);
    sim.drainEvents(out);
    expect(out).toHaveLength(2);
  });

  it('CommandRejected carries the command and the reason', () => {
    const sim = fixtureSim();
    sim.enqueue(buildGun(2, 0));
    sim.applyPending();
    expect(drain(sim)).toEqual([
      { type: 'CommandRejected', cmd: buildGun(2, 0), reason: 'notBuildable' },
    ]);
  });
});

describe('content is never mutated', () => {
  it('stays deep-frozen and unchanged after a run', () => {
    const content = compileContent(SIM_FIXTURE);
    const before = JSON.stringify(content);
    const sim = createSim({ ...fixtureConfig(), content });
    sim.enqueue(buildGun(1, 1));
    for (let i = 0; i < 300; i++) {
      if (i === 10) sim.enqueue({ type: 'upgrade', towerUid: 1 });
      sim.step();
    }
    sim.hash();
    expect(JSON.stringify(content)).toBe(before);
    expectDeepFrozen(content);
  });
});

function expectDeepFrozen(v: unknown, path = 'content'): void {
  if (typeof v !== 'object' || v === null) return;
  expect(Object.isFrozen(v), path).toBe(true);
  for (const [k, child] of Object.entries(v)) expectDeepFrozen(child, `${path}.${k}`);
}
