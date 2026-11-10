// Pebble's portrait (`portrait.pebble`; story/characters.md § Pebble, story/races.md § Skitterkin,
// art-direction § Portrait roster): a Skitterkin youngling about the size of a teacup and very
// brave about it, and the Peeker who watched you from behind a rock all through Act I. A round,
// fuzzy coral ball with a butter belly, two stubby front feet, huge dark shiny eyes, and the
// Peeker's seedling for a tuft (the same green two-leaf sprout as `prop.peeker`, so the player
// knows her). The faint pink-gold shimmer frost on her back is still faint, because she's young.
// In the `skitterkin.ally` palette. Bare-headed at A2M3; variant `cap` (from A2M4) is Bricks's
// Everglow bottle cap worn as a hat, the seedling poking up through a hole punched in its middle.
// Variant `patch` (from A3M3) is the same cap carrying Bricks's faded Survey Corps patch (a compass
// over a stone, as on his sleeve) stitched to the front of its skirt.
// The seedling is her tell: it perks up when she's happy and droops when she's worried or sad.
// `singing` (the Leaving Song, A3M1): eyes closed, a round mouth, the shimmer lit; its two talk
// frames are a small and a large round mouth, a hum.
import { disc, grid, plot, type CharGrid } from '../helpers.ts';
import { definePortrait, outlineInPlace, PORTRAIT_SIZE, type PaintArgs } from './portrait.ts';

const S = PORTRAIT_SIZE;
/** The body's center and radii. */
const CX = 24;
const CY = 29;
const RX = 17.5;
const RY = 15.5;
/** The eyes' centers (pixel-edge coordinates) and the mouth row. */
const EYE_L = 17.5;
const EYE_R = 30.5;
const EYE_Y = 26;
const MOUTH_Y = 34;

/** Pebble's expressions: the five base ones plus `singing` (style-guide §5.2). */
export const PEBBLE_EXPRESSIONS = ['neutral', 'happy', 'worried', 'angry', 'sad', 'singing'];

function put(g: CharGrid, x: number, y: number, src: readonly string[]): void {
  src.forEach((r, dy) => {
    for (let dx = 0; dx < r.length; dx++) {
      const ch = r.charAt(dx);
      if (ch !== '.') plot(g, x + dx, y + dy, ch);
    }
  });
}

function inBody(x: number, y: number): boolean {
  const dx = (x + 0.5 - CX) / RX;
  const dy = (y + 0.5 - CY) / RY;
  return dx * dx + dy * dy <= 1;
}

/** The round fuzzy body, lit from the upper left, its rim tufted, and the butter belly. */
function body(g: CharGrid): void {
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = (x + 0.5 - CX) / RX;
      const dy = (y + 0.5 - CY) / RY;
      const d = Math.hypot(dx, dy);
      // Fuzz: tufts poke out past the rim in little clumps, and a few rim pixels drop out.
      const a = Math.atan2(dy, dx);
      const clump = Math.max(0, Math.sin(a * 22)) * 0.07;
      if (d > 1 + clump) continue;
      if (d > 0.96 && d <= 1 && (x * 7 + y * 3) % 5 === 0) continue;
      const lit = -0.6 * dx - 0.8 * dy;
      let ch = '3';
      if (lit > 0.45 && d < 0.85) ch = '4';
      else if (lit < -0.35) ch = d > 0.84 ? '1' : '2';
      // A soft dither between the lit crown and the body.
      if (ch === '3' && lit > 0.3 && d < 0.85 && (x + y) % 2 === 0) ch = '4';
      plot(g, x, y, ch);
    }
  }
  // Fur: short strands a step darker than the coral around them, all combed the same way.
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (!inBody(x, y) || !inBody(x + 1, y + 2)) continue;
      if ((x * 7 + y * 11) % 19 !== 0) continue;
      const here = g[y]?.[x];
      const dark = here === '4' ? '3' : here === '3' ? '2' : '1';
      plot(g, x, y, dark);
      plot(g, x, y + 1, dark);
      plot(g, x + 1, y + 2, dark);
    }
  }
  // The butter belly, low and round, its top edge fuzzy.
  for (let y = 36; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (!inBody(x, y)) continue;
      const bx = (x + 0.5 - (CX + 1)) / 9;
      const by = (y + 0.5 - 47) / 9.5;
      const bd = Math.hypot(bx, by);
      if (bd > 1 || (bd > 0.86 && (x + y) % 2 === 0)) continue;
      plot(g, x, y, bd > 0.8 ? '7' : bx + by < -0.55 ? '9' : '8');
    }
  }
}

