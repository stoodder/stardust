import { describe, expect, it } from 'vitest';
import type { TileChar } from '../../content/types.ts';
import { APRON_RINGS } from '../../content/sprites/tiles/apron.ts';
import { map as a1m02 } from '../../content/maps/a1_m02/map.ts';
import {
  apronCells,
  cliffFrames,
  CUE_DECOR,
  DECOR_MARKERS,
  dressTile,
  envVariant,
  propVariant,
  tilesBehind,
} from './groundTiles.ts';

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
    expect(dressTile(g, 3, 1).prop).toEqual({ sprite: 'prop.wreckage', frame: 'v0', anim: null });
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

  it('lines grass beside the road with a verge on each shared edge, and nowhere else', () => {
    // (0,1) has the spawn on its NE edge; (1,2) the road on its SE; the rock at (3,1) the road on
    // its NW and the core on its SW. (1,1) is a pad.
    expect(dressTile(g, 0, 1).verge).toEqual(['ne_1']);
    expect(dressTile(g, 1, 2).verge).toEqual(['se_1']);
    expect(dressTile(g, 3, 1).verge).toEqual(['nw_0', 'sw_0']);
    expect(dressTile(g, 1, 1).verge).toBeUndefined();
    expect(dressTile(g, 1, 0).verge).toBeUndefined(); // the road itself
    const open = grid(['...', '...']);
    expect(dressTile(open, 1, 1).verge).toBeUndefined();
  });

  it('draws decor markers as their props, on any map, and ignores other markers', () => {
    const m = { ...grid(['....', '.o..']), markers: { scarecrow: [3, 1], post: [2, 1] } } as const;
    expect(dressTile(m, 3, 1).prop).toEqual({ sprite: 'prop.scarecrow', frame: 'v0', anim: null });
    expect(dressTile(m, 2, 1).prop?.sprite).not.toBe('prop.scarecrow');
    expect(propVariant('prop.scarecrow', 'act3')).toBe('default');
    // A1M2 places all three of its decor markers (act1.md § A1M2) on open ground.
    const a1 = {
      cols: a1m02.size.cols,
      rows: a1m02.size.rows,
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- map rows use only TileChars
      tiles: a1m02.tiles.join('').split('') as TileChar[],
      markers: a1m02.markers ?? {},
    };
    const drawn = Object.entries(a1.markers).flatMap(([id, [c, r]]) => {
      const sprite = dressTile(a1, c, r).prop?.sprite;
      return sprite === undefined ? [] : [[id, sprite]];
    });
    expect(Object.fromEntries(drawn)).toMatchObject({
      rig3: DECOR_MARKERS['rig3'],
      housing: DECOR_MARKERS['housing'],
      scarecrow: DECOR_MARKERS['scarecrow'],
    });
    // The Peeker's rock is PeekerView's (T309): its tile has no sparse decor of its own.
    const [pc, pr] = a1.markers['peeker'] ?? [-1, -1];
    expect(dressTile(a1, pc, pr).prop).toBeNull();
  });

  it('steps terraces down with a cliff face on the lower tile, cut by the road (T223)', () => {
    const t = { ...grid(['....', '.o#^', '.+#.']), terraces: [2, 2, 2, 2, 1, 0, 1, 1, 1, 0, 0, 1] };
    // A step from the tile behind (row − 1): the lit `ne` face.
    expect(cliffFrames(t, 0, 1)).toEqual(['ne_1']);
    // A step from the tile to the left (col − 1): the shaded `nw` face. A pad or power node keeps
    // its plate clear.
    expect(dressTile(t, 1, 1).cliff).toEqual(['ne_pad_0', 'nw_pad_0']);
    expect(cliffFrames(t, 1, 2)).toEqual(['nw_pad_1']);
    const decor = { ...t, tiles: t.tiles.map((c, i) => (i === 9 ? '.' : c)) };
    expect(cliffFrames(decor, 1, 2)).toEqual(['nw_1']);
    // The road and a high-ground block take no face; nor does a step up toward the front.
    expect(cliffFrames(t, 2, 1)).toEqual([]);
    expect(cliffFrames(t, 3, 1)).toEqual([]);
    expect(cliffFrames(t, 3, 2)).toEqual([]);
    // Flat maps (no terraces) draw none.
    expect(dressTile(grid(['..', '..']), 1, 1).cliff).toBeUndefined();
  });

  it("faces A1M2's two terrace steps along rows 3 and 6, never on the road (act1.md § A1M2)", () => {
    const a1 = {
      cols: a1m02.size.cols,
      rows: a1m02.size.rows,
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- map rows use only TileChars
      tiles: a1m02.tiles.join('').split('') as TileChar[],
      terraces: (a1m02.terraces ?? []).join('').split('').map(Number),
    };
    const faced: string[] = [];
    for (let r = 0; r < a1.rows; r++) {
      for (let c = 0; c < a1.cols; c++) {
        if (cliffFrames(a1, c, r).length > 0) faced.push(`${c},${r}`);
      }
    }
    // Every tile of rows 3 and 6 but the switchback road (2,3) and (11,6).
    expect(faced).toHaveLength(2 * a1.cols - 2);
    expect(faced).not.toContain('2,3');
    expect(faced).not.toContain('11,6');
    expect(faced.every((k) => k.endsWith(',3') || k.endsWith(',6'))).toBe(true);
  });

  it("draws A1M3–A1M5's decor markers, numbered markers, and their looks (T311c)", () => {
    const m = {
      ...grid(['.....', '.#...', '.#...', '.....']),
      markers: {
        mailbox: [0, 0],
        podium: [2, 0],
        billboard_2: [3, 0],
        banner_line: [2, 1],
        party_tent: [0, 3],
        zibzab_shop: [3, 3],
        fountain: [2, 3],
      },
    } as const;
    expect(dressTile(m, 0, 0).prop).toEqual({ sprite: 'prop.mailbox', frame: 'v0', anim: null });
    // Prim hovers at the podium all map; the fountain flows.
    expect(dressTile(m, 2, 0).prop).toEqual({
      sprite: 'prop.podium',
      frame: 'prim_0',
      anim: 'prim',
    });
    expect(dressTile(m, 2, 3).prop?.anim).toBe('flow');
    // `<decor>_<n>` names one of several (A1M4's three billboards).
    expect(dressTile(m, 3, 0).prop?.sprite).toBe('prop.billboard');
    expect(dressTile(m, 0, 3).prop?.sprite).toBe('prop.party_tent');
    // The banner line slings back across the road behind its tile: along x here (road at col − 1).
    expect(dressTile(m, 2, 1).prop).toEqual({ sprite: 'prop.bunting', frame: 'x', anim: null });
    const across = { ...grid(['.#.', '...']), markers: { banner_line: [1, 1] } } as const;
    expect(dressTile(across, 1, 1).prop?.frame).toBe('y');
    // A cue's prop (Zibzab's shop, T312b) leaves its tile bare until the cue.
    expect(CUE_DECOR['zibzab_shop']).toBe('prop.zibzab_shop');
    expect(dressTile(m, 3, 3).prop).toBeNull();
    // Hardware keeps its own palette.
    expect(propVariant('prop.podium', 'act3')).toBe('default');
    expect(propVariant('prop.zibzab_shop', 'act2.dusk')).toBe('default');
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
