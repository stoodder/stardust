// Buildable pad: an Everglow steel plate with teal corner brackets, set into the ground
// (art-direction §8 Tile readability: a constructed plate, never plain ground).
import { defineSprite } from '../defineSprite.ts';
import { diamond, inTileMask, plot, rows, TILE_H, TILE_W } from '../helpers.ts';
import { ENV_VARIANTS, grassGrid } from './tileGen.ts';

const PLATE = 5.75; // plate inset, in diamond() units (the mask edge is 7.75)

function padGrid(): string[] {
  const g = grassGrid(7);
  const top = (x: number, y: number): boolean => diamond(x, y + 1) <= PLATE; // raised 1 px
  const body = (x: number, y: number): boolean => diamond(x, y) <= PLATE;
  for (let y = 0; y < TILE_H; y++) {
    for (let x = 0; x < TILE_W; x++) {
      if (!inTileMask(x, y)) continue;
      if (top(x, y)) {
        const rim = !top(x, y - 1) || !top(x - 1, y) || !top(x + 1, y);
        const lowEdge = !top(x, y + 1);
        plot(g, x, y, lowEdge ? 'N' : rim ? 'P' : (x + y) % 8 === 0 ? 'L' : 'M');
      } else if (body(x, y)) {
        plot(g, x, y, x < 16 ? 'L' : 'K'); // the plate's front lip: lit left, shaded right
      } else if (diamond(x, y) <= PLATE + 0.75 && y >= 8) {
        plot(g, x, y, '1'); // contact shadow on the ground below the plate
      }
    }
  }
  // Corner brackets at the plate's four vertices.
  const cx = 15.5;
  const cy = 6.5;
  const brackets: [number, number][] = [
    [Math.floor(cx), cy - PLATE + 1],
    [Math.ceil(cx), cy - PLATE + 1],
    [Math.floor(cx) - 1, cy - PLATE + 2],
    [Math.ceil(cx) + 1, cy - PLATE + 2],
    [Math.floor(cx), cy + PLATE - 1],
    [Math.ceil(cx), cy + PLATE - 1],
    [Math.floor(cx) - 1, cy + PLATE - 2],
    [Math.ceil(cx) + 1, cy + PLATE - 2],
    [cx - 2 * PLATE + 2.5, cy],
    [cx - 2 * PLATE + 3.5, cy],
    [cx - 2 * PLATE + 2.5, cy + 1],
    [cx + 2 * PLATE - 2.5, cy],
    [cx + 2 * PLATE - 3.5, cy],
    [cx + 2 * PLATE - 2.5, cy + 1],
  ];
  for (const [x, y] of brackets) plot(g, Math.round(x), Math.round(y), 'T');
  return rows(g);
}

export const tilePad = defineSprite({
  id: 'tile.pad',
  size: { w: TILE_W, h: TILE_H },
  anchor: { x: 16, y: 0 },
  palette: 'act1',
  variants: ENV_VARIANTS,
  // The plate is Everglow hardware, so its steel and teal stay the same in every act.
  legend: { K: 'steel.0', L: 'steel.1', M: 'steel.2', N: 'steel.0', P: 'steel.2', T: 'teal.3' },
  frames: { v0: padGrid() },
});
