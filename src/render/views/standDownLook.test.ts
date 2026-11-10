// The stand-down fade (T506; standDownLook.ts; enemyPose.ts `cloakAlpha` reads it first, which
// smoke/penitent.spec.ts checks on screen) and the Ward's kneeling frame (WardView.ts).
import { describe, expect, it } from 'vitest';
import { STAND_DOWN_FADE_SEC } from '../../content/rules.ts';
import { secToTicks } from '../../shared/time.ts';
import { STAND_DOWN_ALPHAS, standDownAlpha } from './standDownLook.ts';
import { spriteId } from './spriteInfo.ts';
import { wardFrame } from './WardView.ts';

describe('the stand-down fade', () => {
  it('steps down the alpha ladder, a rung per quarter of the 1 s fade', () => {
    expect(secToTicks(STAND_DOWN_FADE_SEC)).toBe(60);
    const seen = [60, 46, 45, 31, 30, 16, 15, 1].map(standDownAlpha);
    expect(seen).toEqual([0.8, 0.8, 0.6, 0.6, 0.4, 0.4, 0.2, 0.2]);
    expect(new Set(seen)).toEqual(new Set(STAND_DOWN_ALPHAS));
  });
});

describe('the Ward', () => {
  it('kneels in the bowed pose the placeholder Penitent has (the Witch’s `puff`)', () => {
    expect(wardFrame(spriteId('enemy.sunderglass_penitent'))).toBe('puff_se_0');
    expect(wardFrame(spriteId('enemy.glimmer'))).toBe('walk_se_0');
  });
});
