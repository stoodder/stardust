// Bramble's portrait (`portrait.chitterbloom`, the `chitterbloom` speaker; story/characters.md §
// Bramble, story/races.md § Skitterkin, art-direction § Portrait roster): the Terraces warren's
// matriarch, Act I's "Matriarch Chitterbloom", back in A3M1 as an ally. She is far too big for the
// frame, so it is cropped close: a wall of curly coral fur running off three edges, the butter belly
// at the bottom, the mossy wreath of pink blossoms (gold hearts glowing) across her crown that
// A1M5's boss wore, heavy dark brows over big eyes, blushing cheeks, and one of her young peeking
// over her shoulder (the little one that rode her back in A1M5). Her shimmer is a grown-up's:
// brighter and denser than Pebble's. In the `skitterkin.ally` palette, with the wreath's moss kept
// green (custom legend), as the player remembers it.
//
// She is formidable and dryly unimpressed ("You chased me off my own road. Now help me walk it."),
// so her `neutral` is half-lidded under level heavy brows, the mouth a flat line. `happy` is
// grudging (eyes eased shut, a small curve of a smile); `worried` lifts the brows and opens the
// eyes wide (her little one ducks into her fur); `angry` drops the brows to a V and bristles her
// crown; `sad` lifts the inner brows, lowers the lids, and lets one tear fall.
import { disc, grid, hash01, plot, stamp, type CharGrid } from '../helpers.ts';
import { definePortrait, outlineInPlace, PORTRAIT_SIZE, type PaintArgs } from './portrait.ts';

const S = PORTRAIT_SIZE;
/** The body's center and radii: wider and taller than the frame, so it runs off three edges. */
const CX = 24;
const CY = 34;
const RX = 29;
const RY = 26;
/** The eyes' centers (pixel-edge coordinates). */
const EYE_L = 16.5;
const EYE_R = 31.5;
const EYE_Y = 24.5;
/** The mouth stamp's top-left. */
const MOUTH_X = 19;
const MOUTH_Y = 31;

/** Bramble's expressions: the five base ones. */
export const BRAMBLE_EXPRESSIONS = ['neutral', 'happy', 'worried', 'angry', 'sad'] as const;

/** The rows of her brows' band and her face (eyes, blush, mouth), for tests. */
export const BRAMBLE_FACE = { x0: 9, y0: 17, x1: 38, y1: 36 } as const;

function inBody(x: number, y: number): boolean {
  const dx = (x + 0.5 - CX) / RX;
  const dy = (y + 0.5 - CY) / RY;
  return dx * dx + dy * dy <= 1;
}

/** The top of her fur at column `x` (where the wreath sits). */
function crownY(x: number): number {
  const dx = (x + 0.5 - CX) / RX;
  return Math.ceil(CY - RY * Math.sqrt(Math.max(0, 1 - dx * dx)));
}

/** The great fuzzy body: lit from the upper left, tufted at the rim, curled all over. */
function body(g: CharGrid, bristle: boolean): void {
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = (x + 0.5 - CX) / RX;
      const dy = (y + 0.5 - CY) / RY;
      const d = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx);
      // Fur: clumps poke past the rim (spikier when she bristles).
      const clump = Math.max(0, Math.sin(a * (bristle ? 34 : 26))) * (bristle ? 0.09 : 0.05);
      if (d > 1 + clump) continue;
      const lit = -0.6 * dx - 0.8 * dy;
      let ch = '3';
      if (lit > 0.4 && d < 0.9 && d > 0.45) ch = '4';
      else if (lit < -0.3 && d > 0.6) ch = d > 0.9 ? '1' : '2';
      if (ch === '3' && lit > 0.28 && d > 0.45 && (x + y) % 2 === 0) ch = '4';
      plot(g, x, y, ch);
    }
  }
  // Curls: a dark stroke under a lit one, staggered across the coat (clear of the face).
  for (let gy = 0; gy < 9; gy++) {
    for (let gx = 0; gx < 9; gx++) {
      const x = 2 + gx * 6 + (gy % 2) * 3;
      const y = 10 + gy * 5;
      if (hash01(gx, gy, 11) < 0.45) continue;
      if (x > BRAMBLE_FACE.x0 && x < BRAMBLE_FACE.x1 && y > 15 && y < 38) continue;
      const here = g[y]?.[x];
      if (here !== '3' && here !== '4' && here !== '2') continue;
      const dark = here === '4' ? '3' : here === '3' ? '2' : '1';
      plot(g, x - 1, y, dark);
      plot(g, x, y + 1, dark);
      plot(g, x + 1, y + 1, dark);
      plot(g, x + 2, y, dark);
    }
  }
  // The butter belly at the bottom, its top edge fuzzy.
  for (let y = 38; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const bx = (x + 0.5 - CX) / 13;
      const by = (y + 0.5 - 52) / 13;
      const bd = Math.hypot(bx, by);
      if (bd > 1 || (bd > 0.9 && (x + y) % 2 === 0)) continue;
      plot(g, x, y, bd > 0.85 ? '7' : bx + by < -0.5 ? '9' : '8');
    }
  }
  // Gold flank spots, her huddle (the spots A1M5's phase 3 lit).
  for (const [x, y] of [
    [3, 34],
    [5, 38],
    [2, 41],
    [44, 35],
    [42, 39],
    [45, 42],
  ] as const)
    plot(g, x, y, '+');
}

