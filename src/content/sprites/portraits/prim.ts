// Compliance Officer Prim's portrait (`portrait.prim`; story/characters.md § Minor recurring
// characters, art-direction § Portrait roster): a comms screen like QUILL's, but audit grey, and on
// it Prim itself, an Everglow compliance drone of the Auditor model: a boxy steel head with a
// short antenna, one wide visor whose orange LED eyes (the Auditor's color, art-direction § 8) do
// all its expressing, a speaker grille that lights when it talks, and its clipboard held up on a
// thin arm, every line ticked but one. Polite, relentless, one notch too literal: its `happy` is
// the mandated customer-service smile. The scanlines flicker in two phases like QUILL's.
import { grid, line, plot, stamp, type CharGrid } from '../helpers.ts';
import { definePortrait, PORTRAIT_SIZE, type PaintArgs } from './portrait.ts';

const S = PORTRAIT_SIZE;

/** The bezel: square-cornered steel (bureaucracy has no curves), an audit lamp, a barcode. */
function bezel(g: CharGrid): void {
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const cx = Math.min(x, S - 1 - x);
      const cy = Math.min(y, S - 1 - y);
      if (cx === 0 && cy === 0) continue;
      const ring = Math.min(cx, cy);
      if (ring === 0) plot(g, x, y, 'x');
      else if (ring <= 3) {
        const lit = x < S - 1 - y;
        plot(g, x, y, ring === 1 ? (lit ? '3' : '1') : ring === 3 ? '0' : lit ? '2' : '1');
      }
    }
  }
  // The audit lamp, top right: always on.
  plot(g, 41, 2, 'd');
  plot(g, 42, 2, 'e');
  // A barcode on the bottom bezel: it has been inventoried.
  for (const x of [7, 8, 10, 13, 14, 16, 18, 19]) plot(g, x, 45, '0');
}

/** The screen's grey glass, scanlines on alternating rows (`phase` flips them). */
function screen(g: CharGrid, phase: number): void {
  for (let y = 4; y < S - 4; y++) {
    for (let x = 4; x < S - 4; x++) plot(g, x, y, (y + phase) % 2 === 0 ? 'A' : 'B');
  }
  line(g, 6, 9, 10, 5, 'C');
  line(g, 6, 11, 12, 5, 'C');
}

/** Prim: a boxy steel head on a narrow chassis, an antenna, the visor and the grille. */
function drone(g: CharGrid, phase: number): void {
  // The chassis below the head: narrow shoulders and a hazard-striped compliance collar.
  for (let y = 34; y < S - 4; y++) {
    for (let x = 12; x <= 35; x++) plot(g, x, y, x < 14 ? '3' : x > 32 ? '0' : '1');
  }
  for (let x = 14; x <= 33; x++) plot(g, x, 34, (x + phase) % 4 < 2 ? 'd' : 'k');
  // The head: a rounded box, lit from the upper left.
  for (let y = 9; y <= 33; y++) {
    for (let x = 9; x <= 38; x++) {
      const cx = Math.min(x - 9, 38 - x);
      const cy = Math.min(y - 9, 33 - y);
      if (cx + cy < 2) continue;
      let ch = '2';
      if (x < 13 || y < 12) ch = '3';
      if (x < 11 && y < 14) ch = '4';
      if (x > 35 || y > 30) ch = '1';
      if (cx === 0 || cy === 0) ch = 'x';
      plot(g, x, y, ch);
    }
  }
  // Panel seams and four rivets.
  line(g, 10, 24, 37, 24, '1');
  for (const [x, y] of [
    [11, 11],
    [36, 11],
    [11, 31],
    [36, 31],
  ] as const)
    plot(g, x, y, '4');
  // The antenna, its tip blinking orange.
  line(g, 31, 4, 31, 8, '1');
  line(g, 32, 5, 32, 8, '0');
  plot(g, 31, 4, 'e');
  // The visor: a wide dark band across the face.
  for (let y = 13; y <= 22; y++) {
    for (let x = 12; x <= 35; x++) {
      const edge = y === 13 || y === 22 || x === 12 || x === 35;
      plot(g, x, y, edge ? 'E' : (y + phase) % 2 === 0 ? 'k' : 'D');
    }
  }
  // A glint across the visor glass.
  line(g, 14, 15, 15, 14, 'C');
}

