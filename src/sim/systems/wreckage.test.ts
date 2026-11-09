// The salvage drone and `clear` (T304b; systems/wreckage.ts): the command's checks, the queue, the
// 6 s per tile, what a cleared tile becomes (a pad to build on, a hidden power node that pays its
// bonus), salvage as income, the WreckageCleared event and stat, and the Salvage Rights and
// Salvage Expert modifiers.
import { describe, expect, it } from 'vitest';
import type { CompiledContent, CompiledMapDef } from '../../content/compiled.ts';
import type { TileChar } from '../../content/types.ts';
import { FIXTURE_CONTENT, fixtureSim, type FixtureIds } from '../__fixtures__/sim.ts';
import type { Modifier } from '../config.ts';
import { gateRefusals } from '../gates.ts';
import type { SimEvent } from '../events.ts';
import type { Sim } from '../sim.ts';
import { tileIndex } from '../grid.ts';
import {
  WRECKAGE_CLEAR_TICKS,
  clearCommand,
  clearTicksFor,
  liveTile,
  salvageFor,
  wreckageStatus,
} from './wreckage.ts';

const MAP = FIXTURE_CONTENT.maps.fx_map;
// fx_map (6×5): wreckage at (4, 3), a pad underneath, 40 salvage; pads (1,1) (3,1) (4,2) (1,3).

/**
 * fx_map with more wreckage: (5, 0) hides a power node (60 salvage), (5, 1) a pad (30), and
 * (0, 2) decor (35).
 */
function moreWreckage(): CompiledContent<FixtureIds> {
  const tiles: TileChar[] = [...MAP.tiles];
  const put = (col: number, row: number): void => {
    tiles[row * MAP.cols + col] = 'x';
  };
  put(5, 0);
  put(5, 1);
  put(0, 2);
  const map: CompiledMapDef<FixtureIds> = {
    ...MAP,
    tiles,
    underWreckage: { ...MAP.underWreckage, '5,0': '+', '5,1': 'o', '0,2': '.' },
    salvage: { ...MAP.salvage, '5,0': 60, '5,1': 30, '0,2': 35 },
  };
  return { ...FIXTURE_CONTENT, maps: { fx_map: map } };
}

function drain(sim: Sim<FixtureIds>): SimEvent<FixtureIds>[] {
  const out: SimEvent<FixtureIds>[] = [];
  sim.drainEvents(out);
  return out;
}

function rejections(sim: Sim<FixtureIds>): string[] {
  return drain(sim).flatMap((e) => (e.type === 'CommandRejected' ? [e.reason] : []));
}

function steps(sim: Sim<FixtureIds>, n: number): void {
  for (let i = 0; i < n; i++) sim.step();
}

describe('the clear command', () => {
  it('queues wreckage; refuses off-map, non-wreckage, queued, and cleared tiles', () => {
    const sim = fixtureSim();
    for (const tile of [
      [9, 9],
      [-1, 0],
    ] as const) {
      sim.enqueue({ type: 'clear', tile: [tile[0], tile[1]] });
    }
    sim.enqueue({ type: 'clear', tile: [1, 1] }); // a pad
    sim.enqueue({ type: 'clear', tile: [2, 0] }); // the path
    sim.enqueue(clearCommand([4, 3]));
    sim.enqueue(clearCommand([4, 3])); // already queued
    sim.applyPending();
    expect(rejections(sim)).toEqual([
      'invalidTile',
      'invalidTile',
      'invalidTarget',
      'invalidTarget',
      'invalidTarget',
    ]);
    expect(sim.state.wreckage.queue).toEqual([tileIndex(MAP, 4, 3)]);
    expect(wreckageStatus(MAP, sim.state.wreckage, 4, 3)).toBe('clearing');
    steps(sim, WRECKAGE_CLEAR_TICKS);
    drain(sim);
    sim.enqueue(clearCommand([4, 3])); // already cleared
    sim.applyPending();
    expect(rejections(sim)).toEqual(['invalidTarget']);
  });

  it('is free and works before wave 1 (setup)', () => {
    const sim = fixtureSim();
    const credits = sim.state.credits;
    sim.enqueue(clearCommand([4, 3]));
    sim.applyPending();
    expect(sim.state.credits).toBe(credits);
    expect(sim.state.schedule.phase).toBe('setup');
    steps(sim, WRECKAGE_CLEAR_TICKS);
    expect(sim.state.stats.wreckageCleared).toBe(1);
  });
});

