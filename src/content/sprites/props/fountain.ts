// The plaza fountain (A1M4 decor, act1.md § A1M4: the U-shaped road runs around it; A3M2 revisits
// it dark): a round Everglow basin of white stone, bright blue water, and a steel pedestal crowned
// with the gold Evie sun, spraying from a little bowl. A landmark, so it's the widest Act I decor.
// Frames `f0`–`f2` step the spray and the ripples (anim `flow`); `night_0`–`night_2` (anim `night`)
// are the same at night, for A3M2.
import { defineSprite } from '../defineSprite.ts';
import { disc, grid, line, plot, recolor, rows, stamp } from '../helpers.ts';

const W = 34;
const H = 30;
const AX = 17;
const AY = 22;
const CX = 17;
const CY = 21; // the basin's center on the ground
const RX = 15;
const RY = 7.5;
const WALL = 3;

function ellipse(x: number, y: number, cy: number, rx: number, ry: number): number {
  return Math.hypot((x + 0.5 - CX) / rx, (y + 0.5 - cy) / ry);
}

function fountain(step: 0 | 1 | 2): string[] {
  const g = grid(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      // Its shadow, then the basin wall's front face (lit left, shaded right).
      if (ellipse(x, y, CY + 1, RX + 1, RY + 1) <= 1) plot(g, x, y, '_');
      for (let t = 0; t <= WALL; t++) {
        if (ellipse(x, y + t, CY - WALL, RX, RY) <= 1 && y + 0.5 > CY - WALL) {
          plot(g, x, y, x + 0.5 < CX - 3 ? '3' : x + 0.5 < CX + 5 ? '2' : '1');
        }
      }
      // The rim and the water inside it.
      const e = ellipse(x, y, CY - WALL, RX, RY);
      if (e <= 1) {
        const w = ellipse(x, y, CY - WALL, RX - 2.5, RY - 1.5);
        if (w > 1) plot(g, x, y, y + 0.5 < CY - WALL ? 'w' : '4');
        else {
          const ring = Math.floor(w * 4 + step) % 3 === 0;
          plot(g, x, y, ring ? 'C' : w < 0.5 ? 'D' : 'B');
        }
      }
    }
  }
  // The pedestal and its bowl, crowned with the gold Evie sun.
  for (let y = 9; y <= CY - WALL; y++) {
    plot(g, CX - 1, y, '3');
    plot(g, CX, y, '2');
    plot(g, CX + 1, y, '1');
  }
  line(g, CX - 4, 9, CX + 4, 9, '4');
  line(g, CX - 3, 10, CX + 3, 10, '2');
  disc(g, CX + 0.5, 5.5, 2.5, (d) => (d > 1.8 ? 'G' : 'H'));
  // The spray: arcs of droplets from the bowl's lip down into the basin, stepping outward.
  const arcs: readonly (readonly [number, number])[] = [
    [-1, 0],
    [1, 0],
  ];
  for (const [dir] of arcs) {
    for (let i = 0; i < 6; i++) {
      const t = (i + step / 3) / 6;
      const x = Math.round(CX + dir * (4 + t * 7));
      const y = Math.round(9 - 3 * Math.sin(t * Math.PI) + t * 6);
      plot(g, x, y, i % 2 === 0 ? 'w' : 'C');
    }
  }
  // Splashes where the spray lands.
  stamp(g, CX - 12 + step, CY - WALL - 1, ['w.w']);
  stamp(g, CX + 9 - step, CY - WALL - 1, ['w.w']);
  return rows(g);
}

/**
 * The fountain at night (A3M2, T640c): still running, under the moons. Its stone two steps down,
 * the water deep blue with its ripples a step lit, the Evie sun unlit brass.
 */
function night(step: 0 | 1 | 2): string[] {
  // prettier-ignore
  return recolor(fountain(step), {
    B: 'E', D: 'I', C: 'D', G: 'K', H: 'L', w: '3', '4': '2', '3': '2', '2': '1', '1': '0',
  });
}

export const propFountain = defineSprite({
  id: 'prop.fountain',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'everglow',
  variants: ['everglow.worn'],
  outline: 'auto',
  legend: {
    B: 'blue.3',
    C: 'blue.4',
    D: 'blue.2',
    G: 'gold.3',
    H: 'gold.4',
    E: 'blue.1',
    I: 'blue.0',
    K: 'brass.1',
    L: 'brass.2',
  },
  frames: {
    f0: fountain(0),
    f1: fountain(1),
    f2: fountain(2),
    night_0: night(0),
    night_1: night(1),
    night_2: night(2),
  },
  anims: {
    flow: { frames: ['f0', 'f1', 'f2'], fps: 4 },
    night: { frames: ['night_0', 'night_1', 'night_2'], fps: 4 },
  },
});
