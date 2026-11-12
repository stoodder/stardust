// M8's world dressing (T842): the finale's Halls (its ledges, its gold seams, the mouth on the apron
// beyond the Halls spawn, the Spires' apron with no colony on it), the waymarks wrecked then relit,
// the memorial wreck by the save's class, the Deep Bore's rig, and A3M3's tunnel mouths.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import { RAW_CONTENT } from '../../content/registry.ts';
import {
  apronCells,
  dressTile,
  hallsMouthCell,
  isHalls,
  propVariant,
  wreckageFrame,
  type GroundGrid,
} from './groundTiles.ts';

const all = compileContent(RAW_CONTENT).maps;
type Compiled = (typeof all)[keyof typeof all];
const maps: Readonly<Partial<Record<string, Compiled>>> = all;

function map(id: string): Compiled {
  const m = maps[id];
  if (m === undefined) throw new Error(`no ${id}`);
  return m;
}

function at(g: GroundGrid, marker: string): readonly [number, number] {
  const p = g.markers?.[marker];
  if (p === undefined) throw new Error(`no marker ${marker}`);
  return p;
}

describe("the finale's Halls (fin_m01)", () => {
  const fin = map('fin_m01');

  it('is the Halls map; no earlier map is', () => {
    expect(isHalls(fin)).toBe(true);
    for (const id of ['a1_m01', 'a2_m01', 'a3_m03', 'a3_m06']) expect(isHalls(map(id))).toBe(false);
  });

  it('raises Halls-mouth ledges and lays gold seams for power nodes', () => {
    for (let r = 0; r < fin.rows; r++) {
      for (let c = 0; c < fin.cols; c++) {
        const t = fin.tiles[r * fin.cols + c];
        const look = dressTile(fin, c, r);
        if (t === '^')
          expect(look.block, `${c},${r}`).toEqual({ sprite: 'tile.high_ground', frame: 'halls' });
        if (t === '+')
          expect(look.ground).toEqual({ sprite: 'tile.power_node', frame: 'seam_0', anim: 'seam' });
      }
    }
    expect(fin.tiles.filter((t) => t === '^').length).toBeGreaterThan(0);
    expect(fin.tiles.filter((t) => t === '+').length).toBeGreaterThan(0);
  });

  it('stands the mouth on the apron beyond the Halls spawn, the road running into it', () => {
    const mouth = hallsMouthCell(fin);
    expect(mouth).not.toBeNull();
    if (mouth === null) return;
    expect(mouth.row).toBe(-1);
    expect(fin.tiles[mouth.col]).toBe('S'); // the north-edge spawn under it
    // Nearer the choir's stop than any other north-edge spawn.
    const [hx] = at(fin, 'halls_mouth');
    expect(Math.abs(mouth.col - hx)).toBeLessThanOrEqual(2);
    const cell = apronCells(fin, fin.env).find((a) => a.col === mouth.col && a.row === mouth.row);
    expect(cell?.prop).toEqual({ sprite: 'prop.halls_mouth', frame: 'v0', anim: 'glint' });
    expect(propVariant('prop.halls_mouth', fin.env)).toBe('default');
  });

  it('runs no fence across the mouth', () => {
    const mouth = hallsMouthCell(fin);
    if (mouth === null) throw new Error('no mouth');
    const fences = apronCells(fin, fin.env).filter(
      (a) => a.prop?.sprite === 'prop.fence' && a.row === -1 && Math.abs(a.col - mouth.col) <= 2,
    );
    expect(fences).toEqual([]);
    // The rest of the north edge keeps its fence.
    expect(
      apronCells(fin, fin.env).some((a) => a.prop?.sprite === 'prop.fence' && a.row === -1),
    ).toBe(true);
  });

  it("dresses the Spires' apron: no billboard, no Dome Row, nothing behind the mouth", () => {
    const mouth = hallsMouthCell(fin);
    const props = apronCells(fin, fin.env).flatMap((a) => (a.prop === null ? [] : [a]));
    const sprites = new Set(props.map((a) => a.prop?.sprite));
    expect(sprites.has('prop.billboard')).toBe(false);
    expect(sprites.has('prop.dome')).toBe(false);
    const behind = props.filter(
      (a) => mouth !== null && a.row < -1 && Math.abs(a.col - mouth.col) <= 2,
    );
    expect(behind).toEqual([]);
  });

  it('keeps the colony apron on maps without the Halls', () => {
    const a3m6 = map('a3_m06');
    expect(hallsMouthCell(a3m6)).toBeNull();
    const sprites = apronCells(a3m6, a3m6.env).map((a) => a.prop?.sprite);
    expect(sprites).toContain('prop.dome');
    expect(sprites).not.toContain('prop.halls_mouth');
  });

  it('lies a waymark knocked down on each lantern tile until cleared, then relights it', () => {
    for (const id of ['waymark_1', 'waymark_2', 'waymark_3', 'waymark_4']) {
      const [c, r] = at(fin, id);
      expect(fin.tiles[r * fin.cols + c], id).toBe('x');
      const wreck = dressTile(fin, c, r).prop;
      expect(wreck?.sprite, id).toBe('prop.wreckage');
      expect(['v8', 'v9']).toContain(wreck?.frame);
      expect(wreckageFrame(c, r, fin.env, fin.markers)).toBe(wreck?.frame);
      // Cleared: the tile is its live decor, and the marker stands the lantern there, lit.
      const tiles = fin.tiles.slice();
      tiles[r * fin.cols + c] = '.';
      const lit = dressTile({ ...fin, tiles }, c, r).prop;
      expect(lit, id).toEqual({ sprite: 'prop.waymark', frame: 'lit', anim: 'lit' });
    }
    // Both wrecks show along the road.
    const looks = new Set(
      ['waymark_1', 'waymark_2', 'waymark_3', 'waymark_4'].map((id) => {
        const [c, r] = at(fin, id);
        return wreckageFrame(c, r, fin.env, fin.markers);
      }),
    );
    expect(looks).toEqual(new Set(['v8', 'v9']));
  });

  it("draws the memorial wreck of the save's class, the Rivet's without one", () => {
    const [c, r] = at(fin, 'memorial_wreck');
    expect(dressTile(fin, c, r).prop).toEqual({
      sprite: 'prop.memorial_wreck',
      frame: 'rivet',
      anim: null,
    });
    for (const tower of ['burrow', 'prism', 'zapcoil', 'sproing'] as const) {
      expect(dressTile({ ...fin, memorialTower: tower }, c, r).prop?.frame).toBe(tower);
    }
    expect(propVariant('prop.memorial_wreck', fin.env)).toBe('default');
  });

  it("stands the Deep Bore's rig on its marker, its gauge empty", () => {
    const [c, r] = at(fin, 'bore_rig');
    expect(dressTile(fin, c, r).prop).toEqual({ sprite: 'prop.bore_rig', frame: 'g0', anim: null });
    expect(propVariant('prop.bore_rig', fin.env)).toBe('default');
  });
});

