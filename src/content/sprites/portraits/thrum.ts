// Old Thrum's portrait (`portrait.thrum`; story/characters.md § Old Thrum, story/races.md §
// Skitterkin, art-direction § Portrait roster): Pebble's grandmother, the Elder who led the Quiet
// Wave in A1M5, recognisably `enemy.elder` close up. Broad and low, the old shell of steel-grey
// plates over her back rising behind her head and gone green with moss, a thin white tuft, big
// bushy white brows over heavy-lidded eyes, crow's feet, white chin whiskers,
// the gold huddle spots along her flanks, and the butter belly. Her shimmer is the oldest and
// brightest in the cast: it glows pink-gold in the seams between her shell plates. In the
// `skitterkin.ally` palette, the moss kept green (custom legend), as the player saw her in A1M5.
//
// She is slow, wise and a little funny ("You are very tall. It must be lonely up there."), and
// knee-high, so at rest she looks up at you: her eyes' glints sit high. `singing` (A3M1, the
// Leaving Song, humming along with Pebble): eyes closed, a round mouth, the seams lit bright; its
// talk frame opens the mouth wider (a hum).
import { disc, grid, plot, stamp, type CharGrid } from '../helpers.ts';
import { definePortrait, outlineInPlace, PORTRAIT_SIZE, type PaintArgs } from './portrait.ts';

const S = PORTRAIT_SIZE;
/** The body's center and radii: broad and low, cut by the frame's bottom edge. */
const CX = 24;
const CY = 38;
const RX = 23;
const RY = 17;
/** The shell's dome behind her head. */
const SHELL = { cx: 24, cy: 26, rx: 21, ry: 15 } as const;
/** The plates' centers along the dome (her right, middle, left). */
const PLATES = [12, 24, 36] as const;
/** The eyes' centers (pixel-edge coordinates). */
const EYE_L = 17.5;
const EYE_R = 30.5;
const EYE_Y = 31.5;
/** The mouth stamp's top-left (9×3). */
const MOUTH_X = 20;
const MOUTH_Y = 36;

/** Thrum's expressions: the five base ones plus `singing` (style-guide §5.2). */
export const THRUM_EXPRESSIONS = ['neutral', 'happy', 'worried', 'angry', 'sad', 'singing'];

/** Where her brows sit (the stamps' bounding box), for tests. */
export const THRUM_BROWS = { x0: 11, y0: 25, x1: 36, y1: 28 } as const;

/** The old shell: three overlapping steel plates, lit on top, moss on them, shimmer in the seams. */
function shell(g: CharGrid, singing: boolean): void {
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = (x + 0.5 - SHELL.cx) / SHELL.rx;
      const dy = (y + 0.5 - SHELL.cy) / SHELL.ry;
      if (dx * dx + dy * dy > 1 || dy > 0) continue;
      const d = PLATES.map((p) => Math.abs(x + 0.5 - p));
      const sorted = d.toSorted((a, b) => a - b);
      const k = d.indexOf(sorted[0] ?? 0);
      // A seam where two plates meet, shimmer glinting through it.
      const seam = Math.abs((sorted[0] ?? 0) - (sorted[1] ?? 0)) < 1.2;
      const rim = dx * dx + dy * dy > 0.8;
      // Each plate is its own little dome, lit on its upper left.
      const lx = (x + 0.5 - (PLATES[k] ?? 0)) / 6;
      let ch = lx < 0.3 && dy < -0.45 ? 'S' : 'T';
      if (lx > 0.75 || rim) ch = 'U';
      if (seam) ch = (x + y) % 3 === 0 ? (singing ? '*' : '+') : singing ? 'P' : 'K';
      plot(g, x, y, ch);
    }
  }
  // Moss on the plates' crowns.
  for (const [x, y, src] of [
    [6, 18, ['.HI', 'GHH']],
    [19, 12, ['..HI.', '.GHHI', 'GG.HG']],
    [32, 15, ['IH.', 'HHG', '.GG']],
    [40, 22, ['H.', 'GH']],
  ] as const)
    stamp(g, x, y, src);
}

