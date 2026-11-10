// Ves'thara's portrait (`portrait.vesthara`; story/characters.md § Ves'thara, story/races.md §
// Aelari, art-direction §4 and § Portrait roster): an unthreaded Aelari weaver-psion, the "Glass
// Witch". Tall and slender, a body of woven lumenglass thread (sapphire and emerald, ruby at the
// knots) lit from inside, never plated or faceted. Her head is framed by a tall open-weave veil of
// the same thread, with real see-through gaps; dark robes woven from it hang from her shoulders.
// Her eyes are two bright knots of light. At her collar one thread is cut: its loose end hangs out
// of the weave, dimmer than the rest (the unthreading). She speaks without contractions; her face
// does the work: brows of thread, the knots' shape and brightness, and a mouth that is a seam in
// the weave, which opens on her inner light when she talks.
import { grid, line, plot, type CharGrid } from '../helpers.ts';
import { definePortrait, outlineInPlace, PORTRAIT_SIZE, type PaintArgs } from './portrait.ts';

const S = PORTRAIT_SIZE;
/** The head's center column, and the eye and mouth rows. */
const CX = 23.5;
const EYE_Y = 18;
const MOUTH_Y = 25;
/** A lattice gap while painting (a dim fill, so the outline pass skips it), punched out after. */
const HOLE = 'H';

/** The cut thread's pixels at her collar (the unthreading), for the sprite test. */
export const VESTHARA_CUT_THREAD: readonly (readonly [number, number])[] = [
  [30, 35],
  [30, 36],
  [31, 37],
  [31, 38],
  [32, 39],
  [31, 40],
  [33, 40],
];

function put(g: CharGrid, x: number, y: number, src: readonly string[]): void {
  src.forEach((r, dy) => {
    for (let dx = 0; dx < r.length; dx++) {
      const ch = r.charAt(dx);
      if (ch !== '.') plot(g, x + dx, y + dy, ch);
    }
  });
}

/** Inside the head: a long oval narrowing to a slender chin. */
function inHead(x: number, y: number): boolean {
  const py = y + 0.5;
  const rx = py < 18 ? 7.6 : 7.6 - (py - 18) * 0.28;
  const nx = (x + 0.5 - CX) / rx;
  const ny = (py - 18.5) / 12.5;
  return nx * nx + ny * ny <= 1;
}

/** Inside the veil's outer edge: a tall pointed arch around the head, down to the shoulders. */
function inVeil(x: number, y: number): boolean {
  const py = y + 0.5;
  const nx = (x + 0.5 - CX) / 14.5;
  const ny = (py - 23) / 22.5;
  // Pointed at the crown: the arch narrows faster above the eyes.
  const pinch = py < 12 ? 1 + (12 - py) * 0.035 : 1;
  return (nx * pinch) ** 2 + ny ** 2 <= 1 && py > 1;
}

/**
 * The weave: two diagonal thread sets `step` pixels apart. Where they cross is a knot; every
 * other knot is ruby (the rest are bright emerald).
 */
function weave(x: number, y: number, step = 4): 'a' | 'b' | 'knot' | 'ruby' | null {
  const a = (x + y) % step === 0;
  const b = (x - y + 96) % step === 0;
  if (a && b) return ((x + y) / step) % 2 === 0 ? 'ruby' : 'knot';
  if (a) return 'a';
  if (b) return 'b';
  return null;
}

/**
 * The veil, behind the head: an open lattice with see-through gaps and a solid thread along its
 * rim. Gaps are painted `HOLE` and listed in `holes`, punched out after the outline pass so the
 * panel shows through.
 */
function veil(g: CharGrid, holes: [number, number][]): void {
  for (let y = 0; y < 40; y++) {
    for (let x = 0; x < S; x++) {
      if (!inVeil(x, y)) continue;
      const rim = !inVeil(x - 1, y) || !inVeil(x + 1, y) || !inVeil(x, y - 1);
      // Lit from inside: the threads brighten toward the head.
      const near = Math.hypot((x + 0.5 - CX) / 14.5, (y + 0.5 - 17) / 20) < 0.7;
      if (rim) {
        plot(g, x, y, near ? '3' : '2');
        continue;
      }
      const w = weave(x, y, 6);
      if (w === 'ruby') plot(g, x, y, 'd');
      else if (w === 'knot') plot(g, x, y, '9');
      else if (w === 'a') plot(g, x, y, near ? '8' : '7');
      else if (w === 'b') plot(g, x, y, near ? '3' : '2');
      else {
        plot(g, x, y, HOLE);
        holes.push([x, y]);
      }
    }
  }
}

