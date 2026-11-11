// T602: the Hollow's Act III looks as rules (gatherLook.ts): the tendril tell's progress and noose,
// the growth ring, who trails ripples, and the rift cracks' three looks.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import { RAW_CONTENT } from '../../content/registry.ts';
import type { Enemy } from '../../sim/index.ts';
import { SPRITES } from '../../content/sprites/index.ts';
import {
  GROWTH_RING_BASE_TILES,
  GROWTH_STEPS,
  growthRingTiles,
  mawBody,
  nooseTiles,
  riftLook,
  showsRipples,
  tendrilProgress,
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

  it('a Maw wears a growth ring once it has gathered, 10% wider per absorb', () => {
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

  it('a rift is hidden closed, a pulsing dashed crack opening, a solid one open', () => {
    expect(riftLook('closed', true).drawn).toBe(false);
    expect(riftLook('opening', true)).toEqual({ drawn: true, dashed: true, alpha: 1 });
    expect(riftLook('opening', false).alpha).toBeLessThan(1);
    expect(riftLook('open', false)).toEqual({ drawn: true, dashed: false, alpha: 1 });
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
    // Every step it can reach is a registered sprite, as many as the Maw's absorbs.
    const ids = new Set<string>(SPRITES.map((s) => s.id));
    expect(GROWTH_STEPS).toBe(E.maw.gather!.maxAbsorbs);
    for (let n = 0; n <= GROWTH_STEPS; n++) {
      expect(ids.has(mawBody(body, unit({ def: E.maw, absorbs: n }))), String(n)).toBe(true);
    }
  });
});
