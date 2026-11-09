// T407a's minimal Stasis look: who is frozen, and the tint that marks them.
import { describe, expect, it } from 'vitest';
import { rgbOf } from '../../content/palettes/master.ts';
import { ENEMY_BLANK, type Enemy } from '../../sim/entities.ts';
import { HEAVY_TINT } from './hushLook.ts';
import { FREEZE_RING_COLOR, isFrozen, STASIS_TINT } from './stasisLook.ts';

function unit(over: Partial<Enemy>): Enemy {
  return { ...ENEMY_BLANK, alive: true, ...over };
}

describe('the Stasis look (T407a)', () => {
  it('holds while the unit is in Stasis, never once immunity runs or it is gone', () => {
    expect(isFrozen(unit({ stasisTicks: 1 }))).toBe(true);
    expect(isFrozen(unit({ stasisTicks: 0, stasisImmuneTicks: 90 }))).toBe(false);
    expect(isFrozen(unit({ stasisTicks: 5, alive: false }))).toBe(false);
  });

  it('is a pale ice tint, distinct from Heavy, and its ring is the same ice', () => {
    const c = rgbOf('act1.water.3');
    expect(STASIS_TINT).toBe((c.r << 16) | (c.g << 8) | c.b);
    expect(STASIS_TINT).not.toBe(HEAVY_TINT);
    expect(FREEZE_RING_COLOR).toBe('act1.water.3');
  });
});
