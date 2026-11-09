import { describe, expect, it } from 'vitest';
import {
  chargeRadius,
  RIPPLE_GAP_MS,
  RIPPLES_PER_FRAME,
  RippleGate,
  tellAlpha,
} from './ShieldView.ts';

describe('RippleGate (the shield ripple, T403)', () => {
  it('ripples a unit at most once per RIPPLE_GAP_MS', () => {
    const g = new RippleGate();
    g.tick(16);
    expect(g.admit(7, false)).toBe(true);
    expect(g.admit(7, false)).toBe(false);
    expect(g.admit(8, false)).toBe(true);
    g.tick(RIPPLE_GAP_MS - 1);
    expect(g.admit(7, false)).toBe(false);
    g.tick(1);
    expect(g.admit(7, false)).toBe(true);
  });

  it('caps the ripples a frame, but a break always shows', () => {
    const g = new RippleGate();
    g.tick(16);
    for (let uid = 1; uid <= RIPPLES_PER_FRAME; uid++) expect(g.admit(uid, false)).toBe(true);
    expect(g.admit(100, false)).toBe(false);
    expect(g.admit(1, true)).toBe(true);
    g.tick(16);
    expect(g.admit(100, false)).toBe(true);
  });

  it('forgets everything on reset', () => {
    const g = new RippleGate();
    g.tick(16);
    g.admit(3, false);
    g.reset();
    g.tick(16);
    expect(g.admit(3, false)).toBe(true);
  });
});

describe('the pulse tell ring', () => {
  it('steps 100% ↔ 60% every 10 sim ticks (3 Hz), steady under reduced motion', () => {
    expect([99, 90, 89, 80, 79, 70, 69].map((t) => tellAlpha(t, false))).toEqual([
      0.6, 0.6, 1, 1, 0.6, 0.6, 1,
    ]);
    expect(tellAlpha(87, true)).toBe(1);
    expect(tellAlpha(80, true)).toBe(1);
  });
});

describe('the charge ring', () => {
  it('closes from the pulse radius to a quarter tile over the tell, in quarter tiles', () => {
    expect(chargeRadius(90, 90, 2)).toBe(2);
    expect(chargeRadius(45, 90, 2)).toBe(1.25); // 0.25 + 1.75 / 2 = 1.125 → 1.25
    expect(chargeRadius(1, 90, 2)).toBe(0.25);
    expect(chargeRadius(0, 90, 2)).toBe(0.25);
    expect(chargeRadius(200, 90, 2)).toBe(2);
  });
});
