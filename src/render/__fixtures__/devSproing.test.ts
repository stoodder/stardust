// T704: dev_sproing (devM7.ts) compiles, validates, and runs: its par build's Sproing Pad bonks the
// Puffwings and Gunships and grounds them (sim/leapers.test.ts probes the ground-only Thumper on
// them); Lookie Here and Bounce Chorus form; it wins; the run replays to the same hash.
// smoke/sproing.spec.ts shows it.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import type { IdSpace } from '../../content/types.ts';
import { createSim, type SimConfig } from '../../sim/index.ts';
import { DEV_CONTENT } from './devBattle.ts';

const dev = compileContent(DEV_CONTENT);
const maps: Readonly<Record<string, (typeof dev.maps)[keyof typeof dev.maps]>> = dev.maps;

interface Run {
  readonly hash: string;
  readonly bonks: number;
  readonly grounded: number;
  readonly links: readonly string[];
  readonly outcome: string;
}

function run(): Run {
  const map = maps.dev_sproing!;
  const cfg: SimConfig<IdSpace> = {
    content: dev,
    mapId: 'dev_sproing',
    seed: 3,
    loadout: map.builds.parBuild.loadout,
    companion: null,
    modifiers: [],
    difficulty: 'standard',
    abilities: { slot1: 'dev_strike', slot2: null, slot2State: 'none' },
    specsUnlocked: ['sproing'],
    scriptFlags: {},
  };
  const sim = createSim(cfg);
  sim.enqueue({ type: 'build', tower: 'sproing', tile: [6, 4] });
  sim.enqueue({ type: 'build', tower: 'dev_thumper', tile: [7, 4] });
  sim.enqueue({ type: 'build', tower: 'choir', tile: [5, 4] });
  sim.enqueue({ type: 'build', tower: 'lantern', tile: [6, 5] });
  sim.enqueue({ type: 'callWave' });
  let bonks = 0;
  let grounded = 0;
  const links = new Set<string>();
  for (let i = 0; i < 60 * 90 && sim.state.outcome === 'playing'; i++) {
    sim.step();
    for (const e of sim.state.events) {
      if (e.type === 'LeaperBonk') bonks++;
      if (e.type === 'FlyerGrounded') grounded++;
      if (e.type === 'LinkFormed') links.add(e.link);
      if (e.type === 'CommandRejected') throw new Error(JSON.stringify(e));
    }
  }
  return {
    hash: sim.hash(),
    bonks,
    grounded,
    links: [...links].toSorted(),
    outcome: sim.state.outcome,
  };
}

describe('dev_sproing (T704)', () => {
  it('runs its par build: bonks, grounded flyers, both links, and a win', () => {
    const a = run();
    expect(a.bonks).toBeGreaterThan(0);
    expect(a.grounded).toBeGreaterThan(0);
    expect(a.links).toEqual(['bounce_chorus', 'lookie_here']);
    expect(a.outcome).toBe('won');
    expect(run()).toEqual(a);
  });
});
