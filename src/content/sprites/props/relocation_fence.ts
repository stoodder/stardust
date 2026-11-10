// Everglow's relocation fencing (`prop.relocation_fence`; A2M5 decor, act2.md § A2M5, markers
// `fence_<name>`): a tall chain-link run along the Preserve Road, one tile long along the grid's x
// axis through the tile's center (so neighbouring markers join into one run). Steel posts, a mesh
// dithered so the ground shows through, a strand of barbed wire along the top, and an orange hazard
// tag. `v0` also carries Everglow's sign: a white plate with a teal band (relocation, with care;
// the colony's brand on a cage). `v1` is the plain run.
import { defineSprite } from '../defineSprite.ts';
import { grid, line, plot, rows, type CharGrid } from '../helpers.ts';

const W = 20;
const H = 24;
/** The anchor: the tile's center, the run's middle. */
const AX = 10;
const AY = 17;
/** The post height. */
const POST = 13;

/** The run's ground line at column x (slope ½, from (AX − 8, AY − 4) to (AX + 8, AY + 4)). */
function groundAt(x: number): number {
  return AY + Math.round((x - AX) / 2);
}

function run(sign: boolean): string[] {
  const g: CharGrid = grid(W, H);
  // The mesh: a checker between the bottom rail and the top wire, the ground showing through.
  for (let x = AX - 8; x <= AX + 8; x++) {
    const y0 = groundAt(x);
    for (let k = 1; k < POST; k++) if ((x + k) % 2 === 0) plot(g, x, y0 - k, k === 1 ? '2' : '1');
    plot(g, x, y0 - POST + 1, '3'); // the top rail
    plot(g, x, y0 + 1, '_');
  }
  // Barbed wire over the top: a strand with barbs every few pixels.
  line(g, AX - 8, groundAt(AX - 8) - POST - 1, AX + 8, groundAt(AX + 8) - POST - 1, '2');
  for (let x = AX - 7; x <= AX + 7; x += 3) plot(g, x, groundAt(x) - POST - 2, '3');
  // Posts at the start and the middle (the next run's post closes this one).
  for (const px of [AX - 8, AX]) {
    for (let k = 0; k <= POST + 1; k++) {
      plot(g, px, groundAt(px) - k, '3');
      plot(g, px + 1, groundAt(px) - k + (px === AX ? 0 : 0), '1');
    }
    plot(g, px, groundAt(px) - POST - 2, '4');
  }
  // The hazard tag on the mesh.
  plot(g, AX + 4, groundAt(AX + 4) - 6, 'c');
  plot(g, AX + 5, groundAt(AX + 5) - 6, 'd');
  if (sign) {
    // Everglow's sign on the middle post: a white plate, a teal band, text lines.
    const sx = AX - 6;
    const sy = groundAt(AX) - 11;
    for (let j = 0; j < 6; j++) {
      for (let i = 0; i < 7; i++) {
        const y = sy + j + Math.round(i / 2);
        plot(
          g,
          sx + i,
          y,
          j === 0 || j === 5 ? '3' : j === 1 ? '8' : (i + j) % 3 === 0 ? '2' : '4',
        );
      }
    }
  }
  return rows(g);
}

export const propRelocationFence = defineSprite({
  id: 'prop.relocation_fence',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'everglow',
  outline: 'none',
  frames: { v0: run(true), v1: run(false) },
});
