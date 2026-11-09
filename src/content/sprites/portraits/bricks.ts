// Bricks's portrait (`portrait.bricks`; story/characters.md § Bricks, art-direction § Portrait
// roster): Sgt. Ikenna Okonkwo, 54. Huge and broad, dark skin, a grey-stubbled shaved head and
// grey stubble on the jaw, a scar through his left eyebrow, a battered khaki Survey Corps jacket
// (the faded compass-over-a-stone patch) over teal Everglow fatigues, and the rivet cannon resting
// on his shoulder. Gruff and kind: a deadpan, heavy-lidded neutral; his smile is a lopsided one.
// Variant `pebble` (from A2M3, "Pocket's got room"): Pebble rides in his jacket's breast pocket,
// her head and the Peeker's seedling up over the flap, her front feet hooked on its edge. She
// grins when he does and looks up at him when he's worried or sad.
import { disc, grid, line, plot, type CharGrid } from '../helpers.ts';
import { definePortrait, outlineInPlace, PORTRAIT_SIZE, type PaintArgs } from './portrait.ts';

const S = PORTRAIT_SIZE;
/** The head's center column and the eye row. */
const CX = 23.5;
const EYE_Y = 18;

function put(g: CharGrid, x: number, y: number, src: readonly string[]): void {
  src.forEach((r, dy) => {
    for (let dx = 0; dx < r.length; dx++) {
      const ch = r.charAt(dx);
      if (ch !== '.') plot(g, x + dx, y + dy, ch);
    }
  });
}

/** The rivet cannon on his right shoulder (screen right), rising behind his head. */
function cannon(g: CharGrid): void {
  // The barrel: four rows thick along a diagonal, white top, lit, mid, dark underside.
  ['4', '3', '2', '1'].forEach((ch, i) => {
    line(g, 34, 25 + i, 47, 12 + i, ch);
    line(g, 35, 25 + i, 47, 13 + i, ch);
  });
  // The receiver resting on his shoulder: a chunky steel block, wider than the barrel, with a
  // dark vent slot.
  ['4', '3', '3', '2', '2', '1', '0', '0'].forEach((ch, i) => {
    line(g, 28, 28 + i, 35, 21 + i, ch);
    line(g, 29, 28 + i, 35, 22 + i, ch);
  });
  line(g, 31, 29, 34, 26, 'k');
  // The orange band at the receiver's mouth, and a muzzle ring where the barrel leaves the frame.
  for (let i = 0; i < 8; i++) plot(g, 36, 20 + i, i < 2 ? 'e' : i < 5 ? 'd' : 'c');
  for (let i = 0; i < 5; i++) plot(g, 45, 13 + i, i < 2 ? 'w' : '1');
}

function jacket(g: CharGrid): void {
  for (let y = 31; y < S; y++) {
    const t = y - 31;
    const half = Math.min(24, 13 + Math.round(Math.sqrt(t) * 5.5));
    for (let x = Math.round(CX - half); x <= Math.round(CX + half); x++) {
      const fromL = x - (CX - half);
      const fromR = CX + half - x;
      // Khaki, lit from the upper left; the far shoulder in shade.
      let ch = x > 30 ? 'J' : 'K';
      if (fromL < 2 || (t < 1 && x < 22)) ch = 'L';
      if (fromR < 3) ch = 'I';
      plot(g, x, y, ch);
    }
  }
  // The open front: the lapels and the teal fatigue shirt at his throat.
  for (let y = 31; y < S; y++) {
    const w = Math.max(0, 5 - Math.floor((y - 31) / 4));
    for (let x = Math.round(CX - w); x <= Math.round(CX + w); x++) {
      plot(g, x, y, x < CX - 2 ? '8' : x > CX + 2 ? '6' : '7');
    }
    plot(g, Math.round(CX - w) - 1, y, 'I');
    plot(g, Math.round(CX + w) + 1, y, 'I');
  }
  // Collar points, lit and turned up.
  put(g, 12, 30, ['LLL.....', 'LKKLL...', '.KKKKL..', '..JKKKL.']);
  put(g, 28, 30, ['.....JJJ', '...JJKKJ', '..JKKKK.', '.JKKKJ..']);
  // Seams over the shoulders, and the faded Survey Corps patch on his left sleeve (screen left):
  // a compass over a stone.
  line(g, 4, 41, 10, 36, 'J');
  put(g, 3, 41, [
    '.RRRRR.',
    'RRLLLRR',
    'RLRNRLR',
    'RLRRRLR',
    'RRLLLRR',
    'RRQQQRR',
    'RQQQQQR',
    '.RRRRR.',
  ]);
}

/** Inside the head: a broad, squarish skull and a heavy jaw. */
function inHead(x: number, y: number): boolean {
  const nx = (x + 0.5 - CX) / (y > 22 ? 10.5 - (y - 22) * 0.35 : 11);
  const ny = (y + 0.5 - 17) / 13;
  return Math.abs(nx) ** 2.6 + Math.abs(ny) ** 2.6 <= 1 && y >= 4;
}