/** The broad body (her head is its front): coral fur, lit from the upper left, greying at the face. */
function body(g: CharGrid): void {
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = (x + 0.5 - CX) / RX;
      const dy = (y + 0.5 - CY) / RY;
      const d = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx);
      if (d > 1 + Math.max(0, Math.sin(a * 20)) * 0.05) continue;
      if (d > 0.96 && d <= 1 && (x * 5 + y * 3) % 4 === 0) continue;
      const lit = -0.6 * dx - 0.8 * dy;
      let ch = '3';
      if (lit > 0.42 && d < 0.85) ch = '4';
      else if (lit < -0.3) ch = d > 0.85 ? '1' : '2';
      if (ch === '3' && lit > 0.28 && d < 0.85 && (x + y) % 2 === 0) ch = '4';
      plot(g, x, y, ch);
    }
  }
  // The butter belly, low, its top fuzzy.
  for (let y = 41; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const bx = (x + 0.5 - CX) / 11;
      const by = (y + 0.5 - 52) / 10;
      const bd = Math.hypot(bx, by);
      if (bd > 1 || (bd > 0.88 && (x + y) % 2 === 0)) continue;
      plot(g, x, y, bd > 0.82 ? '7' : bx + by < -0.5 ? '9' : '8');
    }
  }
  // The huddle spots along her flanks (A1M5's `huddle` tell), warm gold.
  for (const [x, y, ch] of [
    [4, 36, '*'],
    [3, 40, '+'],
    [6, 42, '*'],
    [43, 37, '+'],
    [44, 41, '*'],
    [41, 43, '+'],
  ] as const)
    plot(g, x, y, ch);
}

/** A thin white tuft standing up off her crown, in front of the shell. */
const TUFT = ['.W..W.', 'W.WW.W', '.WWWW.', '..VV..'] as const;

/** The tuft, rimmed in dark steel so its white reads against the pale shell behind it. */
function tuft(g: CharGrid, x0: number, y0: number): void {
  TUFT.forEach((r, dy) => {
    for (let dx = 0; dx < r.length; dx++) {
      if (r.charAt(dx) === '.') continue;
      for (const [ox, oy] of [
        [1, 0],
        [-1, 0],
        [0, -1],
      ] as const) {
        if ((TUFT[dy + oy]?.charAt(dx + ox) ?? '.') === '.')
          plot(g, x0 + dx + ox, y0 + dy + oy, 'K');
      }
    }
  });
  stamp(g, x0, y0, TUFT);
}

/** An old dark eye: smaller than a youngling's, its glints high (she's looking up at you). */
function eye(g: CharGrid, cx: number, cy: number, look: 'up' | 'ahead'): void {
  disc(g, cx, cy, 3.1, (d, x, y) => {
    if (d > 2.4) return 'x';
    if (y + 0.5 > cy + 0.9) return 'J';
    return 'k';
  });
  const gx = Math.floor(cx) - 1;
  const gy = Math.floor(cy) - (look === 'up' ? 1 : 0);
  stamp(g, gx, gy, ['ww', 'w.']);
}

/** A heavy lid of fur over the top `rows` of an eye, tilted toward the nose (`slant` > 0) or away. */
function lid(
  g: CharGrid,
  cx: number,
  cy: number,
  rows: number,
  slant: number,
  inner: 1 | -1,
): void {
  const top = Math.floor(cy - 3);
  for (let y = top; y < top + rows + 2; y++) {
    for (let x = Math.floor(cx - 3); x <= Math.floor(cx + 3); x++) {
      if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) > 3.5) continue;
      const edge = top + rows + Math.round(((x + 0.5 - cx) / 3) * slant * inner);
      if (y < edge) plot(g, x, y, '3');
      else if (y === edge) plot(g, x, y, 'x');
    }
  }
}

/** A shut eye: an arc curving up (a smile) or down (peace, singing). */
function shutEye(g: CharGrid, cx: number, cy: number, up: boolean): void {
  stamp(
    g,
    Math.round(cx) - 3,
    Math.round(cy) - 1,
    up ? ['.xxxx.', 'x....x'] : ['x....x', '.xxxx.'],
  );
}

/** Crow's feet at the outer corners. */
function crowsFeet(g: CharGrid): void {
  stamp(g, Math.round(EYE_L) - 6, Math.round(EYE_Y) - 1, ['2.', '.2', '2.']);
  stamp(g, Math.round(EYE_R) + 4, Math.round(EYE_Y) - 1, ['.2', '2.', '.2']);
}

// Brows: bushy white tufts (`W`, shaded `V` underneath), a 10×3 stamp for her right eye (screen
// left), the nose side on its right; mirrored for the other.
// prettier-ignore
const BROWS: Readonly<Record<string, readonly string[]>> = {
  // Soft, drooping a little at the outer ends: kindly.
  neutral: ['...WWWWW..', '.WWWWWVVW.', 'WVV.......'],
  // Lifted high.
  happy: ['.WWWWWWW..', 'WWVVVVVVW.', '..........'],
  // Up at the nose.
  worried: ['.......WW.', '...WWWWVV.', 'WWWVV.....'],
  // Down at the nose: the cranky boss-lady of A1M5.
  angry: ['WW........', 'VWWWWW....', '...VVWWWW.'],
  // Inner ends up, outer ends sagging down past the eye.
  sad: ['......WWW.', '..WWWWVV..', 'WWVV......'],
  // Eased, peaceful.
  singing: ['..WWWWWW..', 'WWWVVVVWW.', '..........'],
};