/** The two stubby front feet at the bottom of the frame. */
function feet(g: CharGrid): void {
  for (const fx of [14, 33]) {
    disc(g, fx + 0.5, 46.5, 3.6, (d, x) => (d > 2.8 ? '1' : x < fx ? '3' : '2'));
    // Three little toes.
    for (const t of [-2, 0, 2]) plot(g, fx + t, 47, '1');
  }
}

/**
 * The shimmer frost along her back and crown: faint pink-gold sparkles, still sparse because
 * she's young. Singing lights it: more sparkles, brighter.
 */
function shimmer(g: CharGrid, lit: boolean): void {
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (!inBody(x, y)) continue;
      const dy = (y + 0.5 - CY) / RY;
      const dx = (x + 0.5 - CX) / RX;
      // A band over the top and down the far (right) side: her back, seen over her shoulder.
      const band = Math.hypot(dx, dy) > 0.72 && (dy < -0.35 || (dx > 0.55 && dy < 0.2));
      if (!band) continue;
      const h = (x * 13 + y * 29) % 23;
      if (h === 0) plot(g, x, y, lit ? '*' : 'P');
      else if (h === 7) plot(g, x, y, lit ? 'Q' : '+');
      else if (lit && h % 4 === 3) plot(g, x, y, (x + y) % 2 === 0 ? 'P' : '+');
    }
  }
}

// The seedling on her crown, a 13×9 stamp from (18, 5): two leaves (`I` lit, `H` mid, `G` dark)
// on a stem that roots in her fuzz. Perky when she's happy, drooping when she's worried or sad.
// prettier-ignore
const SPROUTS: Readonly<Record<'up' | 'perky' | 'droop', readonly string[]>> = {
  up: [
    '.............',
    '.II.......II.',
    'IIHH.....HHII',
    '.HHHH...HHHH.',
    '..GHHH.HHHG..',
    '....GG.GG....',
    '......G......',
    '......G......',
    '......G......',
  ],
  perky: [
    'II.........II',
    'IHH.......HHI',
    '.HHH.....HHH.',
    '..GHH...HHG..',
    '....GG.GG....',
    '......G......',
    '......G......',
    '......G......',
    '......G......',
  ],
  droop: [
    '.............',
    '.............',
    '.............',
    '....GG.GG....',
    '..GHHH.HHHG..',
    '.HHHH...HHHH.',
    'IHHH.....HHHI',
    'II....G....II',
    '......G......',
  ],
};

/** Which way each expression holds the seedling. */
const SPROUT_OF: Readonly<Record<string, keyof typeof SPROUTS>> = {
  neutral: 'up',
  happy: 'perky',
  worried: 'droop',
  angry: 'up',
  sad: 'droop',
  singing: 'perky',
};

/** One huge dark shiny eye: ink, a deeper shine at the bottom, a big glint and a small one. */
function eye(g: CharGrid, cx: number, cy: number): void {
  disc(g, cx, cy, 5, (d, x, y) => {
    if (d > 4.3) return 'x';
    if (y + 0.5 > cy + 2.2) return 'J';
    return 'k';
  });
  // Two glints, top-left large, bottom-right small.
  put(g, Math.floor(cx) - 3, Math.floor(cy) - 3, ['ww', 'ww']);
  plot(g, Math.floor(cx) + 2, Math.floor(cy) + 1, 'w');
}

/** Paints over the top `rows` of an eye with fur (a lowered lid). */
function lid(g: CharGrid, cx: number, cy: number, rows: number, slant: -1 | 0 | 1): void {
  for (let y = Math.floor(cy - 5); y < Math.floor(cy - 5) + rows + 2; y++) {
    for (let x = Math.floor(cx - 5); x <= Math.floor(cx + 5); x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      // The lid line tilts toward the nose (angry) or away from it (sad).
      const edge = Math.floor(cy - 5) + rows + Math.round(((x + 0.5 - cx) / 5) * slant);
      if (d > 5.2) continue;
      if (y < edge) plot(g, x, y, '3');
      else if (y === edge) plot(g, x, y, 'x');
    }
  }
}

