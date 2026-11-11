// dev_revoke (devM6.ts; T603's units) as a whole sim: the Expediter catches the drone column up
// and hastes the drones in its ring (enemyAbilities/hasteAura.ts), which then walk 1.3 tiles a
// second, and a drone that reaches the core repossesses 1 integrity. Its W2 Clean Exit (T606) is
// sim/revoke.test.ts's.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import type { IdSpace } from '../../content/types.ts';
import { createSim, type SimConfig } from '../../sim/index.ts';
import { DEV_CONTENT } from './devBattle.ts';

const content = compileContent(DEV_CONTENT);
const maps: Readonly<Record<string, (typeof content.maps)[keyof typeof content.maps]>> =
  content.maps;

function config(): SimConfig<IdSpace> {
  return {
    content,
    mapId: 'dev_revoke',
    seed: 1,
    loadout: maps.dev_revoke!.builds.parBuild.loadout,
    companion: null,
    modifiers: [],
    difficulty: 'standard',
    abilities: { slot1: 'dev_strike', slot2: null, slot2State: 'none' },
    specsUnlocked: [],
    scriptFlags: {},
  };
}

describe('dev_revoke: Everglow Security (T603)', () => {
  it('the Expediter hastes the drones it catches: 1.3 tiles/s in its ring, 1.0 out of it', () => {
    const sim = createSim(config());
    sim.enqueue({ type: 'callWave' });
    let hasted = 0;
    let plain = 0;
    for (let t = 0; t < 60 * 20; t++) {
      const before = new Map<number, number>();
      const pool = sim.state.enemies;
      for (let i = 0; i < pool.used; i++) {
        const e = pool.items[i]!;
        if (e.alive && e.def?.id === 'compliance') before.set(e.uid, e.dist);
      }
      sim.step();
      for (let i = 0; i < pool.used; i++) {
        const e = pool.items[i]!;
        if (!e.alive || e.def?.id !== 'compliance') continue;
        const was = before.get(e.uid);
        if (was === undefined || e.dist >= (e.route?.lengthTiles ?? 0)) continue;
        const step = (e.dist - was) * 60;
        if (e.auraHastePct === 0.3) {
          expect(step).toBeCloseTo(1.3, 9);
          hasted++;
        } else {
          expect(e.auraHastePct).toBe(0);
          expect(step).toBeCloseTo(1.0, 9);
          plain++;
        }
      }
    }
    expect(hasted).toBeGreaterThan(0);
    expect(plain).toBeGreaterThan(0);
  });

  it('with no towers the drones repossess the core, 1 integrity each', () => {
    const sim = createSim(config());
    sim.enqueue({ type: 'callWave' });
    const start = sim.state.integrity;
    for (let t = 0; t < 60 * 40 && sim.state.stats.integrityLost < 7; t++) sim.step();
    // Six drones and an Expediter (leak 1 each).
    expect(start - sim.state.integrity).toBe(7);
  });
});
