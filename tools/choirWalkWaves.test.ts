// T820: the choir's walk paced to the waves (`ChoirDef.walkWaves`; sim/choir.ts `legCap`): on
// dev_voices (devM8.ts: 2 waves, the stop 6 tiles up the road) with `walkWaves: 2`, the leader
// walks half the way as W1 starts and waits there (`waiting`, `waitTicks`: no halt scan, no
// ChoirHalted, nothing counted as a halt) until W2 starts; the cap is a ceiling, so a choir
// halted mid-leg walks on when free. Without `walkWaves` the walk is unchanged.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../src/content/compile.ts';
import type { CompiledMapDef } from '../src/content/compiled.ts';
import type { IdSpace } from '../src/content/types.ts';
import { DEV_CONTENT } from '../src/render/__fixtures__/devBattle.ts';
import { spawn } from '../src/sim/__fixtures__/combat.ts';
import { fixtureConfig } from '../src/sim/__fixtures__/sim.ts';
import { choir, initChoir, legCap } from '../src/sim/choir.ts';
import { createState, type SimState } from '../src/sim/state.ts';
import { createScratch, type TickContext } from '../src/sim/tick.ts';

const DEV = compileContent(DEV_CONTENT);
const MAPS: Readonly<Record<string, CompiledMapDef<IdSpace>>> = DEV.maps;
const BASE = MAPS.dev_voices!;
const PACED: CompiledMapDef<IdSpace> = { ...BASE, choir: { ...BASE.choir!, walkWaves: 2 } };
const ROAD = BASE.choir!.route;
const MOTE = DEV.enemies.mote;

function setup(map: CompiledMapDef<IdSpace>): { state: SimState; ctx: TickContext } {
  const state = createState(map, 1);
  initChoir(state, map, {});
  return { state, ctx: { content: DEV, map, config: fixtureConfig(), scratch: createScratch() } };
}

function tick(state: SimState, ctx: TickContext, n: number): void {
  for (let i = 0; i < n; i++) {
    choir(state, ctx);
    state.tick++;
  }
}

describe('legCap', () => {
  it('is wave ÷ walkWaves of the way, all of it from that wave on; all of it unpaced', () => {
    expect(legCap({ walkWaves: 4 }, 40, 1)).toBe(10);
    expect(legCap({ walkWaves: 4 }, 40, 3)).toBe(30);
    expect(legCap({ walkWaves: 4 }, 40, 4)).toBe(40);
    expect(legCap({ walkWaves: 4 }, 40, 9)).toBe(40);
    expect(legCap({ walkWaves: 0 }, 40, 1)).toBe(40);
    expect(legCap({}, 40, 1)).toBe(40);
  });
});

describe('the walk paced to the waves', () => {
  it('leaves an unpaced choir as it was', () => {
    const a = setup(BASE);
    a.state.wave = 1;
    tick(a.state, a.ctx, 2000);
    expect(a.state.choir.arrived).toBe(true);
    expect([a.state.choir.waiting, a.state.choir.waitTicks]).toEqual([false, 0]);
  });

  it('walks a leg as the wave starts, then waits (no halt) for the next', () => {
    const { state, ctx } = setup(PACED);
    const half = state.choir.stopDist / 2;
    state.wave = 1;
    tick(state, ctx, 2000);
    expect(state.choir.dist).toBeCloseTo(half, 9);
    expect(state.choir.waiting).toBe(true);
    expect(state.choir.waitTicks).toBeGreaterThan(0);
    // A Mote just ahead of her while she waits: still waiting, never a halt.
    spawn(state, MOTE, { route: ROAD, dist: ROAD.lengthTiles - state.choir.dist - 0.5 });
    const waits = state.choir.waitTicks;
    tick(state, ctx, 60);
    expect([state.choir.halted, state.choir.haltTicks]).toEqual([false, 0]);
    expect(state.choir.waitTicks).toBe(waits + 60);
    expect(state.events.some((e) => e.type === 'ChoirHalted')).toBe(false);
    // W2 starts: she walks on (halting for the Mote now) and, clear of it, arrives.
    state.wave = 2;
    tick(state, ctx, 30);
    expect(state.choir.waiting).toBe(false);
    expect(state.choir.halted).toBe(true);
    state.enemies.items.forEach((e) => (e.alive = false));
    tick(state, ctx, 2000);
    expect(state.choir.arrived).toBe(true);
    expect(state.choir.waiting).toBe(false);
  });

  it('is a ceiling, not a schedule: halted mid-leg, she finishes it when free', () => {
    const { state, ctx } = setup(PACED);
    state.wave = 1;
    tick(state, ctx, 30);
    const mote = spawn(state, MOTE, {
      route: ROAD,
      dist: ROAD.lengthTiles - state.choir.dist - 0.5,
    });
    tick(state, ctx, 600);
    expect(state.choir.halted).toBe(true);
    const at = state.choir.dist;
    expect(at).toBeLessThan(state.choir.stopDist / 2);
    mote.alive = false;
    state.wave = 2; // a whole leg behind: she walks on into the next leg's allowance
    tick(state, ctx, 3000);
    expect(state.choir.arrived).toBe(true);
  });
});
