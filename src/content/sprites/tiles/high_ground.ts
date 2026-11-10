// High ground (`^`, design/maps.md §3): a buildable raised block, one elevation step (8 px) up.
// Its top face is a pad (art-direction §8 Tile readability), and its cliff faces are the act's
// clay, lit on the left, shaded on the right, banded with strata, with grass lipping over the
// edge. The renderer draws it in `world` (tech-spec § Depth sorting), its top face `ZH` higher.
import { defineSprite } from '../defineSprite.ts';
import { grid, hash01, inTileMask, plot, rows, stamp, TILE_H, TILE_W } from '../helpers.ts';
import { PAD_LEGEND, padGrid } from './pad.ts';
import { ENV_VARIANTS } from './tileGen.ts';

/** One elevation step (tech-spec § Tile and screen: `ZH`). */
export const ELEVATION_PX = 8;

/** The lowest row of the tile mask in column x (−1 outside it). */
function maskBottom(x: number): number {
  for (let y = TILE_H - 1; y >= 0; y--) if (inTileMask(x, y)) return y;
  return -1;
}

/**
 * The block's look: `v0` Act I's grassy terrace block; `ledge` a canyon ledge (A2M1: rock lips
 * instead of grass, three strata, cracks down the faces, rubble at the foot); `outcrop` an Aelari
 * thread-glass outcrop (A2M2: dark rock woven through with sapphire glass threads crossing at
 * bright knots, glass shards at its foot).
 */
export type HighGroundLook = 'v0' | 'ledge' | 'outcrop';

function highGroundGrid(look: HighGroundLook = 'v0'): string[] {
  const g = grid(TILE_W, TILE_H + ELEVATION_PX);
  // The top face: a pad, raised one step (it occupies rows 0..15 of the taller frame).
  padGrid().forEach((row, y) => row.forEach((ch, x) => plot(g, x, y, ch)));
  for (let x = 0; x < TILE_W; x++) {
    const e = maskBottom(x);
    if (e < 0) continue;
    const left = x < 16;
    for (let k = 1; k <= ELEVATION_PX; k++) {
      const y = e + k;
      let ch = left ? 'c' : 'b';
      if (look === 'outcrop') ch = left ? 'b' : 'a';
      // Strata: dashed bands following the slope (three on a ledge); the left face is lit.
      const strata = look === 'ledge' ? k === 2 || k === 4 || k === 6 : k === 3 || k === 6;
      if (strata && look !== 'outcrop') ch = (x + k) % 5 < 3 ? (left ? 'b' : 'a') : ch;
      if (left && k === 1) ch = look === 'outcrop' ? 'c' : 'd';
      if (k === ELEVATION_PX) ch = left ? 'b' : 'a'; // the foot, where it meets the ground
      // The outermost columns are the far corners: shade them like the face they turn from.
      if (x === 0 || x === TILE_W - 1) ch = 'a';
      plot(g, x, y, ch);
    }
    if (look === 'v0') {
      // Grass lipping over the edge, here and there.
      if (hash01(x, 3, 11) < 0.35) plot(g, x, e + 1, hash01(x, 4, 11) < 0.5 ? '1' : '2');
    } else if (look === 'ledge') {
      // A rocky lip, and cracks running down the faces.
      if (hash01(x, 3, 13) < 0.3) plot(g, x, e + 1, 'e');
      if (x % 7 === 2) for (let k = 2; k < ELEVATION_PX; k++) plot(g, x + (k % 2), e + k, 'a');
    } else {
      // Thread-glass woven through the rock: two families of 1 px threads crossing on the faces
      // (along each face's slope), bright knots where they cross.
      for (let k = 2; k < ELEVATION_PX; k++) {
        const u = (x + 2 * k) % 10;
        const v = (x - 2 * k + 100) % 10;
        if (u < 2 && v < 2) plot(g, x, e + k, 'I');
        else if (u < 2 || v < 2) plot(g, x, e + k, left ? 'H' : 'G');
      }
    }
  }
  if (look === 'outcrop') {
    // Glass shards at the foot of its side corners, lit from inside.
    stamp(g, 0, 15, ['G.', 'HG', 'IH']);
    stamp(g, 30, 15, ['.G', 'GH', 'HI']);
    stamp(g, 14, TILE_H + ELEVATION_PX - 4, ['.G.', 'GIH']);
  } else if (look === 'ledge') {
    // Rubble at the foot of the near corner.
    stamp(g, 12, TILE_H + ELEVATION_PX - 3, ['.d.cd', 'dcb.b']);
  }
  return rows(g);
}

export const tileHighGround = defineSprite({
  id: 'tile.high_ground',
  size: { w: TILE_W, h: TILE_H + ELEVATION_PX },
  // The ground point (the footprint's top vertex) sits one step below the raised top face.
  anchor: { x: 16, y: ELEVATION_PX },
  palette: 'act1',
  variants: ENV_VARIANTS,
  legend: { ...PAD_LEGEND, G: 'blue.2', H: 'blue.3', I: 'teal.4' },
  frames: {
    v0: highGroundGrid('v0'),
    ledge: highGroundGrid('ledge'),
    outcrop: highGroundGrid('outcrop'),
  },
});
