// T640c's Act III world, as pure rules: the decor A3M1–A3M3's markers put on their tiles, Act
// III's looks (the empty podium, crystal for brush, the dark billboards and domes), the apron's
// night dressing, the Peeker's absence, and the rift cracks' tiles and halves on the real maps.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import { RAW_CONTENT } from '../../content/registry.ts';
import type { SpriteId } from '../../content/sprites/index.ts';
import { ALL_SPRITES } from '../../content/sprites/all.ts';
import { apronCells, decorLook, dressTile, peekerShows, propVariant } from './groundTiles.ts';
import { riftCrackLook, riftCrackTiles } from './riftCrack.ts';

const maps = compileContent(RAW_CONTENT).maps;
const m1 = maps['a3_m01'];
const m2 = maps['a3_m02'];
const m3 = maps['a3_m03'];

function frames(id: SpriteId): readonly string[] {
  const d = ALL_SPRITES.find((s) => s.id === id);
  if (d === undefined) throw new Error(`no sprite ${id}`);
  return Object.keys(d.frames);
}

function anims(id: SpriteId): readonly string[] {
  return Object.keys(ALL_SPRITES.find((s) => s.id === id)?.anims ?? {});
}

function propAt(g: typeof m1, id: string): ReturnType<typeof dressTile>['prop'] {
  const at = g.markers[id];
  if (at === undefined) throw new Error(`no marker ${id}`);
  return dressTile(g, at[0], at[1]).prop;
}

describe("A3M1's Preserve", () => {
  it('hangs the sign over the inner gate and stands the warren homes round the basin', () => {
    expect(propAt(m1, 'sign')).toMatchObject({ sprite: 'prop.preserve_sign', frame: 'v0' });
    const homes = ['home_1', 'home_2', 'home_3', 'home_4'].map((h) => propAt(m1, h));
    expect(homes.map((h) => h?.sprite)).toEqual(Array(4).fill('prop.warren_home'));
    // Alternating: a tagged home, then one with its lantern lit.
    expect(homes.map((h) => h?.frame)).toEqual(['v1', 'v0', 'v1', 'v0']);
    expect(propAt(m1, 'basin')?.sprite).toBe('prop.basin');
    expect(propAt(m1, 'fence_north')).toMatchObject({ sprite: 'prop.relocation_fence' });
  });

  it('sinks into a bowl: cliff faces on the back walls, never on the road', () => {
    let faces = 0;
    for (let r = 0; r < m1.rows; r++) {
      for (let c = 0; c < m1.cols; c++) {
        const d = dressTile(m1, c, r);
        if (d.cliff === undefined) continue;
        faces++;
        expect(['tile.grass', 'tile.pad']).toContain(d.ground.sprite);
        // A pad at a cliff's foot keeps its plate clear.
        if (d.ground.sprite === 'tile.pad')
          expect(d.cliff.every((f) => f.includes('_pad'))).toBe(true);
      }
    }
    expect(faces).toBeGreaterThan(4);
  });
});

describe("A3M2's plaza at night", () => {
  it('parks the shuttle on its pad, nav lights trading, and leaves your old turrets dead', () => {
    expect(propAt(m2, 'shuttle_pad')).toEqual({
      sprite: 'prop.shuttle',
      frame: 'parked_0',
      anim: 'parked',
    });
    expect(propAt(m2, 'dead_turret_1')).toMatchObject({ sprite: 'prop.dead_turret', frame: 'v0' });
    expect(propAt(m2, 'dead_turret_2')).toMatchObject({ sprite: 'prop.dead_turret', frame: 'v1' });
  });

  it('empties the podium and darkens the billboards; the Peeker is gone', () => {
    expect(propAt(m2, 'podium')).toMatchObject({ sprite: 'prop.podium', frame: 'v0', anim: null });
    for (const b of ['billboard_west', 'billboard_center', 'billboard_east'])
      expect(propAt(m2, b)?.frame).toBe('dark');
    expect(peekerShows(m2.env)).toBe(false);
    expect(peekerShows('act1')).toBe(true);
    expect(peekerShows('act2.dusk')).toBe(true);
    // The Peeker's tile stays bare (its view draws nothing in Act III).
    expect(propAt(m2, 'peeker')).toBeNull();
  });
});

