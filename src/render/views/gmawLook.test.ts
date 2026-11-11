// The Gathering Maw's split and merge look (T708; gmawLook.ts).
import { describe, expect, it } from 'vitest';
import {
  BURST_FROM_TILES,
  BURST_MS,
  BURST_TO_TILES,
  bossBarKey,
  burstRing,
  PART_LANE_PX,
  partLanePx,
  TETHER,
  TETHER_TAUT,
  tetherStroke,
} from './gmawLook.ts';

describe('the tether between a split’s parts', () => {
  it('hangs slack until the merge’s tell, then pulls taut in three steps, the core last', () => {
    expect(tetherStroke(720, 90)).toEqual({ px: 2, color: TETHER, core: false });
    expect(tetherStroke(91, 90).color).toBe(TETHER);
    expect(tetherStroke(90, 90)).toEqual({ px: 2, color: TETHER_TAUT, core: false });
    expect(tetherStroke(50, 90)).toEqual({ px: 3, color: TETHER_TAUT, core: false });
    expect(tetherStroke(1, 90)).toEqual({ px: 3, color: TETHER_TAUT, core: true });
    expect(tetherStroke(0, 90).color).toBe(TETHER); // merged (or not counting)
  });
});

describe('the burst (split) and the gulp (merge)', () => {
  it('opens out and fades over BURST_MS; still, it holds its size and steps its alpha', () => {
    expect(burstRing(0, false)).toEqual({ tiles: BURST_FROM_TILES, alpha: 1 });
    const mid = burstRing(BURST_MS / 2, false);
    expect(mid.tiles).toBeCloseTo((BURST_FROM_TILES + BURST_TO_TILES) / 2);
    expect(mid.alpha).toBeCloseTo(0.5);
    expect(burstRing(BURST_MS, false).alpha).toBe(0);
    expect(burstRing(10, true)).toEqual({ tiles: BURST_TO_TILES, alpha: 1 });
    expect(burstRing(BURST_MS * 0.75, true)).toEqual({ tiles: BURST_TO_TILES, alpha: 0.5 });
  });
});

describe('the one boss bar across a split', () => {
  it('keys a part and the merged Maw to the boss they split from; any other boss to itself', () => {
    expect(bossBarKey({ uid: 9, ownerUid: 0, splitMaxHp: 0 })).toBe(9);
    expect(bossBarKey({ uid: 12, ownerUid: 9, splitMaxHp: 7200 })).toBe(9);
    // A Penitent's shard names its owner but isn't split-born: it has no bar of its own anyway.
    expect(bossBarKey({ uid: 14, ownerUid: 9, splitMaxHp: 0 })).toBe(14);
  });

  it('T730a: three consecutive parts walk three lanes across the road', () => {
    const lanes = [30, 31, 32].map(partLanePx).toSorted((x, y) => x - y);
    expect(lanes).toEqual([-PART_LANE_PX, 0, PART_LANE_PX]);
  });
});
