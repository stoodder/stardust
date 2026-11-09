// The player's portrait (`portrait.player`; story/characters.md § The protagonist, art-direction
// § Portrait roster): an oversized Everglow helmet, white and teal with the JPT-1 decal, and a
// mirrored visor that is always down. No face is ever drawn, so the player owns it whatever name
// and pronouns they choose; the bust under it is a plain teal jumpsuit with the lettuce-leaf
// Gardens patch. Expressions read through the helmet's body language and comic marks (a thumbs-up,
// a sweat drop, an anger mark, a droop) and the visor's reflection. Talking blinks the mic tip.
// Variant `reflect_confetti` (Act I's party) puts confetti in the visor.
import { at, grid, line, plot, type CharGrid } from '../helpers.ts';
import { definePortrait, outlineInPlace, PORTRAIT_SIZE, type PaintArgs } from './portrait.ts';

const S = PORTRAIT_SIZE;

/** Per-expression pose: the helmet's vertical offset and the visor's brightness step. */
const POSE: Readonly<Record<string, { readonly dy: number; readonly dim: number }>> = {
  neutral: { dy: 0, dim: 0 },
  happy: { dy: -1, dim: 0 },
  worried: { dy: 1, dim: 0 },
  angry: { dy: 1, dim: 0 },
  sad: { dy: 2, dim: 1 },
};

/** The visor's reflection, top to bottom: sky (dark to light), horizon, then the Gardens. */
const VISOR_SKY = ['A', 'B', 'B', 'C', 'C', 'D', 'D', 'E'] as const;
const VISOR_DIM: Readonly<Record<string, string>> = { E: 'D', D: 'C', C: 'B', B: 'A', w: 'E' };

function jumpsuit(g: CharGrid, slump: number): void {
  // Shoulders: a rounded trapezoid in teal, lit from the upper left, cut by the frame's bottom.
  for (let y = 35 + slump; y < S; y++) {
    const t = y - (35 + slump);
    const half = Math.min(22, 12 + Math.round(Math.sqrt(t) * 4.2));
    for (let x = 24 - half; x < 24 + half; x++) {
      const edgeL = x - (24 - half);
      const edgeR = 24 + half - 1 - x;
      // Lit from the upper left: a bright shoulder line, the far side in shade.
      let ch = x >= 31 ? '6' : '7';
      if (edgeL <= 2) ch = '8';
      if (edgeR <= 1) ch = '5';
      if (t <= 1) ch = x < 30 ? '9' : '8';
      else if (t === 2 && (edgeL <= 4 || edgeR <= 4)) ch = x < 24 ? '9' : '7';
      plot(g, x, y, ch);
    }
  }
  // The suit's seams: a center zip and shoulder seams.
  for (let y = 38 + slump; y < S; y++) plot(g, 24, y, '6');
  for (let y = 41 + slump; y < S; y++) plot(g, 25, y, '8');
  // The lettuce-leaf Gardens patch on the chest: a leaf on a white roundel.
  const px = 32;
  const py = 41 + slump;
  for (const [x, y, ch] of [
    [1, 0, '4'],
    [2, 0, '4'],
    [3, 0, '4'],
    [0, 1, '4'],
    [4, 1, '3'],
    [0, 2, '4'],
    [4, 2, '3'],
    [0, 3, '3'],
    [4, 3, '3'],
    [1, 4, '3'],
    [2, 4, '3'],
    [3, 4, '3'],
    [1, 1, 'R'],
    [2, 1, 'W'],
    [3, 1, 'R'],
    [1, 2, 'V'],
    [2, 2, 'W'],
    [3, 2, 'R'],
    [1, 3, 'V'],
    [2, 3, 'V'],
    [3, 3, 'V'],
  ] as const)
    plot(g, px + x, py + y, ch);
}

function collar(g: CharGrid, dy: number): void {
  // The helmet's neck seal: a steel ring between helmet and suit.
  for (let y = 33 + dy; y <= 36 + dy; y++) {
    for (let x = 14; x <= 33; x++) {
      plot(g, x, y, y === 33 + dy ? '2' : x < 20 ? '3' : x > 29 ? '1' : '2');
    }
  }
  for (let x = 15; x <= 32; x += 4) plot(g, x, 35 + dy, '0');
}

