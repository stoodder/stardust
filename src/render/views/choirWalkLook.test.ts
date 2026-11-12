// The finale's choir on its walk (T830; choirWalkLook.ts): bodies and poses (halt only while halted,
// never while waiting), the gate queue that files out smoothly onto the road, the song ring's
// beat, the halt window along the road, and the HALTED plate.
import { describe, expect, it } from 'vitest';
import { CHOIR_SPACING_TILES } from '../../content/rules.ts';
import {
  gateOf,
  HALT_TEXT,
  haltPlateImage,
  memberPose,
  memberSprite,
  queueDepth,
  queuePoint,
  routePoint,
  SONG_FILL_OFF,
  SONG_FILL_ON,
  songFillAlpha,
  songRingShift,
  windowPath,
  type Gate,
} from './choirWalkLook.ts';
import { hasAnim } from './spriteInfo.ts';

const walking = { halted: false, waiting: false, arrived: false };
const halted = { halted: true, waiting: false, arrived: false };
const waiting = { halted: false, waiting: true, arrived: false };
const pebble = { kind: 'singer', pebble: true };
const singer = { kind: 'singer', pebble: false };
const thrum = { kind: 'thrum', pebble: false };

describe('bodies and poses', () => {
  it("draws each in its own T841 sprite, with every pose's anims", () => {
    expect(memberSprite(pebble)).toBe('ally.pebble_lead');
    expect(memberSprite(singer)).toBe('ally.singer');
    expect(memberSprite(thrum)).toBe('ally.thrum');
    for (const f of ['se', 'sw', 'ne', 'nw']) {
      for (const p of ['walk', 'sing', 'halt'])
        expect(hasAnim('ally.pebble_lead', `${p}_${f}`)).toBe(true);
      for (const p of ['walk', 'sing', 'hushed'])
        expect(hasAnim('ally.singer', `${p}_${f}`)).toBe(true);
      for (const p of ['walk', 'sing']) expect(hasAnim('ally.thrum', `${p}_${f}`)).toBe(true);
    }
  });

  it('Pebble halts only while halted; waiting at a leg is singing, not a halt', () => {
    expect(memberPose(pebble, false, halted, false)).toBe('halt');
    expect(memberPose(pebble, false, waiting, false)).toBe('sing');
    expect(memberPose(pebble, false, walking, true)).toBe('walk');
    expect(memberPose(singer, false, halted, false)).toBe('sing');
    expect(memberPose(thrum, false, halted, false)).toBe('sing');
    expect(memberPose(singer, false, walking, true)).toBe('walk');
  });

  it('a hushed singer wears `hushed` whatever the choir does', () => {
    expect(memberPose(singer, true, walking, true)).toBe('hushed');
    expect(memberPose(singer, true, halted, false)).toBe('hushed');
  });
});

/** A road north from (8.5, 3.5) to its core end at (8.5, 13.5), on a 22×14 map. */
const road = { xs: [8.5, 8.5], ys: [3.5, 13.5], cumLenTiles: [0, 10], lengthTiles: 10 };

describe('the gate queue', () => {
  it('runs sideways from the core end, on the side that keeps it on the map', () => {
    const g: Gate = { x: 0, y: 0, fx: 0, fy: 0, sx: 0, sy: 0 };
    gateOf(road, 22, 14, 9, g);
    expect([g.x, g.y]).toEqual([8.5, 13.5]);
    expect([g.fx, g.fy]).toEqual([0, -1]); // up the road
    expect(Math.abs(g.sx)).toBe(1);
    expect(g.sy).toBeCloseTo(0);
    // Near the west edge it turns east.
    const west = { ...road, xs: [1.5, 1.5] };
    gateOf(west, 22, 14, 9, g);
    expect(g.sx).toBe(1);
  });

  it('is q = rank × spacing − the leader’s walk: shrinking smoothly as she walks', () => {
    expect(queueDepth(3, 0)).toBeCloseTo(3 * CHOIR_SPACING_TILES);
    expect(queueDepth(3, 0.5)).toBeCloseTo(3 * CHOIR_SPACING_TILES - 0.5);
    expect(queueDepth(1, 1)).toBeLessThan(0); // on the road
  });

  it('meets the road at the gate (q = 0) and moves only a little per small step of q', () => {
    const g: Gate = { x: 8.5, y: 13.5, fx: 0, fy: -1, sx: -1, sy: 0 };
    const p = { x: 0, y: 0 };
    expect(queuePoint(g, 0, 0, p)).toEqual({ x: 8.5, y: 13.5 });
    expect(queuePoint(g, 0, 1, p)).toEqual({ x: 8.5, y: 13.5 });
    const a = { ...queuePoint(g, 2, 0, p) };
    const b = queuePoint(g, 2.01, 0, { x: 0, y: 0 });
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(0.05);
    // Two files either side of the line.
    expect(queuePoint(g, 2, 0, p).y).not.toBeCloseTo(queuePoint(g, 2, 1, { x: 0, y: 0 }).y);
  });
});

describe('the song ring', () => {
  it('pulses its fill between two low rungs on the hymn, steady under reduced motion', () => {
    const seen = new Set<number>();
    for (let t = 0; t < 200; t++) seen.add(songFillAlpha(t, false));
    expect([...seen].toSorted((x, y) => x - y)).toEqual([SONG_FILL_OFF, SONG_FILL_ON]);
    for (let t = 0; t < 200; t++) expect(songFillAlpha(t, true)).toBe(SONG_FILL_ON);
    const shifts = new Set<number>();
    for (let t = 0; t < 200; t++) shifts.add(songRingShift(t, false));
    expect(shifts.size).toBe(2);
    expect(songRingShift(77, true)).toBe(0);
  });
});

describe('the halt window', () => {
  const bend = { xs: [0, 0, 4], ys: [0, 4, 4], cumLenTiles: [0, 4, 8], lengthTiles: 8 };

  it('finds points along the road', () => {
    expect(routePoint(bend, 2, { x: 0, y: 0 })).toEqual({ x: 0, y: 2 });
    expect(routePoint(bend, 6, { x: 0, y: 0 })).toEqual({ x: 2, y: 4 });
    expect(routePoint(bend, 99, { x: 0, y: 0 })).toEqual({ x: 4, y: 4 });
  });

  it('follows the road round a corner toward the spawn', () => {
    const xs = Array.from({ length: 8 }, () => 0);
    const ys = Array.from({ length: 8 }, () => 0);
    const n = windowPath(bend, 5, 3.5, xs, ys);
    expect(n).toBe(3);
    expect([xs[0], ys[0]]).toEqual([1, 4]); // from the leader
    expect([xs[1], ys[1]]).toEqual([0, 4]); // the corner
    expect([xs[2], ys[2]]).toEqual([0, 3.5]); // its far edge
    expect(windowPath(bend, 7, 6, xs, ys)).toBe(2); // a straight stretch
  });

  it('wears a HALTED plate', () => {
    const img = haltPlateImage();
    expect(HALT_TEXT).toBe('HALTED');
    expect(img.w).toBeGreaterThan(20);
    expect(img.h).toBe(7 + 2);
    expect(img.data[3]).toBe(0); // clipped corner
  });
});
