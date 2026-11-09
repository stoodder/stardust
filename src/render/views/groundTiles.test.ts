import { describe, expect, it } from 'vitest';
import type { TileChar } from '../../content/types.ts';
import { dressTile, envVariant } from './groundTiles.ts';

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