function head(g: CharGrid): void {
  // The neck: thick, in shadow under the jaw.
  for (let y = 26; y <= 32; y++) {
    for (let x = 16; x <= 31; x++) plot(g, x, y, x < 19 ? 'C' : 'B');
  }
  // Ears.
  put(g, 11, 15, ['.CD', 'CDC', 'CBC', 'CCB', '.CB', '..B']);
  put(g, 34, 15, ['DC.', 'BCB', 'BBB', 'BCB', 'BB.', 'B..']);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (!inHead(x, y)) continue;
      const nx = (x + 0.5 - CX) / 11;
      const ny = (y + 0.5 - 16) / 13;
      // Lit from the upper left: a broad mid tone, the far side and jaw in shade, a sheen on the
      // crown and the near cheekbone.
      let ch = 'C';
      if ((nx < 0.08 || (nx < 0.2 && (x + y) % 2 === 0)) && ny < 0.6) ch = 'D';
      if (nx > 0.45 || ny > 0.82) ch = 'B';
      if ((nx + 0.3) ** 2 + (ny + 0.62) ** 2 < 0.06) ch = 'E';
      if ((nx + 0.58) ** 2 + (ny - 0.12) ** 2 < 0.012) ch = 'E';
      plot(g, x, y, ch);
    }
  }
  // Grey stubble: a dither over the shaved crown's top and along the jaw and chin.
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (!inHead(x, y)) continue;
      const crown = !inHead(x, y - 2) && (x + y) % 2 === 0;
      const jaw = y >= 24 && (y >= 27 || x <= 17 || x >= 30) && (x + 2 * y) % 3 === 0;
      if (crown) plot(g, x, y, x > 27 ? 'G' : 'H');
      else if (jaw) plot(g, x, y, 'G');
    }
  }
  // The broad nose: a lit bridge, shaded nostrils.
  put(g, 21, 19, ['..D..', '..DC.', '.DDCC', 'CBDBB', '.ABA.']);
  // Deep creases from the nose: 54 years, most of them squinting.
  plot(g, 19, 23, 'C');
  plot(g, 29, 23, 'B');
}

// Brows and eyes per expression, a 20×6 stamp from (14, EYE_Y - 4). The scar crosses his left
// brow (screen right) at columns 13–14 of the stamp in every one; `S` marks it.
// prettier-ignore
const EYES: Readonly<Record<string, readonly string[]>> = {
  // Heavy, level brows; heavy-lidded deadpan.
  neutral: [
    '....................',
    '.AAAAAA.....AASAAA..',
    '..BBBBB.....BBSBBB..',
    '..CBBBC.....CBBSBC..',
    '..CWkWC.....CWkWC...',
    '...CCC.......CCC....',
  ],
  // Brows up, eyes creased shut into crescents: the rare, real one.
  happy: [
    '.AAAAAA.....AASAAA..',
    '....................',
    '...BBB.......BSB....',
    '..B...B.....B.S.B...',
    '....................',
    '..C...C.....C...C...',
  ],
  // Inner ends raised; eyes wide, pupils small.
  worried: [
    '.....AA.....AA......',
    '..AAA.........ASAA..',
    '.AA.BBB.....BBS..A..',
    '...CWWWC...CWWWC....',
    '...CWkWC...CWkWC....',
    '....CCC.....CCC.....',
  ],
  // Brows driven down to the nose; eyes narrowed to slits.
  angry: [
    '.AA...............A.',
    '..AAAA.......ASAA...',
    '....AAAA...AAAA.....',
    '..BBBBBB...BBBBBB...',
    '..CWkkWC...CWkkWC...',
    '...BBBB.....BBBB....',
  ],
  // Inner ends lifted a little; lids low, looking down.
  sad: [
    '....................',
    '....AAA.....AAS.....',
    '.AAA...A...A..SAA...',
    '..CBBBBC...CBBBBC...',
    '..CBBBBC...CBBBBC...',
    '...WkWC.....WkWC....',
  ],
};

// Mouths: a 12×4 stamp from (18, 24), closed and talking. The happy one is lopsided.
// prettier-ignore
const MOUTHS: Readonly<Record<string, { readonly closed: readonly string[]; readonly talk: readonly string[] }>> = {
  neutral: {
    closed: ['............', '..AAAAAAAA..', '...BCCCCB...', '............'],
    talk: ['............', '..AAAAAAAA..', '...AkkkkA...', '....BCCB....'],
  },
  happy: {
    closed: ['.........AA.', '..A.....A...', '...AAAAAA...', '....BCCB....'],
    talk: ['.........AA.', '..AAAAAAA...', '...AWWWWA...', '....AkkA....'],
  },
  worried: {
    closed: ['............', '...AAAAAA...', '..A......A..', '............'],
    talk: ['............', '....AAAA....', '...AkkkkA...', '....AAAA....'],
  },
  angry: {
    closed: ['............', '..AAAAAAAA..', '..AWAWAWAA..', '.A........A.'],
    talk: ['............', '..AAAAAAAA..', '..AWWWWWWA..', '..AkkkkkkA..'],
  },
  sad: {
    closed: ['............', '....AAAA....', '..AA....AA..', '.A........A.'],
    talk: ['............', '....AAAA....', '...AkkkkA...', '..AA....AA..'],
  },
};

