// dev_choir (T607; devChoir.ts): par's Lullaby Choir beside the bend, a Mindspike beside it
// (Harmony), and two Rivets, against a Maw with Motes and Blinkstriders. The same run every time:
// the towers inside the Choir's ring take its +20%, Harmony forms, units at the bend are Lulled,
// and par wins. The smoke flow (smoke/choir.spec.ts) counts on these.
import { describe, expect, it } from 'vitest';
import { battleConfig } from '../../app/battleSetup.ts';
import type { IdSpace } from '../../content/types.ts';
import { createSim, type Sim } from '../../sim/index.ts';

interface Run {
  hash: string;
  outcome: string;
  lulledTicks: number;
  lulledIds: Set<string>;
  harmony: boolean;
  towers: { id: string; pctDamage: number; jamMul: number; extra: number }[];
}

/** Par's steps in order (each wave-1 step at once), wave 1 called at once, then every wave. */
function play(): Run {
  const sim: Sim<IdSpace> = createSim(battleConfig('dev_choir', 1));
  const uidAt = (col: number, row: number): number => {
    const t = sim.state.towers.items.find((x) => x.alive && x.col === col && x.row === row);
    return t?.uid ?? 0;
  };
  for (const s of sim.map.builds.parBuild.steps) {
    if (s.kind === 'build') sim.enqueue({ type: 'build', tower: s.tower, tile: s.tile });
    else if (s.kind === 'upgrade') sim.enqueue({ type: 'upgrade', towerUid: uidAt(...s.tile) });
    else if (s.kind === 'specialize') {
      sim.enqueue({ type: 'specialize', towerUid: uidAt(...s.tile), spec: s.spec });
    }
    sim.step(); // each step lands before the next names its tower
  }
  sim.enqueue({ type: 'callWave' });
  let lulledTicks = 0;
  const lulledIds = new Set<string>();
  while (sim.state.outcome === 'playing' && sim.state.tick < 60 * 240) {
    sim.step();
    const st = sim.state;
    if (st.schedule.phase === 'countdown') sim.enqueue({ type: 'callWave' });
    for (let i = 0; i < st.enemies.used; i++) {
      const e = st.enemies.items[i]!;
      if (e.alive && e.lulled) {
        lulledTicks++;
        lulledIds.add(e.def!.id);
      }
    }
  }
  const towers = sim.state.towers.items
    .filter((t) => t.alive)
    .map((t) => ({
      id: t.def!.id,
      pctDamage: t.pctDamage,
      jamMul: t.jamMul,
      extra: t.linkExtraTargets,
    }));
  const harmony = (sim.state.stats.linkTicks.harmony ?? 0) > 0;
  return { hash: sim.hash(), outcome: sim.state.outcome, lulledTicks, lulledIds, harmony, towers };
}

describe('dev_choir (T607)', () => {
  const run = play();

  it('is deterministic and par wins', () => {
    expect(play().hash).toBe(run.hash);
    expect(run.outcome).toBe('won');
  });

  it('par builds a Lullaby Choir, a Harmony Mindspike, and two Rivets', () => {
    expect(run.towers.map((t) => t.id)).toEqual(['choir', 'mindspike', 'rivet', 'rivet']);
    expect(run.harmony).toBe(true);
    const [choir, mindspike, near, far] = run.towers;
    expect([choir!.pctDamage, choir!.jamMul]).toEqual([0, 1]); // no Choir covers a Choir
    expect(mindspike!.extra).toBe(1);
    expect(mindspike!.pctDamage).toBeCloseTo(0.2, 12);
    expect(near!.pctDamage).toBeCloseTo(0.2, 12); // (9,4): 2 tiles, inside T3's 2 (+0.5)
    expect(far!.pctDamage).toBe(0); // (12,4): 3.6 tiles off
    expect(near!.jamMul).toBe(0.25);
  });

  it('lulls the units at the bend: the Maw, Motes, and Blinkstriders', () => {
    expect(run.lulledTicks).toBeGreaterThan(60);
    expect([...run.lulledIds].toSorted()).toEqual(['blinkstrider', 'maw', 'mote']);
  });
});
