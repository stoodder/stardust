import { describe, expect, it } from 'vitest';
import type { TileChar } from '../../content/types.ts';
import { APRON_RINGS } from '../../content/sprites/tiles/apron.ts';
import { map as a1m02 } from '../../content/maps/a1_m02/map.ts';
import {
  apronCells,
  cliffFrames,
  CUE_DECOR,
  decorLook,
  DECOR_MARKERS,
  dressTile,
  envVariant,
  highGroundLook,
  hushFrame,
  inDressingArea,
  isActTwo,
  kerbEdges,
  peekerCover,
  propVariant,
  soilFrame,
  tilesBehind,
  wreckageFrame,
} from './groundTiles.ts';
import { map as a2m01 } from '../../content/maps/a2_m01/map.ts';
import { map as a2m02 } from '../../content/maps/a2_m02/map.ts';
import { compileContent } from '../../content/compile.ts';
import { RAW_CONTENT } from '../../content/registry.ts';
import { SPRITES, type SpriteId } from '../../content/sprites/index.ts';

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
    expect(CUE_DECOR['zibzab_shop']).toEqual({ sprite: 'prop.zibzab_shop', wave: 6 });
    expect(dressTile(m, 3, 3).prop).toBeNull();
    // Hardware keeps its own palette.
    expect(propVariant('prop.podium', 'act3')).toBe('default');
    expect(propVariant('prop.zibzab_shop', 'act2.dusk')).toBe('default');
  });

  it("hides the Peeker in A1M4's planter, and behind the rock elsewhere (T312b)", () => {
    expect(peekerCover('a1_m04')).toBe('planter');
    expect(peekerCover('a1_m03')).toBe('rock');
    expect(peekerCover('dev_range')).toBe('rock');
    expect(peekerCover('toString')).toBe('rock');
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

describe("dressing layers (T410a: the revisit's grey soil)", () => {
  // A 6×4 revisit of a 2×2 original at (2, 1): footprint cols 2–3, rows 1–2.
  const base = grid(['......', '..o...', '......', '...o..']);
  const revisit = { ...base, revisitAt: [2, 1] as const, revisitSize: { cols: 2, rows: 2 } };

  it('tells the original footprint from the band, the whole map, and a corner-to-corner area', () => {
    expect(inDressingArea(revisit, 'original', 2, 1)).toBe(true);
    expect(inDressingArea(revisit, 'original', 3, 2)).toBe(true);
    expect(inDressingArea(revisit, 'original', 4, 2)).toBe(false);
    expect(inDressingArea(revisit, 'band', 4, 2)).toBe(true);
    expect(inDressingArea(revisit, 'band', 2, 1)).toBe(false);
    expect(inDressingArea(revisit, 'all', 0, 0)).toBe(true);
    const east = { from: [4, 0], to: [5, 3] } as const;
    expect(inDressingArea(revisit, east, 5, 3)).toBe(true);
    expect(inDressingArea(revisit, east, 3, 3)).toBe(false);
    // Not a revisit: its original and band are nowhere.
    expect(inDressingArea(base, 'original', 2, 1)).toBe(false);
    expect(inDressingArea(base, 'band', 0, 0)).toBe(false);
  });

  it('greys the grass by the last layer over it, never a pad, and keeps no flora on a scar', () => {
    const g = {
      ...revisit,
      dressing: [
        { kind: 'greySoil', area: 'all' },
        { kind: 'mineScar', area: { from: [4, 0], to: [5, 3] } },
      ] as const,
    };
    expect(soilFrame(g, 0, 0)).toMatch(/^soil_[0-2]$/);
    expect(soilFrame(g, 5, 0)).toMatch(/^scar_[0-2]$/);
    expect(soilFrame(revisit, 0, 0)).toBeNull();
    expect(dressTile(g, 0, 0).soil).toMatch(/^soil_/);
    // A pad keeps its plate clear.
    expect(dressTile(g, 2, 1).soil).toBeUndefined();
    // (0, 0) carries sparse flora; cut to a scar, it's bare.
    expect(dressTile(revisit, 0, 0).prop?.sprite).toBe('prop.flora');
    const scarred = { ...revisit, dressing: [{ kind: 'mineScar', area: 'all' }] as const };
    expect(dressTile(scarred, 0, 0)).toMatchObject({
      soil: expect.stringMatching(/^scar_/),
      prop: null,
    });
    for (let col = 4; col < 6; col++) {
      for (let row = 0; row < 4; row++) {
        const look = dressTile(g, col, row);
        if (look.ground.sprite !== 'tile.grass') continue;
        expect(look.soil, `${col},${row}`).toMatch(/^scar_/);
        expect(look.prop?.sprite, `${col},${row}`).not.toBe('prop.flora');
      }
    }
  });
});

function frames(id: SpriteId): readonly string[] {
  return Object.keys(SPRITES.find((d) => d.id === id)?.frames ?? {});
}

describe("Act II's looks (T440c)", () => {
  it('reads Act II from the env', () => {
    expect(isActTwo('act2.gold')).toBe(true);
    expect(isActTwo('act2.dusk')).toBe(true);
    expect(isActTwo('act1')).toBe(false);
    expect(isActTwo(undefined)).toBe(false);
  });

  it('peels the billboard, fades the scarecrow, and sets Rig 3 to the strip mine', () => {
    expect(decorLook('prop.billboard', 'act1').frame).toBe('beaming');
    expect(decorLook('prop.billboard', 'act2.gold').frame).toBe('peeling');
    expect(decorLook('prop.scarecrow', 'act2.dusk').frame).toBe('faded');
    expect(decorLook('prop.rig', 'act2.gold').frame).toBe('strip');
    expect(decorLook('prop.fountain', 'act2.gold')).toEqual({ frame: 'f0', anim: 'flow' });
    expect(decorLook('prop.dome', 'act2.gold')).toEqual({ frame: 'v0', anim: null });
    // Every frame named here exists.
    for (const [sprite, frame] of [
      ['prop.billboard', 'peeling'],
      ['prop.scarecrow', 'faded'],
      ['prop.rig', 'strip'],
      ['prop.rig', 'nine'],
      ['prop.spoil', 'warren'],
      ['prop.spoil', 'drill_1'],
      ['prop.warren', 'v1'],
      ['tile.high_ground', 'ledge'],
      ['tile.high_ground', 'outcrop'],
      ['tile.power_node', 'conduit_0'],
      ['prop.wreckage', 'v2'],
      ['prop.wreckage', 'v3'],
      ['tile.hush', 'd3'],
    ] as const) {
      expect(frames(sprite), `${sprite}:${frame}`).toContain(frame);
    }
  });

  it("dresses A2M1: Rig Nine, the crew's hut, the crew-log rigs, the spoil, the dark edge", () => {
    const g = { ...grid(a2m01.tiles), markers: a2m01.markers ?? {}, env: a2m01.env };
    expect(dressTile(g, 16, 0).prop).toEqual({ sprite: 'prop.rig', frame: 'nine', anim: null });
    expect(dressTile(g, 16, 2).prop).toEqual({ sprite: 'prop.crew_hut', frame: 'v0', anim: null });
    expect(dressTile(g, 16, 5).prop).toEqual({
      sprite: 'prop.spoil',
      frame: 'drill_1',
      anim: null,
    });
    expect(dressTile(g, 16, 8).prop?.frame).toBe('drill_0');
    // The crew-log wrecks are Act II's broken rigs (their markers aren't decor).
    for (const [c, r] of [
      [13, 5],
      [10, 10],
    ] as const) {
      expect(dressTile(g, c, r).prop?.frame, `${c},${r}`).toMatch(/^v[23]$/);
      expect(dressTile(g, c, r).prop?.frame).toBe(wreckageFrame(c, r, 'act2.gold'));
    }
    // The canyon ledges and the stardust conduit.
    expect(dressTile(g, 4, 2).block?.frame).toBe('ledge');
    expect(dressTile(g, 9, 7).ground).toEqual({
      sprite: 'tile.power_node',
      frame: 'conduit_0',
      anim: 'conduit',
    });
    // The dark creeps in from the north-east corner and down the east edge, over decor only.
    expect(dressTile(g, 17, 0).hush).toBe('d3');
    expect(dressTile(g, 16, 11).hush).toBeDefined();
    expect(dressTile(g, 2, 11).hush).toBeUndefined();
    expect(dressTile(g, 15, 5).hush).toBeUndefined(); // the yard cut keeps its read
    expect(dressTile(g, 13, 4).hush).toBeUndefined(); // so does the ledge
    expect(apronCells(g, 'act2.gold').some((c) => c.hush === 'd3')).toBe(true);
  });

  it('dresses A2M2: the outcrops are thread-glass, the domes stand, the rigs are left bare', () => {
    const g = {
      ...grid(a2m02.tiles),
      markers: a2m02.markers ?? {},
      env: a2m02.env,
      asset: { marker: 'rigs' },
    };
    expect(highGroundLook(g, 5, 3)).toBe('outcrop');
    expect(dressTile(g, 13, 3).block?.frame).toBe('outcrop');
    expect(dressTile(g, 1, 3).prop?.sprite).toBe('prop.dome');
    expect(dressTile(g, 1, 8).prop?.sprite).toBe('prop.dome');
    expect(dressTile(g, 17, 10).prop).toBeNull(); // AssetView draws the rigs there
    expect(dressTile(g, 4, 1).prop?.sprite).not.toBe('prop.dome'); // the fork names no decor
    expect(hushFrame(g, 17, 0)).toBeNull();
  });

  it('dresses A2M3: the warrens line the road and the mining cuts cross two terraces', () => {
    // A revisit: compiled, so A1M2's layout is composed in.
    const g = compileContent(RAW_CONTENT).maps['a2_m03'];
    if (g === undefined) throw new Error('no a2_m03');
    expect(dressTile(g, 13, 0).prop).toEqual({ sprite: 'prop.spoil', frame: 'warren', anim: null });
    expect(dressTile(g, 12, 2).prop).toEqual({ sprite: 'prop.warren', frame: 'v1', anim: null });
    expect(dressTile(g, 3, 5).prop?.frame).toBe('v0');
    expect(soilFrame(g, 2, 1)).toMatch(/^scar_/);
    expect(soilFrame(g, 14, 10)).toMatch(/^scar_/);
    expect(soilFrame(g, 8, 8)).toMatch(/^soil_/);
  });

  it('keeps the dressing on decor: a hush never lands on a pad, the road, or a block', () => {
    const g = {
      ...grid(['....', '.o#.', '.^#+']),
      markers: { halls_dark: [3, 0] as const },
      env: 'act2.gold',
    };
    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 3; row++) {
        const look = dressTile(g, col, row);
        if (look.ground.sprite !== 'tile.grass' || look.block !== undefined)
          expect(look.hush, `${col},${row}`).toBeUndefined();
      }
    }
    expect(dressTile(g, 3, 0).hush).toBe('d3');
  });
});

