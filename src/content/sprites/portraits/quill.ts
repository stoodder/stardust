// QUILL's portrait (`portrait.quill`; story/characters.md § QUILL, art-direction § Portrait
// roster): a comms screen in an Everglow steel bezel, and on it a floating teal hexagon with one
// round eye LED and a pixel smile, under a 2-frame scanline flicker. Extras: `policy` (the
// fair-play tell: a flat-line mouth, plus `policy_flash`, one 125 ms frame of the whole screen in
// corporate yellow, `gold.3`, never the Hollow's acid). Variant `party_hat` (A1M5). Variant `purge`
// (C4 Purge, from A3M5; characters.md § QUILL): flattened. The hexagon loses its lit half (one
// flat teal), and the smile is gone: in its place, in every expression, a plain status bar (a
// teal frame, six of nine segments lit), whose next segment blinks on as it talks. The eye keeps
// its shapes, so the expressions still read; `policy` is the neutral face (no directives, no tell).
// Variant `damaged` (C4 Keep, finale Phase 2, after Directive 0 fires and "Not Everglow." lands;
// bible.md § C4): still QUILL, still smiling, but it fought itself and it shows. The glass is
// cracked from an impact in the upper right, the crack running down the hexagon's right side clear
// of the eye and the mouth (so every expression reads), a band of the picture torn three pixels
// sideways across the lower hexagon, and the power LED burning warning amber.
import { grid, line, plot, type CharGrid } from '../helpers.ts';
import type { FrameDef } from '../types.ts';
import { definePortrait, portraitFrame, PORTRAIT_SIZE, type PaintArgs } from './portrait.ts';

const S = PORTRAIT_SIZE;
/** The hexagon's center. */
const HX = 24;
const HY = 26;

/** Stamps rows at (x, y), skipping `.`. */
function put(g: CharGrid, x: number, y: number, src: readonly string[]): void {
  src.forEach((r, dy) => {
    for (let dx = 0; dx < r.length; dx++) {
      const ch = r.charAt(dx);
      if (ch !== '.') plot(g, x + dx, y + dy, ch);
    }
  });
}

/** The steel bezel: rounded corners, lit top left, a power LED and the Everglow chevron below. */
function bezel(g: CharGrid): void {
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const cx = Math.min(x, S - 1 - x);
      const cy = Math.min(y, S - 1 - y);
      // Rounded corners: cut a 3 px quarter circle.
      if (cx < 3 && cy < 3 && Math.hypot(3 - cx - 0.5, 3 - cy - 0.5) > 3) continue;
      const ring = Math.min(cx, cy);
      if (ring === 0) plot(g, x, y, 'x');
      else if (ring <= 3) {
        const lit = x < S - 1 - y; // above the anti-diagonal: the lit half
        plot(g, x, y, ring === 1 ? (lit ? '3' : '1') : ring === 3 ? '0' : lit ? '2' : '1');
      }
    }
  }
  // The power LED and a small teal chevron on the bottom bezel.
  plot(g, 39, 45, '*');
  plot(g, 40, 45, '+');
  for (const [x, y] of [
    [8, 45],
    [9, 44],
    [10, 45],
  ] as const)
    plot(g, x, y, '8');
}

/** The screen's glass behind the hexagon, scanlines on alternating rows (`phase` flips them). */
function screen(g: CharGrid, phase: number): void {
  for (let y = 4; y < S - 4; y++) {
    for (let x = 4; x < S - 4; x++) plot(g, x, y, (y + phase) % 2 === 0 ? 'A' : 'B');
  }
  // A faint reflection in the glass's upper left.
  line(g, 6, 9, 10, 5, 'C');
  line(g, 6, 11, 12, 5, 'C');
}

/** Inside the flat-topped hexagon centered at (cx, cy)? */
function inHex(x: number, y: number, cx: number, cy: number): boolean {
  const dx = Math.abs(x + 0.5 - cx);
  const dy = Math.abs(y + 0.5 - cy);
  const r = 15;
  const h = 12.5;
  return dy <= h && dx <= r - (dy / h) * (r / 2) * 0.9;
}

function hexagon(g: CharGrid, cx: number, cy: number, phase: number, flat = false): void {
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (!inHex(x, y, cx, cy)) continue;
      const edge =
        !inHex(x - 1, y, cx, cy) ||
        !inHex(x + 1, y, cx, cy) ||
        !inHex(x, y - 1, cx, cy) ||
        !inHex(x, y + 1, cx, cy);
      // Flattened (`purge`): one tone, no lit half, its edge still lit along the top left.
      const lit = !flat && x + 0.5 - cx + (y + 0.5 - cy) < 0;
      const edgeLit = x + 0.5 - cx + (y + 0.5 - cy) < 0;
      let ch = edge ? (edgeLit ? '9' : '8') : lit ? '7' : '6';
      if (!edge && (y + phase) % 2 === 1) ch = lit ? '6' : 'D';
      plot(g, x, y, ch);
    }
  }
}