describe("A3M3's tunnel mouths", () => {
  const a3m3 = map('a3_m03');

  it("marks each refugee road's edge: the convoy's portal, the warren's burrow", () => {
    const [cc, cr] = at(a3m3, 'convoy_mouth');
    const [wc, wr] = at(a3m3, 'warren_mouth');
    expect(dressTile(a3m3, cc, cr).prop).toEqual({
      sprite: 'prop.tunnel_mouth',
      frame: 'convoy',
      anim: null,
    });
    expect(dressTile(a3m3, wc, wr).prop).toEqual({
      sprite: 'prop.tunnel_mouth',
      frame: 'warren',
      anim: null,
    });
  });
});

/** The sparse flora and rocks drawn on a map's open ground. */
function sparseProps(g: GroundGrid): number {
  let n = 0;
  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < g.cols; c++) {
      const p = dressTile(g, c, r).prop?.sprite;
      if (p === 'prop.flora' || p === 'prop.rock') n++;
    }
  }
  return n;
}

describe('the sim deck’s maps (M8 R5): sparser decor', () => {
  it('drops about a third of the open ground’s flora and rocks on Endless and the Challenges', () => {
    let seen = 0;
    for (const id of ['end_m01', 'ch_m01', 'ch_m02', 'ch_m03']) {
      const m = maps[id];
      if (m === undefined) continue; // registered by the finale's chunk
      seen++;
      const thinned = sparseProps(m);
      const full = sparseProps({ ...m, id: 'a1_m01' });
      expect(full, id).toBeGreaterThan(0);
      expect(thinned / full, id).toBeGreaterThan(0.5);
      expect(thinned / full, id).toBeLessThan(0.85);
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('leaves the campaign’s maps as they were', () => {
    const m = map('fin_m01');
    expect(sparseProps(m)).toBe(sparseProps({ ...m, id: 'a1_m01' }));
  });
});
