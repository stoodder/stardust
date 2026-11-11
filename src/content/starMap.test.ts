// The star map's data holds (art-direction.md § 10): every planned campaign map has a node, and
// every node stays inside the chart, out of the corner chrome, and clear of every other node.
import { describe, expect, it } from 'vitest';
import { CAMPAIGN_PLAN_IDS } from './campaign.ts';
import {
  NODE_BOX,
  STAR_MAP_AFTER,
  STAR_MAP_LONG_WALK,
  STAR_MAP_NODES,
  STAR_MAP_RESERVED,
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

  it("sets Act III's nodes on their landmarks (art-direction § 10, T612)", () => {
    const n = STAR_MAP_NODES;
    // The Preserve: inside its bowl (x 120–196, y 188–240).
    expect(n.a3_m01.x).toBeGreaterThanOrEqual(120);
    expect(n.a3_m01.x).toBeLessThanOrEqual(196);
    expect(n.a3_m01.y).toBeGreaterThanOrEqual(188);
    expect(n.a3_m01.y).toBeLessThanOrEqual(240);
    // A1M4 at night: beside Admin Plaza's node, the revisit's pair (as A2M3 stands by A1M2's).
    expect(Math.abs(n.a3_m02.x - n.a1_m04.x)).toBe(16);
    expect(Math.abs(n.a3_m02.y - n.a1_m04.y)).toBeLessThanOrEqual(8);
    // Okonkwo's Gap: a vertex of the Long Walk, between the Halls' mouth and the north gate.
    expect(STAR_MAP_LONG_WALK).toContainEqual({ x: n.a3_m03.x, y: n.a3_m03.y });
    // The Shelters (A3M4's teaser): inside the colony's wall (x 268–424, y 196–304).
    expect(n.a3_m04.x).toBeGreaterThan(268);
    expect(n.a3_m04.x).toBeLessThan(424);
    expect(n.a3_m04.y).toBeGreaterThan(196);
    expect(n.a3_m04.y).toBeLessThan(304);
  });

  it('holds the Deep Halls label back until A3M4 names them, over the mouth, clear of the chrome', () => {
    const halls = STAR_MAP_REGIONS.find((r) => r.id === 'deep_halls');
    expect(halls).toMatchObject({ text: 'The Deep Halls', shownAfter: 'a3_m04' });
    expect(STAR_MAP_REGIONS.filter((r) => r.shownAfter !== undefined)).toHaveLength(1);
    // A label box about 90×10 px around its anchor: inside the chart, off the corner chrome, and
    // above the finale's glyph at the Halls' mouth.
    const box = { x: halls!.x - 45, y: halls!.y - 5, w: 90, h: 10 };
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    for (const r of STAR_MAP_RESERVED) {
      expect(
        box.x < r.x + r.w && r.x < box.x + box.w && box.y < r.y + r.h && r.y < box.y + box.h,
      ).toBe(false);
    }
    expect(box.y + box.h).toBeLessThanOrEqual(STAR_MAP_NODES.fin_m01.y + NODE_BOX.dy);
    expect(STAR_MAP_LONG_WALK).toContainEqual({
      x: STAR_MAP_NODES.fin_m01.x,
      y: STAR_MAP_NODES.fin_m01.y,
    });
  });
});
