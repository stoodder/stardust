// The mouth of the Deep Halls (`prop.halls_mouth`; finale.md § FIN *Layout*, the codex's Deep Halls;
// art-direction §6): where the Long Walk ends, under the Spires. Render stands it on the apron just
// beyond the edge spawn nearest the map's `halls_mouth` marker (the Halls spawn, where the road runs
// off the north edge; groundTiles' `hallsMouthCell`), so the road runs into it and the Hollow come
// up out of it. A cliff of the Spires' dark rock with its face along the grid's x axis (the map's
// north edge), the lit face toward us; in it a tall arch, its voussoirs worn smooth, the dark of the
// Halls inside and, deep in that dark, a little warm gold light: the dead at rest. The Halls' natural
// seams run through the rock in **sung gold** (`stardust.sung`, art-direction §1 principle 6), on the
// palette's emissives so they glow in the night, a glint creeping along them (`glint`, 2 fps). Over
// the arch, the warrens' hum-glyph is cut in the rock and gilded; a fungus lantern (the waymarks'
// cap) burns on a post either side. The road's floor runs in under the arch.
import { defineSprite } from '../defineSprite.ts';
import { grid, hash01, plot, rows, type CharGrid } from '../helpers.ts';

const W = 64;
const H = 60;
const AX = 32;
const AY = 50;
/** Half the face's length along the edge (px across the screen), and the arch's half width. */
const HALF = 30;
const ARCH = 7;
const ARCH_H = 22;

/** The face's foot at screen column x: the edge line runs down-right, 1 px per 2. */
function footAt(x: number): number {
  return AY + Math.floor((x - AX) / 2);
}

/** The face's height above its foot at column x: a ragged crest, falling away at its ends. */
function heightAt(x: number): number {
  const u = Math.abs(x + 0.5 - AX) / HALF;
  const crest = 38 - 22 * u * u * u + Math.round(hash01(x >> 2, 1, 5) * 4);
  return Math.max(0, Math.round(crest));
}

/** True inside the arch's opening (column x, row y). */
function inArch(x: number, y: number): boolean {
  const u = (x + 0.5 - AX) / (ARCH + 0.5);
  if (Math.abs(u) > 1) return false;
  return y < footAt(x) && y >= footAt(x) - Math.round(ARCH_H * Math.sqrt(1 - u * u * 0.85));
}

/** The seams: three veins wandering across the face, as pixel runs (left to right). */
function seams(): (readonly [number, number])[][] {
  const out: (readonly [number, number])[][] = [];
  for (const [y0, seed] of [
    [-27, 3],
    [-12, 7],
  ] as const) {
    const run: (readonly [number, number])[] = [];
    let dy: number = y0;
    for (let x = 2; x < W - 2; x++) {
      const r = hash01(x, seed, 9);
      if (r < 0.25) dy -= 1;
      else if (r > 0.75) dy += 1;
      dy = Math.max(-heightAt(x) + 3, Math.min(-3, dy));
      const y = footAt(x) + dy;
      // Broken veins: the seam dives into the rock and surfaces again.
      const shows = hash01(x >> 1, seed, 4) < 0.6;
      if (shows && heightAt(x) > 8 && !inArch(x, y) && !inArch(x, y + 1) && !inArch(x, y - 1))
        run.push([x, y]);
    }
    out.push(run);
  }
  return out;
}

