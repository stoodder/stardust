import { describe, expect, it } from 'vitest';
import { FIN_SKY, FIN_SKY_WAVES } from './lighting.ts';
import { PHASE_1_WAVES } from './map.ts';

describe("FIN's sky (T831; D154's T701 ruling)", () => {
  it('is sky-only keys with no darkness, so the sim and the world never read it', () => {
    for (const k of FIN_SKY) {
      expect(k.skyOnly).toBe(true);
      expect(k.dark).toBeUndefined();
    }
  });

  it("holds the night through W1, then warms toward the dawn's sky to the Halls", () => {
    expect(FIN_SKY[0]).toEqual({ wave: 1, env: 'act3', skyOnly: true });
    const rest = FIN_SKY.slice(1);
    expect(rest.map((k) => k.env)).toEqual(FIN_SKY_WAVES.map(() => 'finale'));
    expect(rest.map((k) => k.wave)).toEqual([...FIN_SKY_WAVES]);
    for (let i = 1; i < FIN_SKY.length; i++) {
      expect(FIN_SKY[i]!.wave).toBeGreaterThan(FIN_SKY[i - 1]!.wave);
    }
    // Its last step as Phase 1's last wave clears (Phase 2's first starts).
    expect(FIN_SKY.at(-1)!.wave).toBe(PHASE_1_WAVES + 1);
  });
});
