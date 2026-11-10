// dev_rift (T503; devBattle.ts): par's Skyhooks, Rivets, and Zapcoils see every Rift Moth tell and
// phase and the Fractures split twice, the same way every run, so the smoke flow
// (smoke/phase.spec.ts) can count on a tell, a Phased unit, and Shards and Motes on the road.
import { describe, expect, it } from 'vitest';
import { battleConfig } from '../../app/battleSetup.ts';
import type { IdSpace } from '../../content/types.ts';
import { createSim, type SimEvent } from '../../sim/index.ts';

/** Par's builds, the wave called; the phase and split events, and how the run ends. */
function play(): { log: string[]; hash: string; outcome: string } {
  const sim = createSim(battleConfig('dev_rift', 1));
  for (const s of sim.map.builds.parBuild.steps) {
    if (s.kind === 'build') sim.enqueue({ type: 'build', tower: s.tower, tile: s.tile });
  }
  sim.enqueue({ type: 'callWave' });
  const log: string[] = [];
  const out: SimEvent<IdSpace>[] = [];
  while (sim.state.outcome === 'playing' && sim.state.tick < 60 * 120) {
    sim.step();
    out.length = 0;
    sim.drainEvents(out);
    for (const e of out) {
      if (e.type === 'PhaseShift') log.push(`${sim.state.tick} phase ${e.phase}`);
      else if (e.type === 'EnemySpawned') log.push(`${sim.state.tick} spawn ${e.enemy}`);
      else if (e.type === 'TowerBuilt') log.push(`${sim.state.tick} built`);
    }
  }
  return { log, hash: sim.hash(), outcome: sim.state.outcome };
}

describe('dev_rift', () => {
  it('is deterministic: par builds, sees Moths tell and phase, both splits, and wins', () => {
    const a = play();
    expect(play()).toEqual(a);
    expect(a.outcome).toBe('won');
    const has = (what: string): boolean => a.log.some((l) => l.endsWith(what));
    expect(a.log.filter((l) => l.endsWith('built'))).toHaveLength(11);
    for (const what of ['phase tell', 'phase in', 'phase out']) expect(has(what), what).toBe(true);
    expect(has('spawn fracture_shard')).toBe(true);
    expect(has('spawn mote')).toBe(true);
  });
});