function brows(g: CharGrid, e: string): void {
  const src = BROWS[e] ?? BROWS['neutral'] ?? [];
  const flip = src.map((r) => r.split('').toReversed().join(''));
  stamp(g, Math.round(EYE_L) - 7, THRUM_BROWS.y0, src);
  stamp(g, Math.round(EYE_R) - 3, THRUM_BROWS.y0, flip);
}

// Mouths: a 9×3 stamp at (MOUTH_X, MOUTH_Y), closed and talking; `R` the inside of her mouth.
// prettier-ignore
const MOUTHS: Readonly<Record<string, { readonly closed: readonly string[]; readonly talk: readonly string[] }>> = {
  neutral: {
    closed: ['.........', '..xxxxx..', '.........'],
    talk: ['..xxxxx..', '..xRRRx..', '...xxx...'],
  },
  happy: {
    closed: ['.x.....x.', '..xxxxx..', '.........'],
    talk: ['.xxxxxxx.', '..xRRRx..', '...xxx...'],
  },
  worried: {
    closed: ['.........', '...xxx...', '..x...x..'],
    talk: ['...xxx...', '..xRRRx..', '..x...x..'],
  },
  angry: {
    closed: ['.........', '.xxxxxxx.', '.........'],
    talk: ['.xxxxxxx.', '.xwwwwwx.', '..xxxxx..'],
  },
  sad: {
    closed: ['...xxx...', '..x...x..', '.x.....x.'],
    talk: ['...xxx...', '..xRRRx..', '.x.....x.'],
  },
  singing: {
    closed: ['...xxx...', '...xRx...', '...xxx...'],
    talk: ['..xxxxx..', '..xRRRx..', '..xxxxx..'],
  },
};

/** White chin whiskers hanging under her mouth. */
// prettier-ignore
const WHISKERS = [
  '..W.W.W..',
  '.W..V..W.',
  '.V.....V.',
] as const;

function paint({ expression, mouth }: PaintArgs): CharGrid {
  const g = grid(S, S);
  const e = MOUTHS[expression] === undefined ? 'neutral' : expression;
  const singing = e === 'singing';
  shell(g, singing);
  body(g);
  tuft(g, 21, 19);
  if (e === 'happy') {
    shutEye(g, EYE_L, EYE_Y, true);
    shutEye(g, EYE_R, EYE_Y, true);
  } else if (singing) {
    shutEye(g, EYE_L, EYE_Y, false);
    shutEye(g, EYE_R, EYE_Y, false);
  } else {
    eye(g, EYE_L, EYE_Y, e === 'neutral' ? 'up' : 'ahead');
    eye(g, EYE_R, EYE_Y, e === 'neutral' ? 'up' : 'ahead');
    if (e === 'angry') {
      lid(g, EYE_L, EYE_Y, 2, 1.5, 1);
      lid(g, EYE_R, EYE_Y, 2, 1.5, -1);
    } else if (e === 'sad') {
      lid(g, EYE_L, EYE_Y, 2, -1.5, 1);
      lid(g, EYE_R, EYE_Y, 2, -1.5, -1);
      stamp(g, 14, 35, ['B', 'w', 'B']);
    } else if (e === 'neutral') {
      // Heavy old lids: one row of fur over each eye.
      lid(g, EYE_L, EYE_Y, 1, 0, 1);
      lid(g, EYE_R, EYE_Y, 1, 0, -1);
    }
  }
  crowsFeet(g);
  brows(g, e);
  // Blush: warmer when she's pleased or humming.
  const blush = e === 'happy' || singing ? ['QQ', 'PP'] : ['PP'];
  stamp(g, Math.round(EYE_L) - 5, Math.round(EYE_Y) + 3, blush);
  stamp(g, Math.round(EYE_R) + 3, Math.round(EYE_Y) + 3, blush);
  const m = MOUTHS[e];
  if (m !== undefined) stamp(g, MOUTH_X, MOUTH_Y, mouth === 'talk' ? m.talk : m.closed);
  stamp(g, MOUTH_X, MOUTH_Y + 3, WHISKERS);
  outlineInPlace(g);
  return g;
}

export const portraitThrum = definePortrait({
  id: 'portrait.thrum',
  palette: 'skitterkin.ally',
  // The old shell (steel), her white brows, tuft and whiskers, the moss (green, as in A1M5), her
  // shimmer and blush (pink), the deep shine of her eyes, the inside of her mouth, and a tear.
  legend: {
    S: 'steel.4',
    T: 'steel.3',
    U: 'steel.2',
    K: 'steel.1',
    W: 'white.0',
    V: 'steel.4',
    G: 'green.2',
    H: 'green.3',
    I: 'green.4',
    P: 'pink.3',
    Q: 'pink.4',
    J: 'ink.3',
    R: 'coral.1',
    B: 'blue.4',
  },
  expressions: THRUM_EXPRESSIONS,
  paint,
});
