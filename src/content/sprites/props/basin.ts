// The Preserve's fenced basin (`prop.basin`; A2M5 decor, act2.md § A2M5, marker `basin`): what lies
// behind the Preserve gate, visible from the road and too quiet. A hollow sunk into the act's ground
// (env palette), ringed by Everglow's relocation fencing (steel posts and two wires), its gate on
// the side facing the road's end: two taller posts under a white Everglow plate with a teal band.
// Inside, nothing moves: two dug nests gone dark and empty, and a steel feed trough tipped on its
// side. About two tiles across, so it stands clear of the gate's core on the tile beside it.
import { defineSprite } from '../defineSprite.ts';
import { grid, hash01, line, plot, rows, type CharGrid } from '../helpers.ts';
import { ENV_VARIANTS } from '../tiles/tileGen.ts';

const W = 52;
const H = 34;
const CX = 26;
/** The anchor: the basin's center. */
const CY = 22;
const RX = 22;
const RY = 11;

/** The ellipse point at angle t (0 east, π/2 south: toward the viewer). */
function rimAt(t: number): readonly [number, number] {
  return [Math.round(CX + RX * Math.cos(t)), Math.round(CY + RY * Math.sin(t))];
}

/** The hollow: a lit rim of earth round a dim floor, darker toward its far wall. */
function hollow(g: CharGrid): void {
  for (let y = CY - RY; y <= CY + RY; y++) {
    for (let x = CX - RX; x <= CX + RX; x++) {
      const dx = (x + 0.5 - CX) / RX;
      const dy = (y + 0.5 - CY) / RY;
      const r = Math.hypot(dx, dy);
      if (r > 1) continue;
      const n = hash01(x, y, 31);
      let ch: string;
      if (r > 0.86)
        ch = dy < 0 ? 'c' : 'b'; // the rim: lit along the far side
      else if (dy < -0.35 && r > 0.62)
        ch = 'a'; // the far wall, in shadow
      else ch = n < 0.15 ? 'a' : n > 0.9 ? 'c' : 'b';
      plot(g, x, y, ch);
    }
  }
  // Two dug nests, empty: dark mouths with a lip of earth.
  for (const [nx, ny] of [
    [CX - 6, CY - 2],
    [CX + 8, CY + 3],
  ] as const) {
    line(g, nx - 2, ny - 1, nx + 2, ny - 1, 'c');
    line(g, nx - 2, ny, nx + 2, ny, 'K');
    line(g, nx - 1, ny + 1, nx + 1, ny + 1, 'K');
  }
  // A feed trough tipped on its side.
  line(g, CX + 1, CY + 6, CX + 6, CY + 8, 'S');
  line(g, CX + 1, CY + 7, CX + 6, CY + 9, 'T');
  plot(g, CX, CY + 7, 'T');
}

/** The fence round the rim: posts every few steps, two wires between, the gate left open. */
function fence(g: CharGrid, gate: number): void {
  const steps = 22;
  const posts: (readonly [number, number])[] = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    if (Math.abs(Math.atan2(Math.sin(t - gate), Math.cos(t - gate))) < 0.25) continue;
    posts.push(rimAt(t));
  }
  for (let i = 0; i < posts.length; i++) {
    const a = posts[i]!; // i < length
    const b = posts[(i + 1) % posts.length]!;
    if (Math.abs(a[0] - b[0]) > 9 || Math.abs(a[1] - b[1]) > 6) continue; // the gate's gap
    line(g, a[0], a[1] - 3, b[0], b[1] - 3, 'T');
    line(g, a[0], a[1] - 6, b[0], b[1] - 6, 'T');
  }
  for (const [x, y] of posts) {
    for (let k = 0; k <= 7; k++) plot(g, x, y - k, k === 7 ? 'V' : 'S');
  }
}

/** The gate: two taller posts at angle `gate`, under Everglow's white plate. */
function gatePosts(g: CharGrid, gate: number): void {
  const [gx, gy] = rimAt(gate);
  for (const [px, py] of [
    [gx - 3, gy + 2],
    [gx + 3, gy - 2],
  ] as const) {
    for (let k = 0; k <= 11; k++) plot(g, px, py - k, k === 11 ? 'V' : 'S');
  }
  for (let i = -3; i <= 3; i++) {
    const y = gy - 12 - Math.round(i / 1.5);
    plot(g, gx + i, y, 'W');
    plot(g, gx + i, y + 1, 'E');
    plot(g, gx + i, y - 1, 'W');
  }
}

function basinGrid(): string[] {
  const g = grid(W, H);
  // The gate faces the road's end, up and to the left on screen (the grid's −x).
  const gate = (-3 * Math.PI) / 4;
  hollow(g);
  fence(g, gate);
  gatePosts(g, gate);
  return rows(g);
}

export const propBasin = defineSprite({
  id: 'prop.basin',
  size: { w: W, h: H },
  anchor: { x: CX, y: CY },
  palette: 'act1',
  variants: ENV_VARIANTS,
  outline: 'none',
  legend: { K: 'ink.1', S: 'steel.2', T: 'steel.1', V: 'steel.3', W: 'white.0', E: 'teal.2' },
  frames: { v0: basinGrid() },
});
