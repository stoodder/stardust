// The Gathering Maw's split and merge look (T708; gmawLook.ts).
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import { DEV_CONTENT } from '../__fixtures__/devBattle.ts';
import {
  BURST_FROM_TILES,
  BURST_MS,
  BURST_TO_TILES,
  bossBarKey,
  burstRing,
  gmawSpread,
  MERGED_DEPTH_LIFT_PX,
  PART_LANE_PX,
  partLanePx,
  TETHER,
  TETHER_TAUT,
  SIM_SPREAD_TILES,
  SPREAD_TO_TILES,
  tetherStroke,
} from './gmawLook.ts';

type Unit = Parameters<typeof gmawSpread>[0];
const DEV_DEF = Object.values(compileContent(DEV_CONTENT).enemies)[0]!;

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

  it('D150: the parts drawn SPREAD_TO_TILES apart along the road; the merged Maw sorts on top', () => {
    // Any def stands in for the split's: only whether one is there counts.
    const root = DEV_DEF;
    const unit = (uid: number, dist: number, over: Partial<Unit> = {}): Unit => ({
      uid,
      alive: true,
      leaving: false,
      splitFrom: root,
      splitMaxHp: 9000,
      ownerUid: 9,
      dist,
      ...over,
    });
    const parts = [unit(30, 4.4), unit(31, 5), unit(32, 5.6)];
    const pool = { used: 3, items: parts };
    const drawn = parts.map(
      (p) => p.dist + gmawSpread(p, pool, { alongTiles: 0, depthLiftPx: 0 }).alongTiles,
    );
    expect(drawn[1]! - drawn[0]!).toBeCloseTo(SPREAD_TO_TILES);
    expect(drawn[2]! - drawn[1]!).toBeCloseTo(SPREAD_TO_TILES);
    expect(SIM_SPREAD_TILES).toBe(0.6);
    // Walking together in the merge, the spread closes with them.
    const close = [unit(30, 5), unit(31, 5), unit(32, 5)];
    expect(gmawSpread(close[0]!, { used: 3, items: close }).alongTiles).toBe(0);
    // A part alone (the others killed) isn't moved; nor is any other unit.
    expect(gmawSpread(parts[0]!, { used: 1, items: [parts[0]!] }).alongTiles).toBe(0);
    const plain = unit(40, 3, { splitFrom: null, splitMaxHp: 0 });
    expect(gmawSpread(plain, pool)).toEqual({ alongTiles: 0, depthLiftPx: 0 });
    const merged = unit(41, 3, { splitFrom: null });
    expect(gmawSpread(merged, pool)).toEqual({ alongTiles: 0, depthLiftPx: MERGED_DEPTH_LIFT_PX });
  });
});
