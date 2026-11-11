// dev_maw (T602; devM6.ts): par's Zapcoils and Rivet against Motes and a Maw on the road, then
// Motes up a rift lane from W2. The same run every time: the Maw gathers (its tendril tell, then
// the gather), the rift cracks as W1 starts and opens as W2 starts, and only then does anything
// walk it. The smoke flow (smoke/maw.spec.ts) counts on these.
import { describe, expect, it } from 'vitest';
import { battleConfig } from '../../app/battleSetup.ts';
import type { IdSpace } from '../../content/types.ts';
import { createSim, riftStatus, type SimEvent } from '../../sim/index.ts';

interface Run {
  log: string[];
  hash: string;
  outcome: string;
  firstRiftSpawn: number;
  waveStart: number[];
}

/** Par's builds, wave 1 called at once, each wave called as its countdown starts. */
function play(): Run {
  const sim = createSim(battleConfig('dev_maw', 1));
  for (const s of sim.map.builds.parBuild.steps) {
    if (s.kind === 'build') sim.enqueue({ type: 'build', tower: s.tower, tile: s.tile });
  }
  sim.enqueue({ type: 'callWave' });
  const log: string[] = [];
  const waveStart: number[] = [];
  let firstRiftSpawn = -1;
  const out: SimEvent<IdSpace>[] = [];
  while (sim.state.outcome === 'playing' && sim.state.tick < 60 * 180) {
    sim.step();
    out.length = 0;
    sim.drainEvents(out);
    for (const e of out) {
      const t = sim.state.tick - 1; // the tick the event happened in
      if (e.type === 'GatherTell') log.push(`${t} tell ${e.ally ? 'ally' : 'enemy'}`);
      else if (e.type === 'Gathered') log.push(`${t} gathered ${e.victim} ${e.absorbs}`);
      else if (e.type === 'RiftOpening') log.push(`${t} opening ${e.route} ${e.wave}`);
      else if (e.type === 'RiftOpened') log.push(`${t} opened ${e.route} ${e.wave}`);
      else if (e.type === 'WaveStarted') waveStart.push(t);
      else if (e.type === 'EnemySpawned' && firstRiftSpawn < 0) {
        const en = sim.state.enemies.items.find((x) => x.uid === e.uid);
        if (en?.route?.kind === 'rift') firstRiftSpawn = t;
      }
    }
  }
  return { log, hash: sim.hash(), outcome: sim.state.outcome, firstRiftSpawn, waveStart };
}

describe('dev_maw (T602)', () => {
  const run = play();

  it('is deterministic and par wins', () => {
    const again = play();
    expect(again.hash).toBe(run.hash);
    expect(again.log).toEqual(run.log);
    expect(run.outcome).toBe('won');
  });

  it('the Maw tells, then gathers a Mote', () => {
    const tell = run.log.findIndex((l) => l.endsWith('tell enemy'));
    const gathered = run.log.findIndex((l) => l.includes('gathered mote 1'));
    expect(tell).toBeGreaterThanOrEqual(0);
    expect(gathered).toBeGreaterThan(tell);
  });

  it('the rift cracks as W1 starts (a wave ahead), opens as W2 starts, and is walked after', () => {
    const [w1, w2] = run.waveStart;
    expect(run.log).toContain(`${w1} opening rift 2`);
    expect(run.log).toContain(`${w2} opened rift 2`);
    expect(run.log.filter((l) => l.includes('rift'))).toHaveLength(2);
    expect(run.firstRiftSpawn).toBeGreaterThanOrEqual(w2!);
  });
});

describe('riftStatus', () => {
  it('is closed until the wave before, opening through it, then open', () => {
    const lane = { opensAtWave: 3 };
    expect([0, 1, 2, 3, 4].map((w) => riftStatus(lane, w))).toEqual([
      'closed',
      'closed',
      'opening',
      'open',
      'open',
    ]);
    expect([0, 1].map((w) => riftStatus({ opensAtWave: 1 }, w))).toEqual(['opening', 'open']);
  });
});