/** A closed eye: a 2 px thick arc of `x`, curving up (happy) or down (peaceful, singing). */
function closedEye(g: CharGrid, cx: number, cy: number, up: boolean): void {
  const pts = up ? ['..xxxx..', '.x....x.', 'x......x'] : ['x......x', '.x....x.', '..xxxx..'];
  put(g, Math.round(cx) - 4, Math.round(cy) - 1, pts);
}

// Mouths: a 9×4 stamp from (20, MOUTH_Y - 1), closed and talking (a squeak). The singing mouth is
// round: small at rest, large on the talk frame (a hum).
// prettier-ignore
const MOUTHS: Readonly<Record<string, { readonly closed: readonly string[]; readonly talk: readonly string[] }>> = {
  neutral: {
    closed: ['.........', '..x...x..', '...xxx...', '.........'],
    talk: ['.........', '...xxx...', '..xkkkx..', '...xPx...'],
  },
  happy: {
    closed: ['.........', '.xxxxxxx.', '..xkkkx..', '...xPx...'],
    talk: ['.xxxxxxx.', '.xkkkkkx.', '..xkPkx..', '...xxx...'],
  },
  worried: {
    closed: ['.........', '....x....', '...xkx...', '....x....'],
    talk: ['....x....', '...xkx...', '...xkx...', '....x....'],
  },
  angry: {
    closed: ['.........', '...xxx...', '..x...x..', '.........'],
    talk: ['.........', '...xxx...', '..xkkkx..', '..x...x..'],
  },
  sad: {
    closed: ['.........', '...xxx...', '..x...x..', '.x.....x.'],
    talk: ['...xxx...', '..xkkkx..', '..x...x..', '.x.....x.'],
  },
  singing: {
    closed: ['.........', '...xxx...', '...xkx...', '...xxx...'],
    talk: ['...xxx...', '..xkkkx..', '..xkPkx..', '...xxx...'],
  },
};

/** How far the cap lifts the seedling: it grows up through the cap's hole. */
const CAP_LIFT = 2;
/** The cap's top row; its hole is two rows down, at the seedling's column. */
const CAP_Y = 11;

/**
 * Bricks's Everglow bottle cap, worn as a hat (the `cap` variant, from A2M4): a crown cork seen a
 * little from above, its white top ringed in Everglow teal with a hole punched in the middle for
 * the seedling, and a crimped steel skirt sitting down in her fuzz.
 */
function bottleCap(g: CharGrid): void {
  const cx = 24;
  // The crimped skirt, flaring a little toward the bottom; its teeth bite into her fur.
  for (let y = CAP_Y + 3; y <= CAP_Y + 6; y++) {
    const half = 7 + (y >= CAP_Y + 5 ? 1 : 0);
    for (let x = cx - half; x < cx + half; x++) {
      const k = (x + 1) % 3;
      let ch = k === 0 ? 'U' : k === 1 ? 'S' : 'R';
      if (x >= cx + half - 2) ch = k === 1 ? 'R' : 'U';
      if (y === CAP_Y + 6) ch = k === 1 ? 'U' : 'x';
      plot(g, x, y, ch);
    }
  }
  // The teeth's shadow in the fur under the skirt.
  for (let x = cx - 8; x < cx + 8; x++) if ((x + 1) % 3 === 1) plot(g, x, CAP_Y + 7, 'x');
  // The top: a white disc in a teal ring, seen at a slant.
  // prettier-ignore
  put(g, cx - 7, CAP_Y, [
    '...ccccccccc...',
    '.cddSSSSSSSddc.',
    'cdSSwwwkwwwSSdc',
    '.ddSSSSSSSSSdd.',
  ]);
  plot(g, cx - 8, CAP_Y + 2, 'x');
  plot(g, cx + 8, CAP_Y + 2, 'x');
}

/** Where Bricks's Survey Corps patch sits on the cap's skirt (the `patch` variant), for tests. */
export const SURVEY_PATCH = { x: 21, y: 14, w: 7, h: 7 } as const;