describe('kerbs between lanes side by side (T430b)', () => {
  const maps = compileContent(RAW_CONTENT).maps;
  const compiled = maps.a2_m02;

  it("kerbs A2M2's hairpin lanes, rows 4 and 5, and nowhere else", () => {
    const kerbed: string[] = [];
    for (let r = 0; r < compiled.rows; r++) {
      for (let c = 0; c < compiled.cols; c++) {
        for (const e of kerbEdges(compiled, c, r)) kerbed.push(`${c},${r},${e}`);
      }
    }
    const expected: string[] = [];
    for (let c = 10; c <= 14; c++) expected.push(`${c},4,sw`, `${c},5,ne`);
    expect(kerbed.toSorted()).toEqual(expected.toSorted());
    expect(dressTile(compiled, 12, 4).kerb).toEqual(['sw']);
  });

  it('runs the treads along the lane, not across to the lane beside it', () => {
    expect(dressTile(compiled, 12, 4).ground.frame).toBe('tread_x');
    expect(dressTile(compiled, 12, 5).ground.frame).toBe('tread_x');
    // The hairpin's corner turns down to the lower lane: it runs along y.
    expect(dressTile(compiled, 9, 4).ground.frame).toBe('tread_y');
  });

  it('draws no kerb on a map whose lanes never lie side by side, or without routes', () => {
    for (const id of ['a1_m01', 'a1_m02', 'a1_m05', 'a2_m01', 'a2_m03'] as const) {
      const m = maps[id];
      for (let r = 0; r < m.rows; r++) {
        for (let c = 0; c < m.cols; c++) expect(kerbEdges(m, c, r), `${id} ${c},${r}`).toEqual([]);
      }
    }
    expect(kerbEdges(grid(['##', '##']), 0, 0)).toEqual([]);
  });
});
