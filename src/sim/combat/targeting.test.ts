import { describe, expect, it } from 'vitest';
import { enemyDef, MORTAR, ROAD, setup, spawn, WALKER } from '../__fixtures__/combat.ts';
import type { Enemy } from '../entities.ts';
import { isInRange, isStillTarget, pickTarget } from './targeting.ts';

const BOTH = { ground: true, air: true };
const GROUND = { ground: true, air: false };
const WIDE = { rangeSq: 100, minRangeSq: 0 };
const flyer = enemyDef('fx_flyer', { layer: 'air' });

// fx_map's road: (0.5,0.5) → (2.5,0.5) → (2.5,3.5) → (3.5,3.5) → (3.5,4.5) → (5.5,4.5).
/** Walkers at these route distances. */
function at(dists: readonly number[]): { state: ReturnType<typeof setup>['state']; es: Enemy[] } {
  const { state } = setup();
  return { state, es: dists.map((dist) => spawn(state, WALKER, { dist })) };
}

describe('range rule (towers.md §5)', () => {
  it('minimum range is exclusive, maximum inclusive', () => {
    const attack = MORTAR.tiers[0].attack!; // range 3.5, min 1
    expect(isInRange(1, attack)).toBe(false);
    expect(isInRange(1.0000001, attack)).toBe(true);
    expect(isInRange(3.5 * 3.5, attack)).toBe(true);
    expect(isInRange(3.5 * 3.5 + 1e-9, attack)).toBe(false);
  });

  it('without a minimum range, distance 0 is in range (a flyer over the tower)', () => {
    expect(isInRange(0, WIDE)).toBe(true);
  });
});

describe('pickTarget priorities and tie-breaks', () => {
  it('First: least route distance left; Last: most', () => {
    const { state, es } = at([1, 4, 2.5]);
    expect(pickTarget(state.enemies, 2.5, 2.5, BOTH, WIDE, 'first')).toBe(es[1]);
    expect(pickTarget(state.enemies, 2.5, 2.5, BOTH, WIDE, 'last')).toBe(es[0]);
  });

  it('Strong: highest HP + shield, ties to First', () => {
    // es has three entries (`!` below).
    const { state, es } = at([1, 4, 2.5]);
    es[0]!.hp = 50;
    es[1]!.hp = 40;
    es[2]!.hp = 30;
    es[2]!.shieldHp = 20;
    expect(pickTarget(state.enemies, 2.5, 2.5, BOTH, WIDE, 'strong')).toBe(es[2]);
    es[2]!.shieldHp = 0;
    expect(pickTarget(state.enemies, 2.5, 2.5, BOTH, WIDE, 'strong')).toBe(es[0]);
    es[1]!.hp = 50;
    expect(pickTarget(state.enemies, 2.5, 2.5, BOTH, WIDE, 'strong')).toBe(es[1]); // tie → First
  });

  it('Close: nearest, ties to First', () => {
    // From (2.5, 1.5), dist 2 (2.5, 0.5) and dist 4 (2.5, 2.5) are both 1 away; dist 6.5 is
    // (3.5, 4), nearest to (3.5, 4).
    const { state, es } = at([2, 4, 6.5]);
    expect(pickTarget(state.enemies, 2.5, 1.5, BOTH, WIDE, 'close')).toBe(es[1]); // tie → First
    expect(pickTarget(state.enemies, 3.5, 4, BOTH, WIDE, 'close')).toBe(es[2]);
  });

  it('exact ties on every key fall to the lowest uid, whatever the slot order', () => {
    const { state } = setup();
    const a = spawn(state, WALKER, { dist: 3 });
    const b = spawn(state, WALKER, { dist: 3 });
    expect(pickTarget(state.enemies, 2.5, 2.5, BOTH, WIDE, 'first')).toBe(a);
    // Swap uids so the lower uid sits in the higher slot.
    const ua = a.uid;
    a.uid = b.uid;
    b.uid = ua;
    for (const p of ['first', 'last', 'strong', 'close'] as const) {
      expect(pickTarget(state.enemies, 2.5, 2.5, BOTH, WIDE, p)).toBe(b);
    }
  });

  it('respects range, minimum range, layers, and dead enemies', () => {
    const { state } = setup();
    const attack = MORTAR.tiers[0].attack!; // range 3.5, min 1 (exclusive)
    const near = spawn(state, WALKER, { dist: 4 }); // (2.5, 2.5): d² 1 from (2.5,1.5): at min
    const far = spawn(state, WALKER, { dist: 8.5 }); // (5, 4.5): d² 15.25 > 12.25
    const air = spawn(state, flyer, { dist: 6 }); // (3.5, 3.5): d² 5, but flying
    expect(pickTarget(state.enemies, 2.5, 1.5, GROUND, attack, 'first')).toBe(null);
    expect(pickTarget(state.enemies, 2.5, 1.5, BOTH, attack, 'first')).toBe(air);
    far.dist = 7.5; // (4, 4.5): d² 11.25, in range
    far.x = 4;
    expect(pickTarget(state.enemies, 2.5, 1.5, GROUND, attack, 'first')).toBe(far);
    far.alive = false;
    expect(pickTarget(state.enemies, 2.5, 1.5, GROUND, attack, 'first')).toBe(null);
    expect(near.alive).toBe(true);
    expect(ROAD.lengthTiles).toBe(9);
  });

  it('isStillTarget checks the slot hint against the uid, liveness, layer, and range', () => {
    const { state } = setup();
    const e = spawn(state, WALKER, { dist: 3 });
    expect(isStillTarget(state.enemies, e.slot, e.uid, 2.5, 2.5, BOTH, WIDE)).toBe(e);
    expect(isStillTarget(state.enemies, e.slot, e.uid + 1, 2.5, 2.5, BOTH, WIDE)).toBe(null);
    expect(isStillTarget(state.enemies, 7, e.uid, 2.5, 2.5, BOTH, WIDE)).toBe(null);
    expect(
      isStillTarget(state.enemies, e.slot, e.uid, 2.5, 2.5, BOTH, { rangeSq: 0.5, minRangeSq: 0 }),
    ).toBe(null);
    e.alive = false;
    expect(isStillTarget(state.enemies, e.slot, e.uid, 2.5, 2.5, BOTH, WIDE)).toBe(null);
  });
});
