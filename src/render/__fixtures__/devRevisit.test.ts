// dev_revisit (T410a; devBattle.ts): one source. A1M2's layout flows through dev_terraces into the
// revisit by reference, unchanged in the footprint at (2, 1), with the strip-mine band's benches
// added; the pads are pinned, so an A1M2 pad edit is never silent here (or in A2M3, T422).
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import { RAW_CONTENT } from '../../content/registry.ts';
import type { CompiledMapDef } from '../../content/compiled.ts';
import type { GridPos, IdSpace, TileChar } from '../../content/types.ts';
import { DEV_CONTENT } from './devBattle.ts';

/** Each buildable tile (`o`, `^`, `+`) of a compiled grid, row by row. */
function pads(m: { cols: number; tiles: readonly TileChar[] }): GridPos[] {
  const out: GridPos[] = [];
  m.tiles.forEach((t, i) => {
    if (t === 'o' || t === '^' || t === '+') out.push([i % m.cols, Math.floor(i / m.cols)]);
  });
  return out;
}

describe('one source: A1M2 → dev_terraces → dev_revisit (the shape of A2M3)', () => {
  // DevIds names only dev_range; the registry holds every dev map.
  const dev: Readonly<Record<string, CompiledMapDef<IdSpace>>> = compileContent(DEV_CONTENT).maps;
  const live = compileContent(RAW_CONTENT).maps.a1_m02;
  const m = dev['dev_revisit']!; // registered in devBattle.ts

  it("holds A1M2's compiled grid, unchanged, in the footprint at (2, 1)", () => {
    expect(m.revisitAt).toEqual([2, 1]);
    expect(m.revisitSize).toEqual({ cols: live.cols, rows: live.rows });
    for (let r = 0; r < live.rows; r++) {
      for (let c = 0; c < live.cols; c++) {
        expect(m.tiles[(r + 1) * m.cols + c + 2], `${c},${r}`).toBe(live.tiles[r * live.cols + c]);
      }
    }
    expect(m.routes['road']?.tiles).toEqual(
      live.routes['road']?.tiles.map(([c, r]) => [c + 2, r + 1]),
    );
    expect(m.markers['peeker']).toEqual([
      live.markers['peeker']![0] + 2,
      live.markers['peeker']![1] + 1,
    ]);
  });

  // The guard: an A1M2 pad edit changes this list (and A2M3's, T422), so it's never silent.
  it("pins the revisit's pads: A1M2's eleven, unchanged, and four strip-mine benches", () => {
    const own = pads(m);
    expect(own).toEqual([
      [7, 2],
      [14, 2],
      [16, 2],
      [7, 4],
      [10, 4],
      [17, 4],
      [5, 5],
      [8, 5],
      [16, 6],
      [9, 7],
      [12, 7],
      [8, 8],
      [12, 8],
      [14, 8],
      [17, 8],
    ]);
    const original = pads(live).map(([c, r]): GridPos => [c + 2, r + 1]);
    expect(original).toHaveLength(11);
    expect(own).toEqual(expect.arrayContaining(original));
  });

  it('carries the lighting schedule and the dressing to render', () => {
    expect(m.lighting).toEqual([{ wave: 4, env: 'act2.dusk', dark: 0 }]);
    expect(m.dressing.map((d) => d.kind)).toEqual(['greySoil', 'mineScar']);
  });
});
