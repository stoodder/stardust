// Phasing's minimal look (T503; phaseLook.ts): solid units draw whole; a tell alternates whole and
// dithered on the sim's 3 Hz tell step (whole under reduced motion); a Phased unit is a steady,
// faint dithered ghost; the broken ring steps with the tell and holds while Phased.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import { RAW_CONTENT } from '../../content/registry.ts';
import type { Enemy } from '../../sim/index.ts';
import {
  PHASED_ALPHA,
  PHASED_PLAIN_ALPHA,
  TELL_DITHER_ALPHA,
  phaseAlpha,
  phaseDithered,
  phaseRingAlpha,
  phaseState,
} from './phaseLook.ts';

const LIVE = compileContent(RAW_CONTENT);
const MOTH = LIVE.enemies.riftmoth;

function moth(phased: boolean, phaseTicks: number): Enemy {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- only these fields are read
  return { alive: true, uid: 1, def: MOTH, phased, phaseTicks } as Enemy;
}

describe('phasing’s look', () => {
  it('a solid unit (or one that never phases) draws whole and ringless', () => {
    for (const e of [moth(false, 100), { ...moth(false, 10), def: LIVE.enemies.mote }]) {
      expect(phaseState(e)).toBe('solid');
      expect([
        phaseDithered(e, false),
        phaseAlpha(e, true, false),
        phaseRingAlpha(e, false),
      ]).toEqual([false, 1, 0]);
    }
  });

  it('the tell flickers whole and dithered on the 10-tick step; whole under reduced motion', () => {
    const high = moth(false, 25); // 20–29 ticks left: the step's high half
    const low = moth(false, 15); // 10–19: dithered
    expect([phaseState(high), phaseState(low)]).toEqual(['tell', 'tell']);
    expect([phaseDithered(high, false), phaseAlpha(high, true, false)]).toEqual([false, 1]);
    expect([phaseDithered(low, false), phaseAlpha(low, true, false)]).toEqual([
      true,
      TELL_DITHER_ALPHA,
    ]);
    expect([phaseDithered(low, true), phaseAlpha(low, true, true)]).toEqual([false, 1]);
    expect(phaseRingAlpha(high, false)).toBeGreaterThan(phaseRingAlpha(low, false));
    expect(phaseRingAlpha(low, true)).toBe(phaseRingAlpha(high, true));
  });

  it('Phased: a steady dithered ghost, fainter still without a dithered variant', () => {
    const e = moth(true, 40);
    expect(phaseState(e)).toBe('phased');
    expect([phaseDithered(e, false), phaseDithered(e, true)]).toEqual([true, true]);
    expect(phaseAlpha(e, true, false)).toBe(PHASED_ALPHA);
    expect(phaseAlpha(e, false, false)).toBe(PHASED_PLAIN_ALPHA);
    expect(PHASED_PLAIN_ALPHA).toBeLessThan(PHASED_ALPHA);
    expect(phaseRingAlpha(e, false)).toBe(phaseRingAlpha(moth(true, 3), true));
  });
});
