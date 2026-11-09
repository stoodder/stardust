// The static playfield: the decor apron and the map's ground tiles in the `ground` layer (back to
// front: by i + j, then i), and the props standing on tiles (core, fence, decor) depth-sorted in
// `world`. Drawn once per map. The apron lies outside the grid, so picking never reaches it.
import * as Phaser from 'phaser';
import { worldDepth } from '../depth.ts';
import { gridToScreen, tileImageTopLeft, type Vec2 } from '../iso.ts';
import {
  apronCells,
  dressTile,
  envVariant,
  propVariant,
  type GroundGrid,
  type TileDressing,
} from './groundTiles.ts';
import type { ViewContext } from './ViewContext.ts';

const pos: Vec2 = { x: 0, y: 0 };
/** Apron cells' tie-break ids start above any map tile's. */
const APRON_ID_BASE = 4096;

/** Props are not pooled entities; their depth tie-break uses a per-tile id. */
function propTieBreak(index: number): number {
  return index & 0xff;
}

/** Draws one cell's ground and prop; returns the prop's sprite (null with none). */
function drawCell(
  ctx: ViewContext,
  env: string,
  i: number,
  j: number,
  look: TileDressing,
  id: number,
): Phaser.GameObjects.Sprite | null {
  const { scene, sprites, layers, origin } = ctx;
  const f = sprites.frame(look.ground.sprite, look.ground.frame, envVariant(env));
  tileImageTopLeft(i, j, origin, pos);
  layers.ground.add(
    new Phaser.GameObjects.Image(scene, pos.x, pos.y, f.texture, f.frame).setOrigin(0, 0),
  );
  const prop = look.prop;
  if (prop === null) return null;
  const pv = propVariant(prop.sprite, env);
  const pf = sprites.frame(prop.sprite, prop.frame, pv);
  const pa = sprites.frameAnchor(prop.sprite, prop.frame);
  gridToScreen(i + 0.5, j + 0.5, origin, pos);
  const img = new Phaser.GameObjects.Sprite(scene, pos.x, pos.y, pf.texture, pf.frame)
    .setDisplayOrigin(pa.x, pa.y)
    .setDepth(worldDepth(pos.y, 'prop', propTieBreak(id)));
  if (prop.anim !== null) img.play(sprites.anim(prop.sprite, prop.anim, pv));
  layers.world.add(img);
  return img;
}

/**
 * Draws a map's apron, ground, and props. Static: called once when the battle starts. Returns the
 * core props by tile index, for CoreView (it fades a core that hides a tower behind it).
 */
export function drawGround(
  ctx: ViewContext,
  grid: GroundGrid,
  env: string,
): Map<number, Phaser.GameObjects.Sprite> {
  const cores = new Map<number, Phaser.GameObjects.Sprite>();
  // The apron first: its tiles never overlap the map's, so only the props need sorting.
  apronCells(grid, env).forEach((cell, n) => {
    drawCell(ctx, env, cell.col, cell.row, cell, APRON_ID_BASE + n);
  });
  // Back to front: diagonals (i + j) in order, then i within a diagonal (tech-spec § Depth sorting).
  for (let d = 0; d <= grid.cols + grid.rows - 2; d++) {
    for (let i = Math.max(0, d - grid.rows + 1); i <= Math.min(d, grid.cols - 1); i++) {
      const j = d - i;
      const index = j * grid.cols + i;
      const prop = drawCell(ctx, env, i, j, dressTile(grid, i, j), index);
      if (prop !== null && grid.tiles[index] === 'C') cores.set(index, prop);
    }
  }
  return cores;
}
