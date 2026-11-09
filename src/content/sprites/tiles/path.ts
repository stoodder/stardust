// Path: the sand track enemies walk, with plain and tread-marked frames per grid axis.
import { defineSprite } from '../defineSprite.ts';
import { rows, TILE_H, TILE_W } from '../helpers.ts';
import { ENV_VARIANTS, pathGrid, pathWithTreads, TILE_ANCHOR } from './tileGen.ts';

export const tilePath = defineSprite({
  id: 'tile.path',
  size: { w: TILE_W, h: TILE_H },
  anchor: TILE_ANCHOR,
  palette: 'act1',
  variants: ENV_VARIANTS,
  frames: {
    v0: rows(pathGrid(1)),
    v1: rows(pathGrid(2)),
    tread_x: pathWithTreads(3, 'x'),
    tread_y: pathWithTreads(4, 'y'),
  },
});