// Eyes: 11×9 stamps centered on (HX, HY - 4). E is the LED's teal.4, w its white-hot core.
// prettier-ignore
const EYES: Readonly<Record<string, readonly string[]>> = {
  neutral: [
    '...EEEEE...',
    '..EEwwwEE..',
    '.EEwwwwwEE.',
    '.EwwwwwwwE.',
    '.EwwwwwwwE.',
    '.EwwwwwwwE.',
    '.EEwwwwwEE.',
    '..EEwwwEE..',
    '...EEEEE...',
  ],
  // An upturned arc: the one eye smiling.
  happy: [
    '...........',
    '...EEEEE...',
    '..EwwwwwE..',
    '.EwwEEEwwE.',
    '.EwE...EwE.',
    '.EE.....EE.',
    '...........',
    '...........',
    '...........',
  ],
  // Smaller and wobbly, under a brow bar raised in the middle.
  worried: [
    '.....EE....',
    '...EE..EE..',
    '.EE......E.',
    '...EEEEE...',
    '..EwwwwwE..',
    '..EwwwwwE..',
    '..EwwwwwE..',
    '...EEEEE...',
    '...........',
  ],
  // A lid sliced flat on a slant: stern.
  angry: [
    '.EE........',
    '..EEE......',
    '....EEEE...',
    '.E....EEEE.',
    '.EwwE....E.',
    '.EwwwwwwwE.',
    '.EEwwwwwEE.',
    '..EEwwwEE..',
    '...EEEEE...',
  ],
  // A heavy lid drooping over the lower half.
  sad: [
    '...........',
    '...........',
    '...........',
    '.EEEEEEEEE.',
    '.EwwwwwwwE.',
    '.EEwwwwwEE.',
    '..EEwwwEE..',
    '...EEEEE...',
    '...........',
  ],
};

// Mouths: 13×4 stamps under the eye, closed and talking.
// prettier-ignore
const MOUTHS: Readonly<Record<string, { readonly closed: readonly string[]; readonly talk: readonly string[] }>> = {
  neutral: {
    closed: ['.............', '.E.........E.', '..EE.....EE..', '....EEEEE....'],
    talk: ['.............', '.EEEEEEEEEEE.', '..EkkkkkkkE..', '....EEEEE....'],
  },
  happy: {
    closed: ['EEEEEEEEEEEEE', '.EkkkkkkkkkE.', '..EkkkkkkkE..', '....EEEEE....'],
    talk: ['EEEEEEEEEEEEE', '.EkkkkkkkkkE.', '..EkkCCCkkE..', '....EEEEE....'],
  },
  worried: {
    closed: ['.............', '...EE...EE...', '..E..EEE..E..', '.............'],
    talk: ['.............', '....EEEEE....', '...EkkkkkE...', '....EEEEE....'],
  },
  angry: {
    closed: ['.............', '.............', '...EEEEEEE...', '..E.......E..'],
    talk: ['.............', '...EEEEEEE...', '..EkkkkkkkE..', '...EEEEEEE...'],
  },
  sad: {
    closed: ['.............', '....EEEEE....', '..EE.....EE..', '.E.........E.'],
    talk: ['.............', '....EEEEE....', '...EkkkkkE...', '..EE.....EE..'],
  },
  // The tell: a flat line.
  policy: {
    closed: ['.............', '.............', '.EEEEEEEEEEE.', '.............'],
    talk: ['.............', '.EEEEEEEEEEE.', '.EkkkkkkkkkE.', '.EEEEEEEEEEE.'],
  },
};

/**
 * The `purge` status bar, a 13×4 stamp where the mouth was: a plain teal frame, six of nine
 * segments lit white; talking lights the seventh (the bar's blink). No curve, in any expression.
 */
// prettier-ignore
export const QUILL_STATUS_BAR = {
  closed: ['.............', '.EEEEEEEEEEE.', '.EwwwwwwkkkE.', '.EEEEEEEEEEE.'],
  talk: ['.............', '.EEEEEEEEEEE.', '.EwwwwwwwkkE.', '.EEEEEEEEEEE.'],
} as const;

/** A sweat bead on the hexagon's upper right edge (worried). */
function bead(g: CharGrid): void {
  put(g, 34, 16, ['.E.', 'EwE', 'EEE']);
}

/** Rows of the `damaged` tear band: the picture there slips three pixels right. */
export const QUILL_TEAR_ROWS = { y0: 33, y1: 35 } as const;
/** How far the tear band slips. */
const TEAR = 3;

/** The `damaged` crack: polylines from the impact point, in glass-white. */
// prettier-ignore
export const QUILL_CRACK: readonly (readonly (readonly [number, number])[])[] = [
  [[37, 10], [43, 5]],
  [[37, 10], [43, 14]],
  [[37, 10], [35, 7], [32, 4]],
  [[37, 10], [34, 16], [35, 22], [32, 30], [34, 37], [31, 43]],
  [[35, 22], [40, 26], [43, 25]],
];

