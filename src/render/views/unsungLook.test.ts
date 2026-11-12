// The Unsung on screen (T830; unsungLook.ts): one body per form by boss phase (form 1 grown by its
// absorbs), every form's poses in the sprite, the rested body's rise, the dig ring, the churn and
// the surfacing burst.
import { describe, expect, it } from 'vitest';
import { UNSUNG_FORM_SPRITE, UNSUNG_REST_SPRITE } from '../../content/sprites/enemies/unsung.ts';
import { gridToScreen, TILE_H } from '../iso.ts';
import { worldDepth } from '../depth.ts';
import { hasAnim } from './spriteInfo.ts';
import {
  clodAt,
  DIG_RING_TIGHT,
  DIG_RING_WIDE,
  digRingTiles,
  facingOfKey,
  frontTowerNear,
  heldBySong,
  PART_OUTLINE_ALPHA,
  PART_OUTLINE_SIDES,
  partOutline,
  isUnsungBody,
  rimToward,
  SONG_SCRIPT_PHASE,
  THROW_MS,
  thrownAt,
  SURFACE_BURST_MS,
  surfaceBurstAt,
  UNSUNG_FLIP_MS,
  UNSUNG_HOLD_LIFT_PX,
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

describe('held by the song (M8 R1)', () => {
  const unit = { alive: true, burrowed: false, leaving: false, x: 5, y: 5 };
  const circle = { x: 6, y: 5, r: 2 };

  it('holds a unit standing inside a song circle while the song sings', () => {
    expect(heldBySong(unit, SONG_SCRIPT_PHASE, [circle])).toBe(circle);
  });

  it('lets go outside the circle, underground, leaving, dead, or out of the song’s phase', () => {
    expect(heldBySong({ ...unit, x: 1 }, SONG_SCRIPT_PHASE, [circle])).toBeNull();
    expect(heldBySong({ ...unit, burrowed: true }, SONG_SCRIPT_PHASE, [circle])).toBeNull();
    expect(heldBySong({ ...unit, leaving: true }, SONG_SCRIPT_PHASE, [circle])).toBeNull();
    expect(heldBySong({ ...unit, alive: false }, SONG_SCRIPT_PHASE, [circle])).toBeNull();
    expect(heldBySong(unit, SONG_SCRIPT_PHASE + 1, [circle])).toBeNull();
    expect(heldBySong(unit, SONG_SCRIPT_PHASE, [])).toBeNull();
  });

  it('picks the nearest circle when two hold it', () => {
    const far = { x: 3.5, y: 5, r: 2 };
    expect(heldBySong(unit, SONG_SCRIPT_PHASE, [far, circle])).toBe(circle);
  });

  it('rims the side facing the song, a pixel each way', () => {
    const out = { dx: 0, dy: 0 };
    expect(rimToward(100, 100, 140, 100, out)).toEqual({ dx: 1, dy: 0 });
    expect(rimToward(100, 100, 60, 140, out)).toEqual({ dx: -1, dy: 1 });
    expect(rimToward(100, 100, 102, 60, out)).toEqual({ dx: 0, dy: -1 });
    expect(rimToward(100, 100, 100, 100, out)).toEqual({ dx: 0, dy: -1 });
  });
});

describe('the split’s parts at night (M8 R2)', () => {
  const tower = (x: number, y: number, alive = true) => ({ alive, x, y });
  const pool = (...items: { alive: boolean; x: number; y: number }[]) => ({
    used: items.length,
    items,
  });

  it('finds the lowest-drawn tower within one tile in any direction, and none further', () => {
    const out = { x: 0, y: 0 };
    // A part at the back of tile (11, 2): spires either side, one diagonally in front.
    const towers = pool(tower(10.5, 2.5), tower(12.5, 2.5), tower(12.5, 3.5), tower(13.5, 2.5));
    expect(frontTowerNear(11.05, 2.05, towers, out)).toBe(true);
    expect(out).toEqual({ x: 12.5, y: 3.5 });
    // Behind it, beside it, in front of it: every one of the eight round it counts.
    for (const [dx, dy] of [
      [-1, -1],
      [0, -1],
      [1, -1],
      [-1, 0],
      [1, 0],
      [-1, 1],
      [0, 1],
      [1, 1],
    ]) {
      expect(frontTowerNear(11.5, 2.5, pool(tower(11.5 + dx!, 2.5 + dy!)), out)).toBe(true);
    }
    // Two tiles off, or a sold one: none.
    expect(frontTowerNear(11.5, 2.5, pool(tower(13.5, 2.5), tower(11.5, 4.5)), out)).toBe(false);
    expect(frontTowerNear(11.5, 2.5, pool(tower(12.5, 2.5, false)), out)).toBe(false);
    expect(frontTowerNear(11.5, 2.5, { used: 0, items: [tower(12.5, 2.5)] }, out)).toBe(false);
  });

  it('sorts a held body at the back of its tile over the spire diagonally in front (the lift alone can’t)', () => {
    const origin = { x: 0, y: 0 };
    const at = { x: 0, y: 0 };
    gridToScreen(11.05, 2.05, origin, at);
    const body = worldDepth(at.y + UNSUNG_HOLD_LIFT_PX, 'enemy', 7);
    gridToScreen(12.5, 3.5, origin, at);
    const spire = worldDepth(at.y, 'tower', 200) + 0.00005; // its head
    expect(body).toBeLessThan(spire); // R1's lift alone: buried
    expect(Math.max(body, worldDepth(at.y, 'held', 7))).toBeGreaterThan(spire);
    expect(UNSUNG_HOLD_LIFT_PX).toBe(TILE_H + 1);
  });

  it('outlines a held part all round, whole on the song’s side, a step down elsewhere', () => {
    expect(PART_OUTLINE_SIDES).toHaveLength(4);
    const strengths = (rx: number, ry: number) =>
      PART_OUTLINE_SIDES.map(([sx, sy]) => partOutline(sx, sy, rx, ry));
    // Sides: left, right, up, down.
    expect(strengths(1, 0)).toEqual([
      PART_OUTLINE_ALPHA,
      1,
      PART_OUTLINE_ALPHA,
      PART_OUTLINE_ALPHA,
    ]);
    expect(strengths(-1, 1)).toEqual([1, PART_OUTLINE_ALPHA, PART_OUTLINE_ALPHA, 1]);
    expect(strengths(0, -1)).toEqual([
      PART_OUTLINE_ALPHA,
      PART_OUTLINE_ALPHA,
      1,
      PART_OUTLINE_ALPHA,
    ]);
    expect(PART_OUTLINE_ALPHA).toBeGreaterThan(0);
    expect(PART_OUTLINE_ALPHA).toBeLessThan(1);
  });
});

/** The throw at `ms` (unsungLook.ts `thrownAt`). */
function throwAt(ms: number, still = false): { left: number; alpha: number } {
  return thrownAt(ms, still, { left: 0, alpha: 0 });
}

describe('thrown back (D156)', () => {
  it('starts where it came up and lands where the sim put it, leaving fast and settling', () => {
    expect(throwAt(0)).toEqual({ left: 1, alpha: 1 });
    const quarter = throwAt(THROW_MS / 4).left;
    const half = throwAt(THROW_MS / 2).left;
    const late = throwAt((THROW_MS * 3) / 4).left;
    expect(1 - quarter).toBeGreaterThan(half - late); // more ground early than late
    expect(half).toBeLessThan(quarter);
    expect(late).toBeLessThan(half);
    expect(throwAt(THROW_MS)).toEqual({ left: 0, alpha: 0 });
  });

  it('never jumps between frames: each 16 ms moves it at most a tenth of the way', () => {
    for (let ms = 0; ms + 16 <= THROW_MS; ms += 16) {
      expect(throwAt(ms).left - throwAt(ms + 16).left).toBeLessThan(0.1);
    }
  });

  it('steps the streak out', () => {
    expect(throwAt(THROW_MS * 0.1).alpha).toBeGreaterThan(throwAt(THROW_MS * 0.9).alpha);
  });

  it('cuts under reduced motion: no carry, no streak', () => {
    expect(throwAt(0, true)).toEqual({ left: 0, alpha: 0 });
  });
});