describe("Act III's looks", () => {
  it('grows crystal where the brush grew, and keeps Act I and II looks as they were', () => {
    expect(decorLook('prop.flora', 'act3')).toEqual({ frame: 'crystal', anim: null });
    expect(decorLook('prop.flora', 'act1').frame).toBe('v0');
    expect(decorLook('prop.podium', 'act1')).toEqual({ frame: 'prim_0', anim: 'prim' });
    expect(decorLook('prop.billboard', 'act2.gold').frame).toBe('peeling');
    expect(decorLook('prop.dome', 'act3').frame).toBe('dark');
    for (const [id, look] of [
      ['prop.flora', 'crystal'],
      ['prop.dome', 'dark'],
      ['prop.podium', 'v0'],
      ['prop.billboard', 'dark'],
    ] as const)
      expect(frames(id)).toContain(look);
  });

  it("dresses the apron's north edges in the Long Night: a dark billboard, lamps, dark domes, crystal", () => {
    const cells = apronCells(m1, 'act3');
    const props = cells.flatMap((c) => (c.prop === null ? [] : [c]));
    const of = (s: SpriteId): typeof props => props.filter((c) => c.prop?.sprite === s);
    expect(of('prop.billboard').map((c) => c.prop?.frame)).toEqual(['dark']);
    expect(of('prop.emergency_lamp').length).toBeGreaterThanOrEqual(2);
    expect(of('prop.dome').map((c) => c.prop?.frame)).toEqual(['dark', 'dark']);
    // Every brush on the Act III apron is crystal.
    expect(of('prop.flora').every((c) => c.prop?.frame === 'crystal')).toBe(true);
    // Behind the map only (north edges), never past ring 2.
    for (const c of [...of('prop.billboard'), ...of('prop.emergency_lamp'), ...of('prop.dome')])
      expect(c.row < 0 || c.col < 0).toBe(true);
    for (const c of cells) if (c.ring > 2) expect(c.prop).toBeNull();
  });

  it('keeps every M6 prop in its own palette (none has an act3 variant to bake)', () => {
    for (const id of [
      'prop.preserve_sign',
      'prop.warren_home',
      'prop.shuttle',
      'prop.dead_turret',
      'prop.blast_door',
      'prop.emergency_lamp',
    ] as const)
      expect(propVariant(id, 'act3')).toBe('default');
  });
});

function rifts(g: typeof m1): (typeof g.routeList)[number][] {
  return g.routeList.filter((r) => r.kind === 'rift');
}

describe('the rift cracks', () => {
  it('crack only the off-road run of each lane, two halves a tile, joined edge to edge', () => {
    for (const g of [m1, m2, m3]) {
      for (const lane of rifts(g)) {
        const cracks = riftCrackTiles(g, lane);
        expect(cracks.length).toBeGreaterThan(2);
        for (const k of cracks) {
          expect(['#', 'S', 'C']).not.toContain(g.tiles[k.row * g.cols + k.col]);
          // Never over a pad (maps.md § 4).
          expect(['o', '+', '^']).not.toContain(g.tiles[k.row * g.cols + k.col]);
          expect(k.edges).toHaveLength(2);
        }
        // Each pair of neighbours shares its edge: one's `se` meets the next's `nw`, and so on.
        const opposite = { nw: 'se', se: 'nw', ne: 'sw', sw: 'ne' } as const;
        for (let i = 1; i < cracks.length; i++)
          expect(cracks[i]!.edges[0]).toBe(opposite[cracks[i - 1]!.edges[1]!]);
      }
    }
  });

  it("reads A3M1's north rift down column 5 to the west ring", () => {
    const north = rifts(m1).find((r) => r.id === 'rift_n')!;
    const cracks = riftCrackTiles(m1, north);
    expect(cracks.map((k) => [k.col, k.row])).toEqual([
      [5, 0],
      [5, 1],
      [5, 2],
      [5, 3],
      [5, 4],
      [5, 5],
      [6, 5],
      [7, 5],
    ]);
    // Out of the map's north edge, down the column, the bend east, then into the road at (8,5).
    expect(cracks[0]!.edges).toEqual(['ne', 'sw']);
    expect(cracks[5]!.edges).toEqual(['ne', 'se']);
    expect(cracks[7]!.edges).toEqual(['nw', 'se']);
  });

  it('keeps sparse decor off a crack', () => {
    for (const lane of rifts(m1)) {
      for (const k of riftCrackTiles(m1, lane)) {
        const p = dressTile(m1, k.col, k.row).prop;
        expect(['prop.flora', 'prop.rock']).not.toContain(p?.sprite);
      }
    }
  });

  it('plays a still scar while closed and a loop once it cracks, frames that exist', () => {
    expect(riftCrackLook('closed', 'ne')).toEqual({ frame: 'closed_ne', anim: null });
    expect(riftCrackLook('opening', 'sw')).toEqual({ frame: 'opening_sw_0', anim: 'opening_sw' });
    expect(riftCrackLook('open', 'se')).toEqual({ frame: 'open_se_0', anim: 'open_se' });
    for (const s of ['closed', 'opening', 'open'] as const) {
      for (const e of ['nw', 'ne', 'se', 'sw'] as const) {
        const l = riftCrackLook(s, e);
        expect(frames('tile.rift')).toContain(l.frame);
        if (l.anim !== null) expect(anims('tile.rift')).toContain(l.anim);
      }
    }
  });
});