function mouth(glint: number): string[] {
  const g: CharGrid = grid(W, H);
  // The rock: the face from its foot up to its crest, lit near the crest, strata along the slope,
  // darkening toward the foot; the crest itself a lit rim.
  for (let x = AX - HALF; x < AX + HALF; x++) {
    const foot = footAt(x);
    const h = heightAt(x);
    for (let k = 0; k < h; k++) {
      const y = foot - 1 - k;
      if (y < 0) continue;
      let ch = k > h - 2 ? 'E' : k > h - 7 ? 'D' : k < 5 ? 'B' : 'C';
      if (k > 4 && k < h - 2 && (k + Math.floor(x / 5)) % 7 === 0) ch = 'B'; // strata
      if (hash01(x, y, 2) < 0.06) ch = ch === 'B' ? 'A' : 'B'; // pocks
      plot(g, x, y, ch);
    }
  }
  // The arch: worn voussoirs round its opening, the dark inside, the warm light far in.
  for (let y = 0; y < H; y++) {
    for (let x = AX - ARCH - 2; x <= AX + ARCH + 2; x++) {
      if (inArch(x, y)) {
        const deep = Math.abs(x + 0.5 - AX) < 3 && y > footAt(x) - 7;
        plot(g, x, y, deep ? 'Y' : 'Z');
      } else if (
        (inArch(x - 1, y) || inArch(x + 1, y) || inArch(x, y + 1)) &&
        (g[y]?.[x] ?? '.') !== '.'
      ) {
        plot(g, x, y, x < AX ? 'E' : 'D');
      }
    }
  }
  // Far in, the warm light of the Halls: the dead at rest.
  for (const [dx, dy, ch] of [
    [-1, -3, '+'],
    [0, -3, '*'],
    [0, -4, '+'],
    [1, -3, 'P'],
    [-1, -2, 'P'],
  ] as const) {
    plot(g, AX + dx, footAt(AX + dx) + dy, ch);
  }
  // The road's floor running in under the arch, and the floor's lip.
  for (let x = AX - ARCH; x <= AX + ARCH; x++) {
    const f = footAt(x);
    for (let y = f; y < f + 4 - Math.abs(x + 0.5 - AX) / 3; y++) plot(g, x, y, y === f ? 'R' : 'S');
  }
  // The seams, sung gold, a glint creeping along them.
  seams().forEach((run, i) =>
    run.forEach(([x, y], k) => {
      // Mostly the seam's dim gold, lit every few pixels (the emissives: a glow in the dark).
      const on = (k + i * 5) % 12 === glint * 4;
      plot(g, x, y, on ? '*' : (x + i) % 13 === 0 ? 'P' : k % 4 === 0 ? '+' : 'N');
    }),
  );
  // The hum-glyph over the arch, gilded: a singer's ring and two arcs.
  // prettier-ignore
  const hum = [
    '.g...g.',
    'g.....g',
    '...g...',
    '..g.g..',
    '...g...',
  ];
  const gy = footAt(AX) - ARCH_H - 8;
  hum.forEach((r, dy) =>
    [...r].forEach((ch, dx) => ch === 'g' && plot(g, AX - 3 + dx, gy + dy, 'N')),
  );
  // A fungus lantern on a post either side of the arch.
  for (const x of [AX - ARCH - 6, AX + ARCH + 5]) {
    const f = footAt(x) + 2;
    for (let y = f - 6; y <= f; y++) plot(g, x, y, y === f ? '_' : 'C');
    plot(g, x - 1, f - 8, '+');
    plot(g, x, f - 8, '*');
    plot(g, x + 1, f - 8, '+');
    plot(g, x, f - 9, '+');
    plot(g, x - 1, f - 7, 'L');
    plot(g, x + 1, f - 7, 'L');
  }
  // Its shadow along the foot.
  for (let x = AX - HALF; x < AX + HALF; x++) {
    const y = footAt(x);
    if ((g[y]?.[x] ?? '.') === '.') plot(g, x, y, '_');
  }
  return rows(g);
}

export const propHallsMouth = defineSprite({
  id: 'prop.halls_mouth',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  // The warrens' gold emissives (the seams, the lanterns, the light within); the rock is custom
  // legend, the Spires' dark, so it holds in every act and light.
  palette: 'skitterkin.ally',
  outline: 'none',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: {
    A: 'ink.1',
    B: 'ink.2',
    C: 'ink.3',
    D: 'ink.4',
    E: 'steel.0',
    L: 'brass.1',
    N: 'gold.2',
    P: 'pink.3',
    R: 'act3.path.3',
    S: 'act3.path.2',
    Y: 'ink.1',
    Z: 'ink.0',
  },
  frames: { v0: mouth(0), glint_1: mouth(1), glint_2: mouth(2) },
  anims: { glint: { frames: ['v0', 'glint_1', 'glint_2'], fps: 2 } },
});
