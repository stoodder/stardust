// T602, T630a: the Hollow's Act III looks as rules (gatherLook.ts): the tendril tell's progress,
// noose, beads, and snap, the gulp ring, who trails ripples and where they lie, the body a mark
// reads its headroom from, and the rift cracks' three looks.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import { RAW_CONTENT } from '../../content/registry.ts';
import type { Enemy } from '../../sim/index.ts';
import { SPRITES } from '../../content/sprites/index.ts';
import { STEPPED_ALPHA } from '../vfx/fxTiming.ts';
import {
  TENDRIL_STROKES,
  beadAt,
  drawnBody,
  GROWTH_RING_BASE_TILES,
  GROWTH_STEPS,
  growthRingTiles,
  GULP_FROM,
  GULP_MS,
  gulpRing,
  mawBody,
  NOOSE_SNAP,
  nooseColor,
  nooseTiles,
  RIPPLE_SPACING,
  RIPPLE_W_FROM,
  RIPPLE_W_TO,
  rippleAt,
  RIPPLES,
  showsRipples,
  tendrilProgress,
  type Ripple,
} from './gatherLook.ts';

const E = compileContent(RAW_CONTENT).enemies;

type Unit = Pick<
  Enemy,
  'alive' | 'def' | 'gatherUid' | 'gatherTicks' | 'absorbs' | 'burrowed' | 'leaving'
>;

function unit(over: Partial<Unit>): Unit {
  return {
    alive: true,
    def: null,
    gatherUid: 0,
    gatherTicks: 0,
    absorbs: 0,
    burrowed: false,
    leaving: false,
    ...over,
  };
}

describe('the Hollow looks (T602)', () => {
  it('the tell runs 0 → 1 while a Maw holds a unit; the noose closes 0.5 → 0.2 tiles', () => {
    const tell = E.maw.gather!.tellTicks;
    expect(tendrilProgress(unit({ def: E.maw, gatherUid: 0, gatherTicks: tell }))).toBe(0);
    expect(tendrilProgress(unit({ def: E.maw, gatherUid: 9, gatherTicks: tell }))).toBe(0);
    expect(tendrilProgress(unit({ def: E.maw, gatherUid: 9, gatherTicks: tell / 2 }))).toBe(0.5);
    expect(tendrilProgress(unit({ def: E.mote, gatherUid: 9 }))).toBe(0);
    expect([nooseTiles(0), nooseTiles(1)]).toEqual([0.5, 0.2]);
  });

  it("a Maw's gulp ring reaches further as it grows, 10% per absorb", () => {
    expect(growthRingTiles(unit({ def: E.maw, absorbs: 0 }))).toBe(0);
    expect(growthRingTiles(unit({ def: E.maw, absorbs: 3 }))).toBeCloseTo(
      GROWTH_RING_BASE_TILES * 1.3,
      12,
    );
    expect(growthRingTiles(unit({ def: E.mote, absorbs: 3 }))).toBe(0);
  });

  it('a burrowed Hollow unit trails ripples; a Digger keeps its mound only', () => {
    expect(showsRipples(unit({ def: E.undertow, burrowed: true }))).toBe(true);
    expect(showsRipples(unit({ def: E.undertow, burrowed: false }))).toBe(false);
    expect(showsRipples(unit({ def: E.digger, burrowed: true }))).toBe(false);
    expect(showsRipples(unit({ def: E.undertow, burrowed: true, leaving: true }))).toBe(false);
  });
});

describe("the Maw's growth sprites (T640a)", () => {
  it('draws `enemy.maw` until it gathers, then `enemy.maw_g<n>` per absorb, capped', () => {
    const body = E.maw.sprites.body;
    expect(mawBody(body, unit({ def: E.maw, absorbs: 0 }))).toBe('enemy.maw');
    expect(mawBody(body, unit({ def: E.maw, absorbs: 1 }))).toBe('enemy.maw_g1');
    expect(mawBody(body, unit({ def: E.maw, absorbs: 5 }))).toBe('enemy.maw_g5');
    expect(mawBody(body, unit({ def: E.maw, absorbs: 9 }))).toBe(`enemy.maw_g${GROWTH_STEPS}`);
    expect(mawBody('enemy.mote', unit({ def: E.mote, absorbs: 3 }))).toBe('enemy.mote');
    // The Gathering Maw grows in its boss phase's gather (T708), by the same steps.
    const gm = E.gathering_maw.sprites.body;
    expect(mawBody(gm, unit({ def: E.gathering_maw, absorbs: 3 }))).toBe('enemy.gathering_maw_g3');
    expect(mawBody(gm, unit({ def: E.gathering_maw, absorbs: 0 }))).toBe('enemy.gathering_maw');
    // Every step it can reach is a registered sprite, as many as the Maw's absorbs.
    const ids = new Set<string>(SPRITES.map((s) => s.id));
    expect(GROWTH_STEPS).toBe(E.maw.gather!.maxAbsorbs);
    for (let n = 0; n <= GROWTH_STEPS; n++) {
      expect(ids.has(mawBody(body, unit({ def: E.maw, absorbs: n }))), String(n)).toBe(true);
    }
  });
});