/** Her shimmer: a grown-up's, dense pink-gold sparkles over her crown and shoulders. */
function shimmer(g: CharGrid): void {
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (!inBody(x, y)) continue;
      const dx = (x + 0.5 - CX) / RX;
      const dy = (y + 0.5 - CY) / RY;
      const d = Math.hypot(dx, dy);
      // A band over her crown and down her shoulders, clear of the face.
      if (d < 0.8 || dy > -0.1) continue;
      const h = (x * 13 + y * 29) % 19;
      if (h === 0) plot(g, x, y, '*');
      else if (h === 6) plot(g, x, y, 'P');
      else if (h === 12) plot(g, x, y, '+');
    }
  }
}

/** A blossom: pink petals round a glowing gold heart. */
const BLOSSOM = ['.QP.', 'QP+P', 'P+PP', '.PP.'] as const;
const BIG_BLOSSOM = ['..QP..', '.QPPP.', 'QPP*PP', 'PP*+PP', '.PPPP.', '..PP..'] as const;

/** The wreath: moss and leaves arched over her crown, set with blossoms. */
function wreath(g: CharGrid, bristle: boolean): void {
  for (let x = 6; x <= 41; x++) {
    const top = crownY(x) - (bristle ? 1 : 0);
    const k = hash01(x, 3, 9);
    plot(g, x, top, k < 0.35 ? 'I' : 'H');
    plot(g, x, top + 1, k < 0.5 ? 'H' : 'G');
    plot(g, x, top + 2, k < 0.3 ? 'G' : k < 0.6 ? 'F' : '2');
    // Leaves stand up out of the moss here and there.
    if (k > 0.78) plot(g, x, top - 1, 'H');
  }
  const t = (x: number): number => crownY(x) - (bristle ? 1 : 0);
  stamp(g, 9, t(10) - 3, BLOSSOM);
  stamp(g, 35, t(36) - 3, BLOSSOM);
  stamp(g, 15, t(16) - 3, ['.QP', 'P+P', '.P.']);
  stamp(g, 30, t(31) - 3, ['PQ.', 'P+P', '.P.']);
  stamp(g, 21, t(24) - 4, BIG_BLOSSOM);
}

/** One of her young, peeking over her right shoulder (screen left) out of her fur. */
// prettier-ignore
const YOUNG = [
  '....x4x....',
  '...x434x...',
  '.xx44444xx.',
  'x444444444x',
  'x44wk4wk44x',
  'x43kk3kk34x',
  'x3P33333P3x',
  '.x3333333x.',
  '..xxxxxxx..',
] as const;
// Ducked: only its tuft and the top of its head show over her fur.
// prettier-ignore
const YOUNG_DUCKED = [
  '....x4x....',
  '...x434x...',
  '.xx44444xx.',
  'xxxxxxxxxxx',
] as const;

/** A big eye: dark, a deeper shine low down, a glint. `look` shifts the glint (and pupil). */
function eye(g: CharGrid, cx: number, cy: number, wide: boolean): void {
  disc(g, cx, cy, wide ? 4.2 : 3.8, (d, x, y) => {
    if (d > (wide ? 3.5 : 3.1)) return 'x';
    if (y + 0.5 > cy + 1.6) return 'J';
    return 'k';
  });
  stamp(g, Math.floor(cx) - 2, Math.floor(cy) - 2, ['ww', 'w.']);
  plot(g, Math.floor(cx) + 1, Math.floor(cy) + 1, 'w');
}

/** Lowers a lid of fur over the top `rows` of an eye; `slant` tilts it toward the nose (+1). */
function lid(g: CharGrid, cx: number, cy: number, rows: number, slant: number, inner: 1 | -1): void {
  const top = Math.floor(cy - 4);
  for (let y = top; y < top + rows + 2; y++) {
    for (let x = Math.floor(cx - 4); x <= Math.floor(cx + 4); x++) {
      if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) > 4.2) continue;
      const edge = top + rows + Math.round(((x + 0.5 - cx) / 4) * slant * inner);
      if (y < edge) plot(g, x, y, '3');
      else if (y === edge) plot(g, x, y, 'x');
    }
  }
}

/** A shut eye: an arc, curving up (a content smile) or down (grief, eyes squeezed). */
function shutEye(g: CharGrid, cx: number, cy: number, up: boolean): void {
  const src = up ? ['.xxxx.', 'x....x'] : ['x....x', '.xxxx.'];
  stamp(g, Math.round(cx) - 3, Math.round(cy) - 1, src);
}

