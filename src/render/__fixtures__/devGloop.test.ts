// T705: dev_gloop (devGloop.ts) compiles, validates, and runs: its par build's Big Glorp leaves
// puddles, the Gloop corrodes the armor, and Sticky Flak forms with the Skyhook beside it, so
// smoke/gloop.spec.ts has something to show.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import type { IdSpace } from '../../content/types.ts';
import { createSim, type SimConfig } from '../../sim/index.ts';
import { DEV_CONTENT } from './devBattle.ts';

const dev = compileContent(DEV_CONTENT);

describe('dev_gloop (T705)', () => {
  it('runs its par build: puddles, Corroded, and Sticky Flak', () => {
    const maps: Readonly<Record<string, (typeof dev.maps)[keyof typeof dev.maps]>> = dev.maps;
    const map = maps.dev_gloop!;
    const cfg: SimConfig<IdSpace> = {
      content: dev,
      mapId: 'dev_gloop',
      seed: 1,
      loadout: map.builds.parBuild.loadout,
      companion: null,
      modifiers: [],
      difficulty: 'standard',
      abilities: { slot1: 'dev_strike', slot2: null, slot2State: 'none' },
      specsUnlocked: ['gloop'],
      scriptFlags: {},
    };
    const sim = createSim(cfg);
    sim.enqueue({ type: 'build', tower: 'gloop', tile: [9, 2] });
    sim.enqueue({ type: 'build', tower: 'skyhook', tile: [9, 3] });
    sim.step();
    const gloop = sim.state.towers.items.find((t) => t.alive && t.def?.id === 'gloop')!;
    sim.enqueue({ type: 'upgrade', towerUid: gloop.uid });
    sim.enqueue({ type: 'upgrade', towerUid: gloop.uid });
    sim.enqueue({ type: 'specialize', towerUid: gloop.uid, spec: 'a' });
    sim.enqueue({ type: 'callWave' });
    let puddles = 0;
    let corroded = 0;
    let linked = false;
    for (let i = 0; i < 60 * 40 && sim.state.outcome === 'playing'; i++) {
      sim.step();
      for (const e of sim.state.events) {
        if (e.type === 'PuddleSpawned') puddles++;
        if (e.type === 'LinkFormed') linked = true;
        if (e.type === 'CommandRejected') throw new Error(JSON.stringify(e));
      }
      for (const e of sim.state.enemies.items) if (e.alive && e.corrodedStacks > 0) corroded++;
    }
    expect(gloop.spec).toBe('a');
    expect(puddles).toBeGreaterThan(0);
    expect(corroded).toBeGreaterThan(0);
    expect(linked).toBe(true);
    expect(gloop.pctRate).toBeCloseTo(0.1, 12);
  });
});
