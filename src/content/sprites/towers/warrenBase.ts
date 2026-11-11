// The Skitterkin tower base (design/towers.md § Skitterkin towers: "they are not purchased; they
// are given", each one a *home*: a mound, a nest, a hollow log; §8: mounds, moss, woven grass,
// little lanterns). The warrens' gifts stand on a **footing of turned earth**: a low heap of warm
// soil on the Everglow base's footprint, canvas, anchor, and mount (so heads mount the same), its
// top lit, its faces stepping into shade, crumbs of soil and pebbles at its foot and green moss
// spilling over its rim. Where the other factions mark a tier with a chevron, a weld or a knot,
// the warrens hang **a glowworm lantern per tier** down the right face (warm gold, the faction's
// bioluminescence). Tiers change the silhouette like every faction's (tech-spec § Format rules):
// T2 (4+ px wider) and T3 (6+ px taller) are each tower's own kit (`WarrenKit`): the Den's side
// hillocks and lantern reed, the Choir's grass sheaves and seed-pod chime. A tier-4 spec keeps the
// three lanterns, lights a white status glint at the front corner, and swaps in the spec's kit.
// In the `skitterkin.ally` palette (coral, butter gold, teal accent: the alliance nod) plus the
// earth, moss and trimmings of `WARREN_LEGEND`.
import { disc, grid, hash01, isoBox, plot, rows, type CharGrid } from '../helpers.ts';
import { BASE_ANCHOR, BASE_H, BASE_W } from './base.ts';

/**
 * The warrens' own colours, outside the faction ramps: warm earth (`E` lit rim, `F` top, `J` the
 * left face, `K` the right face and shade, `L` the darkest crumbs), green moss (`G` lit, `H`, `I`
 * shade; the elders' moss stays green, art-direction § Portrait roster), white fur and steel shell
 * (`W`, `V`, `S`, `T`), a warm shimmer (`P`), and the specs' trimmings: red (`R`, `Q`, the
 * Champions' headband) and moonlight blue (`B`, `C`, the Lullaby's).
 */
export const WARREN_LEGEND = {
  E: 'skin.b.4',
  F: 'skin.b.3',
  J: 'skin.b.2',
  K: 'skin.b.1',
  L: 'skin.b.0',
  G: 'green.3',
  H: 'green.2',
  I: 'green.1',
  W: 'white.0',
  V: 'steel.4',
  S: 'steel.3',
  T: 'steel.2',
  P: 'pink.3',
  R: 'red.3',
  Q: 'red.2',
  B: 'blue.4',
  C: 'blue.3',
} as const;

/** The footing's height (px): its top face sits at the base's mount, a row under it. */
const HEIGHT = 4;

/** A tower's kit at a tier, drawn round the footing's anchor. */
export type WarrenKit = (g: CharGrid, cx: number, cy: number) => void;

/** Moss spilling over the footing's rim: clumps on the top face's edge and drips down the faces. */
function moss(g: CharGrid, cx: number, cy: number, seed: number): void {
  for (let x = Math.floor(cx - 11); x <= Math.ceil(cx + 11); x++) {
    // The top face's back rim: the row where the face meets the sky.
    const hw = 11 - Math.abs(x + 0.5 - cx);
    if (hw < 0) continue;
    const yTop = Math.round(cy - HEIGHT - hw / 2);
    const yFront = Math.round(cy - HEIGHT + hw / 2);
    const clump = hash01(x >> 1, 0, seed) < 0.45;
    if (clump) {
      plot(g, x, yTop, 'G');
      plot(g, x, yTop + 1, 'H');
    }
    // Over the front rim it spills: a drip of one or two rows down the face.
    if (hash01(x >> 1, 1, seed) < 0.35) {
      plot(g, x, yFront, 'H');
      plot(g, x, yFront + 1, x + 0.5 < cx ? 'H' : 'I');
      if (hash01(x, 2, seed) < 0.4) plot(g, x, yFront + 2, 'I');
    }
  }
}

/** The heap of earth every tier shares. */
function footing(seed: number): CharGrid {
  const g: CharGrid = grid(BASE_W, BASE_H);
  const { x: cx, y: cy } = BASE_ANCHOR;
  isoBox(g, cx, cy + 1, 12, 0, { top: '_', rim: '_', left: '_', right: '_' });
  isoBox(g, cx, cy, 11, HEIGHT, { top: 'F', rim: 'E', left: 'J', right: 'K' });
  // Soil, not a plinth: the top face is lumpy (darker crumbs), the faces streaked with roots.
  for (let y = 0; y < BASE_H; y++) {
    for (let x = 0; x < BASE_W; x++) {
      const c = g[y]?.[x];
      const h = hash01(x, y, seed);
      if (c === 'F' && h < 0.14) plot(g, x, y, 'J');
      else if (c === 'J' && h < 0.12) plot(g, x, y, 'K');
      else if (c === 'K' && h < 0.1) plot(g, x, y, 'L');
    }
  }
  moss(g, cx, cy, seed);
  // Pebbles and crumbs at its foot.
  plot(g, cx - 9, cy + 2, 'V');
  plot(g, cx - 8, cy + 2, 'T');
  plot(g, cx + 6, cy + 4, 'J');
  plot(g, cx + 7, cy + 4, 'K');
  plot(g, cx - 3, cy + 6, 'K');
  return g;
}

/**
 * The glowworm lanterns, one per tier, stepping down the right face (drawn over the kit, so a
 * hillock never hides one): a gold drop on a grass thread, so the tiers count in light.
 */
