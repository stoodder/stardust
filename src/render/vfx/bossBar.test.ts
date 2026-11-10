import { describe, expect, it } from 'vitest';
import {
  BAR_FADE_MS,
  BAR_HOLD_MS,
  barFadeAlpha,
  barFillPx,
  BOSS_BAR_W,
  bossLabel,
  chipPx,
  phaseMarksPx,
} from './bossBar.ts';

describe('the boss bar (T312b)', () => {
  it('fills by HP share, showing a pixel while any HP is left', () => {
    expect(barFillPx(2500, 2500)).toBe(BOSS_BAR_W);
    expect(barFillPx(1500, 2500)).toBe(96);
    expect(barFillPx(1, 2500)).toBe(1);
    expect(barFillPx(0, 2500)).toBe(0);
    expect(barFillPx(10, 0)).toBe(0);
    expect(barFillPx(3000, 2500)).toBe(BOSS_BAR_W);
  });

  it("marks every phase after the first at its threshold (Chitterbloom's 60% and 25%)", () => {
    const phases = [{ fromPct: 1 }, { fromPct: 0.6 }, { fromPct: 0.25 }];
    expect(phaseMarksPx(phases)).toEqual([96, 40]);
    expect(phaseMarksPx([{ fromPct: 1 }])).toEqual([]);
    // The Penitent's shield-broken phase starts when its shield breaks: no mark at 0 (T530a).
    expect(phaseMarksPx([{ fromPct: 1 }, { fromPct: 0, onShieldBroken: true }])).toEqual([]);
    expect(
      phaseMarksPx([{ fromPct: 1 }, { fromPct: 0, onShieldBroken: true }, { fromPct: 0.3 }]),
    ).toEqual([48]);
  });

  it('drains the damage chip toward the fill, never below it', () => {
    expect(chipPx(100, 60, 0)).toBe(100);
    expect(chipPx(100, 60, 100)).toBeCloseTo(84);
    expect(chipPx(100, 60, 10_000)).toBe(60);
    expect(chipPx(50, 60, 16)).toBe(60); // healed past it
  });

  it('holds after the ending, then steps out on the stepped-alpha ladder', () => {
    expect(barFadeAlpha(0)).toBe(1);
    expect(barFadeAlpha(BAR_HOLD_MS - 1)).toBe(1);
    expect(barFadeAlpha(BAR_HOLD_MS)).toBe(0.6);
    expect(barFadeAlpha(BAR_HOLD_MS + BAR_FADE_MS / 2)).toBe(0.35);
    expect(barFadeAlpha(BAR_HOLD_MS + BAR_FADE_MS * 0.9)).toBe(0.15);
    expect(barFadeAlpha(BAR_HOLD_MS + BAR_FADE_MS)).toBe(0);
    // A pivot steps out at once (no hold).
    expect(barFadeAlpha(0, 0)).toBe(0.6);
    expect(barFadeAlpha(BAR_FADE_MS, 0)).toBe(0);
  });

  it('labels the bar in capitals', () => {
    expect(bossLabel('Matriarch Chitterbloom')).toBe('MATRIARCH CHITTERBLOOM');
  });
});