describe('the salvage drone', () => {
  it('clears the tile 6 s later: salvage as income, the stat, the event, a pad to build on', () => {
    const sim = fixtureSim();
    const credits = sim.state.credits;
    sim.enqueue({ type: 'build', tower: 'fx_gun', tile: [4, 3] });
    sim.enqueue(clearCommand([4, 3]));
    sim.applyPending();
    expect(rejections(sim)).toEqual(['notBuildable']);
    steps(sim, WRECKAGE_CLEAR_TICKS - 1);
    expect(sim.state.stats.wreckageCleared).toBe(0);
    expect(liveTile(MAP, sim.state.wreckage, 4, 3)).toBe('x');
    drain(sim);
    sim.step();
    const cleared = drain(sim).filter((e) => e.type === 'WreckageCleared');
    expect(cleared).toEqual([{ type: 'WreckageCleared', tile: [4, 3], to: 'o', salvage: 40 }]);
    expect(sim.state.credits).toBe(credits + 40);
    expect(sim.state.stats.creditsEarned).toBe(40);
    expect(sim.state.stats.wreckageCleared).toBe(1);
    expect(sim.state.wreckage).toEqual({
      queue: [],
      progressTicks: 0,
      cleared: [tileIndex(MAP, 4, 3)],
    });
    expect(liveTile(MAP, sim.state.wreckage, 4, 3)).toBe('o');
    expect(wreckageStatus(MAP, sim.state.wreckage, 4, 3)).toBe('cleared');
    expect(MAP.tiles[tileIndex(MAP, 4, 3)]).toBe('x'); // the compiled map never changes
    sim.enqueue({ type: 'build', tower: 'fx_gun', tile: [4, 3] });
    sim.applyPending();
    expect(drain(sim).find((e) => e.type === 'TowerBuilt')).toMatchObject({ tile: [4, 3] });
  });

  it('clears one tile at a time, in queue order', () => {
    const content = moreWreckage();
    const map = content.maps.fx_map;
    const sim = fixtureSim({ content });
    for (const t of [
      [5, 1],
      [0, 2],
      [5, 0],
    ] as const) {
      sim.enqueue(clearCommand([t[0], t[1]]));
    }
    sim.applyPending();
    expect(wreckageStatus(map, sim.state.wreckage, 5, 1)).toBe('clearing');
    expect(wreckageStatus(map, sim.state.wreckage, 0, 2)).toBe('queued');
    expect(wreckageStatus(map, sim.state.wreckage, 4, 3)).toBe('wreckage');
    expect(wreckageStatus(map, sim.state.wreckage, 1, 1)).toBe('none');
    const done: [number, number, number][] = [];
    for (let i = 0; i < 3 * WRECKAGE_CLEAR_TICKS + 5; i++) {
      sim.step();
      for (const e of drain(sim)) {
        if (e.type === 'WreckageCleared') done.push([sim.state.tick, e.tile[0], e.salvage]);
      }
    }
    const T = WRECKAGE_CLEAR_TICKS;
    expect(done).toEqual([
      [T, 5, 30],
      [2 * T, 0, 35],
      [3 * T, 5, 60],
    ]);
    expect(liveTile(map, sim.state.wreckage, 0, 2)).toBe('.'); // decor: cleared, not buildable
    expect(liveTile(map, sim.state.wreckage, 5, 0)).toBe('+');
    expect(sim.state.stats.wreckageCleared).toBe(3);
  });

  it('a hidden power node pays its +20% fire rate to the tower built on it', () => {
    const content = moreWreckage();
    const sim = fixtureSim({ content });
    sim.enqueue(clearCommand([5, 0]));
    sim.applyPending();
    steps(sim, WRECKAGE_CLEAR_TICKS);
    sim.enqueue({ type: 'build', tower: 'fx_gun', tile: [5, 0] });
    sim.step();
    const t = sim.state.towers.items.find((x) => x.alive)!;
    expect([t.col, t.row]).toEqual([5, 0]);
    expect(t.pctRate).toBeCloseTo(0.2, 9);
  });

  it('stops when the map has ended', () => {
    const sim = fixtureSim();
    sim.enqueue(clearCommand([4, 3]));
    sim.applyPending();
    Reflect.set(sim.state, 'outcome', 'lost'); // the map ended (the sim's state is read-only outside)
    steps(sim, WRECKAGE_CLEAR_TICKS + 1);
    expect(sim.state.stats.wreckageCleared).toBe(0);
  });
});

