// T402's minimal look: the held runner's shake, Heavy's tint, and the poses the hush and Skittish
// call for (enemyPose.ts).
import { describe, expect, it } from 'vitest';
import { battleConfig } from '../../app/battleSetup.ts';
import { compileContent } from '../../content/compile.ts';
import { RAW_CONTENT } from '../../content/registry.ts';
import { createSim, type Enemy } from '../../sim/index.ts';
import { blankFacts, poseFacts, statePose } from './enemyPose.ts';
import { HEAVY_TINT, HUSH_SHAKE_MS, hushShakePx, isHeld } from './hushLook.ts';

const E = compileContent(RAW_CONTENT).enemies;

/** A live A1M1 Nibbler, copied, with `over` patched in (render reads only). */
const BASE: Enemy = (() => {
  const sim = createSim(battleConfig('a1_m01', 1));
  sim.enqueue({ type: 'callWave' });
  for (let t = 0; t < 600; t++) {
    sim.step();
    const e = sim.state.enemies.items.find((x) => x.alive);
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a test's copy of a live unit
    if (e !== undefined) return { ...e } as Enemy;
  }
  throw new Error('no enemy spawned');
})();

function unit(over: Partial<Enemy>): Enemy {
  return { ...BASE, ...over };
}

describe('the hush look (T402)', () => {
  it('a held runner shakes 1 px either side at 3 Hz; nothing under reduced motion', () => {
    const held = unit({ def: E.nibbler, hushUid: 3, tags: ['fleeing'] });
    expect(isHeld(held)).toBe(true);
    expect(hushShakePx(held, 0, false)).toBe(1);
    expect(hushShakePx(held, HUSH_SHAKE_MS, false)).toBe(-1);
    expect(hushShakePx(held, 0, true)).toBe(0);
    // The Hollow unit holding it doesn't shake, and a free runner doesn't.
    const mote = unit({ def: E.mote, hushUid: 9, hushTicks: 10 });
    expect([isHeld(mote), hushShakePx(mote, 0, false)]).toEqual([false, 0]);
    expect(hushShakePx(unit({ def: E.nibbler }), 0, false)).toBe(0);
  });

  it("Heavy's tint is acid.2 (#9cc214)", () => {
    expect(HEAVY_TINT).toBe(0x9cc214);
  });

  it('a held runner and a bolting one panic; the Hollow unit in its tell walks', () => {
    const f = blankFacts();
    const pose = (e: Enemy) => statePose(poseFacts(e, f));
    expect(pose(unit({ def: E.nibbler, hushUid: 3 }))).toBe('panic');
    expect(pose(unit({ def: E.nibbler, skittishTicks: 5 }))).toBe('panic');
    expect(pose(unit({ def: E.nibbler }))).toBe('walk');
    expect(pose(unit({ def: E.mote, hushUid: 9, hushTicks: 10 }))).toBe('walk');
  });
});