/** Dark robes woven from the same thread, hanging from slender shoulders, open at the front. */
function robes(g: CharGrid): void {
  for (let y = 34; y < S; y++) {
    const t = y - 34;
    const half = Math.min(21, 8 + Math.round(Math.sqrt(t) * 4));
    const x0 = Math.round(CX - half);
    const x1 = Math.round(CX + half);
    for (let x = x0; x <= x1; x++) {
      // Deep emerald, a faint weave in it, its threads catching the light on the shoulders.
      const w = weave(x, y, 6);
      let ch = w === 'a' ? '6' : '5';
      if (w === 'ruby') ch = 'b';
      if (x - x0 < 1 || (t < 2 && x < CX)) ch = '7';
      if (x1 - x < 1) ch = '6';
      // Long folds down the drape.
      if ((x === x0 + 5 || x === x1 - 5) && t > 4) ch = '1';
      plot(g, x, y, ch);
    }
  }
  // The open front: her woven chest in a narrowing V, a knot of light at its heart.
  for (let y = 36; y < 44; y++) {
    const w = Math.max(0, 2 - Math.floor((y - 36) / 3));
    for (let x = Math.round(CX - w - 0.5); x <= Math.round(CX + w - 0.5); x++) {
      const wv = weave(x, y);
      plot(g, x, y, wv === 'ruby' ? 'd' : wv !== null ? '3' : '2');
    }
    plot(g, Math.round(CX - w - 0.5) - 1, y, '8');
    plot(g, Math.round(CX + w - 0.5) + 1, y, '7');
  }
  put(g, 22, 37, ['.+.', '+*+', '.+.']);
}

/** The slender neck, woven open (the panel shows between its threads), and the collar. */
function neck(g: CharGrid, holes: [number, number][]): void {
  for (let y = 28; y <= 34; y++) {
    for (let x = 21; x <= 26; x++) {
      const wv = weave(x, y);
      if (x === 21) plot(g, x, y, '3');
      else if (x === 26) plot(g, x, y, '1');
      else if (wv === 'ruby' || wv === 'knot') plot(g, x, y, '4');
      else if (wv !== null) plot(g, x, y, wv === 'a' ? '3' : '2');
      else if (y > 29) {
        plot(g, x, y, HOLE);
        holes.push([x, y]);
      } else plot(g, x, y, '1');
    }
  }
  // The collar: a raised woven band of emerald, one ruby thread running along it.
  for (let x = 14; x <= 33; x++) {
    plot(g, x, 34, (x + 1) % 3 === 0 ? '9' : '8');
    plot(g, x, 35, '7');
  }
  // The ruby thread, intact from the left to where it is cut; its loose end hangs out of the
  // weave, frayed in two (the unthreading).
  for (let x = 14; x <= 29; x++) plot(g, x, 35, x % 2 === 0 ? 'd' : 'c');
  for (const [x, y] of VESTHARA_CUT_THREAD) plot(g, x, y, 'd');
}

/**
 * The face: a long woven oval lit from inside, brightest at its heart (`blue.4`, a step over the
 * lattice's brightest thread, so her dark brows and sockets read on it; D134), in a dark frame.
 */
function head(g: CharGrid): void {
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (inHead(x, y)) continue;
      // A dark band where the veil meets her face, so the face reads apart from the lattice.
      const ring = inHead(x - 1, y) || inHead(x + 1, y) || inHead(x, y - 1) || inHead(x, y + 1);
      if (ring && y < 30) plot(g, x, y, '0');
    }
  }
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (!inHead(x, y)) continue;
      const d = Math.hypot((x + 0.5 - CX) / 7.6, (y + 0.5 - 19.5) / 11.5);
      // The heart of the face glows smooth; the fine weave shows toward its rim.
      const wv = weave(x, y);
      let ch = d < 0.55 ? '4' : d < 0.88 ? '3' : '2';
      if (d >= 0.55 && wv !== null) ch = d < 0.88 ? '4' : '3';
      plot(g, x, y, ch);
    }
  }
  // Where the veil's threads meet on her brow, a ruby knot.
  put(g, 22, 8, ['.d.', 'ded', '.d.']);
  // Cheekbones: a lit thread under each eye, a shadow beneath.
  line(g, 17, 22, 19, 23, '4');
  line(g, 30, 22, 28, 23, '4');
  line(g, 18, 24, 19, 25, '1');
  line(g, 29, 24, 28, 25, '1');
  // A thin bright thread down the bridge of the nose, shaded on the far side.
  line(g, 23, 17, 23, 22, '4');
  line(g, 24, 18, 24, 22, '2');
  // The slender chin, a shade under.
  line(g, 22, 30, 25, 30, '1');
}

