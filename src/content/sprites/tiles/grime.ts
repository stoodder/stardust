// Grime: the mining scars spreading over Act II's revisited ground (art-direction §3, the `grime`
// ramp), drawn over a decor tile's grass by a map's dressing layers (MapDef.dressing; T410a).
// `soil_<k>`: grey streaks along the grid's x axis with dithered edges and a few dark pebbles, so
// the grass still shows between them (the original's grass, greying). `scar_<k>`: bare grey
// earth cut over the whole tile, with bench lines and loose stones (a strip mine). Master colors
// straight from the `grime` ramp, so every env shows the same grey: the scars aren't the act's.
import { defineSprite } from '../defineSprite.ts';
import { grid, hash01, inTileMask, plot, rows, TILE_H, TILE_W } from '../helpers.ts';
import { TILE_ANCHOR } from './tileGen.ts';

export const GRIME_VARIANTS = 3;

/** Streaks: 2–3 bands of `B` (grime.2) one to two rows deep along +x (down-right on screen). */
function soilGrid(seed: number): string[] {
  const g = grid(TILE_W, TILE_H);
  const streaks = 2 + Math.floor(hash01(seed, 1, 5) * 2);
  for (let i = 0; i < streaks; i++) {
    // A line y = y0 + x / 2 (the grid's x axis), cut to a run of the tile.
    const y0 = -6 + hash01(i, seed, 2) * 14;
    const x0 = Math.floor(hash01(i, seed, 3) * 12);
    const len = 10 + Math.floor(hash01(i, seed, 4) * 14);
    const depth = 1 + hash01(i, seed, 6);
    for (let x = x0; x < Math.min(TILE_W, x0 + len); x++) {
      const yc = y0 + x / 2;
      for (let y = Math.floor(yc - 1); y <= Math.ceil(yc + depth); y++) {
        if (!inTileMask(x, y)) continue;
        const d = y - yc;
        // A solid core, a dithered fringe, and ragged run ends.
        const end = x === x0 || x === x0 + len - 1;
        if (d >= 0 && d < depth && !(end && (x + y) % 2 === 0)) {
          plot(g, x, y, hash01(x, y, seed + i) < 0.12 ? 'C' : 'B');
        } else if (d >= -1 && d < depth + 1 && (x + y) % 2 === 0) {
          plot(g, x, y, 'B');
        }
      }
    }
  }
  for (let i = 0; i < 4; i++) {
    const x = 3 + Math.floor(hash01(i, 11, seed) * 26);
    const y = 2 + Math.floor(hash01(i, 12, seed) * 12);
    if (inTileMask(x, y)) plot(g, x, y, 'A');
  }
  return rows(g);
}

/** Bare earth: `B` over the tile, `A` speckle and bench lines, `C` lit stone tops. */
function scarGrid(seed: number): string[] {
  const g = grid(TILE_W, TILE_H);
  const bench = 4 + Math.floor(hash01(seed, 7, 1) * 6);
  for (let y = 0; y < TILE_H; y++) {
    for (let x = 0; x < TILE_W; x++) {
      if (!inTileMask(x, y)) continue;
      const h = hash01(x, y, seed);
      // A bench line along the grid's x axis: a dark cut with a lit lip above it.
      const along = y - x / 2 + 8 - bench;
      let ch = h < 0.1 ? 'A' : h < 0.16 ? 'C' : 'B';
      if (along >= 0 && along < 1) ch = 'A';
      else if (along >= -1 && along < 0 && (x + y) % 2 === 0) ch = 'C';
      plot(g, x, y, ch);
    }
  }
  // Loose stones: a lit top over a dark foot.
  for (let i = 0; i < 3; i++) {
    const x = 5 + Math.floor(hash01(i, 21, seed) * 22);
    const y = 3 + Math.floor(hash01(i, 22, seed) * 9);
    if (!inTileMask(x, y) || !inTileMask(x, y + 1)) continue;
    plot(g, x, y, 'D');
    plot(g, x, y + 1, 'A');
  }
  return rows(g);
}

const frames: Record<string, string[]> = {};
for (let k = 0; k < GRIME_VARIANTS; k++) {
  frames[`soil_${k}`] = soilGrid(41 + k * 7);
  frames[`scar_${k}`] = scarGrid(53 + k * 7);
}

export const tileGrime = defineSprite({
  id: 'tile.grime',
  size: { w: TILE_W, h: TILE_H },
  anchor: TILE_ANCHOR,
  palette: 'act1',
  legend: { A: 'grime.1', B: 'grime.2', C: 'grime.3', D: 'grime.4' },
  frames,
});
