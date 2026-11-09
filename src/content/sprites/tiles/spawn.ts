// Spawn tile, Skitterkin look: a burrow mouth in clay at the head of the path, with grass tufts
// (design/maps.md § Tile types: the portal look is per faction).
import { defineSprite } from '../defineSprite.ts';
import { plot, rows, stamp } from '../helpers.ts';
import { ENV_VARIANTS, pathGrid } from './tileGen.ts';

// prettier-ignore
const BURROW = [
  '.....cddddc.....',
  '...ccdeeeedcc...',
  '..cdbbbbbbbbdc..',
  '.cdb.kkkkkk.bdc.',
  '.cbkkkkkkkkkkbc.',
  '.cbkkkkkkkkkkbc.',
  '..cbkkkkkkkkbc..',
  '...cbbkkkkbbc...',
  '....aaccccaa....',
];

function spawnGrid(): string[] {
  const g = pathGrid(9);
  stamp(g, 8, 2, BURROW);
  // The burrow's dark mouth: `.` in the stamp above is skipped, so fill the gaps explicitly.
  for (const [x, y] of [
    [12, 5],
    [19, 5],
  ] as const)
    plot(g, x, y, 'b');
  // Grass tufts on the mound.
  for (const [x, y] of [
    [9, 3],
    [22, 3],
    [10, 10],
    [21, 10],
    [14, 1],
  ] as const) {
    plot(g, x, y, '3');
    plot(g, x, y + 1, '1');
  }
  return rows(g);
}

export const tileSpawn = defineSprite({
  id: 'tile.spawn',
  size: { w: 32, h: 16 },
  anchor: { x: 16, y: 0 },
  palette: 'act1',
  variants: ENV_VARIANTS,
  frames: { v0: spawnGrid() },
});
