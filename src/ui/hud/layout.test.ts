import { describe, expect, it } from 'vitest';
import { EDGE, placePanel, tickToward, TOWER_BOX, UI_H, UI_W, type Point } from './layout.ts';

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

/** Whether a w×h panel at `p` overlaps the box of a tower at `t`. */
function overlaps(p: { left: number; top: number }, w: number, h: number, t: Point): boolean {
  const bx = t.x + TOWER_BOX.dx;
  const by = t.y + TOWER_BOX.dy;
  return p.left < bx + TOWER_BOX.w && bx < p.left + w && p.top < by + TOWER_BOX.h && by < p.top + h;
}

describe('placePanel around other towers (T126)', () => {
  const W = 124;
  const H = 96;

  it('keeps the preferred side when no tower is in the way', () => {
    const far = [{ x: 500, y: 300 }];
    expect(placePanel(200, 180, W, H, far)).toEqual(placePanel(200, 180, W, H));
  });

  it('moves to the other side when a neighbour stands on the preferred one', () => {
    // A tower one screen step left (col − 1, row + 1) of one left of center: the panel opens right.
    const p = placePanel(200, 180, W, H, [{ x: 168, y: 180 }]);
    expect(p.left).toBe(200 + 14);
    expect(overlaps(p, W, H, { x: 168, y: 180 })).toBe(false);
  });

  it('goes above or below when both sides hold towers', () => {
    const others = [
      { x: 168, y: 180 },
      { x: 232, y: 180 },
      { x: 184, y: 172 },
      { x: 216, y: 188 },
    ];
    const p = placePanel(200, 180, W, H, others);
    for (const t of others) expect(overlaps(p, W, H, t)).toBe(false);
    expect(overlaps(p, W, H, { x: 200, y: 180 })).toBe(false);
  });

  it('never covers the selected tower itself, and covers the fewest when it must cover one', () => {
    // A ring of towers all around: some panel must cover one, never the selected tower.
    const ring: Point[] = [];
    for (let dx = -96; dx <= 96; dx += 32) {
      for (let dy = -112; dy <= 112; dy += 16) {
        if (dx !== 0 || dy !== 0) ring.push({ x: 320 + dx, y: 180 + dy });
      }
    }
    const p = placePanel(320, 180, W, H, ring);
    expect(overlaps(p, W, H, { x: 320, y: 180 })).toBe(false);
    expect(p.left).toBeGreaterThanOrEqual(EDGE);
    expect(p.top + H).toBeLessThanOrEqual(UI_H - EDGE);
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