// Brows: heavy dark fur over each eye (the boss's grumpy brows), a 9×3 stamp per eye; `L` is her
// right (screen left), mirrored for the other. `0` the darkest fur, `1` its edge.
// prettier-ignore
const BROWS: Readonly<Record<string, readonly string[]>> = {
  // Level and heavy, a little down at the nose: unimpressed.
  neutral: ['.........', '000000000', '111111100'],
  // Eased up and softened.
  happy: ['.0000000.', '111111111', '.........'],
  // Up in the middle.
  worried: ['......000', '...000011', '0001111..'],
  // Down hard to a V.
  angry: ['00.......', '1100000..', '...111000'],
  // Inner ends lifted, outer ends falling.
  sad: ['......000', '..000011.', '00111....'],
};

function brows(g: CharGrid, e: string): void {
  const src = BROWS[e] ?? BROWS['neutral'] ?? [];
  const flip = src.map((r) => r.split('').toReversed().join(''));
  stamp(g, Math.round(EYE_L) - 5, Math.round(EYE_Y) - 8, src);
  stamp(g, Math.round(EYE_R) - (src[2]?.length ?? 9) + 4, Math.round(EYE_Y) - 8, flip);
}

// Mouths: an 11×4 stamp at (MOUTH_X, MOUTH_Y), closed and talking. `R` is the inside of her
// mouth (dark coral), `x` the lip line.
// prettier-ignore
const MOUTHS: Readonly<Record<string, { readonly closed: readonly string[]; readonly talk: readonly string[] }>> = {
  neutral: {
    closed: ['...........', '..xxxxxxx..', '.x.......x.', '...........'],
    talk: ['...........', '..xxxxxxx..', '.xxRRRRRxx.', '...xxxxx...'],
  },
  happy: {
    closed: ['...........', '.x.......x.', '..xxxxxxx..', '...........'],
    talk: ['...........', '.xxxxxxxxx.', '..xRRRRRx..', '...xxxxx...'],
  },
  worried: {
    closed: ['...........', '....xxx....', '...x...x...', '...........'],
    talk: ['....xxx....', '...xRRRx...', '...xRRRx...', '....xxx....'],
  },
  angry: {
    closed: ['...........', '.xxxxxxxxx.', '...........', '...........'],
    talk: ['...........', '.xxxxxxxxx.', '.xwwwwwwwx.', '..xxxxxxx..'],
  },
  sad: {
    closed: ['...........', '...xxxxx...', '..x.....x..', '.x.......x.'],
    talk: ['...........', '...xxxxx...', '..xRRRRRx..', '.x.......x.'],
  },
};

function paint({ expression, mouth }: PaintArgs): CharGrid {
  const g = grid(S, S);
  const e = MOUTHS[expression] === undefined ? 'neutral' : expression;
  const bristle = e === 'angry';
  body(g, bristle);
  shimmer(g);
  wreath(g, bristle);
  // Her little one: peeking, or ducked into her fur when she's worried.
  stamp(g, 0, e === 'worried' ? 17 : 12, e === 'worried' ? YOUNG_DUCKED : YOUNG);
  // Eyes.
  if (e === 'happy') {
    shutEye(g, EYE_L, EYE_Y, true);
    shutEye(g, EYE_R, EYE_Y, true);
  } else {
    eye(g, EYE_L, EYE_Y, e === 'worried');
    eye(g, EYE_R, EYE_Y, e === 'worried');
    if (e === 'neutral') {
      // Half-lidded: she has seen your kind before.
      lid(g, EYE_L, EYE_Y, 3, 0, 1);
      lid(g, EYE_R, EYE_Y, 3, 0, -1);
    } else if (e === 'angry') {
      lid(g, EYE_L, EYE_Y, 3, 1.5, 1);
      lid(g, EYE_R, EYE_Y, 3, 1.5, -1);
    } else if (e === 'sad') {
      lid(g, EYE_L, EYE_Y, 3, -1.5, 1);
      lid(g, EYE_R, EYE_Y, 3, -1.5, -1);
      // One tear, falling from her near eye.
      stamp(g, 13, 28, ['T', 'w', 'T']);
    }
  }
  brows(g, e);
  // Blush, under the eyes toward the cheeks.
  const blush = e === 'angry' || e === 'happy' ? ['QQQ', 'PPP'] : ['PPP'];
  stamp(g, Math.round(EYE_L) - 6, Math.round(EYE_Y) + 4, blush);
  stamp(g, Math.round(EYE_R) + 3, Math.round(EYE_Y) + 4, blush);
  const m = MOUTHS[e];
  if (m !== undefined) stamp(g, MOUTH_X, MOUTH_Y, mouth === 'talk' ? m.talk : m.closed);
  outlineInPlace(g);
  return g;
}

export const portraitBramble = definePortrait({
  id: 'portrait.chitterbloom',
  palette: 'skitterkin.ally',
  // The wreath's moss and leaves (green, as in A1M5), its blossoms and her blush (pink), the deep
  // shine of her eyes, the inside of her mouth, and a tear.
  legend: {
    F: 'green.1',
    G: 'green.2',
    H: 'green.3',
    I: 'green.4',
    P: 'pink.3',
    Q: 'pink.4',
    J: 'ink.3',
    R: 'coral.1',
    T: 'blue.4',
  },
  expressions: BRAMBLE_EXPRESSIONS,
  paint,
});