// The visor's eyes: a 20×6 stamp at (14, 15), orange LED (`d`, `e` its hot core).
// prettier-ignore
const EYES: Readonly<Record<string, readonly string[]>> = {
  // Two level bars: attentive, impartial.
  neutral: [
    '....................',
    '....................',
    '..dddddd....dddddd..',
    '..deeeed....deeeed..',
    '..dddddd....dddddd..',
    '....................',
  ],
  // The mandated smile: two arcs, sincerity at 61%.
  happy: [
    '....................',
    '...dddd......dddd...',
    '..de..ed....de..ed..',
    '..d....d....d....d..',
    '....................',
    '....................',
  ],
  // Small, high, wavering, under a pair of raised bars.
  worried: [
    '..ddd..........ddd..',
    '.....dd......dd.....',
    '....................',
    '....ddd......ddd....',
    '....ded......ded....',
    '....ddd......ddd....',
  ],
  // Two bars slanted to a V: a violation.
  angry: [
    '..dd..............dd',
    '..dedd..........dded',
    '...ddedd......ddedd.',
    '.....dded....dedd...',
    '.......dd....dd.....',
    '....................',
  ],
  // Bars drooping at the outer ends.
  sad: [
    '....................',
    '....................',
    '.....dddd..dddd.....',
    '...ddeedd..ddeedd...',
    '..dd............dd..',
    '....................',
  ],
};

/** The speaker grille under the visor; it lights orange while Prim talks. */
function grille(g: CharGrid, talk: boolean, expression: string): void {
  for (let i = 0; i < 3; i++) {
    const y = 26 + i * 2;
    // Talking lights the slits, the middle one widest; at rest they are dark slots.
    const half = talk ? (i === 1 ? 5 : 4) : 4;
    for (let x = 24 - half; x < 24 + half; x++) plot(g, x, y, talk ? (i === 1 ? 'e' : 'd') : 'k');
  }
  // `angry` adds a red violation light by the grille.
  if (expression === 'angry') {
    plot(g, 34, 27, 'R');
    plot(g, 34, 28, 'R');
  }
}

/** The clipboard, held up on a thin arm: ruled lines, ticks, and one red cross. */
function clipboard(g: CharGrid): void {
  // The arm, from the chassis up to the board.
  line(g, 35, 40, 38, 38, '2');
  line(g, 35, 41, 38, 39, '1');
  // The board: masonite brown, the paper, the steel clip.
  for (let y = 25; y <= 43; y++) {
    for (let x = 31; x <= 43; x++) {
      const edge = x === 31 || x === 43 || y === 25 || y === 43;
      plot(g, x, y, edge ? 'H' : x === 32 || x === 42 || y === 42 ? 'G' : 'W');
    }
  }
  stamp(g, 34, 24, ['x444x', 'x3331']);
  // Ruled lines with ticks (teal: approved), and one red cross.
  for (let i = 0; i < 4; i++) {
    const y = 28 + i * 3;
    line(g, 37, y, 41, y, 'V');
    if (i === 2) stamp(g, 33, y - 1, ['R.R', '.R.', 'R.R']);
    else stamp(g, 33, y - 1, ['..T', 'T.T', '.T.']);
  }
}

function paint({ expression, mouth, scan }: PaintArgs): CharGrid {
  const g = grid(S, S);
  const phase = scan ? 1 : 0;
  bezel(g);
  screen(g, phase);
  drone(g, phase);
  stamp(g, 14, 15, EYES[expression] ?? EYES['neutral'] ?? []);
  grille(g, mouth === 'talk', expression);
  clipboard(g);
  return g;
}

export const portraitPrim = definePortrait({
  id: 'portrait.prim',
  palette: 'everglow',
  // prettier-ignore
  legend: {
    A: 'steel.0', B: 'ink.2', C: 'steel.1', D: 'ink.2', E: 'ink.0',
    G: 'grime.3', H: 'grime.1', W: 'white.0', V: 'steel.3', T: 'teal.2', R: 'red.3',
  },
  expressions: ['neutral', 'happy', 'worried', 'angry', 'sad'],
  scanlines: true,
  paint,
});
