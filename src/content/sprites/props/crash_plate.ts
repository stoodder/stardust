// The crash site's plates (`prop.crash_plate`; A3M5, act3.md § A3M5: "When Shareholder Value
// jettisons its plating (phase 3), the plates land on four predefined decor tiles as new wreckage";
// the `crash_1..4` markers, opened by the sim's `openTile`, drawn by T730b where TakeoverView now
// draws a flat slab). Each is a piece of the boss's armour, white Everglow plate worn to steel, bent
// and dug in askew in a scorched gouge it ploughed on landing, a wisp of smoke off it. They aren't
// salvage, so no stake: they read as the boss's shed shell, not a job. Four frames, one per plate:
// - `v0` a flank plate, dented, its teal band and bolts;
// - `v1` a curved shoulder plate rolled on its back;
// - `v2` a section of the orange hazard skirt, stripes and all;
// - `v3` the bridge's screen plate, its glass cracked across the stock chart (Evie's pink and gold,
//   the REC lamp dead).
// Everglow-owned, with its scorch and smoke in its own legend.
import { defineSprite } from '../defineSprite.ts';
import { diamond, grid, hash01, line, plot, rows, type CharGrid } from '../helpers.ts';

const W = 32;
const H = 26;
/** The top vertex of the tile's footprint diamond (the diamond fills the bottom 16 rows). */
const TOP = H - 16;

/** The gouge the plate ploughed: a scorched oval along the grid's x axis, ragged at its rim. */
function gouge(g: CharGrid, seed: number): void {
  for (let y = TOP; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const n = hash01(x, y, seed);
      const d = diamond(x, y - TOP) + (n - 0.5) * 1.4;
      if (d > 6.6) continue;
      plot(g, x, y, d < 3.4 ? 'K' : d < 5.2 ? (n < 0.5 ? 'K' : 'J') : n < 0.5 ? 'J' : '_');
    }
  }
}

/** A plate: a slab tilted into the ground, its corners given, filled lit-to-shade. */
function slab(
  g: CharGrid,
  pts: readonly (readonly [number, number])[],
  fill: (x: number, y: number) => string,
): void {
  const ys = pts.map((p) => p[1]);
  for (let y = Math.min(...ys); y <= Math.max(...ys); y++) {
    for (let x = 0; x < W; x++) {
      // Point-in-polygon (even-odd) at the pixel centre.
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i]!; // i < length
        const [xj, yj] = pts[j]!;
        const px = x + 0.5;
        const py = y + 0.5;
        if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) plot(g, x, y, fill(x, y));
    }
  }
}

function plate(v: 0 | 1 | 2 | 3): string[] {
  const g: CharGrid = grid(W, H);
  gouge(g, v + 11);
  if (v === 0) {
    // A flank plate dug in on its edge: white worn to steel, the teal band, four bolts, a dent.
    slab(
      g,
      [
        [6, TOP + 2],
        [22, TOP - 6],
        [27, TOP + 3],
        [11, TOP + 11],
      ],
      (x, y) => (x + y < 20 + TOP ? '4' : (x * 2 + y) % 13 === 0 ? '2' : '3'),
    );
    line(g, 8, TOP + 3, 23, TOP - 4, '8');
    line(g, 9, TOP + 4, 24, TOP - 3, '7');
    for (const [x, y] of [
      [12, TOP + 4],
      [20, TOP],
      [15, TOP + 7],
      [23, TOP + 3],
    ] as const) {
      plot(g, x, y, '1');
    }
    plot(g, 17, TOP + 4, '2');
    plot(g, 18, TOP + 4, '1');
  } else if (v === 1) {
    // A shoulder plate rolled on its back: a curved shell, lit along its rim, its inner face dark.
    for (let x = 6; x <= 26; x++) {
      const t = (x - 6) / 20;
      const top = Math.round(TOP + 2 - Math.sin(t * Math.PI) * 7 + t * 4);
      for (let y = top; y <= top + 5; y++) plot(g, x, y, y === top ? '4' : y < top + 3 ? '2' : '1');
    }
    line(g, 8, TOP + 5, 25, TOP + 8, '0');
    line(g, 10, TOP + 1, 14, TOP - 2, '7');
  } else if (v === 2) {
    // A section of the hazard skirt, orange and ink stripes, its torn mounting lip steel.
    slab(
      g,
      [
        [5, TOP + 1],
        [20, TOP - 5],
        [27, TOP + 1],
        [12, TOP + 8],
      ],
      (x, y) => (Math.floor((x + y * 2) / 3) % 2 === 0 ? 'c' : 'k'),
    );
    line(g, 5, TOP + 1, 20, TOP - 5, '3');
    line(g, 6, TOP + 2, 20, TOP - 4, '2');
    plot(g, 13, TOP - 2, '1');
  } else {
    // The bridge's screen plate: a steel frame round the cracked glass, the chart still rising.
    slab(
      g,
      [
        [7, TOP],
        [21, TOP - 6],
        [26, TOP + 1],
        [12, TOP + 8],
      ],
      () => '2',
    );
    slab(
      g,
      [
        [9, TOP],
        [21, TOP - 4],
        [24, TOP + 1],
        [12, TOP + 6],
      ],
      () => 'K',
    );
    for (const [x, h, c] of [
      [13, 1, 'P'],
      [15, 2, 'Y'],
      [17, 2, 'P'],
      [19, 3, 'Y'],
      [21, 4, 'P'],
    ] as const) {
      const base = TOP + 3 - Math.round((x - 12) / 2.5);
      for (let y = base - h + 1; y <= base; y++) plot(g, x, y, c);
    }
    // The crack across the glass, and the dead REC lamp.
    line(g, 11, TOP + 1, 17, TOP + 3, 'W');
    line(g, 17, TOP + 3, 22, TOP - 1, 'W');
    plot(g, 22, TOP - 3, 'Q');
  }
  // A wisp of smoke off it.
  for (const [x, y] of [
    [18, 3],
    [19, 2],
    [18, 1],
    [17, 0],
  ] as const) {
    if ((x + y + v) % 2 === 0) plot(g, x, y + (v % 2), 'M');
  }
  return rows(g);
}

export const propCrashPlate = defineSprite({
  id: 'prop.crash_plate',
  size: { w: W, h: H },
  // The tile's centre (where TakeoverView centres a plate).
  anchor: { x: 16, y: TOP + 8 },
  palette: 'everglow.worn',
  outline: 'auto',
  legend: {
    K: 'ink.1',
    J: 'grime.1',
    M: 'steel.1',
    W: 'white.0',
    P: 'pink.3',
    Y: 'gold.3',
    Q: 'red.0',
  },
  frames: { v0: plate(0), v1: plate(1), v2: plate(2), v3: plate(3) },
});