function lanterns(g: CharGrid, n: number): void {
  const { x: cx, y: cy } = BASE_ANCHOR;
  for (let t = 0; t < n; t++) {
    const x = cx + 3 + t * 3;
    const y = cy - 1 - Math.floor((t * 3) / 2);
    plot(g, x, y - 1, '6');
    plot(g, x, y, '*');
    plot(g, x, y + 1, '+');
  }
}

/** One base frame per tier (1–3): the footing plus the tower's kit for that tier. */
export function warrenBase(
  tier: 1 | 2 | 3,
  kits: { readonly t2: WarrenKit; readonly t3: WarrenKit },
  seed: number,
): string[] {
  const g = footing(seed);
  const { x: cx, y: cy } = BASE_ANCHOR;
  if (tier >= 2) kits.t2(g, cx, cy);
  if (tier === 3) kits.t3(g, cx, cy);
  lanterns(g, tier);
  return rows(g);
}

/**
 * A tier-4 spec base: the footing with three lanterns, a white status glint at the front corner,
 * and the spec's own kit (drawn by `kit` round the anchor) in place of T2's and T3's.
 */
export function warrenSpecBase(kit: WarrenKit, seed: number): string[] {
  const g = footing(seed);
  const { x: cx, y: cy } = BASE_ANCHOR;
  kit(g, cx, cy);
  lanterns(g, 3);
  plot(g, cx - 1, cy + 4, 'w');
  plot(g, cx, cy + 4, '*');
  return rows(g);
}

/**
 * A shaded earth dome (a hillock, a mound's room) centred on the pixel-edge point (cx, cy), lit
 * from the upper left, its cap mossed above `mossAt` (a share of its height, 0 for none).
 */
export function dome(
  g: CharGrid,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  mossAt = 0.55,
): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      const d = Math.hypot(dx, dy);
      if (d > 1 || dy > 0.9) continue;
      const lit = -0.6 * dx - 0.8 * dy;
      let ch = lit > 0.45 && d < 0.85 ? 'E' : lit > -0.15 ? 'F' : lit > -0.55 ? 'J' : 'K';
      if (mossAt > 0 && dy < -mossAt + (hash01(x, 7, 3) < 0.5 ? 0.12 : 0)) {
        ch = lit > 0.3 ? 'G' : lit > -0.3 ? 'H' : 'I';
      }
      plot(g, x, y, ch);
    }
  }
}

/** A dark round doorway (`w` wide, `h` tall, its sill at row `sill`), rimmed in packed earth. */
export function doorway(g: CharGrid, x0: number, sill: number, w: number, h: number): void {
  for (let y = sill - h + 1; y <= sill; y++) {
    const top = y === sill - h + 1;
    for (let x = x0; x < x0 + w; x++) {
      if (top && (x === x0 || x === x0 + w - 1)) continue;
      plot(g, x, y, 'k');
    }
  }
  // The packed lintel over it, lit on the left.
  for (let x = x0; x < x0 + w; x++) plot(g, x, sill - h, x < x0 + w / 2 ? 'E' : 'J');
}

/** A reed post from row `foot` up to row `top` at column x, with a gold lantern hung off its tip. */
export function reedLantern(g: CharGrid, x: number, foot: number, top: number): void {
  for (let y = top; y <= foot; y++) {
    plot(g, x, y, y % 3 === 0 ? '6' : '7');
    plot(g, x + 1, y, '6');
  }
  // A crook at the top and the lantern hanging from it: a glowing gold drop in a woven cage.
  plot(g, x + 2, top, '7');
  plot(g, x + 3, top + 1, '6');
  plot(g, x + 3, top + 2, '7');
  plot(g, x + 2, top + 3, '8');
  plot(g, x + 3, top + 3, '*');
  plot(g, x + 4, top + 3, '8');
  plot(g, x + 2, top + 4, '7');
  plot(g, x + 3, top + 4, '+');
  plot(g, x + 4, top + 4, '7');
  plot(g, x + 3, top + 5, '6');
}

/** A sheaf of woven grass standing on a corner: stalks bound with a teal band, seed heads lit. */
export function sheaf(g: CharGrid, x: number, foot: number, tall: number): void {
  for (let k = 0; k < tall; k++) {
    const y = foot - k;
    const spread = k > tall - 3 ? 2 : k < 2 ? 2 : 1;
    for (let dx = -spread; dx <= spread; dx++) {
      if ((dx + k) % 2 !== 0 && Math.abs(dx) === spread) continue;
      plot(g, x + dx, y, dx < 0 ? '8' : dx === 0 ? '7' : '6');
    }
  }
  plot(g, x - 1, foot - Math.floor(tall / 2), 'd');
  plot(g, x, foot - Math.floor(tall / 2), 'c');
  plot(g, x + 1, foot - Math.floor(tall / 2), 'b');
  plot(g, x - 2, foot - tall + 1, '9');
  plot(g, x + 2, foot - tall, '9');
  plot(g, x, foot - tall, '9');
}

/** A stick pennant: a pole from `foot` up to `top`, a two-row flag of `lit`/`shade` off its tip. */
export function pennant(
  g: CharGrid,
  x: number,
  foot: number,
  top: number,
  lit: string,
  shade: string,
  side: 1 | -1 = 1,
): void {
  for (let y = top; y <= foot; y++) plot(g, x, y, y === top ? '9' : 'K');
  for (let k = 1; k <= 4; k++) {
    plot(g, x + side * k, top + 1, k < 3 ? lit : shade);
    if (k < 4) plot(g, x + side * k, top + 2, k < 2 ? lit : shade);
  }
}

/** A gold glow disc (a lantern's or the hum's light): a white-gold heart in gold. */
export function glowDrop(g: CharGrid, cx: number, cy: number, r: number): void {
  disc(g, cx, cy, r, (d) => (d < r - 1.2 ? '*' : '+'));
}
