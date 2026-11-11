// The lettuce-crate barricade (`prop.barricade`; A3M6 decor, act3.md § A3M6: "the old road beyond
// is barricaded with lettuce crates"): Dome Row's crop crates, the same slatted brass wood as the
// militia's cover (`ally.militia`), stacked two high across the old road past the gate, so every
// refugee who reaches the gate turns in. Heads of butterhead peek out of the top crates, one has
// rolled off into the dirt, and a hand-painted board leans on the stack: an arrow pointing back
// toward the dome, IN. Frames `x` and `y`: the stack runs along each grid axis (render picks the
// one across the road). Everglow-owned (custom legend): it keeps its colours in every act.
import { defineSprite } from '../defineSprite.ts';
import { textPixels } from '../font3x5.ts';
import { grid, isoBox, mirrorRows, plot, rows, stamp, type CharGrid } from '../helpers.ts';

const W = 36;
const H = 26;
const AX = 18;
const AY = 18;

/** One lettuce crate: slats lit on top and the left face, gaps between them, a head peeking. */
function crate(g: CharGrid, cx: number, cy: number, lettuce: boolean): void {
  isoBox(g, cx, cy, 5, 5, { top: 'D', rim: 'E', left: 'C', right: 'B' });
  // Slat gaps across both faces.
  for (let x = Math.round(cx - 5); x < Math.round(cx + 5); x++) {
    const foot = Math.round(cy + 2.5 - Math.abs(x + 0.5 - cx) / 2);
    plot(g, x, foot - 2, 'A');
  }
  if (lettuce) stamp(g, Math.round(cx) - 2, Math.round(cy) - 9, ['.LM.', 'LMLN']);
}

/** The stack along `axis`: built along x, mirrored for y; the board stays readable either way. */
function barricade(axis: 'x' | 'y'): string[] {
  let g: CharGrid = grid(W, H);
  // The stack's shadow along the road's cross line.
  for (let x = 2; x < W - 2; x++) plot(g, x, AY - 5 + Math.round((x - 2) / 2) + 2, '_');
  // The bottom row along the grid's x axis (down to the right), then two on top.
  for (const [cx, cy] of [
    [8, 13],
    [16, 17],
    [24, 21],
  ] as const) {
    crate(g, cx, cy, false);
  }
  crate(g, 12, 10, true);
  crate(g, 20, 14, true);
  // A head that rolled off into the dirt.
  stamp(g, 29, 20, ['.LM', 'LMN']);
  if (axis === 'y') g = mirrorRows(rows(g)).map((r) => r.split(''));
  // The board leaning on the front: weathered white, a coral arrow back toward the dome, IN.
  const bx = axis === 'x' ? 2 : W - 10;
  for (let y = 12; y <= 23; y++) {
    for (let x = bx; x <= bx + 8; x++) plot(g, x, y, x === bx || y === 12 ? 'W' : 'V');
  }
  stamp(g, bx + 2, 14, axis === 'x' ? ['.S...', 'SSSSS', '.S...'] : ['...S.', 'SSSSS', '...S.']);
  for (const p of textPixels('IN', bx + 1, 18)) plot(g, p.x, p.y, 'S');
  return rows(g);
}

export const propBarricade = defineSprite({
  id: 'prop.barricade',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'everglow',
  outline: 'auto',
  legend: {
    A: 'brass.0',
    B: 'brass.1',
    C: 'brass.2',
    D: 'brass.3',
    E: 'brass.4',
    L: 'green.4',
    M: 'green.3',
    N: 'green.2',
    W: 'white.0',
    V: 'steel.3',
    S: 'coral.2',
  },
  frames: { x: barricade('x'), y: barricade('y') },
});
