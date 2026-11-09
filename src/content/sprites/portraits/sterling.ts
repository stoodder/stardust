// Director Joy Sterling's portrait (`portrait.sterling`; story/characters.md § Sterling,
// art-direction § Portrait roster): in her forties, an impeccable Everglow-white suit with teal
// piping, the Evie sun brooch, a sharp geometric copper bob, very white teeth, and her stardust
// snow globe glowing violet on the desk in front of her. The fair-play tell: her smile is the same
// pixels in every expression. Expression patches touch only the eye and brow rows
// (STERLING_EYE_ROWS); the mouth band (STERLING_MOUTH_ROWS) changes only to talk, the same way
// whatever her eyes are doing.
import { disc, grid, line, plot, type CharGrid } from '../helpers.ts';
import { definePortrait, outlineInPlace, PORTRAIT_SIZE, type PaintArgs } from './portrait.ts';

const S = PORTRAIT_SIZE;
const CX = 24;
/** First and last rows the expressions may change (brows and eyes). */
export const STERLING_EYE_ROWS = { y0: 14, y1: 20 } as const;
/** First and last rows of the smile, identical across expressions. */
export const STERLING_MOUTH_ROWS = { y0: 23, y1: 27 } as const;

function put(g: CharGrid, x: number, y: number, src: readonly string[]): void {
  src.forEach((r, dy) => {
    for (let dx = 0; dx < r.length; dx++) {
      const ch = r.charAt(dx);
      if (ch !== '.') plot(g, x + dx, y + dy, ch);
    }
  });
}

function suit(g: CharGrid): void {
  // Shoulders: tailored, squared, white, lit from the upper left.
  for (let y = 33; y < S; y++) {
    const t = y - 33;
    const half = Math.min(23, 11 + Math.round(Math.sqrt(t) * 5.2));
    for (let x = CX - half; x < CX + half; x++) {
      const fromL = x - (CX - half);
      const fromR = CX + half - 1 - x;
      let ch = x > 30 ? '3' : '4';
      if (fromL < 2 || (t < 1 && x < 22)) ch = 'w';
      if (fromR < 3) ch = '2';
      plot(g, x, y, ch);
    }
  }
  // The neck, then the blouse's high teal collar in the V of the lapels.
  for (let y = 28; y <= 34; y++) for (let x = 20; x <= 27; x++) plot(g, x, y, x > 25 ? 'B' : 'C');
  for (let y = 34; y < S; y++) {
    const w = Math.max(0, 6 - Math.floor((y - 34) / 2));
    for (let x = CX - w; x < CX + w; x++) plot(g, x, y, x < CX - 1 ? '8' : '7');
  }
  // Lapels piped in teal: two lines from the collar down and out.
  line(g, CX - 7, 34, CX - 1, S - 1, '9');
  line(g, CX + 6, 34, CX, S - 1, '8');
  line(g, CX - 8, 34, CX - 2, S - 1, '3');
  line(g, CX + 7, 34, CX + 1, S - 1, '2');
  // The Evie sun brooch on her lapel: a gold sun with rays.
  put(g, 11, 38, ['..e..', '.QIQ.', 'eIJIe', '.QIQ.', '..e..']);
}

function snowGlobe(g: CharGrid): void {
  // On the desk in the frame's lower right: a glass dome glowing cold violet, flecks of stardust
  // drifting in it, on a brass foot.
  disc(g, 41.5, 40.5, 4.6, (d, x, y) => {
    if (d > 3.9) return 'V';
    const lit = x + y < 80;
    return lit ? 'U' : 'T';
  });
  for (const [x, y] of [
    [40, 38],
    [42, 40],
    [39, 41],
    [43, 38],
  ] as const)
    plot(g, x, y, 'w');
  plot(g, 39, 37, 'Z');
  for (let x = 37; x <= 46; x++) {
    plot(g, x, 45, x < 41 ? 'N' : 'M');
    plot(g, x, 46, 'M');
    plot(g, x, 47, 'L');
  }
}

/** Inside the face: an oval, a little narrower at the chin. */
function inFace(x: number, y: number): boolean {
  const nx = (x + 0.5 - CX) / (y > 20 ? 8.6 - (y - 20) * 0.32 : 8.6);
  const ny = (y + 0.5 - 19) / 11;
  return nx * nx + ny * ny <= 1;
}

function face(g: CharGrid): void {
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (!inFace(x, y)) continue;
      const nx = (x + 0.5 - CX) / 8.6;
      let ch = nx > 0.5 ? 'B' : 'C';
      if (nx < -0.2 && y < 22) ch = 'D';
      plot(g, x, y, ch);
    }
  }
  // Ears, mostly hidden by the bob; a small nose and its shadow.
  put(g, 23, 19, ['.D', '.C', 'CB']);
  // Blush, high on the cheeks.
  plot(g, 18, 22, 'P');
  plot(g, 19, 22, 'P');
  plot(g, 29, 22, 'O');
  plot(g, 30, 22, 'O');
  // Smile lines: she has been smiling like this for twenty years.
  plot(g, 18, 25, 'B');
  plot(g, 29, 25, 'B');
}