function helmet(g: CharGrid, dy: number): void {
  const cx = 24;
  const cy = 19.5 + dy;
  const rx = 17.5;
  const ry = 16.5;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const nx = (x + 0.5 - cx) / rx;
      const ny = (y + 0.5 - cy) / ry;
      const d = Math.hypot(nx, ny);
      if (d > 1 || y > 34 + dy) continue;
      const lit = -0.62 * nx - 0.78 * ny;
      let ch = '3';
      if (lit > 0.55 && d > 0.45) ch = '4';
      else if (lit < -0.5 || d > 0.93) ch = lit > 0.2 ? '3' : '2';
      if (lit < -0.62 && d > 0.8) ch = '1';
      plot(g, x, y, ch);
    }
  }
  // The teal crest stripe from the crown to the visor.
  for (let y = 3 + dy; y <= 12 + dy; y++) {
    if (at(g, 23, y) === '.') continue;
    plot(g, 23, y, '9');
    plot(g, 24, y, '8');
    plot(g, 25, y, '7');
  }
  // The specular glint on the dome.
  for (const [x, y] of [
    [14, 8],
    [15, 7],
    [16, 6],
    [13, 10],
  ] as const)
    plot(g, x, y + dy, 'w');
  // The JPT-1 decal: an orange grade plate on the dome's right, a dark dash and the grade's bar.
  for (let y = 9; y <= 11; y++) for (let x = 30; x <= 36; x++) plot(g, x, y + dy, 'd');
  for (let x = 30; x <= 36; x++) plot(g, x, 11 + dy, 'c');
  for (const x of [31, 32, 33]) plot(g, x, 10 + dy, 'k');
  plot(g, 35, 9 + dy, 'k');
  plot(g, 35, 10 + dy, 'k');
  plot(g, 30, 9 + dy, 'e');
}

/** The visor's outline shape: a wide rounded band across the helmet's front. */
function inVisor(x: number, y: number, dy: number): boolean {
  const top = 14 + dy;
  const bottom = 29 + dy;
  if (y < top || y > bottom) return false;
  const r = y - top;
  const fromBottom = bottom - y;
  const inset = r === 0 ? 4 : r === 1 ? 2 : r === 2 ? 1 : fromBottom === 0 ? 5 : fromBottom === 1 ? 3 : fromBottom === 2 ? 1 : 0;
  return x >= 10 + inset && x <= 37 - inset;
}

/**
 * How deep the visor's top shadow reaches at column x: the band's lower edge reads as a brow line
 * (level, knitted down to the middle when angry, raised in the middle when worried or sad).
 */
function browDepth(expression: string, x: number): number {
  const t = Math.min(1, Math.abs(x + 0.5 - 24) / 13);
  switch (expression) {
    case 'angry':
      return Math.round(1 + 4 * (1 - t));
    case 'worried':
    case 'sad':
      return Math.round(1 + 3.4 * t);
    case 'happy':
      return 1;
    default:
      return 2;
  }
}

/** The horizon's bow: a frown (∩) normally, deeper when sad, a smile (∪) when happy. */
function horizonBow(expression: string, x: number): number {
  const k = ((x + 0.5 - 24) / 14) ** 2;
  if (expression === 'happy') return -Math.round(k * 3);
  return Math.round(k * (expression === 'sad' ? 3 : 2));
}

function visor(
  g: CharGrid,
  dy: number,
  dim: number,
  variant: string | null,
  expression: string,
): void {
  const top = 14 + dy;
  // The rim: a dark steel frame around the visor.
  for (let y = top - 1; y <= top + 16; y++) {
    for (let x = 8; x <= 39; x++) {
      if (inVisor(x, y, dy)) continue;
      const near =
        inVisor(x - 1, y, dy) || inVisor(x + 1, y, dy) || inVisor(x, y - 1, dy) || inVisor(x, y + 1, dy);
      if (near) plot(g, x, y, '1');
    }
  }
  for (let y = top; y <= top + 15; y++) {
    for (let x = 10; x <= 37; x++) {
      if (!inVisor(x, y, dy)) continue;
      const r = y - top;
      // The horizon bows down toward the visor's edges (it's curved glass).
      const bow = horizonBow(expression, x);
      const horizon = 9 + bow;
      let ch: string;
      if (r < horizon) ch = VISOR_SKY[Math.min(VISOR_SKY.length - 1, Math.max(0, r - bow + 1))] ?? 'C';
      else if (r === horizon) ch = 'w';
      else ch = r === horizon + 1 ? 'G' : 'H';
      for (let i = 0; i < dim; i++) ch = VISOR_DIM[ch] ?? ch;
      const brow = browDepth(expression, x);
      if (r < brow) ch = 'k';
      else if (r === brow) ch = 'A';
      plot(g, x, y, ch);
    }
  }
  // Two specular slashes across the upper left of the glass.
  const glare = dim > 0 ? 'D' : 'w';
  line(g, 14, top + 6, 19, top + 1, glare);
  line(g, 15, top + 6, 20, top + 1, dim > 0 ? 'C' : 'E');
  line(g, 18, top + 6, 21, top + 3, dim > 0 ? 'C' : 'E');
  if (variant === 'reflect_confetti') {
    // Confetti drifting across the reflection: a scatter of saturated flecks and two streamers.
    for (const [x, y, ch] of [
      [12, 4, 'P'],
      [17, 9, 'Q'],
      [22, 3, 'R'],
      [26, 6, 'S'],
      [31, 2, 'Q'],
      [34, 7, 'P'],
      [28, 10, 'R'],
      [20, 12, 'S'],
      [13, 11, 'Q'],
      [33, 12, 'P'],
      [24, 9, 'Q'],
      [30, 5, 'w'],
    ] as const) {
      if (inVisor(x, top + y, dy)) plot(g, x, top + y, ch);
    }
    for (const [x, y] of [
      [26, 1],
      [27, 2],
      [28, 2],
      [29, 3],
    ] as const)
      plot(g, x, top + y, 'P');
    for (const [x, y] of [
      [15, 13],
      [16, 12],
      [17, 13],
      [18, 12],
    ] as const)
      if (inVisor(x, top + y, dy)) plot(g, x, top + y, 'Q');
  }
}

