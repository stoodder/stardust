// Rift cracks (`tile.rift`; design/maps.md § 4 rift lanes, art-direction §8 *Rift cracks*): the
// ground tearing open along a rift lane, drawn over the decor tiles a lane crosses before it joins
// the road. One overlay per **half** tile: a crack from the tile's centre out to one edge's
// midpoint (`nw` toward (col − 1, row), `ne` (col, row − 1), `se` (col + 1, row), `sw` (col,
// row + 1), as the verge names them), so a straight run, a bend, and a lane's open end all compose
// from two halves, and neighbouring tiles' halves meet on the shared edge. The crack jags between
// its ends (fixed at the centre and the edge, so the halves join) and never leaves the tile mask.
//
// Three statuses (`riftStatus`, sim/rifts.ts), each its own look so the telegraph reads at 1×:
// - `closed_<edge>`: an old scar, a broken hairline of `ink.0` with a dull violet fleck or two:
//   nothing comes through yet, and it never glows.
// - `opening_<edge>_0`/`_1` (anim `opening_<edge>`, 2 fps): the telegraph, a wave ahead. The scar
//   splits: dark `ink.0` lips round a 1 px seam of cold violet that breathes (`violet.2` ↔
//   `violet.3`), with the ground lifting in pale chips along it.
// - `open_<edge>_0`/`_1` (anim `open_<edge>`, 3 fps): torn wide, 3 px of unsung light between
//   jagged lips (a `violet.4` heart in `violet.3`, the lips `ink.0` over a `violet.1` rim) with
//   motes rising off it, the light stepping along the seam frame to frame. The unsung violet is
//   the Hollow's stardust (art-direction §1 principle 6). All under 3 Hz.
// Master colours (custom legend), so a crack reads the same on every act's ground; the open
// seam's light is emissive (`+`/`*`, the act3 palette's crystal) and bakes a 1 px halo.
import { defineSprite } from '../defineSprite.ts';
import { grid, hash01, inTileMask, plot, rows, TILE_H, TILE_W, type CharGrid } from '../helpers.ts';
import { TILE_ANCHOR } from './tileGen.ts';
import { VERGE_EDGES, type VergeEdge } from './verge.ts';

export type RiftStatusLook = 'closed' | 'opening' | 'open';
export const RIFT_STATUSES: readonly RiftStatusLook[] = ['closed', 'opening', 'open'];

/** The tile's centre and each edge's midpoint, in pixel-edge coordinates. */
const CENTRE = { x: 16, y: 8 } as const;
const MIDPOINT: Readonly<Record<VergeEdge, { readonly x: number; readonly y: number }>> = {
  nw: { x: 8, y: 4 },
  ne: { x: 24, y: 4 },
  se: { x: 24, y: 12 },
  sw: { x: 8, y: 12 },
};

/**
 * The crack's spine from the centre to `edge`'s midpoint: one point per screen column, its row
 * jagging up to 1 px off the straight line (0 at both ends, so halves and tiles join).
 */
function spine(edge: VergeEdge): { x: number; y: number }[] {
  const end = MIDPOINT[edge];
  const dir = end.x > CENTRE.x ? 1 : -1;
  const out: { x: number; y: number }[] = [];
  const steps = Math.abs(end.x - CENTRE.x);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = CENTRE.x + dir * i - (dir < 0 ? 1 : 0);
    const straight = CENTRE.y + (end.y - CENTRE.y) * t;
    // The jag: a step off the line in the middle of the run, its side by edge.
    const jag =
      i >= 2 && i <= steps - 2 ? Math.round(Math.sin(i * 1.3 + edge.charCodeAt(1)) * 1.4) : 0;
    out.push({ x, y: Math.floor(straight - 0.5) + jag });
  }
  return out;
}

function put(g: CharGrid, x: number, y: number, ch: string): void {
  if (inTileMask(x, y)) plot(g, x, y, ch);
}

function crackGrid(status: RiftStatusLook, edge: VergeEdge, beat: 0 | 1): string[] {
  const g = grid(TILE_W, TILE_H);
  const pts = spine(edge);
  pts.forEach((p, i) => {
    const h = hash01(i, beat, edge.charCodeAt(0) + edge.charCodeAt(1));
    if (status === 'closed') {
      // A hairline scar of `ink.0`, broken now and then, a dull fleck and a pale lip here and there.
      if (i % 5 !== 4) put(g, p.x, p.y, h < 0.15 ? 'U' : 'J');
      if (h > 0.8) put(g, p.x, p.y - 1, 'K');
      return;
    }
    if (status === 'opening') {
      put(g, p.x, p.y - 1, 'J');
      put(g, p.x, p.y + 1, 'J');
      // The seam breathes: the second beat lights every pixel a step brighter.
      put(g, p.x, p.y, beat === 1 || i % 2 === 0 ? '+' : 'V');
      // Pale chips of ground lifting at the lips.
      if (h < 0.18) put(g, p.x, p.y - 2, 'P');
      return;
    }
    // Open: a seam of light 3–5 px tall between jagged lips, torn ground darkening round it.
    const wide = i > 0 && i < pts.length - 1 && h > 0.3;
    const lip = i > 0 && i < pts.length - 1 && h < 0.5;
    if (lip) put(g, p.x, p.y - 3, 'J');
    put(g, p.x, p.y - 2, wide ? '+' : 'R');
    put(g, p.x, p.y - 1, '+');
    put(g, p.x, p.y, (i + beat) % 3 === 0 ? 'W' : '*');
    put(g, p.x, p.y + 1, wide || i % 2 === beat ? '*' : '+');
    put(g, p.x, p.y + 2, '+');
    put(g, p.x, p.y + 3, wide ? 'R' : 'J');
    if (h > 0.6) put(g, p.x, p.y + 4, 'J');
  });
  if (status === 'open') {
    // Motes rising off the seam, a pixel higher on the second beat.
    for (let m = 0; m < 2; m++) {
      const p = pts[2 + m * 3];
      if (p === undefined) continue;
      put(g, p.x + (m === 0 ? 1 : -1), p.y - 4 - beat - m, m === 0 ? '*' : '+');
    }
  }
  return rows(g);
}

const frames: Record<string, string[]> = {};
const anims: Record<string, { frames: string[]; fps: number }> = {};
for (const edge of VERGE_EDGES) {
  frames[`closed_${edge}`] = crackGrid('closed', edge, 0);
  for (const status of ['opening', 'open'] as const) {
    frames[`${status}_${edge}_0`] = crackGrid(status, edge, 0);
    frames[`${status}_${edge}_1`] = crackGrid(status, edge, 1);
    anims[`${status}_${edge}`] = {
      frames: [`${status}_${edge}_0`, `${status}_${edge}_1`],
      fps: status === 'open' ? 3 : 2,
    };
  }
}

export const tileRift = defineSprite({
  id: 'tile.rift',
  size: { w: TILE_W, h: TILE_H },
  anchor: TILE_ANCHOR,
  palette: 'act3',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  // ink lips, the dull scar fleck, the seam's dim step, pale chips, the open rim, its white heart.
  legend: {
    K: 'hollow.2',
    J: 'ink.0',
    U: 'violet.1',
    V: 'violet.2',
    P: 'hollow.3',
    R: 'violet.1',
    W: 'violet.4',
  },
  frames,
  anims,
});
