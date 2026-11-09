import { describe, expect, it } from 'vitest';
import { rgbOf } from '../../content/palettes/master.ts';
import { airLaneImage, LANE_DASH_ON, LANE_DASH_PERIOD, lanePixels } from './airLanePixels.ts';

const PTS = [
  { x: 100, y: 40 },
  { x: 130, y: 55 },
  { x: 130, y: 70 },
];

describe('the air lane (art-direction §8)', () => {
  it('steps every segment without gaps, its joints shared', () => {
    const px = lanePixels(PTS);
    expect(px[0]).toEqual([100, 40]);
    expect(px.at(-1)).toEqual([130, 70]);
    for (let i = 1; i < px.length; i++) {
      const [x0, y0] = px[i - 1]!;
      const [x1, y1] = px[i]!;
      expect(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))).toBe(1);
    }
  });

  it('is dotted: LANE_DASH_ON of every LANE_DASH_PERIOD pixels, over an ink under-stroke', () => {
    const lane = airLaneImage(PTS, 0);
    expect([lane.x, lane.y]).toEqual([100, 40]);
    const px = lanePixels(PTS);
    const white = rgbOf('white.0');
    const lit = px.filter(([x, y]) => {
      const i = ((y - lane.y) * lane.image.w + (x - lane.x)) * 4;
      return lane.image.data[i] === white.r && lane.image.data[i + 3]! > 0;
    });
    const expected = px.filter((_, i) => i % LANE_DASH_PERIOD < LANE_DASH_ON).length;
    expect(lit).toHaveLength(expected);
    expect(lane.image.h).toBe(70 - 40 + 2);
  });

  it('drifts in the direction of travel: phase 1 is phase 0 moved one pixel along', () => {
    const px = lanePixels(PTS);
    const litAt = (phase: number): number[] => {
      const lane = airLaneImage(PTS, phase);
      const out: number[] = [];
      px.forEach(([x, y], i) => {
        const k = ((y - lane.y) * lane.image.w + (x - lane.x)) * 4;
        if (lane.image.data[k] === rgbOf('white.0').r && lane.image.data[k + 3]! > 0) out.push(i);
      });
      return out;
    };
    expect(litAt(1)).toEqual(litAt(0).map((i) => i + 1).filter((i) => i < px.length));
  });
});
