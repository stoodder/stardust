// Terrace cliffs (`tile.cliff`, T223): the face of a render-only terrace step (MapDef.terraces),
// drawn over the lower tile's ground where its back neighbour is higher. Gameplay stays flat
// (design/maps.md § 3), so the step is faked on the ground plane: the face fills the back half of
// the lower tile (exactly the half of the tile mask nearest the shared edge, so faces on a row of
// tiles join seamlessly), with a contact shadow on the ground just below its foot.
//
// Frames `<edge>_<k>` (two noise variants each): `ne` steps down from the tile at (col, row − 1),
// a face lit by the upper-left light; `nw` steps down from (col − 1, row), a face in shade. The
// `_pad` frames leave a buildable tile's plate and its shadow clear, so a pad at the foot of a
// cliff still reads whole (art-direction § 8 Tile readability).
//
// Terraces are big earth banks, so their faces sit a step darker than the high-ground block's
// (`b`/`a` rather than `c`/`b`): the bright raised block stays the buildable one, and the banks
// put real mid-darks into the playfield (the m2 art verdict, D063).
import { defineSprite } from '../defineSprite.ts';
import { diamond, grid, hash01, inTileMask, plot, rows, TILE_H, TILE_W } from '../helpers.ts';
import { PLATE } from './pad.ts';
import { ENV_VARIANTS, TILE_ANCHOR } from './tileGen.ts';

export const CLIFF_EDGES = ['ne', 'nw'] as const;
export type CliffEdge = (typeof CLIFF_EDGES)[number];
export const CLIFF_VARIANTS = 2;
/** The face's height in px: one elevation step (tech-spec § Tile and screen: `ZH`). */
const FACE = 8;

/**
 * How far pixel (x, y) lies below `edge`, in px straight down the screen: 0 on the shared edge,
 * 8 at the tile's center line across that edge (the grid's half-tile in that axis).
 */
export function belowEdge(x: number, y: number, edge: CliffEdge): number {
  const px = x + 0.5 - 16;
  const py = y + 0.5;
  return edge === 'ne' ? py - px / 2 : py + px / 2;
}

function cliffGrid(edge: CliffEdge, seed: number, pad: boolean): string[] {
  const g = grid(TILE_W, TILE_H);
  const lit = edge === 'ne';
  for (let y = 0; y < TILE_H; y++) {
    for (let x = 0; x < TILE_W; x++) {
      if (!inTileMask(x, y)) continue;
      // A pad's plate (and the shadow it casts) stays clear: it sits in front of the bank.
      if (pad && diamond(x, y) <= PLATE + 0.75) continue;
      const k = Math.floor(belowEdge(x, y, edge));
      // Position along the edge, so the grass drips run with the bank.
      const along = lit ? x + 2 * y : x - 2 * y;
      const run = Math.floor((along + 64) / 4);
      // Vertical cracks (fixed screen columns), so the face reads as standing, not as a stripe.
      const crack = hash01(x, seed, 13) < 0.2 ? 2 + Math.floor(hash01(x, seed, 17) * 4) : 0;
      const drip = hash01(run, seed, 3) < 0.3;
      let ch: string | null = null;
      if (k === 0) {
        // The rim catches the light; here and there the upper terrace's grass droops over it.
        ch = drip ? '2' : lit ? 'd' : 'c';
      } else if (k === 1) {
        ch = drip && hash01(x, y, seed) < 0.5 ? '1' : lit ? 'c' : 'b';
      } else if (k < FACE - 1) {
        ch = lit ? (k === 2 ? 'c' : 'b') : k === 2 ? 'b' : 'a';
        if (k >= 2 && k < 2 + crack) ch = lit ? 'a' : 'x';
        else if (lit && k > 2 && hash01(x, y, seed + 9) < 0.1) ch = 'c'; // lit flecks of clay
      } else if (k === FACE - 1) {
        ch = lit ? 'a' : 'x'; // the foot, where the bank meets the lower ground
      } else if (k === FACE) {
        ch = (x + y) % 3 === 0 ? '0' : '1'; // contact shadow on the lower terrace
      } else if (k === FACE + 1 && (x + y) % 2 === 0) {
        ch = '1';
      } else if (!lit && k === FACE + 2 && (x + y) % 2 === 1) {
        ch = '1'; // the shaded bank throws a wider shadow
      }
      if (ch !== null) plot(g, x, y, ch);
    }
  }
  return rows(g);
}

const frames: Record<string, string[]> = {};
for (const edge of CLIFF_EDGES) {
  for (let k = 0; k < CLIFF_VARIANTS; k++) {
    frames[`${edge}_${k}`] = cliffGrid(edge, 41 + k * 7, false);
    frames[`${edge}_pad_${k}`] = cliffGrid(edge, 41 + k * 7, true);
  }
}

export const tileCliff = defineSprite({
  id: 'tile.cliff',
  size: { w: TILE_W, h: TILE_H },
  anchor: TILE_ANCHOR,
  palette: 'act1',
  variants: ENV_VARIANTS,
  frames,
});
