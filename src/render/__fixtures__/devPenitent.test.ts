import { describe, expect, it } from 'vitest';
import { battleConfig } from '../../app/battleSetup.ts';
import type { IdSpace } from '../../content/types.ts';
import { createSim, type SimEvent } from '../../sim/index.ts';

const KEEP = new Set(['BossPhase', 'BossEnded', 'ShieldReformed', 'StoodDown', 'ObjectiveChanged', 'WaveStarted', 'WaveCleared', 'EnemyLeaked', 'MapWon', 'MapLost', 'AllySpawned', 'ShieldHit']);
function play(build: boolean) {
  const sim = createSim(battleConfig('dev_penitent', 1));
  if (build) for (const s of sim.map.builds.parBuild.steps) {
    if (s.kind === 'build') sim.enqueue({ type: 'build', tower: s.tower, tile: s.tile });
  }
  sim.enqueue({ type: 'callWave' });
  const log: string[] = [];
  const out: SimEvent<IdSpace>[] = [];
  while (sim.state.outcome === 'playing' && sim.state.tick < 60 * 400) {
    sim.step();
    out.length = 0;
    sim.drainEvents(out);
    for (const e of out) if (KEEP.has(e.type) && !(e.type === 'ShieldHit' && !e.broken)) log.push(`${sim.state.tick} ${JSON.stringify(e)}`);
  }
  return { log, state: sim.state };
}
describe('explore', () => {
  it('par', () => {
    const r = play(true);
    console.log(r.log.join('\n'), r.state.outcome, r.state.stats.pivotWave, r.state.integrity, r.state.stats.evacuated);
  });
  it('none', () => {
    const r = play(false);
    console.log(r.log.join('\n'), r.state.outcome, r.state.stats.pivotWave, r.state.integrity, r.state.stats.evacuated);
  });
});
