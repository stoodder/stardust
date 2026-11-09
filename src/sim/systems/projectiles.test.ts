// The projectiles system's tier-4 parts (T202b): Cluster Thumper's bomblets and Bunker Buster's
// Corroded, on the live Thumper specs (design/towers.md § 7). Plain shells are in towers.test.ts.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import { RAW_CONTENT } from '../../content/registry.ts';
import type { IdSpace } from '../../content/types.ts';
import { enemyDef, placeTower, setup, spawn } from '../__fixtures__/combat.ts';
import type { SimEvent as LiveSimEvent } from '../events.ts';
import { hashState } from '../hashState.ts';
import { poolKill } from '../pool.ts';
import type { SimState } from '../state.ts';
import { runTick, type TickContext } from '../tick.ts';

type SimEvent = LiveSimEvent<IdSpace>;
type Ev<T extends SimEvent['type']> = Extract<SimEvent, { type: T }> & { tick: number };

const THUMPER = compileContent(RAW_CONTENT).towers.thumper;
const CLUSTER = THUMPER.specs!.a; // the live Thumper has specs (data.test.ts)
const BUSTER = THUMPER.specs!.b;

/** A still target: fx_map's route at dist 4 is (2.5, 2.5), 1.41 from a Thumper on (3, 1). */
const still = enemyDef('fx_still', { hp: 100000, speedTilesPerTick: 0 });

function run(state: SimState, ctx: TickContext, n: number): (SimEvent & { tick: number })[] {
  const out: (SimEvent & { tick: number })[] = [];
  for (let i = 0; i < n; i++) {
    const tick = state.tick;
    runTick(state, ctx);
    for (const e of state.events) out.push({ ...e, tick });
    state.events.length = 0;
  }
  return out;
}

function ofType<T extends SimEvent['type']>(
  evs: readonly (SimEvent & { tick: number })[],
  type: T,
): Ev<T>[] {
  return evs.filter((e): e is Ev<T> => e.type === type);
}

/** One Cluster Thumper shell on a still target; the events until its bomblets have landed. */
function cluster(seed = 1) {
  const { state, ctx } = setup({ seed });
  const tower = placeTower(state, THUMPER, 3, 1, CLUSTER);
  const e = spawn(state, still, { dist: 4 });
  const evs = run(state, ctx, 67); // shell 0 → 48, bomblets 48 → 66; the next shell is at 100
  return { state, ctx, tower, e, evs };
}

