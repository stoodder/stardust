import { describe, expect, it } from 'vitest';
import {
  EDGE,
  HUD_CORNERS,
  hudCorners,
  placePanel,
  tickToward,
  TOWER_BOX,
  towerPanelHeight,
  UI_H,
  UI_W,
  wrapParts,
  type Point,
} from './layout.ts';

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

describe('the tower panel around the HUD corners (T213)', () => {
  it('keeps clear of a HUD corner when another spot is free', () => {
    // A tower near the bottom-right build slots: the panel's level spot would cover them.
    const at = placePanel(560, 300, 136, 120, [], HUD_CORNERS);
    for (const r of HUD_CORNERS) {
      const covers =
        at.left < r.x + r.w && r.x < at.left + 136 && at.top < r.y + r.h && r.y < at.top + 120;
      expect(covers).toBe(false);
    }
  });
});

describe('wrapParts', () => {
  it('packs parts into lines and splits a long part at its spaces', () => {
    expect(wrapParts(['Next: +0.5/s', '+3 pierce'], 25)).toEqual(['Next: +0.5/s · +3 pierce']);
    expect(wrapParts(['Next: +0.5/s', '+3 pierce'], 20)).toEqual(['Next: +0.5/s', '+3 pierce']);
    expect(wrapParts(['Engineering unlocks after The Audit'], 25)).toEqual([
      'Engineering unlocks after',
      'The Audit',
    ]);
    expect(wrapParts([], 25)).toEqual([]);
  });

  it('sizes the panel by its rows', () => {
    // Header 18, stats 8, Upgrade, Sell, Target, Hold fire 16 each; 5 gaps of 2; padding 4 + 4.
    expect(towerPanelHeight({ statsLines: ['s'], bonuses: [], deltaLines: [], specs: null })).toBe(
      18 + 8 + 64 + 8 + 10,
    );
    expect(
      towerPanelHeight({ statsLines: ['s'], bonuses: ['a'], deltaLines: ['b'], specs: null }),
    ).toBe(128);
    // Spare runners (once unlocked) adds one more button row.
    expect(
      towerPanelHeight({
        statsLines: ['s'],
        bonuses: [],
        deltaLines: [],
        specs: null,
        spareRunners: false,
      }),
    ).toBe(108 + 18);
  });
});

describe('placePanel around another box (T301b: a star map node)', () => {
  const NODE = { dx: -8, dy: -8, w: 16, h: 16 } as const;
  it('sits 2 px beside the box, away from the screen centre', () => {
    expect(placePanel(200, 180, 176, 100, [], [], NODE).left).toBe(200 - 8 - 2 - 176);
    expect(placePanel(440, 180, 176, 100, [], [], NODE).left).toBe(440 + 8 + 2);
  });

  it('keeps clear of the other boxes it is given, by their own box', () => {
    const wide = { dx: -40, dy: -9, w: 80, h: 36 } as const;
    // A node 30 px to the left: the wide box would cover it, the node box doesn't.
    const p = placePanel(500, 180, 176, 100, [{ x: 300, y: 180 }], [], wide, NODE);
    const covers = p.left < 300 + 8 && 300 - 8 < p.left + 176 && p.top < 188 && 172 < p.top + 100;
    expect(covers).toBe(false);
  });
});

/** The status panel's height among `r`, the HUD's corner blocks. */
function status(r: readonly { h: number }[]): number {
  return r[0]?.h ?? 0;
}

describe('hudCorners (T431)', () => {
  it("grows the status panel by its objective rows and a Protect map's asset row", () => {
    const base = status(HUD_CORNERS);
    expect(hudCorners(0)).toBe(HUD_CORNERS);
    expect(status(hudCorners(1))).toBe(base + 12);
    expect(status(hudCorners(0, true))).toBe(base + 20);
    expect(status(hudCorners(2, true))).toBe(base + 22 + 20);
    // The status panel's width (hud.css: four-digit credits fit).
    expect(HUD_CORNERS[0]?.w).toBe(112);
  });
});
