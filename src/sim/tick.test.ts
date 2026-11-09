import { describe, expect, it } from 'vitest';
import { FIXTURE_CONTENT, fixtureConfig } from './__fixtures__/sim.ts';
import type { SimConfig } from './config.ts';
import { createState, type SimState } from './state.ts';
import { applyCommands } from './systems/applyCommands.ts';
import { cleanup } from './systems/cleanup.ts';
import { poolKill } from './pool.ts';
import { createScratch, runTick, SYSTEMS, type System, type TickContext } from './tick.ts';
import type { IdSpace } from '../content/types.ts';

function setup(): { state: SimState; ctx: TickContext } {
  const config: SimConfig<IdSpace> = fixtureConfig();
  const map = FIXTURE_CONTENT.maps.fx_map;
  return {
    state: createState(map, config.seed),
    ctx: { content: FIXTURE_CONTENT, map, config, scratch: createScratch() },
  };
}

describe('the system pipeline', () => {
  it('runs in the documented order (architecture.md § Entity model)', () => {
    expect(SYSTEMS.map((s) => s.name)).toEqual([
      'applyCommands',
      'wreckage',
      'waves',
      'triggers',
      'status',
      'links',
      'enemyAbilities',
      'abilities',
      'movement',
      'towers',
      'allies',
      'projectiles',
      'cleanup',
    ]);
    expect(Object.isFrozen(SYSTEMS)).toBe(true);
  });

  it('runTick calls each system once, in order, with the tick number, then advances it', () => {
    const { state, ctx } = setup();
    const calls: string[] = [];
    const probe =
      (name: string): System =>
      (s, c) => {
        expect(c).toBe(ctx);
        calls.push(`${name}@${s.tick}`);
      };
    runTick(state, ctx, [{ run: probe('a') }, { run: probe('b') }, { run: probe('c') }]);
    expect(calls).toEqual(['a@0', 'b@0', 'c@0']);
    expect(state.tick).toBe(1);
  });

  it('applies commands before any later system sees the tick', () => {
    const { state, ctx } = setup();
    let towersSeen = -1;
    state.pending.push({ type: 'build', tile: [1, 1], tower: 'fx_gun' });
    runTick(state, ctx, [
      { run: applyCommands },
      {
        run: (s) => {
          towersSeen = s.towers.live;
        },
      },
    ]);
    expect(towersSeen).toBe(1);
  });
});

describe('cleanup', () => {
  it('releases dead entities at the end of the tick and frees a dead tower’s tile', () => {
    const { state, ctx } = setup();
    state.pending.push({ type: 'build', tile: [1, 1], tower: 'fx_gun' });
    applyCommands(state, ctx);
    const tower = state.towers.items[0]!; // just built
    const tile = 1 * ctx.map.cols + 1;
    expect(state.towerAtTile[tile]).toBe(tower.slot);

    poolKill(state.towers, tower);
    expect(state.towerAtTile[tile]).toBe(tower.slot); // still there until cleanup
    cleanup(state, ctx);
    expect(state.towerAtTile[tile]).toBe(-1);
    expect(state.towers.free).toEqual([0]);
    expect(tower.uid).toBe(0);

    // The tile and the slot are both reusable; the new tower gets a fresh uid.
    state.pending.push({ type: 'build', tile: [1, 1], tower: 'fx_gun' });
    applyCommands(state, ctx);
    expect(state.events.at(-1)).toMatchObject({ type: 'TowerBuilt', uid: 2 });
    expect(state.towerAtTile[tile]).toBe(0);
  });
});