/** Where Pebble's head sits over his breast pocket (pixel-edge center). */
const POCKET_PEBBLE = { x: 37.5, y: 39.5, r: 4.3 } as const;

/**
 * Pebble in his breast pocket (screen right, his left): the pocket and its flap, and over it her
 * round coral head, big eyes, and seedling, hand-outlined in ink so she reads on the khaki at 1×.
 */
function pocketPebble(g: CharGrid, expression: string): void {
  // The pocket: a stitched patch pocket, its flap lit along the top edge.
  for (let y = 41; y < S; y++) {
    for (let x = 32; x <= 43; x++) {
      const edge = x === 32 || x === 43 || y === 41;
      plot(g, x, y, edge ? 'I' : y === 42 ? 'L' : y === 43 ? 'K' : 'J');
    }
  }
  const { x: cx, y: cy, r } = POCKET_PEBBLE;
  const inBall = (x: number, y: number): boolean => Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r;
  // An ink ring first, then the ball inside it (only above the flap).
  for (let y = 32; y <= 41; y++) {
    for (let x = 30; x <= 45; x++) {
      if (inBall(x, y)) continue;
      const near = inBall(x - 1, y) || inBall(x + 1, y) || inBall(x, y - 1) || inBall(x, y + 1);
      if (near && y < 41) plot(g, x, y, 'x');
    }
  }
  disc(g, cx, cy, r, (d, x, y) => {
    if (y >= 41) return g[y]?.[x] ?? 'J';
    const lit = -(x + 0.5 - cx) * 0.6 - (y + 0.5 - cy) * 0.8;
    return lit > 1.6 && d < 3.6 ? 'P' : lit < -1.8 ? 'N' : 'M';
  });
  // A few shimmer flecks on her back, and the seedling (the Peeker's two leaves on a stem).
  plot(g, 40, 37, 'T');
  plot(g, 41, 39, 'T');
  for (const [x, y, ch] of [
    [35, 32, 'X'],
    [36, 32, 'V'],
    [38, 32, 'V'],
    [39, 32, 'X'],
    [36, 33, 'V'],
    [37, 33, 'U'],
    [38, 33, 'V'],
    [37, 34, 'U'],
  ] as const) {
    plot(g, x, y, ch);
  }
  // Big eyes (2×3, a glint top-left); closed in a grin, or glancing up at his face.
  const eyes =
    expression === 'happy'
      ? ['k..k', '.kk.']
      : expression === 'worried' || expression === 'sad'
        ? ['wk', 'kk', 'kN']
        : ['wk', 'kk', 'kk'];
  for (const ex of [35, 38]) {
    const rows = expression === 'happy' ? ['kk', '..'] : eyes;
    rows.forEach((row, dy) => {
      for (let dx = 0; dx < row.length; dx++) {
        const ch = row.charAt(dx);
        if (ch !== '.') plot(g, ex + dx, (expression === 'happy' ? 38 : 37) + dy, ch);
      }
    });
  }
  // Her front feet hooked over the flap.
  plot(g, 34, 41, 'P');
  plot(g, 35, 41, 'M');
  plot(g, 39, 41, 'M');
  plot(g, 40, 41, 'P');
}

function paint({ expression, variant, mouth }: PaintArgs): CharGrid {
  const g = grid(S, S);
  cannon(g);
  jacket(g);
  if (variant === 'pebble') pocketPebble(g, expression);
  head(g);
  put(g, 14, EYE_Y - 4, EYES[expression] ?? EYES['neutral'] ?? []);
  // The scar: a pale nick above and below his left brow, in every expression.
  plot(g, 28, EYE_Y - 5, 'F');
  plot(g, 29, EYE_Y - 1, 'F');
  const m = MOUTHS[expression] ?? MOUTHS['neutral'];
  if (m !== undefined) put(g, 18, 24, mouth === 'talk' ? m.talk : m.closed);
  outlineInPlace(g);
  return g;
}

export const portraitBricks = definePortrait({
  id: 'portrait.bricks',
  palette: 'everglow',
  // prettier-ignore
  legend: {
    A: 'skin.c.0', B: 'skin.c.1', C: 'skin.c.2', D: 'skin.c.3', E: 'skin.c.4', F: 'skin.b.4',
    S: 'skin.b.4', G: 'grime.2', H: 'grime.3', W: 'steel.4',
    I: 'grime.1', J: 'grime.2', K: 'grime.3', L: 'grime.4',
    N: 'coral.2', Q: 'steel.1', R: 'grime.1',
    // Pebble (the `pebble` variant): coral fuzz, the seedling's greens, a shimmer fleck.
    M: 'coral.3', P: 'coral.4', U: 'green.2', V: 'green.3', X: 'green.4', T: 'pink.3',
  },
  expressions: ['neutral', 'happy', 'worried', 'angry', 'sad'],
  variants: ['pebble'],
  paint,
});
