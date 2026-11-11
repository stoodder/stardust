// T604: dev_den end to end (render/__fixtures__/devM6.ts): two Scuttle Dens and a Rivet against
// W1's Undertows, Underfoot cast on the road. The swarmlings ride an Undertow underground, the trap
// springs, the run is the same every time, and replaying its command log (a checkpoint's resume)
// reaches the same state. The unit rules are sim/swarmlings.test.ts's.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import type { IdSpace } from '../../content/types.ts';
import { createSim, type Command, type Sim } from '../../sim/index.ts';
import { DEV_CONTENT } from './devBattle.ts';

describe('dev_den end to end (T604)', () => {
  const dev = compileContent({ ...DEV_CONTENT });
  type DevSim = Sim<IdSpace>;

  function devSim(): DevSim {
    return createSim<IdSpace>({
      content: dev,
      mapId: 'dev_den',
      seed: 7,
      loadout: ['burrow', 'rivet'],
      companion: 'bramble',
      abilities: { slot1: 'dev_strike', slot2: 'underfoot', slot2State: 'present' },
      specsUnlocked: [],
      modifiers: [],
      difficulty: 'standard',
      scriptFlags: {},
    });
  }

  const SCRIPT: readonly { readonly tick: number; readonly cmd: Command<IdSpace> }[] = [
    { tick: 0, cmd: { type: 'build', tower: 'burrow', tile: [5, 2] } },
    { tick: 0, cmd: { type: 'build', tower: 'burrow', tile: [12, 4] } },
    { tick: 0, cmd: { type: 'build', tower: 'rivet', tile: [7, 2] } },
    { tick: 1, cmd: { type: 'callWave' } },
    { tick: 600, cmd: { type: 'ability', slot: 2, target: [10, 3] } },
  ];

  function play(sim: DevSim, script: typeof SCRIPT, ticks: number): { latchedBelow: number } {
    let latchedBelow = 0;
    while (sim.state.tick < ticks && sim.state.outcome === 'playing') {
      for (const s of script) if (s.tick === sim.state.tick) sim.enqueue(s.cmd);
      sim.step();
      for (const e of sim.state.enemies.items)
        if (e.alive && e.burrowed && e.latchCount > 0) latchedBelow++;
    }
    return { latchedBelow };
  }

  it('runs: the swarmlings follow the Undertows down, the trap springs, the same every time', () => {
    const a = devSim();
    const b = devSim();
    const ra = play(a, SCRIPT, 3000);
    play(b, SCRIPT, 3000);
    expect(a.hash()).toBe(b.hash());
    expect(ra.latchedBelow).toBeGreaterThan(0);
    expect(a.state.stats.abilityUses).toBe(1);
  });

  it('replaying the command log (a checkpoint resume) reaches the same state', () => {
    const a = devSim();
    play(a, SCRIPT, 1500);
    const log = a.state.commandLog.map((e) => ({ tick: e.tick, cmd: e.cmd }));
    const b = devSim();
    play(b, log, 1500);
    expect(b.hash()).toBe(a.hash());
    expect(b.state.allies.live).toBe(a.state.allies.live);
  });
});