describe('Cluster Thumper: bomblets', () => {
  it('the shell lands, then scatters 4 bomblets that land 0.3 s later within 1.2 tiles', () => {
    const { evs, tower } = cluster();
    const fired = ofType(evs, 'ProjectileFired');
    const hits = ofType(evs, 'ProjectileHit');
    expect(fired).toHaveLength(5);
    const [shell, ...bomblets] = fired;
    expect(shell).toMatchObject({ tick: 0, flightTicks: 48, radiusTiles: 1.2 });
    expect(hits[0]).toMatchObject({ tick: 48, uid: shell!.uid, hits: 1 }); // fired 5 above
    for (const b of bomblets) {
      expect(b).toMatchObject({
        tick: 48,
        kind: 'lobbed',
        towerUid: tower.uid,
        targetUid: 0,
        x: shell!.targetX, // fired 5 above
        y: shell!.targetY,
        sprite: 'projectile.thumper_bomblet',
        flightTicks: 18,
        radiusTiles: 0.6,
      });
      const dx = b.targetX - b.x;
      const dy = b.targetY - b.y;
      expect(dx * dx + dy * dy).toBeLessThanOrEqual(1.2 * 1.2);
    }
    expect(new Set(bomblets.map((b) => b.uid)).size).toBe(4);
    // Each bomblet lands 18 ticks after its shell, once; bomblets don't scatter again.
    expect(hits.slice(1).map((h) => [h.tick, h.uid])).toEqual(bomblets.map((b) => [66, b.uid]));
  });

  it('each bomblet splashes 12 (the shell type) on the enemies within 0.6 of where it lands', () => {
    const { state, ctx } = setup();
    placeTower(state, THUMPER, 3, 1, CLUSTER);
    const e = spawn(state, still, { dist: 4 });
    const evs = run(state, ctx, 49);
    const shellLoss = 100000 - e.hp; // 30 Explosive after its type multiplier
    const mult = shellLoss / 30;
    const bomblets = ofType(evs, 'ProjectileFired').slice(1);
    const near = bomblets.filter(
      (b) => (b.targetX - e.x) ** 2 + (b.targetY - e.y) ** 2 <= 0.6 * 0.6,
    ).length;
    run(state, ctx, 18);
    expect(100000 - e.hp - shellLoss).toBeCloseTo(near * 12 * mult, 9);
  });

  it('bomblets take the tower’s damage bonuses (and a link’s vsStatus bonus) at fire time', () => {
    const { state, ctx } = setup();
    const t = placeTower(state, THUMPER, 3, 1, CLUSTER);
    t.pctDamage = 0.1;
    t.vsStatusMask = 1; // chilled
    t.vsStatusPct = 0.2;
    spawn(state, still, { dist: 4 });
    run(state, ctx, 1);
    const shell = state.projectiles.items.find((p) => p.alive)!; // fired on tick 0
    expect(shell.bombletDamage).toBeCloseTo(12 * 1.1, 12);
    expect(shell.bombletDamageVs).toBeCloseTo(12 * 1.3, 12);
  });

  it('scatter is deterministic: the same seed lands the same points; another seed differs', () => {
    const points = (seed: number): number[][] =>
      ofType(cluster(seed).evs, 'ProjectileFired')
        .slice(1)
        .map((b) => [b.targetX, b.targetY]);
    expect(points(1)).toEqual(points(1));
    expect(points(2)).not.toEqual(points(1));
    expect(hashState(cluster(7).state)).toBe(hashState(cluster(7).state));
  });

  it('a sold tower’s shell still scatters its bomblets', () => {
    const { state, ctx } = setup();
    const t = placeTower(state, THUMPER, 3, 1, CLUSTER);
    spawn(state, still, { dist: 4 });
    run(state, ctx, 1);
    poolKill(state.towers, t); // sold mid-flight
    const evs = run(state, ctx, 66);
    expect(ofType(evs, 'ProjectileFired')).toHaveLength(4);
    expect(ofType(evs, 'ProjectileHit')).toHaveLength(5);
  });
});

describe('Bunker Buster', () => {
  it('one 140-damage shell (splash 0.6) every 2.5 s that applies 3 Corroded stacks', () => {
    const { state, ctx } = setup();
    placeTower(state, THUMPER, 3, 1, BUSTER);
    const target = spawn(state, still, { dist: 4 });
    const evs = run(state, ctx, 301);
    expect(ofType(evs, 'ProjectileFired').map((f) => [f.tick, f.radiusTiles])).toEqual([
      [0, 0.6],
      [150, 0.6],
      [300, 0.6],
    ]);
    expect(ofType(evs, 'ProjectileHit').map((h) => [h.tick, h.hits])).toEqual([
      [48, 1],
      [198, 1],
    ]);
    expect(target.corrodedStacks).toBe(3);
  });

  it('Corroded strips armor for the next hit, never past its max of 3', () => {
    const { state, ctx } = setup();
    placeTower(state, THUMPER, 3, 1, BUSTER);
    const plated = spawn(
      state,
      enemyDef('fx_plated', { hp: 100000, speedTilesPerTick: 0, armor: 8 }),
      {
        dist: 4,
      },
    );
    run(state, ctx, 49); // the first shell lands at 48
    const first = 100000 - plated.hp;
    expect(plated.corrodedStacks).toBe(3);
    run(state, ctx, 150); // the second lands at 198
    const second = 100000 - plated.hp - first;
    expect(plated.corrodedStacks).toBe(3);
    expect(second - first).toBeCloseTo(3, 9); // 3 less armor on the second hit
  });
});
