// T703: dev_heal end to end (render/__fixtures__/devHeal.ts): the map validates; in a whole run
// the Maintenance Associate mends the drones it walks among; C4 Purge's faction armor lowers every
// Everglow unit's armor and opens its panel, and the run is the same every time either way. The
// unit rules are sim/enemyAbilities/healAura.test.ts's and sim/factionArmor.test.ts's.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import type { IdSpace } from '../../content/types.ts';
import { validate } from '../../content/validate.ts';
import { createSim, healRate, projectedHeal, type Modifier, type Sim } from '../../sim/index.ts';
import { DEV_CONTENT } from './devBattle.ts';

const dev = compileContent({ ...DEV_CONTENT });
const PURGE: Modifier = {
  kind: 'enemyStat',
  stat: 'armor',
  faction: 'everglow',
  flat: -2,
  source: 'c4:purge',
};

function devSim(modifiers: Modifier[] = []): Sim<IdSpace> {
  return createSim<IdSpace>({
    content: dev,
    mapId: 'dev_heal',
    seed: 3,
    loadout: ['rivet', 'lookout'],
    companion: null,
    abilities: { slot1: 'dev_strike', slot2: null, slot2State: 'none' },
    specsUnlocked: [],
    modifiers,
    difficulty: 'standard',
    scriptFlags: {},
  });
}

interface Seen {
  mended: number;
  liabilityArmor: number;
  openPanels: number;
}

/** Three T3 Rivets and a Lookout, then both waves; counts the ticks a unit was being mended. */
function play(sim: Sim<IdSpace>, ticks = 4800): Seen {
  sim.enqueue({ type: 'build', tower: 'rivet', tile: [3, 2] });
  sim.enqueue({ type: 'build', tower: 'rivet', tile: [7, 2] });
  sim.enqueue({ type: 'build', tower: 'rivet', tile: [12, 4] });
  sim.enqueue({ type: 'build', tower: 'lookout', tile: [5, 2] });
  sim.step();
  for (let k = 0; k < 2; k++) {
    for (const t of sim.state.towers.items) {
      if (t.alive && t.def?.id === 'rivet') sim.enqueue({ type: 'upgrade', towerUid: t.uid });
    }
    sim.step();
  }
  sim.enqueue({ type: 'callWave' });
  const seen: Seen = { mended: 0, liabilityArmor: -1, openPanels: 0 };
  const sources: number[] = [];
  while (sim.state.tick < ticks && sim.state.outcome === 'playing') {
    sim.step();
    const pool = sim.state.enemies;
    sources.length = 0;
    for (let i = 0; i < pool.used; i++) if (projectedHeal(pool.items[i]!) !== null) sources.push(i);
    for (let i = 0; i < pool.used; i++) {
      const e = pool.items[i]!;
      if (!e.alive || e.def === null) continue;
      if (healRate(pool, i, sources, sources.length) > 0) seen.mended++;
      if (e.def.id === 'liability') seen.liabilityArmor = e.def.armor;
      if (e.def.openPanel) seen.openPanels++;
    }
  }
  return seen;
}

describe('dev_heal (T703)', () => {
  it('validates', () => {
    expect(validate(DEV_CONTENT).filter((e) => e.includes('dev_heal'))).toEqual([]);
  });

  it('the Associate mends its drones in a whole run, the same every time', () => {
    const a = devSim();
    const b = devSim();
    const seen = play(a);
    play(b);
    expect(a.hash()).toBe(b.hash());
    expect(seen.mended).toBeGreaterThan(0);
    expect(seen.liabilityArmor).toBe(12);
    expect(seen.openPanels).toBe(0);
  });

  it('under Purge every Everglow unit spawns 2 armor lighter with its panel open', () => {
    const a = devSim([PURGE]);
    const b = devSim([PURGE]);
    const seen = play(a);
    play(b);
    expect(a.hash()).toBe(b.hash());
    expect(seen.liabilityArmor).toBe(10);
    expect(seen.openPanels).toBeGreaterThan(0);
  });
});
