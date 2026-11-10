// The star map's data holds (art-direction.md § 10): every planned campaign map has a node, and
// every node stays inside the chart, out of the corner chrome, and clear of every other node.
import { describe, expect, it } from 'vitest';
import { CAMPAIGN_PLAN_IDS } from './campaign.ts';
import {
  STAR_MAP_AFTER,
  STAR_MAP_LONG_WALK,
  STAR_MAP_NODES,
  STAR_MAP_PHASES,
  STAR_MAP_REGIONS,
  starMapProblems,
} from './starMap.ts';

describe('the star map data', () => {
  it('has a node for every planned campaign map, and nothing else', () => {
    expect(Object.keys(STAR_MAP_NODES).toSorted()).toEqual([...CAMPAIGN_PLAN_IDS].toSorted());
  });

  it('keeps every node inside the chart, out of the chrome, and 16 px apart on an axis', () => {
    expect(starMapProblems()).toEqual([]);
  });

  it('catches a node under the header, off the chart, or crowding another', () => {
    const bad = {
      a: { place: 'A', tagline: 'a', x: 20, y: 20 },
      b: { place: 'B', tagline: 'b', x: 636, y: 200 },
      c: { place: 'C', tagline: 'c', x: 300, y: 200 },
      d: { place: 'D', tagline: 'd', x: 310, y: 210 },
    };
    const problems = starMapProblems(bad);
    expect(problems.some((p) => p.startsWith('a: under the corner chrome'))).toBe(true);
    expect(problems).toContain('b: outside the chart');
    expect(problems).toContain('c and d: closer than 16 px on both axes');
  });

  it('starts the star map after Act I, its phases in campaign order', () => {
    expect(STAR_MAP_AFTER).toBe('a1_m05');
    const order = STAR_MAP_PHASES.map((p) => CAMPAIGN_PLAN_IDS.indexOf(p.from));
    expect(order).toEqual(order.toSorted((x, y) => x - y));
    expect(STAR_MAP_PHASES[0]?.from).toBe(
      CAMPAIGN_PLAN_IDS[CAMPAIGN_PLAN_IDS.indexOf('a1_m05') + 1],
    );
  });

  it('runs the Long Walk from the north edge to the south edge through both gates', () => {
    expect(STAR_MAP_LONG_WALK[0]?.y).toBe(0);
    expect(STAR_MAP_LONG_WALK.at(-1)?.y).toBe(360);
    expect(STAR_MAP_LONG_WALK).toContainEqual({ x: 312, y: 196 });
    expect(STAR_MAP_LONG_WALK).toContainEqual({ x: 304, y: 304 });
  });

  it("labels the Long Walk Everglow's way until A2M5 is won", () => {
    const walk = STAR_MAP_REGIONS.find((r) => r.id === 'long_walk');
    expect(walk?.text).toBe('Surge corridor');
    expect(walk?.corrected).toEqual({ after: 'a2_m05', text: 'The Long Walk' });
  });
});
