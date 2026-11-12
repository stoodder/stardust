// The banks' Stardust icon by phase (T803c; art-direction.md § 2, *The Stardust currency icon*).
import { describe, expect, it } from 'vitest';
import { STARDUST_ICON } from '../../content/sprites/icons/stardust.ts';
import { stardustPhase } from './Banks.tsx';

describe('stardustPhase', () => {
  it("follows the menus' act: the gem through Act II, the gift stone from Act III, gold after", () => {
    expect(stardustPhase(null)).toBe('finale');
    expect(stardustPhase('a1_m01')).toBe('act1');
    expect(stardustPhase('a1_m05')).toBe('act1');
    expect(stardustPhase('a2_m01')).toBe('act2');
    expect(stardustPhase('a2_m06')).toBe('act2');
    expect(stardustPhase('a3_m01')).toBe('act3');
    expect(STARDUST_ICON[stardustPhase('fin_m01')]).toMatch(/^icon\.stardust/);
  });
});
