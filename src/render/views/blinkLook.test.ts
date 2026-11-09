import { describe, expect, it } from 'vitest';
import { AFTERIMAGE_MS, afterimageAlpha, blinkTellAlpha, GHOST_TINT } from './blinkLook.ts';

describe('the blink look (T404)', () => {
  it('the tell steps 85% ↔ 50% every 10 sim ticks (3 Hz), steady 85% under reduced motion', () => {
    expect([0, 9, 10, 19, 20].map((t) => blinkTellAlpha(t, false))).toEqual([
      0.85, 0.85, 0.5, 0.5, 0.85,
    ]);
    expect([0, 8, 90].map((t) => blinkTellAlpha(t, true))).toEqual([0.85, 0.85, 0.85]);
  });

  it('the afterimage fades in steps from 70% and is gone after its time', () => {
    expect(afterimageAlpha(0)).toBe(0.7);
    const steps = [0, 0.6, 0.75, 0.9].map((f) => afterimageAlpha(f * AFTERIMAGE_MS));
    for (let i = 1; i < steps.length; i++) expect(steps[i]).toBeLessThan(steps[i - 1]!);
    expect(afterimageAlpha(AFTERIMAGE_MS)).toBe(0);
  });

  it("fills with the blink tell's violet.4 (art-direction §8)", () => {
    expect(GHOST_TINT).toBe(0xd8acff);
  });
});
