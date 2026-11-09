// T407a's minimal Stasis look: who is frozen, and the tint that marks them.
import { describe, expect, it } from 'vitest';
import { rgbOf } from '../../content/palettes/master.ts';
import { battleConfig } from '../../app/battleSetup.ts';
import { createSim, type Enemy } from '../../sim/index.ts';
import { HEAVY_TINT } from './hushLook.ts';
import { FREEZE_RING_COLOR, isFrozen, STASIS_TINT } from './stasisLook.ts';

/** A live A1M1 Nibbler, copied (render reads only). */
const BASE: Enemy = (() => {
  const sim = createSim(battleConfig('a1_m01', 1));
  sim.enqueue({ type: 'callWave' });
  for (let t = 0; t < 600; t++) {
    sim.step();
    const e = sim.state.enemies.items.find((x) => x.alive);
    if (e !== undefined) return { ...e };
  }
  throw new Error('no enemy spawned');
})();

function unit(over: Partial<Enemy>): Enemy {
  return { ...BASE, ...over };
}

describe('the Stasis look (T407a)', () => {
  it('holds while the unit is in Stasis, never once immunity runs or it is gone', () => {
    expect(isFrozen(unit({ stasisTicks: 1 }))).toBe(true);
    expect(isFrozen(unit({ stasisTicks: 0, stasisImmuneTicks: 90 }))).toBe(false);
    expect(isFrozen(unit({ stasisTicks: 5, alive: false }))).toBe(false);
  });

  it('is a pale ice tint, distinct from Heavy, and its ring is the same ice', () => {
    const c = rgbOf('act1.water.1');
    expect(STASIS_TINT).toBe((c.r << 16) | (c.g << 8) | c.b);
    expect(STASIS_TINT).not.toBe(HEAVY_TINT);
    expect(FREEZE_RING_COLOR).toBe('act1.water.3');
  });
});
