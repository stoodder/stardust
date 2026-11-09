import { describe, expect, it } from 'vitest';
import type { TileChar } from '../../content/types.ts';
import { APRON_RINGS } from '../../content/sprites/tiles/apron.ts';
import { apronCells, dressTile, envVariant, propVariant, tilesBehind } from './groundTiles.ts';

function grid(rows: readonly string[]): {
  cols: number;
  rows: number;
  tiles: TileChar[];
} {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test grids use only TileChars
  const tiles = rows.join('').split('') as TileChar[];
  return { cols: rows[0]?.length ?? 0, rows: rows.length, tiles };
}

describe('dressTile', () => {
  const g = grid(['S##.', '.o#x', '..#C']);

  it('dresses each tile type with its own ground', () => {
    expect(dressTile(g, 0, 0).ground.sprite).toBe('tile.spawn');
    expect(dressTile(g, 1, 1)).toEqual({ ground: { sprite: 'tile.pad', frame: 'v0' }, prop: null });
    expect(dressTile(g, 3, 1).prop?.sprite).toBe('prop.rock');
    expect(dressTile(g, 3, 2).prop).toEqual({ sprite: 'prop.core', frame: 'idle_0', anim: 'idle' });
    expect(dressTile(g, 3, 2).ground.sprite).toBe('tile.path');
  });

  it('raises high ground as a block and pulses the power node', () => {
    const h = grid(['^+o']);
    expect(dressTile(h, 0, 0)).toMatchObject({
      ground: { sprite: 'tile.grass' },
      prop: null,
      block: { sprite: 'tile.high_ground', frame: 'v0' },
    });
    expect(dressTile(h, 1, 0)).toEqual({
      ground: { sprite: 'tile.power_node', frame: 'v0', anim: 'pulse' },
      prop: null,
    });
    expect(dressTile(h, 2, 0).block).toBeUndefined();
  });

  it('runs path treads along the path', () => {
    expect(dressTile(g, 1, 0).ground.frame).toBe('tread_x'); // a horizontal run
    expect(dressTile(g, 2, 1).ground.frame).toBe('tread_y'); // a vertical run
  });

  it('is deterministic and never props a pad or path', () => {
    for (let r = 0; r < g.rows; r++) {
      for (let c = 0; c < g.cols; c++) {
        expect(dressTile(g, c, r)).toEqual(dressTile(g, c, r));
        const t = g.tiles[r * g.cols + c];
        if (t === 'o' || t === '#' || t === 'S') expect(dressTile(g, c, r).prop).toBeNull();
      }
    }
  });

  it('maps env ids to sprite variants', () => {
    expect(envVariant('act1')).toBe('default');
    expect(envVariant('act3')).toBe('act3');
  });
});

describe('apronCells', () => {
  // A spawn on the north edge and a core on the south edge, like A1M1.
  const g = grid(['.S...', '.#.o.', '.###.', '...#.', '...C.']);
  const cells = apronCells(g, 'act1');
  const at = (c: number, r: number) => cells.find((x) => x.col === c && x.row === r);

  it('rings the grid with every cell out to APRON_RINGS, and none inside it', () => {
    const R = APRON_RINGS;
    expect(cells).toHaveLength((g.cols + 2 * R) * (g.rows + 2 * R) - g.cols * g.rows);
    for (const c of cells) {
      expect(c.col >= 0 && c.col < g.cols && c.row >= 0 && c.row < g.rows).toBe(false);
      expect(c.ring).toBeGreaterThanOrEqual(1);
      expect(c.ring).toBeLessThanOrEqual(R);
    }
    expect(at(-1, -1)?.ring).toBe(1);
    expect(at(g.cols + 3, 2)?.ring).toBe(4);
  });

  it('is ordered back to front', () => {
    for (let n = 1; n < cells.length; n++) {
      const a = cells[n - 1];
      const b = cells[n];
      if (a === undefined || b === undefined) continue;
      expect(a.col + a.row).toBeLessThanOrEqual(b.col + b.row);
    }
  });

  it('runs the road on out of the core, through a gap in the fence', () => {
    for (let k = 1; k <= APRON_RINGS; k++) {
      const c = at(3, 4 + k);
      expect(c?.ground).toEqual({ sprite: 'tile.apron', frame: `road_y_r${k}` });
      expect(c?.prop).toBeNull();
    }
    expect(at(1, -1)?.prop).toBeNull(); // beside the spawn
    expect(at(1, -1)?.ground.frame).toBe('r1');
  });

  it('fences ring 1 along each edge, but not its corners', () => {
    expect(at(2, -1)?.prop).toMatchObject({ sprite: 'prop.fence', frame: 'x' });
    expect(at(2, g.rows)?.prop).toMatchObject({ sprite: 'prop.fence', frame: 'x' });
    expect(at(-1, 2)?.prop).toMatchObject({ sprite: 'prop.fence', frame: 'y' });
    expect(at(g.cols, 2)?.prop).toMatchObject({ sprite: 'prop.fence', frame: 'y' });
    expect(at(-1, -1)?.prop).toBeNull();
  });

  it("dresses Act I's colony behind the map only, and nothing past ring 2", () => {
    const colony = cells.filter((c) =>
      ['prop.dome', 'prop.billboard', 'prop.lettuce'].includes(c.prop?.sprite ?? ''),
    );
    expect(colony.map((c) => c.prop?.sprite)).toEqual(
      expect.arrayContaining(['prop.dome', 'prop.billboard', 'prop.lettuce']),
    );
    for (const c of colony) expect(c.row < 0 || c.col < 0).toBe(true);
    for (const c of cells) if (c.ring > 2) expect(c.prop).toBeNull();
    expect(apronCells(g, 'act3').some((c) => c.prop?.sprite === 'prop.dome')).toBe(false);
  });

  it('keeps hardware in its faction palette and decor in the env palette', () => {
    expect(propVariant('prop.fence', 'act3')).toBe('default');
    expect(propVariant('prop.core', 'act2.gold')).toBe('default');
    expect(propVariant('prop.flora', 'act3')).toBe('act3');
    expect(propVariant('prop.lettuce', 'act1')).toBe('default');
  });
});

describe('tilesBehind (the core fades over them; D028)', () => {
  // A1M1's south end: the core at (4,9), its pad two steps up the same screen column at (2,7).
  const a1 = grid([
    '....S.........',
    '....#.o.......',
    '..o.#.o^......',
    '....######....',
    '...o.....#o...',
    '...o.....#o...',
    '....######....',
    '..o.#.o.......',
    '....#.........',
    '....C.........',
  ]);
  const at = (c: number, r: number) => r * a1.cols + c;

  it('lists the tiles up the core’s screen column that its 33 px sprite covers', () => {
    expect(tilesBehind(a1, 4, 9, 33)).toEqual([at(3, 8), at(2, 7)]);
    // A taller core reaches one step further; a short one only the tile right behind.
    expect(tilesBehind(a1, 4, 9, 48)).toEqual([at(3, 8), at(2, 7), at(1, 6)]);
    expect(tilesBehind(a1, 4, 9, 12)).toEqual([at(3, 8)]);
  });

  it('stops at the grid edge', () => {
    expect(tilesBehind(a1, 1, 9, 33)).toEqual([at(0, 8)]);
    expect(tilesBehind(a1, 0, 9, 33)).toEqual([]);
  });
});