/** `damaged`: the tear band, the crack over the glass, and the amber LED. */
function damage(g: CharGrid): void {
  for (let y = QUILL_TEAR_ROWS.y0; y <= QUILL_TEAR_ROWS.y1; y++) {
    const row = g[y];
    if (row === undefined) continue;
    const src = row.slice();
    for (let x = 4 + TEAR; x < S - 4; x++) row[x] = src[x - TEAR] ?? 'A';
    // The torn-away strip at its left edge shows bare glass.
    for (let x = 4; x < 4 + TEAR; x++) row[x] = 'B';
  }
  for (const path of QUILL_CRACK) {
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1];
      const b = path[i];
      if (a !== undefined && b !== undefined) line(g, a[0], a[1], b[0], b[1], 'w');
    }
  }
  // The impact: a small star of shattered glass.
  put(g, 36, 9, ['.C.', 'CwC', '.C.']);
  plot(g, 37, 10, 'w');
  // The power LED, amber.
  plot(g, 39, 45, 'I');
  plot(g, 40, 45, 'H');
}

/** The party hat (A1M5): a jaunty striped cone, tipped right, a pom-pom and an elastic. */
function partyHat(g: CharGrid): void {
  // prettier-ignore
  put(g, 21, 2, [
    '..........wJw',
    '.........JwwJ',
    '.........PJJ.',
    '........PPPQ.',
    '.......IIPPQ.',
    '......PIIIQ..',
    '.....PPPPIQ..',
    '....PPPPPQQ..',
    '...IIPPPPQ...',
    '..PPIIIIQQ...',
    '.PPPPPPIIQ...',
    'IIPPPPPPQQ...',
  ]);
  // The elastic, down the hexagon's side.
  line(g, 21, 14, 18, 21, 'P');
}

function paint({ expression, variant, mouth, scan }: PaintArgs): CharGrid {
  const g = grid(S, S);
  const phase = scan ? 1 : 0;
  bezel(g);
  screen(g, phase);
  const purge = variant === 'purge';
  hexagon(g, HX, HY, phase, purge);
  // `policy` keeps the neutral eye: only the mouth goes flat.
  put(g, HX - 5, HY - 9, EYES[expression] ?? EYES['neutral'] ?? []);
  const m = purge ? QUILL_STATUS_BAR : (MOUTHS[expression] ?? MOUTHS['neutral']);
  if (m !== undefined) put(g, HX - 6, HY + 2, mouth === 'talk' ? m.talk : m.closed);
  if (expression === 'worried') bead(g);
  if (variant === 'party_hat') partyHat(g);
  if (variant === 'damaged') damage(g);
  return g;
}

/** The policy flash: the screen recolored corporate yellow, its features dark on it. */
const FLASH: Readonly<Record<string, string>> = {
  A: 'H',
  B: 'G',
  C: 'J',
  D: 'H',
  '6': 'I',
  '7': 'I',
  '8': 'J',
  '9': 'J',
  E: 'F',
  w: 'F',
  k: 'J',
};

function flash(src: readonly string[]): string[] {
  return src.map((r, y) =>
    r
      .split('')
      .map((ch, x) => {
        const inside = x >= 4 && x < S - 4 && y >= 4 && y < S - 4;
        return inside ? (FLASH[ch] ?? ch) : ch;
      })
      .join(''),
  );
}

export const portraitQuill = definePortrait({
  id: 'portrait.quill',
  palette: 'everglow',
  // prettier-ignore
  legend: {
    A: 'teal.0', B: 'ink.1', C: 'teal.1', D: 'ink.3', E: 'teal.4',
    F: 'gold.0', G: 'gold.1', H: 'gold.2', I: 'gold.3', J: 'gold.4',
    P: 'pink.3', Q: 'pink.2',
  },
  expressions: ['neutral', 'happy', 'worried', 'angry', 'sad', 'policy'],
  variants: ['party_hat', 'purge', 'damaged'],
  scanlines: true,
  paint,
  extra: (rowsOf) => {
    const frames: Record<string, FrameDef> = {};
    const anims: Record<string, { frames: string[]; fps: number; loop: boolean }> = {};
    for (const variant of [null, 'party_hat']) {
      const policy = portraitFrame('policy', { variant });
      const name = portraitFrame('policy_flash', { variant });
      frames[name] = flash(rowsOf({ expression: 'policy', variant, mouth: 'closed', scan: false }));
      // One 125 ms yellow frame as the line starts, then the policy face.
      anims[`${variant === null ? '' : `${variant}.`}policy_in`] = {
        frames: [name, policy],
        fps: 8,
        loop: false,
      };
    }
    return { frames, anims };
  },
});
