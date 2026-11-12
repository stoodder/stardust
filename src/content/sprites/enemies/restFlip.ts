// Laid to rest (art-direction §1 principle 6, §7 *Laid to rest*; design/maps.md § 5.5): the one
// place Hollow pixels ever turn warm. A Hollow body built in the `hollow` legend (`0`–`3` the
// drained greys, `w` the pale features, `k` the dark, `K` the `ink.0` contour, `V`/`U` unsung
// violet, `+`/`*` acid eyes) is re-pointed to custom characters (`greyed`; its acid eyes close to
// grey, so no acid reaches a warm palette), ringed by hand with its pale (inverted) outline
// (`ringed`), and then flipped to `stardust.sung` gold **from the outline in** (`warmed`, by each
// pixel's depth from the edge), so a sprite that declares these legends can show the grey body,
// every step of the flip, and the gold body in one palette. The gold maps the Hollow's dark heart
// to the brightest white (the hollow filled with light), its greys to the gold ramp (only its
// rim-lit step on an emissive slot, `e1`, so a palette whose emissives are gold, `skitterkin`,
// bakes a glow round its edge and no more), its pale faces to warm pink, its contour to `pink.3`,
// and its outline to `gold.1`, the dark rim any warm actor wears. Thrum's echo (`fx.echo`) and the
// Unsung's rest (`enemy.unsung_rest`) are built with it.
import { at, fromRows, rows } from '../helpers.ts';
import type { ColorName } from '../../palettes/master.ts';
import type { CustomChar } from '../types.ts';

/** The Hollow legend's characters, each re-pointed to its custom grey. */
const GREY_OF: Readonly<Record<string, string>> = {
  '0': 'A',
  '1': 'B',
  '2': 'C',
  '3': 'D',
  '4': 'E',
  w: 'E',
  k: 'A',
  K: 'K',
  V: 'V',
  U: 'U',
  // Its acid eyes close: nothing hungers once it is being laid to rest.
  '+': 'D',
  '*': 'D',
};

/** The drained greys (the `hollow` palette's own colours, kept by custom legend). */
export const REST_GREY_LEGEND = {
  A: 'hollow.0',
  B: 'hollow.1',
  C: 'hollow.2',
  D: 'hollow.3',
  E: 'hollow.4',
  R: 'hollow.4',
  K: 'ink.0',
  V: 'violet.3',
  U: 'violet.4',
} as const satisfies Partial<Record<CustomChar, ColorName>>;

/** Each grey re-pointed to its gold (`+` and `*` are the palette's `e0`/`e1`: gold, glowing). */
export const GOLD_OF: Readonly<Record<string, string>> = {
  A: 'W',
  B: 'G',
  C: 'L',
  D: '*',
  E: 'I',
  R: 'F',
  K: 'H',
  V: 'W',
  U: 'W',
};

/** The sung gold's custom colours (the rest come from a gold-emissive palette's `e0`/`e1`). */
export const REST_GOLD_LEGEND = {
  W: 'white.1',
  G: 'gold.2',
  L: 'gold.3',
  F: 'gold.1',
  H: 'pink.3',
  I: 'pink.4',
} as const satisfies Partial<Record<CustomChar, ColorName>>;

/** Both legends: a sprite declaring this can show every step from grey to gold. */
export const REST_LEGEND = { ...REST_GREY_LEGEND, ...REST_GOLD_LEGEND } as const;

/** `src` (a Hollow body in the `hollow` legend) in the custom greys. */
export function greyed(src: readonly string[]): string[] {
  return src.map((r) => r.replace(/[^.]/g, (c) => GREY_OF[c] ?? c));
}

/** `src` padded by 1 px on every side and ringed 4-adjacently with the pale outline (`R`). */
export function ringed(src: readonly string[]): string[] {
  const w = (src[0]?.length ?? 0) + 2;
  const pad = '.'.repeat(w);
  const g = fromRows([pad, ...src.map((r) => `.${r}.`), pad]);
  const ring: [number, number][] = [];
  for (let y = 0; y < g.length; y++) {
    for (let x = 0; x < w; x++) {
      if (at(g, x, y) !== '.') continue;
      const touches =
        at(g, x - 1, y) !== '.' ||
        at(g, x + 1, y) !== '.' ||
        at(g, x, y - 1) !== '.' ||
        at(g, x, y + 1) !== '.';
      if (touches) ring.push([x, y]);
    }
  }
  for (const [x, y] of ring) g[y]![x] = 'R'; // in the grid by construction
  return rows(g);
}

/** Each opaque pixel's depth: 0 on the edge (4-adjacent to clear or the canvas edge), +1 inward. */
export function depths(src: readonly string[]): number[][] {
  const h = src.length;
  const w = src[0]?.length ?? 0;
  const d: number[][] = Array.from({ length: h }, () => Array<number>(w).fill(-1));
  let frontier: [number, number][] = [];
  const clear = (x: number, y: number): boolean => (src[y]?.[x] ?? '.') === '.';
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (clear(x, y)) continue;
      if (clear(x - 1, y) || clear(x + 1, y) || clear(x, y - 1) || clear(x, y + 1)) {
        d[y]![x] = 0; // y < h, x < w
        frontier.push([x, y]);
      }
    }
  }
  for (let k = 1; frontier.length > 0; k++) {
    const next: [number, number][] = [];
    for (const [x, y] of frontier) {
      for (const [nx, ny] of [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ] as const) {
        const row = d[ny];
        if (clear(nx, ny) || row === undefined || row[nx] !== -1) continue;
        row[nx] = k;
        next.push([nx, ny]);
      }
    }
    frontier = next;
  }
  return d;
}

/**
 * `src` (greyed and ringed) with every pixel at most `depth` from the edge turned gold: the flip
 * from the outline in. `Infinity` turns all of it.
 */
export function warmed(src: readonly string[], depth: number): string[] {
  const d = depths(src);
  return src.map((r, y) =>
    r.replace(/[^.]/g, (c, x: number) => ((d[y]?.[x] ?? 0) <= depth ? (GOLD_OF[c] ?? c) : c)),
  );
}