/** The ear caps and the mic boom; its tip lights while the player talks. */
function earsAndMic(g: CharGrid, dy: number, talk: boolean): void {
  for (const ex of [6, 39]) {
    for (let y = 18; y <= 25; y++) {
      for (let x = ex; x <= ex + 2; x++) {
        const edge = y === 18 || y === 25;
        plot(g, x, y + dy, edge ? '1' : x === ex + (ex < 24 ? 0 : 2) ? '2' : '3');
      }
    }
  }
  plot(g, 7, 21 + dy, '8');
  plot(g, 7, 22 + dy, '7');
  // The boom runs from the left ear cap down under the visor's corner.
  line(g, 8, 26 + dy, 12, 30 + dy, '1');
  for (const [x, y] of [
    [13, 30],
    [14, 30],
    [13, 31],
    [14, 31],
  ] as const)
    plot(g, x, y + dy, talk ? '*' : y === 30 ? '6' : '5');
  if (talk) {
    // Sound ticks off the lit mic.
    plot(g, 16, 31 + dy, '9');
    plot(g, 17, 32 + dy, '9');
    plot(g, 15, 33 + dy, '9');
  }
}

function thumbsUp(g: CharGrid): void {
  // A gloved fist, thumb up, raised at the frame's lower left.
  const ox = 3;
  const oy = 33;
  // prettier-ignore
  const fist = [
    '...44....',
    '..4433...',
    '..4432...',
    '..4432...',
    '.344332..',
    '44444432.',
    '43333322.',
    '44444432.',
    '43333321.',
    '4444432..',
    '3333221..',
    '.88877...',
    '.87776...',
    '.87766...',
  ];
  fist.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) if (r.charAt(x) !== '.') plot(g, ox + x, oy + y, r.charAt(x));
  });
}

function sweatDrop(g: CharGrid, dy: number): void {
  // prettier-ignore
  const drop = ['..E.', '..E.', '.EDE', 'EDDC', 'EwDC', '.CC.'];
  drop.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) if (r.charAt(x) !== '.') plot(g, 40 + x, 6 + y + dy, r.charAt(x));
  });
}

function angerMark(g: CharGrid, dy: number): void {
  // The comic anger mark (four bent strokes) on the dome's upper right.
  // prettier-ignore
  const mark = ['.T..T.', 'TT..TT', '......', '......', 'TT..TT', '.T..T.'];
  mark.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) if (r.charAt(x) !== '.') plot(g, 33 + x, 1 + y + dy, r.charAt(x));
  });
}

function paint({ expression, variant, mouth }: PaintArgs): CharGrid {
  const pose = POSE[expression] ?? { dy: 0, dim: 0 };
  const g = grid(S, S);
  const slump = expression === 'sad' ? 1 : 0;
  jumpsuit(g, slump);
  collar(g, pose.dy);
  helmet(g, pose.dy);
  visor(g, pose.dy, pose.dim, variant, expression);
  earsAndMic(g, pose.dy, mouth === 'talk');
  if (expression === 'happy') thumbsUp(g);
  if (expression === 'worried') sweatDrop(g, pose.dy);
  if (expression === 'angry') angerMark(g, pose.dy);
  outlineInPlace(g);
  return g;
}

export const portraitPlayer = definePortrait({
  id: 'portrait.player',
  palette: 'everglow',
  // prettier-ignore
  legend: {
    A: 'blue.0', B: 'blue.1', C: 'blue.2', D: 'blue.3', E: 'blue.4',
    G: 'act1.grass.3', H: 'act1.grass.1',
    P: 'pink.3', Q: 'gold.3', R: 'green.3', S: 'coral.3', T: 'red.3',
    V: 'green.1', W: 'green.4',
  },
  expressions: ['neutral', 'happy', 'worried', 'angry', 'sad'],
  variants: ['reflect_confetti'],
  paint,
});