// Brows and eyes per expression: a 14×9 stamp from (17, EYE_Y - 4). Each eye is a knot of light
// (a white core, teal ends) in a dim almond socket (`1`); the brows are single dark threads (`1`)
// across her lit face, so each expression reads at a glance (D134). The
// stamp's columns 2–5 and 8–11 are the eyes (x 19–22 and 25–28).
// prettier-ignore
const EYES: Readonly<Record<string, readonly string[]>> = {
  // Level brows, steady knots: formal, precise, watching.
  neutral: [
    '..............',
    '.11111..11111.',
    '..............',
    '..1++1..1++1..',
    '.1+**+11+**+1.',
    '..1++1..1++1..',
    '..............',
    '..............',
    '..............',
  ],
  // The rare dry smile: brows lifted, the knots creased into bright crescents.
  happy: [
    '..1111..1111..',
    '.1..........1.',
    '..............',
    '...++....++...',
    '..+**+..+**+..',
    '..1..1..1..1..',
    '..............',
    '..............',
    '..............',
  ],
  // Inner ends raised; the knots wide open, their light drawn long.
  worried: [
    '....11..11....',
    '..11......11..',
    '.1.++....++.1.',
    '..1++1..1++1..',
    '.1+**+11+**+1.',
    '..1++1..1++1..',
    '...11....11...',
    '..............',
    '..............',
  ],
  // Brows driven down to the bridge; the knots narrowed to hot slits. Shorter sentences.
  angry: [
    '..............',
    '.111......111.',
    '...111..111...',
    '..1111111111..',
    '.1+**+11+**+1.',
    '..1111..1111..',
    '..............',
    '..............',
    '..............',
  ],
  // Slack threads, inner ends lifted, outer ends fallen; the knots dimmed a step, and one light
  // falls from her eye like a tear.
  sad: [
    '..............',
    '....11..11....',
    '..11......11..',
    '.11881..18811.',
    '.18++8118++81.',
    '..1881..1881..',
    '...8..........',
    '...+..........',
    '..............',
  ],
};

// Mouths: a seam in the weave, an 8×3 stamp from (20, MOUTH_Y - 1). Talking parts the seam on her
// inner light (white at the core).
// prettier-ignore
const MOUTHS: Readonly<Record<string, { readonly closed: readonly string[]; readonly talk: readonly string[] }>> = {
  neutral: {
    closed: ['........', '..kkkk..', '...33...'],
    talk: ['..kkkk..', '.k+**+k.', '..kkkk..'],
  },
  happy: {
    closed: ['.k....k.', '..kkkk..', '...44...'],
    talk: ['.k....k.', '.kk**kk.', '..kkkk..'],
  },
  worried: {
    closed: ['........', '..kk.kk.', '....k...'],
    talk: ['...kk...', '..k+*k..', '...kk...'],
  },
  angry: {
    closed: ['........', '..kkkk..', '.k....k.'],
    talk: ['..kkkk..', '.k*++*k.', '.k....k.'],
  },
  sad: {
    closed: ['........', '...kk...', '.kk..kk.'],
    talk: ['...kk...', '..k++k..', '.kk..kk.'],
  },
};

function paint({ expression, mouth }: PaintArgs): CharGrid {
  const g = grid(S, S);
  const holes: [number, number][] = [];
  veil(g, holes);
  robes(g);
  neck(g, holes);
  head(g);
  put(g, 17, EYE_Y - 4, EYES[expression] ?? EYES['neutral'] ?? []);
  const m = MOUTHS[expression] ?? MOUTHS['neutral'];
  if (m !== undefined) put(g, 20, MOUTH_Y - 1, mouth === 'talk' ? m.talk : m.closed);
  outlineInPlace(g);
  // The lattice's gaps are real holes: the panel behind her shows through (art-direction §4).
  for (const [x, y] of holes) if (g[y]?.[x] === HOLE) plot(g, x, y, '.');
  return g;
}

export const portraitVesthara = definePortrait({
  id: 'portrait.vesthara',
  palette: 'aelari',
  legend: { H: 'blue.1' },
  expressions: ['neutral', 'happy', 'worried', 'angry', 'sad'],
  paint,
});
