// Path: the sand track enemies walk, with plain and tread-marked frames per grid axis, and the
// tiles of a 2-wide lane (A3M6's band, T740c): `wide_<axis>_<side>` is the lane's tile on that side
// of the road (along x, the `ne` and `sw` tiles; along y, the `nw` and `se`), its treads as
// `tread_<axis>`'s and no worn rim on the edge it shares with the other, so the pair reads as one
// wide road.
import { defineSprite } from '../defineSprite.ts';
import { rows, TILE_H, TILE_W } from '../helpers.ts';
import { ENV_VARIANTS, pathGrid, pathWithTreads, TILE_ANCHOR, wideLane } from './tileGen.ts';

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
    wide_x_ne: wideLane(3, 'x', 'sw'),
    wide_x_sw: wideLane(5, 'x', 'ne'),
    wide_y_nw: wideLane(4, 'y', 'se'),
    wide_y_se: wideLane(6, 'y', 'nw'),
  },
});