/** Salvage Rights at `ranks` (+25% salvage each). */
function rights(ranks: number): Modifier<FixtureIds>[] {
  return Array.from({ length: ranks }, () => ({
    kind: 'economy' as const,
    stat: 'salvage' as const,
    pct: 0.25,
    source: 'shop:salvage_rights',
  }));
}

/** A clear of (4, 3) under Salvage Rights 1, run past the drone's time. */
function salvagedRun(): Sim<FixtureIds> {
  const sim = fixtureSim({ modifiers: rights(1) });
  sim.enqueue(clearCommand([4, 3]));
  steps(sim, WRECKAGE_CLEAR_TICKS + 2);
  return sim;
}

describe('Salvage Rights and Salvage Expert', () => {
  const expert: Modifier<FixtureIds> = {
    kind: 'economy',
    stat: 'clearSpeed',
    pct: 1,
    source: 'protocol:salvage_expert',
  };

  it('are simulated: createSim takes them', () => {
    expect(gateRefusals({ ...fixtureSim().config, modifiers: [...rights(2), expert] })).toEqual([]);
  });

  it('Salvage Rights: +25% salvage per rank, rounded', () => {
    expect(salvageFor([], 40)).toBe(40);
    expect(salvageFor(rights(1), 40)).toBe(50);
    expect(salvageFor(rights(2), 30)).toBe(45);
    expect(salvageFor(rights(1), 30)).toBe(38); // 37.5 rounds up
    const sim = fixtureSim({ modifiers: rights(2) });
    sim.enqueue(clearCommand([4, 3]));
    sim.applyPending();
    steps(sim, WRECKAGE_CLEAR_TICKS);
    expect(drain(sim).find((e) => e.type === 'WreckageCleared')).toMatchObject({ salvage: 60 });
  });

  it('Salvage Expert: clears 2× faster (3 s a tile)', () => {
    expect(WRECKAGE_CLEAR_TICKS).toBe(360);
    expect(clearTicksFor([])).toBe(360);
    expect(clearTicksFor([expert])).toBe(180);
    const sim = fixtureSim({ modifiers: [expert] });
    sim.enqueue(clearCommand([4, 3]));
    sim.applyPending();
    steps(sim, 179);
    expect(sim.state.stats.wreckageCleared).toBe(0);
    sim.step();
    expect(sim.state.stats.wreckageCleared).toBe(1);
  });

  it('replays: the clear and its salvage are in the command log and the hash', () => {
    const a = salvagedRun();
    const b = salvagedRun();
    expect(a.hash()).toBe(b.hash());
    expect(a.state.commandLog.map((l) => l.cmd.type)).toEqual(['clear']);
    expect(fixtureSim().hash()).not.toBe(a.hash());
  });
});
