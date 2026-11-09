// T402: Skittish (design/enemies.md § 3; D101). A `fleeing` Skitterkin unit bolts (Haste 40% for
// 1.5 s) when a Skitterkin within 2 tiles dies or is hushed, on any layer.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import type { CompiledEnemyDef } from '../../content/compiled.ts';
import { RAW_CONTENT } from '../../content/registry.ts';
import type { IdSpace, WaveTag } from '../../content/types.ts';
import { MAP, WALKER, enemyDef, setup, spawn } from '../__fixtures__/combat.ts';
import { applyDamage } from '../combat/damage.ts';
import type { SimEvent } from '../events.ts';
import type { SimState } from '../state.ts';
import { cleanup } from '../systems/cleanup.ts';
import { movement } from '../systems/movement.ts';
import type { TickContext } from '../tick.ts';
import { HUSH_TELL_TICKS } from './hush.ts';
import { enemyAbilities } from './index.ts';
import { SKITTISH_HASTE_TICKS, isSkittish } from './skittish.ts';

const E = compileContent(RAW_CONTENT).enemies;
const SRC = { kind: 'ability', slot: 1 } as const;
const FLEE: readonly WaveTag[] = ['fleeing'];

function put(state: SimState, def: CompiledEnemyDef, dist: number, tags: readonly WaveTag[] = []) {
  return spawn(state, def, { dist, tags });
}

function bolts(state: SimState): number[] {
  return state.events
    .filter(
      (e): e is Extract<SimEvent<IdSpace>, { type: 'SkittishBolt' }> => e.type === 'SkittishBolt',
    )
    .map((e) => e.uid);
}

/** Kills `e` and runs cleanup (where the tick's kills are booked). */
function kill(state: SimState, ctx: TickContext, e: ReturnType<typeof put>): void {
  applyDamage(state, e, 1e6, 'psionic', SRC);
  cleanup(state, ctx);
}

describe('Skittish', () => {
  it('is the fleeing modifier on Skitterkin', () => {
    const { state } = setup();
    expect(isSkittish(put(state, WALKER, 1, FLEE))).toBe(true);
    expect(isSkittish(put(state, WALKER, 1))).toBe(false);
  });

  it('a Skitterkin killed within 2 tiles: Haste 40% for 1.5 s from the next tick', () => {
    const { state, ctx } = setup();
    const r = put(state, WALKER, 4, FLEE);
    const dead = put(state, WALKER, 2.5); // any Skitterkin, fleeing or not
    kill(state, ctx, dead);
    expect(bolts(state)).toEqual([r.uid]);
    expect(SKITTISH_HASTE_TICKS).toBe(90);
    expect(r.skittishTicks).toBe(90);
    const paces: number[] = [];
    for (let t = 0; t < 91; t++) {
      enemyAbilities(state, ctx);
      paces.push(r.paceMul);
    }
    expect(paces.slice(0, 90).every((p) => p === 1.4)).toBe(true);
    expect(paces[90]).toBe(1);
    expect(r.skittishTicks).toBe(0);
  });

  it('reaches exactly 2 tiles, in a straight line, on any layer', () => {
    const { state, ctx } = setup();
    // fx_map's road turns at (2,0)→(2,3): straight-line distance, not along the route.
    const dead = put(state, WALKER, 2);
    const edge = put(state, WALKER, 4, FLEE); // 2 tiles away along the second leg
    const flyer = put(state, enemyDef('fx_fly', { layer: 'air' }), 3, FLEE);
    const out = put(state, WALKER, 4.01, FLEE);
    kill(state, ctx, dead);
    expect([edge.skittishTicks, flyer.skittishTicks, out.skittishTicks]).toEqual([90, 90, 0]);
  });

  it('no bolt for a leak, a non-Skitterkin death, or a unit that is not fleeing', () => {
    const { state, ctx } = setup();
    const r = put(state, WALKER, 7.5, FLEE);
    const calm = put(state, WALKER, 7.6);
    put(state, WALKER, MAP.routes.a!.lengthTiles - 0.001); // leaks this tick
    movement(state);
    cleanup(state, ctx);
    kill(state, ctx, put(state, E.mote, 7.4));
    expect([r.skittishTicks, calm.skittishTicks, bolts(state)]).toEqual([0, 0, []]);
  });

  it('a second loss restarts the haste without a second bolt event', () => {
    const { state, ctx } = setup();
    const r = put(state, WALKER, 4, FLEE);
    kill(state, ctx, put(state, WALKER, 3.5));
    for (let t = 0; t < 40; t++) enemyAbilities(state, ctx);
    expect(r.skittishTicks).toBe(50);
    kill(state, ctx, put(state, WALKER, 3.5));
    expect([r.skittishTicks, bolts(state)]).toEqual([90, [r.uid]]);
  });

  it('a hushed Skitterkin sets the runners around it bolting', () => {
    const { state, ctx } = setup();
    put(state, E.mote, 3);
    put(state, WALKER, 3.1, FLEE); // the victim
    const r = put(state, WALKER, 4.5, FLEE);
    // Hold the runner still so the hush is the only thing that happens to it.
    for (let t = 0; t <= HUSH_TELL_TICKS; t++) {
      enemyAbilities(state, ctx);
      r.dist = 4.5;
    }
    expect(bolts(state)).toEqual([r.uid]);
    expect(r.skittishTicks).toBe(90);
  });
});