/** The geometric bob: a blunt fringe, sides cut in straight lines to the jaw, a lit sheen. */
function bob(g: CharGrid): void {
  for (let y = 3; y <= 30; y++) {
    for (let x = 0; x < S; x++) {
      const dx = x + 0.5 - CX;
      // The crown is a dome; below it the sides fall straight, angled longer toward the front.
      const crown = Math.hypot(dx / 12, (y + 0.5 - 15) / 12) <= 1 && y < 15;
      const side = y >= 15 && Math.abs(dx) <= 12 - (y - 15) * 0.05 && y <= 22 + Math.abs(dx) * 0.6;
      if (!crown && !side) continue;
      // The face shows through under the fringe and between the curtains.
      const fringe = y <= 13;
      const opening = Math.abs(dx) < 8.2 - Math.max(0, y - 25) * 0.6;
      if (!fringe && opening && inFace(x, y)) continue;
      const lit = dx < -3 || (dx < 0 && (x + y) % 2 === 0);
      let ch = lit ? 'G' : 'F';
      if (dx > 6) ch = 'E';
      plot(g, x, y, ch);
    }
  }
  // The fringe's blunt edge, and the sheen arcing across the crown.
  line(g, 16, 13, 31, 13, 'E');
  line(g, 15, 7, 19, 5, 'H');
  line(g, 20, 5, 23, 4, 'H');
  line(g, 14, 9, 16, 8, 'H');
  // The side part: a crisp line.
  line(g, 27, 4, 29, 9, 'E');
}

// Brows and eyes, a 17×7 stamp at (16, STERLING_EYE_ROWS.y0). Lashes and pupils are `k`, the iris
// teal `7`, the whites `W`, the brows `E`.
// prettier-ignore
const EYES: Readonly<Record<string, readonly string[]>> = {
  // Bright and wide: arched brows, lashes up.
  neutral: [
    '.EEE.......EEE...',
    'E...E.....E...E..',
    '.................',
    '.kkkk.....kkkk...',
    'kW7kW.....W7kWk..',
    '.WkkB.....BkkW...',
    '.................',
  ],
  // Smiling eyes: closed crescents, brows high.
  happy: [
    'EEEE.......EEEE..',
    '.................',
    '.................',
    '.kkkk.....kkkk...',
    'k....k...k....k..',
    '.................',
    '.................',
  ],
  // Brows up in the middle; eyes wide, pupils pinned.
  worried: [
    '....EE.....EE....',
    '.EEE.........EEE.',
    '.kkkk.....kkkk...',
    'kWWWW.....WWWWk..',
    '.WWkW.....WkWW...',
    '.WWWB.....BWWW...',
    '..BB.......BB....',
  ],
  // Brows driven down to a V; eyes narrowed. The smile does not move.
  angry: [
    'E................',
    '.EEE.......EEE...',
    '....EE...EE......',
    '.kkkkk...kkkkk...',
    '.W7kW.....W7kW...',
    '..BB.......BB....',
    '.................',
  ],
  // Inner brows lifted a little; lids low, looking down.
  sad: [
    '.....E.....E.....',
    '..EEE.......EEE..',
    'EE.............EE',
    '.kkkk.....kkkk...',
    '.BBBB.....BBBB...',
    '.Wk7W.....W7kW...',
    '.................',
  ],
};

// The smile: lipstick, a row of very white teeth, the same in every expression. Talking parts
// the teeth.
// prettier-ignore
const SMILE = {
  closed: [
    'R.........R',
    '.RRRRRRRRR.',
    '.RwwwwwwwR.',
    '..RwwwwwR..',
    '...RRRRR...',
  ],
  talk: [
    'R.........R',
    '.RRRRRRRRR.',
    '.RwwwwwwwR.',
    '..RkkkkkR..',
    '...RwwwR...',
  ],
} as const;

function paint({ expression, mouth }: PaintArgs): CharGrid {
  const g = grid(S, S);
  suit(g);
  face(g);
  bob(g);
  put(g, 16, STERLING_EYE_ROWS.y0, EYES[expression] ?? EYES['neutral'] ?? []);
  put(g, CX - 6, STERLING_MOUTH_ROWS.y0, mouth === 'talk' ? SMILE.talk : SMILE.closed);
  snowGlobe(g);
  outlineInPlace(g);
  return g;
}

export const portraitSterling = definePortrait({
  id: 'portrait.sterling',
  palette: 'everglow',
  // prettier-ignore
  legend: {
    B: 'skin.a.2', C: 'skin.a.3', D: 'skin.a.4', O: 'coral.2', P: 'coral.3', R: 'red.2',
    E: 'coral.0', F: 'coral.1', G: 'coral.2', H: 'coral.3', W: 'white.0',
    I: 'gold.3', J: 'gold.4', Q: 'gold.2',
    T: 'violet.2', U: 'violet.3', V: 'violet.1', Z: 'violet.4',
    L: 'brass.0', M: 'brass.1', N: 'brass.3',
  },
  expressions: ['neutral', 'happy', 'worried', 'angry', 'sad'],
  paint,
});