describe('the Hollow looks, polished (T630a)', () => {
  it('the noose flashes white for the snap, the last part of the tell', () => {
    expect(nooseColor(0)).toBe('violet.4');
    expect(nooseColor(1 - NOOSE_SNAP - 0.01)).toBe('violet.4');
    expect(nooseColor(1 - NOOSE_SNAP)).toBe('white.1');
    expect(nooseColor(1)).toBe('white.1');
  });

  it('the beads ride from the noose to the Maw as the tell runs, a step apart', () => {
    for (const t of [0, 1, 2]) {
      expect(beadAt(0, t)).toBe(0);
      expect(beadAt(1, t)).toBe(1);
    }
    expect(beadAt(0.5, 0)).toBeGreaterThan(beadAt(0.5, 1));
    expect(beadAt(0.5, 1)).toBeGreaterThan(beadAt(0.5, 2));
    let last = -1;
    for (let p = 0; p <= 1; p += 0.05) {
      const f = beadAt(p, 1);
      expect(f).toBeGreaterThanOrEqual(last);
      last = f;
    }
  });

  it('a gulp ring grows to its size and steps down the alpha ladder; reduced motion only fades', () => {
    expect(gulpRing(0, 1, false)).toEqual({ tiles: GULP_FROM, alpha: STEPPED_ALPHA[0] });
    expect(gulpRing(GULP_MS / 2, 1, false).tiles).toBe(1);
    expect(gulpRing(GULP_MS - 1, 1, false).alpha).toBe(STEPPED_ALPHA[3]);
    expect(gulpRing(GULP_MS, 1, false).alpha).toBe(0);
    expect(gulpRing(0, 0, false).alpha).toBe(0);
    expect(gulpRing(0, 1, true).tiles).toBe(1);
    const alphas = [0, 100, 200, 300].map((ms) => gulpRing(ms, 1, false).alpha);
    for (const a of alphas) expect(STEPPED_ALPHA).toContain(a);
  });

  it('ripples lie on the ground where they formed, widening and fading as the unit moves on', () => {
    const r: Ripple = { back: 0, w: 0, alpha: 0 };
    // Halfway between two marks, the nearest ripple is half a spacing back.
    expect(rippleAt(10 * RIPPLE_SPACING + RIPPLE_SPACING / 2, 0, r)).toBe(true);
    expect(r.back).toBeCloseTo(RIPPLE_SPACING / 2, 9);
    // The same ripple, a little later: it stays put on the route (its spot is dist − back).
    const at = 10 * RIPPLE_SPACING + RIPPLE_SPACING / 2 - r.back;
    const w0 = r.w;
    rippleAt(10 * RIPPLE_SPACING + 0.9 * RIPPLE_SPACING, 0, r);
    expect(10 * RIPPLE_SPACING + 0.9 * RIPPLE_SPACING - r.back).toBeCloseTo(at, 9);
    expect(r.w).toBeGreaterThanOrEqual(w0);
    // Further back is wider and fainter, within its bounds, on the alpha ladder.
    let lastW = 0;
    let lastA = 2;
    for (let k = 0; k < RIPPLES; k++) {
      expect(rippleAt(5, k, r)).toBe(true);
      expect(r.w).toBeGreaterThanOrEqual(Math.max(lastW, RIPPLE_W_FROM));
      expect(r.w).toBeLessThanOrEqual(RIPPLE_W_TO);
      expect(r.alpha).toBeLessThanOrEqual(lastA);
      expect(STEPPED_ALPHA).toContain(r.alpha);
      lastW = r.w;
      lastA = r.alpha;
    }
    // None before the route's start.
    expect(rippleAt(0.1, 1, r)).toBe(false);
  });

  it("a mark reads a grown Maw's body, not the small one's", () => {
    const maw = { def: E.maw, absorbs: 2, tags: [] };
    expect(drawnBody(maw)).toBe('enemy.maw_g2');
    expect(drawnBody({ def: E.mote, absorbs: 0, tags: [] })).toBe(E.mote.sprites.body);
    expect(drawnBody({ def: null, absorbs: 0, tags: [] })).toBe('');
  });
});

describe("the Maw's tendril, review R14", () => {
  it('is a violet rope with a white.1 core over an ink under-stroke, each stroke narrower', () => {
    expect(TENDRIL_STROKES.map((st) => st.color)).toEqual(['ink.0', 'violet.4', 'white.1']);
    for (let i = 1; i < TENDRIL_STROKES.length; i++) {
      expect(TENDRIL_STROKES[i]!.px).toBeLessThan(TENDRIL_STROKES[i - 1]!.px);
    }
    // Odd widths, so each stroke centres on the same pixel row and the core sits mid-rope.
    for (const st of TENDRIL_STROKES) expect(st.px % 2).toBe(1);
    expect(TENDRIL_STROKES.at(-1)).toMatchObject({ px: 1, color: 'white.1', alpha: 1 });
  });
});
