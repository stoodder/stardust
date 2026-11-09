// The static playfield: ground tiles in the `ground` layer (back to front: by i + j, then i), and
// the props standing on tiles (core, wreckage, decor) depth-sorted in `world`. Drawn once per map.
import * as Phaser from 'phaser';
import { worldDepth } from '../depth.ts';
import { gridToScreen, tileImageTopLeft, type Vec2 } from '../iso.ts';
import { DEFAULT_VARIANT } from '../sprites/bake.ts';
import { dressTile, envVariant, type GroundGrid } from './groundTiles.ts';
import type { ViewContext } from './ViewContext.ts';

const pos: Vec2 = { x: 0, y: 0 };

/** Props are not pooled entities; their depth tie-break uses a per-tile id above any uid's low byte. */
function propTieBreak(index: number): number {
  return index & 0xff;
}

/** Draws a map's ground and props. Static: called once when the battle starts. */
export function drawGround(ctx: ViewContext, grid: GroundGrid, env: string): void {
  const { scene, sprites, layers, origin } = ctx;
  const variant = envVariant(env);
  // Back to front: diagonals (i + j) in order, then i within a diagonal (tech-spec § Depth sorting).
  for (let d = 0; d <= grid.cols + grid.rows - 2; d++) {
    for (let i = Math.max(0, d - grid.rows + 1); i <= Math.min(d, grid.cols - 1); i++) {
      const j = d - i;
      const look = dressTile(grid, i, j);
      const f = sprites.frame(look.ground.sprite, look.ground.frame, variant);
      tileImageTopLeft(i, j, origin, pos);
      layers.ground.add(
        new Phaser.GameObjects.Image(scene, pos.x, pos.y, f.texture, f.frame).setOrigin(0, 0),
      );
      const prop = look.prop;
      if (prop === null) continue;
      // The core is Everglow hardware (faction palette); decor follows the act's env palette.
      const pv = prop.sprite === 'prop.core' ? DEFAULT_VARIANT : variant;
      const pf = sprites.frame(prop.sprite, prop.frame, pv);
      const pa = sprites.frameAnchor(prop.sprite, prop.frame);
      gridToScreen(i + 0.5, j + 0.5, origin, pos);
      const img = new Phaser.GameObjects.Sprite(scene, pos.x, pos.y, pf.texture, pf.frame)
        .setDisplayOrigin(pa.x, pa.y)
        .setDepth(worldDepth(pos.y, 'prop', propTieBreak(j * grid.cols + i)));
      if (prop.anim !== null) img.play(sprites.anim(prop.sprite, prop.anim, pv));
      layers.world.add(img);
    }
  }
}
