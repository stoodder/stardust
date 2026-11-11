// The Gathering Maw's split and merge look (T708; gmawLook.ts).
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import { SPLIT_SPREAD_TILES } from '../../sim/index.ts';
import { DEV_CONTENT } from '../__fixtures__/devBattle.ts';
import { HALF_H, HALF_W } from '../iso.ts';
import {
  BURST_FROM_TILES,
  BURST_MS,
  BURST_TO_TILES,
  bossBarKey,
  burstRing,
  gmawSpread,
  MERGED_DEPTH_LIFT_PX,
  PART_DEPTH_LIFT_PX,
  PART_GAP_PX,
  PART_LANE_MAX_PX,
  PART_LANE_PX,
  partLanePx,
  TETHER,
  TETHER_TAUT,
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

  it('D151: the parts walk lanes by rank, standing PART_GAP_PX apart across any road', () => {
    const rank = SPREAD_TO_TILES - SPLIT_SPREAD_TILES; // one rank's along spread (tiles)
    // EnemyView's `sideOf`: the ground's sideways unit on screen (it imports Phaser).
    const side = { x: 0, y: 0 };
    const sideOf = (dx: number, dy: number, out: typeof side): void => {
      const sx = (-dy - dx) * 2;
      const sy = -dy + dx;
      const len = Math.hypot(sx, sy);
      out.x = sx / len;
      out.y = sy / len;
    };
    // Grid-axis roads (diagonal on screen), the grid's diagonals (straight down or across).
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [-1, -1],
      [1, -1],
      [-1, 1],
    ] as const) {
      sideOf(dx, dy, side);
      const len = Math.hypot(dx, dy);
      const tileX = ((dx - dy) / len) * HALF_W;
      const tileY = ((dx + dy) / len) * HALF_H;
      // A rank-one part's screen offset from the middle one: the road's whole spacing and its lane.
      const at = (r: number) => {
        const lane = partLanePx(r * rank, tileX, side.x);
        return {
          x: r * tileX * SPREAD_TO_TILES + side.x * lane,
          y: r * tileY * SPREAD_TO_TILES + side.y * lane,
        };
      };
      const ahead = at(1);
      const behind = at(-1);
      expect(Math.hypot(ahead.x, ahead.y), `${dx},${dy}`).toBeGreaterThanOrEqual(PART_GAP_PX);
      // Across the screen most of all: never the lane undoing the road's spacing.
      expect(Math.abs(ahead.x), `${dx},${dy}`).toBeGreaterThanOrEqual(Math.abs(tileX));
      expect(ahead.x, `${dx},${dy}`).toBeCloseTo(-behind.x);
      const lane = Math.abs(partLanePx(rank, tileX, side.x));
      expect(lane).toBeGreaterThanOrEqual(PART_LANE_PX);
      expect(lane).toBeLessThanOrEqual(PART_LANE_MAX_PX);
    }
    // The middle part walks the road's line, and the lanes close with the merge.
    expect(partLanePx(0, HALF_W, -0.9)).toBeCloseTo(0);
    expect(Math.abs(partLanePx(rank / 2, HALF_W, -0.9))).toBeCloseTo(PART_LANE_PX / 2);
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
      (p) =>
        p.dist + gmawSpread(p, pool, { alongTiles: 0, depthLiftPx: 0, partLane: false }).alongTiles,
    );
    expect(drawn[1]! - drawn[0]!).toBeCloseTo(SPREAD_TO_TILES);
    expect(drawn[2]! - drawn[1]!).toBeCloseTo(SPREAD_TO_TILES);
    expect(SPLIT_SPREAD_TILES).toBe(0.6);
    // Walking together in the merge, the spread closes with them.
    const close = [unit(30, 5), unit(31, 5), unit(32, 5)];
    expect(gmawSpread(close[0]!, { used: 3, items: close }).alongTiles).toBe(0);
    // A part alone (the others killed) isn't moved; nor is any other unit.
    expect(gmawSpread(parts[0]!, { used: 1, items: [parts[0]!] }).alongTiles).toBe(0);
    const plain = unit(40, 3, { splitFrom: null, splitMaxHp: 0 });
    expect(gmawSpread(plain, pool)).toEqual({ alongTiles: 0, depthLiftPx: 0, partLane: false });
    const merged = unit(41, 3, { splitFrom: null });
    expect(gmawSpread(merged, pool)).toEqual({
      alongTiles: 0,
      depthLiftPx: MERGED_DEPTH_LIFT_PX,
      partLane: false,
    });
    // A part walks its lane by rank and sorts over the tower base it stands in front of.
    expect(gmawSpread(parts[0]!, pool)).toMatchObject({
      depthLiftPx: PART_DEPTH_LIFT_PX,
      partLane: true,
    });
  });
});
