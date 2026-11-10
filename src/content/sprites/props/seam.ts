// A natural stardust seam (`prop.seam`; A2M4 decor, act2.md § A2M4, markers `seam_west`/`_east`):
// a crag of the north cliff, in the act's clay (env palette), shot through with veins of stardust
// as the land made it: warm gold, flushed pink where it runs thick (sung: art-direction §1
// principle 6, "warm gold means remembered"), the one warm glow in the plant, above the road the
// Hollow walks. The rock sits in the environment band; the veins are thin, so the crag reads as
// scenery with a light in it, never as an actor. Frames `v0`, `v1` (anim `glint`, 2 fps: a glint
// moves along the veins).
import { defineSprite } from '../defineSprite.ts';
import { grid, hash01, isoBox, line, plot, rows, type CharGrid } from '../helpers.ts';
import { ENV_VARIANTS } from '../tiles/tileGen.ts';

const W = 30;
const H = 26;
const CX = 15;
/** The footprint center (the anchor). */
const FOOT_Y = 20;

/** The crag's top edge at column x: three jagged peaks, the tallest left of center. */
function topAt(x: number): number {
  const peaks: readonly (readonly [number, number, number])[] = [
    [8, 3, 5], // (center x, top y, half-width)
    [16, 6, 6],
    [23, 9, 5],
  ];
  let top = FOOT_Y;
  for (const [px, py, hw] of peaks) {
    const d = Math.abs(x + 0.5 - px);
    if (d <= hw) top = Math.min(top, Math.round(py + d * 1.4 + (hash01(x, 0, 21) < 0.3 ? 1 : 0)));
  }
  return top;
}

/** The crag: lit on its left faces, shaded right, a lit lip along the top, strata and cracks. */
function crag(g: CharGrid): void {
  for (let x = 2; x < W - 2; x++) {
    const top = topAt(x);
    // The base: the footprint's near edge (a shallow V, the crag's foot on the ground).
    const foot = FOOT_Y + 3 - Math.round(Math.abs(x + 0.5 - CX) / 2.5);
    for (let y = top; y <= foot; y++) {
      const slopeLeft = topAt(x - 1) > top || topAt(x + 1) < top;
      let ch = slopeLeft ? 'c' : 'b';
      if (x > 20) ch = 'b';
      if (y === top) ch = 'd';
      else if (y >= foot - 1) ch = 'a';
      else if ((y + Math.floor(x / 3)) % 5 === 0) ch = 'a'; // strata
      plot(g, x, y, ch);
    }
  }
}

/** The veins: thin runs of gold across the faces, pink where they meet, glints at `k`. */
function veins(g: CharGrid, k: number): void {
  const runs: readonly (readonly [number, number, number, number])[] = [
    [5, 12, 11, 8],
    [11, 8, 14, 13],
    [14, 13, 21, 15],
    [17, 10, 24, 13],
    [7, 16, 12, 14],
  ];
  for (const [x0, y0, x1, y1] of runs) line(g, x0, y0, x1, y1, 'G');
  for (const [x, y] of [
    [11, 8],
    [14, 13],
    [12, 14],
  ] as const)
    plot(g, x, y, 'P');
  // Glints: the bright step along the veins, moving between frames.
  const glints =
    k === 0
      ? [
          [8, 10],
          [18, 14],
          [21, 12],
        ]
      : [
          [13, 11],
          [6, 12],
          [23, 13],
        ];
  for (const [x, y] of glints) plot(g, x ?? 0, y ?? 0, 'H');
}

function seamGrid(k: number): string[] {
  const g = grid(W, H);
  isoBox(g, CX, FOOT_Y + 1, 13, 0, { top: '_', rim: '_', left: '_', right: '_' });
  crag(g);
  veins(g, k);
  return rows(g);
}

export const propSeam = defineSprite({
  id: 'prop.seam',
  size: { w: W, h: H },
  anchor: { x: CX, y: FOOT_Y },
  palette: 'act1',
  variants: ENV_VARIANTS,
  outline: 'auto',
  legend: { G: 'gold.3', H: 'gold.4', P: 'pink.3' },
  frames: { v0: seamGrid(0), v1: seamGrid(1) },
  anims: { glint: { frames: ['v0', 'v1'], fps: 2 } },
});
