// dev_mind (T507; devMind.ts): two Mindspikes, one Echo Spike and one Dread, and a Rivet against
// W1's Mote cluster and Blinkstriders, with Ves'thara's Stillness cast on the cluster, play the same
// way every run: echoes land, Dread Unnerves, Stillness freezes Motes, and the map is won. The smoke flow (smoke/mindspike.spec.ts) counts on the same.
import { describe, expect, it } from 'vitest';
import { battleConfig } from '../../app/battleSetup.ts';
import type { IdSpace } from '../../content/types.ts';
import { createSim, type SimEvent } from '../../sim/index.ts';

const ECHO: [number, number] = [6, 4];
const DREAD: [number, number] = [4, 2];

/** The builds, Stillness cast on the cluster, the events that matter, and how the run ends. */
function play(): { log: string[]; hash: string; outcome: string; unnerved: number } {
  const sim = createSim(battleConfig('dev_mind', 1));
  expect(sim.config.companion).toBe('vesthara');
  expect(sim.config.abilities.slot2).toBe('stillness');
  for (const tile of [ECHO, DREAD]) sim.enqueue({ type: 'build', tower: 'mindspike', tile });
  sim.enqueue({ type: 'build', tower: 'rivet', tile: [7, 2] });
  sim.step();
  for (const [tile, spec] of [
    [ECHO, 'a'],
    [DREAD, 'b'],
  ] as const) {
    const t = sim.state.towers.items.find((x) => x.alive && x.col === tile[0] && x.row === tile[1]);
    const uid = t?.uid ?? 0;
    expect(uid).toBeGreaterThan(0);
    sim.enqueue({ type: 'upgrade', towerUid: uid });
    sim.enqueue({ type: 'upgrade', towerUid: uid });
    sim.enqueue({ type: 'specialize', towerUid: uid, spec });
  }
  sim.enqueue({ type: 'callWave' });
  const log: string[] = [];
  const out: SimEvent<IdSpace>[] = [];
  let cast = false;
  let unnerved = 0;
  while (sim.state.outcome === 'playing' && sim.state.tick < 60 * 120) {
    // Stillness on the cluster once three Motes are on the road, centred on the last one out.
    if (!cast) {
      let motes = 0;
      let last: [number, number] = [0, 0];
      for (let i = 0; i < sim.state.enemies.used; i++) {
        const e = sim.state.enemies.items[i]!;
        if (!e.alive || e.def?.id !== 'mote') continue;
        motes++;
        last = [Math.floor(e.x), Math.floor(e.y)];
      }
      if (motes >= 3) {
        sim.enqueue({ type: 'ability', slot: 2, target: last });
        cast = true;
      }
    }
    sim.step();
    for (let i = 0; i < sim.state.enemies.used; i++) {
      const e = sim.state.enemies.items[i]!;
      if (e.alive && e.unnervedTicks > 0) unnerved++;
    }
    out.length = 0;
    sim.drainEvents(out);
    for (const e of out) {
      if (e.type === 'EchoBurst' && e.hits > 0) log.push('echo');
      else if (e.type === 'StasisArea') log.push(`stillness ${e.frozen}`);
      else if (e.type === 'TowerSpecialized') log.push('specialized');
    }
  }
  return { log, hash: sim.hash(), outcome: sim.state.outcome, unnerved };
}

describe('dev_mind', () => {
  it('is deterministic: echoes land, Dread Unnerves, Stillness freezes the cluster, and it wins', () => {
    const a = play();
    expect(play()).toEqual(a);
    expect(a.outcome).toBe('won');
    expect(a.log.filter((l) => l === 'specialized')).toHaveLength(2);
    expect(a.log).toContain('echo');
    expect(a.unnerved).toBeGreaterThan(0);
    const still = a.log.find((l) => l.startsWith('stillness'));
    expect(still).toBeDefined();
    expect(Number(still!.split(' ')[1])).toBeGreaterThan(0);
  });
});