/**
 * Bricks's faded Survey Corps patch (his sleeve's, art-direction § Portrait roster `bricks`): a
 * compass (a pale ring round a coral needle) over a slate stone, in a worn grime rim, stitched to
 * the front of the cap's skirt above her brows.
 */
// prettier-ignore
const SURVEY_PATCH_ROWS = [
  '.KKKKK.',
  'KLLLLLK',
  'KLKNKLK',
  'KLLLLLK',
  'KMMMMMK',
  'KMMMMMK',
  '.KKKKK.',
] as const;

function paint({ expression, variant, mouth }: PaintArgs): CharGrid {
  const g = grid(S, S);
  const e = MOUTHS[expression] === undefined ? 'neutral' : expression;
  const capped = variant === 'cap' || variant === 'patch';
  body(g);
  feet(g);
  shimmer(g, e === 'singing');
  if (capped) bottleCap(g);
  put(g, 18, capped ? 5 - CAP_LIFT : 5, SPROUTS[SPROUT_OF[e] ?? 'up']);
  // Capped, the stem runs on down into the hole.
  if (capped) for (let y = 12 - CAP_LIFT; y < CAP_Y + 2; y++) plot(g, 24, y, 'G');
  if (variant === 'patch') put(g, SURVEY_PATCH.x, SURVEY_PATCH.y, SURVEY_PATCH_ROWS);
  if (e === 'happy' || e === 'singing') {
    closedEye(g, EYE_L, EYE_Y, e === 'happy');
    closedEye(g, EYE_R, EYE_Y, e === 'happy');
  } else {
    eye(g, EYE_L, EYE_Y);
    eye(g, EYE_R, EYE_Y);
  }
  // Brows are tufts of darker fur over the eyes.
  if (e === 'angry') {
    // A kid's scowl: tufts down to the middle, lids lowered from the nose side, cheeks puffed.
    lid(g, EYE_L, EYE_Y, 3, 1);
    lid(g, EYE_R, EYE_Y, 3, -1);
    put(g, 12, 18, ['11.......', '.111.....', '...111...']);
    put(g, 27, 18, ['.......11', '.....111.', '...111...']);
  } else if (e === 'worried') {
    put(g, 13, 17, ['....111', '.111...', '1......']);
    put(g, 28, 17, ['111....', '...111.', '......1']);
    // A sweat drop on the far side.
    put(g, 39, 22, ['.T', 'TT', 'Tw']);
  } else if (e === 'sad') {
    lid(g, EYE_L, EYE_Y, 2, -1);
    lid(g, EYE_R, EYE_Y, 2, 1);
    put(g, 13, 18, ['....111', '.111...']);
    put(g, 28, 18, ['111....', '...111.']);
    // A tear welling and falling from the near eye.
    put(g, 15, 31, ['TT', 'wT', '.T']);
  }
  // Blush on her cheeks; bigger when she's cross (puffed) or happy.
  const blush = e === 'angry' || e === 'happy' ? ['QQQ', 'QQQ'] : ['QQ'];
  put(g, EYE_L - 6, EYE_Y + 5, blush);
  put(g, EYE_R + 3, EYE_Y + 5, blush);
  const m = MOUTHS[e];
  if (m !== undefined) put(g, 20, MOUTH_Y - 1, mouth === 'talk' ? m.talk : m.closed);
  outlineInPlace(g);
  return g;
}

export const portraitPebble = definePortrait({
  id: 'portrait.pebble',
  palette: 'skitterkin.ally',
  // The Peeker's seedling greens, the shimmer's pink, the eye's deep shine, and a tear.
  legend: {
    G: 'green.2',
    H: 'green.3',
    I: 'green.4',
    P: 'pink.3',
    Q: 'pink.4',
    J: 'ink.3',
    T: 'blue.4',
    // Bricks's bottle cap: crimped steel.
    R: 'steel.3',
    S: 'steel.4',
    U: 'steel.2',
    // Bricks's Survey Corps patch: the worn rim, the compass ring and needle, the stone.
    K: 'grime.1',
    L: 'grime.4',
    N: 'coral.2',
    M: 'steel.1',
  },
  expressions: PEBBLE_EXPRESSIONS,
  variants: ['cap', 'patch'],
  paint,
});
