import { describe, expect, it } from 'vitest';
import { EDGE, placePanel, tickToward, UI_H, UI_W } from './layout.ts';

describe('placePanel', () => {
  it('opens on the side away from the screen center', () => {
    expect(placePanel(200, 180, 96, 72).left).toBe(200 - 14 - 96);
    expect(placePanel(440, 180, 96, 72).left).toBe(440 + 14);
  });

  it('flips to the other side when the preferred side is off screen', () => {
    expect(placePanel(60, 180, 96, 72).left).toBe(60 + 14);
    expect(placePanel(600, 180, 96, 72).left).toBe(600 - 14 - 96);
  });

  it('stays on screen', () => {
    const top = placePanel(320, 2, 96, 72);
    expect(top.top).toBe(EDGE);
    const bottom = placePanel(320, 358, 96, 72);
    expect(bottom.top).toBe(UI_H - EDGE - 72);
    for (const x of [0, 100, 320, 500, 640]) {
      const p = placePanel(x, 180, 96, 72);
      expect(p.left).toBeGreaterThanOrEqual(EDGE);
      expect(p.left + 96).toBeLessThanOrEqual(UI_W - EDGE);
    }
  });
});

describe('tickToward', () => {
  it('moves toward the target and lands on it', () => {
    expect(tickToward(0, 100, 50)).toBe(20);
    expect(tickToward(90, 100, 50)).toBe(92);
    expect(tickToward(99, 100, 16)).toBe(100);
    expect(tickToward(100, 40, 125)).toBe(70);
    expect(tickToward(5, 5, 16)).toBe(5);
  });

  it('never stalls on a zero or negative delta', () => {
    expect(tickToward(0, 3, 0)).toBe(1);
    expect(tickToward(0, 3, -10)).toBe(1);
  });
});
