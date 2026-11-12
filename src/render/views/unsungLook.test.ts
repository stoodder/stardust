// The Unsung on screen (T830; unsungLook.ts): one body per form by boss phase (form 1 grown by its
// absorbs), every form's poses in the sprite, the rested body's rise, the dig ring, the churn and
// the surfacing burst.
import { describe, expect, it } from 'vitest';
import {
  UNSUNG_FORM_SPRITE,
  UNSUNG_REST_SPRITE,
} from '../../content/sprites/enemies/unsung.ts';
import { hasAnim } from './spriteInfo.ts';
import {
  clodAt,
  DIG_RING_TIGHT,
  DIG_RING_WIDE,
  digRingTiles,
  facingOfKey,
  isUnsungBody,
  SURFACE_BURST_MS,
  surfaceBurstAt,
  UNSUNG_FLIP_MS,
  UNSUNG_RISE_MS,
  UNSUNG_RISE_PX,
  unsungBody,
  unsungForms,
  unsungRestAt,
} from './unsungLook.ts';

describe('the Unsung’s forms', () => {
  it('swaps its body by boss phase; form 1 grows by its absorbs', () => {
    expect(isUnsungBody('enemy.unsung')).toBe(true);
    expect(isUnsungBody('enemy.unsung_part')).toBe(false);
    expect(unsungBody({ bossPhase: 1, absorbs: 0 })).toBe('enemy.unsung');
    expect(unsungBody({ bossPhase: 1, absorbs: 2 })).toBe('enemy.unsung_g2');
    expect(unsungBody({ bossPhase: 1, absorbs: 9 })).toBe('enemy.unsung_g5');
    expect(unsungBody({ bossPhase: 2, absorbs: 3 })).toBe(UNSUNG_FORM_SPRITE[2]);
    expect(unsungBody({ bossPhase: 3, absorbs: 3 })).toBe(UNSUNG_FORM_SPRITE[3]);
    expect(unsungBody({ bossPhase: 4, absorbs: 0 })).toBe(UNSUNG_FORM_SPRITE[4]);
  });

  it('each form carries the poses its phase plays (enemyPose.ts)', () => {
    for (const f of ['se', 'sw', 'ne', 'nw']) {
      expect(hasAnim('enemy.unsung_g3', `tell_${f}`)).toBe(true);
      expect(hasAnim(UNSUNG_FORM_SPRITE[2], `puff_${f}`)).toBe(true);
      for (const p of ['dig', 'under', 'surface', 'phase', 'puff']) {
        expect(hasAnim(UNSUNG_FORM_SPRITE[3], `${p}_${f}`)).toBe(true);
      }
      expect(hasAnim(UNSUNG_FORM_SPRITE[4], `tell_${f}`)).toBe(true);
      expect(hasAnim(UNSUNG_REST_SPRITE, `rest_${f}`)).toBe(true);
      expect(hasAnim(UNSUNG_REST_SPRITE, `walk_${f}`)).toBe(true);
    }
  });

  it('lists the Unsung’s drawn bodies for the render-state hook', () => {
    expect(
      unsungForms([{ bodyId: 'enemy.unsung_song' }, { bodyId: 'enemy.mote' }, { bodyId: null }]),
    ).toEqual(['enemy.unsung_song']);
  });
});

describe('laid to rest', () => {
  it('holds through the flip, rises, fades, and is gone', () => {
    const r = { lift: 0, alpha: 0 };
    expect(unsungRestAt(UNSUNG_FLIP_MS - 1, false, r)).toEqual({ lift: 0, alpha: 1 });
    unsungRestAt(UNSUNG_FLIP_MS + UNSUNG_RISE_MS / 4, false, r);
    expect(r.lift).toBeGreaterThan(0);
    expect(r.alpha).toBe(1);
    unsungRestAt(UNSUNG_FLIP_MS + UNSUNG_RISE_MS * 0.9, false, r);
    expect(r.alpha).toBeLessThan(1);
    expect(r.lift).toBeLessThanOrEqual(UNSUNG_RISE_PX);
    expect(unsungRestAt(UNSUNG_FLIP_MS + UNSUNG_RISE_MS, false, r).alpha).toBe(0);
    expect(unsungRestAt(UNSUNG_FLIP_MS + UNSUNG_RISE_MS / 2, true, r).lift).toBe(0);
  });

  it('reads the facing off an anim key', () => {
    expect(facingOfKey('enemy.unsung_song#default:walk_nw')).toBe('nw');
    expect(facingOfKey('enemy.unsung_song#default:tell_ne')).toBe('ne');
    expect(facingOfKey(null)).toBe('se');
  });
});

describe('the dig', () => {
  it('closes its ring as it travels, tight through the surfacing tell', () => {
    expect(digRingTiles(0, false)).toBe(DIG_RING_WIDE);
    expect(digRingTiles(1, false)).toBeCloseTo(DIG_RING_TIGHT);
    expect(digRingTiles(0, true)).toBe(DIG_RING_TIGHT);
  });

  it('churns the ground: clods hop on the ring, at rest under reduced motion', () => {
    const c = { dx: 0, dy: 0 };
    const ys = new Set<number>();
    for (let ms = 0; ms < 300; ms += 20) ys.add(clodAt(0, ms, 40, 20, false, c).dy);
    expect(ys.size).toBeGreaterThan(1);
    const still = new Set<number>();
    for (let ms = 0; ms < 300; ms += 20) still.add(clodAt(0, ms, 40, 20, true, c).dy);
    expect(still.size).toBe(1);
  });

  it('bursts as it surfaces: widening, stepping out, gone', () => {
    const b = { tiles: 0, alpha: 0 };
    surfaceBurstAt(0, false, b);
    const first = b.tiles;
    expect(b.alpha).toBe(1);
    surfaceBurstAt(SURFACE_BURST_MS * 0.8, false, b);
    expect(b.tiles).toBeGreaterThan(first);
    expect(b.alpha).toBeLessThan(1);
    expect(surfaceBurstAt(SURFACE_BURST_MS, false, b).alpha).toBe(0);
  });
});
