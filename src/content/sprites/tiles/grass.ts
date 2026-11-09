// Grass: the default ground and the base of blocked (decor) tiles.
import { defineSprite } from '../defineSprite.ts';
import { rows, TILE_H, TILE_W } from '../helpers.ts';
import { ENV_VARIANTS, grassGrid, TILE_ANCHOR } from './tileGen.ts';

export const tileGrass = defineSprite({
  id: 'tile.grass',
  size: { w: TILE_W, h: TILE_H },
  anchor: TILE_ANCHOR,
  palette: 'act1',
  variants: ENV_VARIANTS,
  frames: { v0: rows(grassGrid(1)), v1: rows(grassGrid(2)), v2: rows(grassGrid(3)) },
});
