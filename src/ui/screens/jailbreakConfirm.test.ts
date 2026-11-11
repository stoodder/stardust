// T714: the jailbreak's confirmation's words: the price first (free under the convoy, Goldie's
// engineers; 300 Stardust under the warren) and what comes back, with no exclamation points.
import { describe, expect, it } from 'vitest';
import { jailbreakPriceLine, jailbreakWhat } from './jailbreakConfirm.tsx';

describe("the jailbreak's confirmation (T714)", () => {
  it('puts the price first', () => {
    expect(jailbreakPriceLine(0)).toBe("Free: Goldie's engineers did the work.");
    expect(jailbreakPriceLine(300)).toBe('Price first: 300 Stardust.');
  });

  it('names what comes back', () => {
    expect(jailbreakWhat(['rivet'])).toMatch(/^Brings back the Rivet on jailbroken firmware/);
    expect(jailbreakWhat(['rivet', 'thumper'])).toContain('the Rivet and the Thumper');
    expect(`${jailbreakWhat(['rivet'])} ${jailbreakPriceLine(0)}`).not.toContain('!');
  });
});
