// Kip's portrait (`portrait.kip`; story/characters.md § Kip, art-direction § Portrait roster): Kip
// "The Exterminator" Vandermeer, twenties, #1 on the Pest Bounty Board three quarters running.
// Lanky (a long neck, narrow sloping shoulders) in the Everglow teal technician jumpsuit, collar
// popped, a white Everglow cap on backwards (the snapback's gap on his forehead with a sandy tuft
// through it, the bill sticking out behind), sunglasses pushed up onto it, and the gold
// "#1 EXTERMINATOR" trophy pin on his chest. Breezy: his neutral is a smirk under one raised brow.
import { grid, line, plot, stamp, type CharGrid } from '../helpers.ts';
import { definePortrait, outlineInPlace, PORTRAIT_SIZE, type PaintArgs } from './portrait.ts';

const S = PORTRAIT_SIZE;
/** The head's center column and center row; the eye row. */
const CX = 23.5;
const CY = 21;
const EYE_Y = 21;

/** Inside the head: a long oval, narrowing to the chin. */
function inHead(x: number, y: number): boolean {
  const nx = (x + 0.5 - CX) / (y + 0.5 > CY ? 8.8 - (y + 0.5 - CY) * 0.2 : 8.8);
  const ny = (y + 0.5 - CY) / 11.5;
  return nx * nx + ny * ny <= 1;
}

/** The jumpsuit: narrow sloping shoulders, the collar popped, a zip, the trophy pin. */
function jumpsuit(g: CharGrid): void {
  // The long neck.
  for (let y = 29; y <= 37; y++) for (let x = 20; x <= 27; x++) plot(g, x, y, x > 25 ? 'A' : 'B');
  for (let y = 36; y < S; y++) {
    const t = y - 36;
    const half = Math.min(21, 8 + Math.round(Math.sqrt(t) * 4.6));
    for (let x = Math.round(CX - half); x <= Math.round(CX + half); x++) {
      const fromL = x - (CX - half);
      const fromR = CX + half - x;
      let ch = x > CX + 4 ? '7' : '8';
      if (fromL < 1.5) ch = '9';
      if (fromR < 2.5) ch = '6';
      plot(g, x, y, ch);
    }
  }
  // The zip, down the middle, and an Everglow chevron patch on his right shoulder.
  line(g, 24, 39, 24, 47, '6');
  line(g, 23, 39, 23, 47, '9');
  stamp(g, 10, 42, ['..4..', '.4c4.', '4c.c4']);
  // The popped collar: two stiff wings up the sides of his neck.
  stamp(g, 15, 33, ['...99', '..998', '.9988', '99887', '.8877']);
  stamp(g, 28, 33, ['77...', '776..', '7766.', '77665', '6655.']);
  // The "#1 EXTERMINATOR" trophy pin on his chest: a little gold cup on a base, a 1 on it.
  // prettier-ignore
  stamp(g, 28, 39, [
    'NMMMMN.',
    'NMOMMG.',
    '.MOMG..',
    '..MG...',
    '..MG...',
    '.GMMG..',
  ]);
}

function head(g: CharGrid): void {
  // Ears.
  stamp(g, 14, 19, ['.B', 'CB', 'CA', '.A']);
  stamp(g, 32, 19, ['B.', 'AB', 'AA', 'A.']);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (!inHead(x, y)) continue;
      const nx = (x + 0.5 - CX) / 8.4;
      const ny = (y + 0.5 - CY) / 11;
      let ch = 'C';
      if ((nx + 0.4) ** 2 + (ny - 0.05) ** 2 < 0.05) ch = 'D';
      if (nx > 0.5 || ny > 0.82) ch = 'B';
      plot(g, x, y, ch);
    }
  }
  // A long nose, lit down the bridge.
  stamp(g, 23, 21, ['C.', 'D.', 'DB', 'BA']);
  // Sideburns: sandy, under the cap.
  for (let y = 15; y <= 19; y++) {
    plot(g, 15, y, 'H');
    plot(g, 16, y, y < 18 ? 'I' : 'H');
    plot(g, 31, y, 'H');
    plot(g, 32, y, 'H');
  }
}

/** The backwards cap: a white crown, a teal panel band, an orange button, the bill behind. */
function cap(g: CharGrid): void {
  // The bill, sticking out behind his head to the right.
  // prettier-ignore
  stamp(g, 30, 7, [
    '....2211',
    '..322211',
    '.3322110',
    '.221100.',
  ]);
  // The crown: a dome over the top of his head.
  for (let y = 2; y <= 15; y++) {
    for (let x = 0; x < S; x++) {
      const nx = (x + 0.5 - CX) / 9.4;
      const ny = (y + 0.5 - 15) / 12.5;
      if (nx * nx + ny * ny > 1) continue;
      let ch = '4';
      if (nx > 0.3) ch = '3';
      if (nx > 0.7) ch = '2';
      // The panel seams, and the teal band round the bottom.
      if (Math.abs(x + 0.5 - CX) < 0.6 && y < 13) ch = '2';
      if (y >= 13) ch = nx > 0.5 ? '6' : '8';
      plot(g, x, y, ch);
    }
  }
  plot(g, 23, 2, 'c');
  plot(g, 24, 2, 'b');
  // The snapback gap over his forehead, a sandy tuft poking through it.
  // prettier-ignore
  stamp(g, 20, 12, [
    '.1111..',
    '1JIIH1.',
    '1IJIH1.',
    '.HJIH..',
    '..HI...',
  ]);
  // Sunglasses pushed up onto the cap: two dark lenses, a teal-pink sky in them.
  // prettier-ignore
  stamp(g, 14, 6, [
    'KKKKKKK....KKKKKKK',
    'KkkPkkK....KkPkkkK',
    'KkPkkkKKKKKKPkkkkK',
    '.KkkkK......KkkkK.',
  ]);
  // Sandy hair flicking out under the band at the back.
  stamp(g, 31, 15, ['IH', 'HH']);
  stamp(g, 15, 15, ['JI']);
}

// Brows and eyes, an 18×6 stamp at (15, EYE_Y − 4). H is a sandy brow, `k` the eyes, `w` the
// glints, A a lid's shadow.
// prettier-ignore
const EYES: Readonly<Record<string, readonly string[]>> = {
  // Smug: his left brow (screen right) cocked, lids half down.
  neutral: [
    '...........HHH....',
    '..HHHH....H...H...',
    '..................',
    '..AAAA.....AAAA...',
    '..kwkk.....kwkk...',
    '..................',
  ],
  // Both brows up, eyes squeezed into a grin.
  happy: [
    '..HHHH.....HHHH...',
    '..................',
    '..................',
    '...kk.......kk....',
    '..k..k.....k..k...',
    '..................',
  ],
  // Brows shoot up in the middle, eyes wide, pupils small.
  worried: [
    '.....HH...HH......',
    '..HHH.......HHH...',
    '..AAAA.....AAAA...',
    '..WWkW.....WkWW...',
    '..WWWW.....WWWW...',
    '...AA.......AA....',
  ],
  // Brows down to a scowl.
  angry: [
    '..H............H..',
    '...HHH.......HHH..',
    '......HH...HH.....',
    '..AAAAA...AAAAA...',
    '...kwk.....kwk....',
    '..................',
  ],
  // Inner brows lifted, looking down and away.
  sad: [
    '..................',
    '.....HH...HH......',
    '..HHH.......HHH...',
    '..AAAA.....AAAA...',
    '..AAAA.....AAAA...',
    '..kkw......kkw....',
  ],
};

// Mouths: a 10×4 stamp from (19, 26), closed and talking. The neutral smirk is lopsided.
// prettier-ignore
const MOUTHS: Readonly<Record<string, { readonly closed: readonly string[]; readonly talk: readonly string[] }>> = {
  neutral: {
    closed: ['........A.', '.......A..', '..AAAAA...', '..........'],
    talk: ['........A.', '..AAAAAA..', '..AkkkkA..', '...ARRA...'],
  },
  // A toothy, cocky grin, one tooth catching the light.
  happy: {
    closed: ['.A......A.', '.AAAAAAAA.', '..AWWwWA..', '...AAAA...'],
    talk: ['.A......A.', '.AAAAAAAA.', '..AWWwWA..', '...AkRA...'],
  },
  // A nervous grimace, teeth showing.
  worried: {
    closed: ['..........', '..AAAAAA..', '.AWAWAWAA.', '..AAAAAA..'],
    talk: ['..........', '..AAAAAA..', '.AWWWWWWA.', '..AkkkkA..'],
  },
  // A snarl.
  angry: {
    closed: ['..........', '..AAAAAA..', '.A.AAAA.A.', '..........'],
    talk: ['..........', '..AAAAAA..', '.AkkkkkkA.', '..AWWWWA..'],
  },
  sad: {
    closed: ['..........', '...AAAA...', '..A....A..', '.A......A.'],
    talk: ['..........', '...AAAA...', '..AkkkkA..', '.A......A.'],
  },
};

/** Worried: a bead of sweat by his temple. */
function sweat(g: CharGrid): void {
  stamp(g, 12, 15, ['.w', 'wU', 'UU']);
}

function paint({ expression, mouth }: PaintArgs): CharGrid {
  const g = grid(S, S);
  jumpsuit(g);
  head(g);
  cap(g);
  stamp(g, 15, EYE_Y - 4, EYES[expression] ?? EYES['neutral'] ?? []);
  const m = MOUTHS[expression] ?? MOUTHS['neutral'];
  if (m !== undefined) stamp(g, 19, 26, mouth === 'talk' ? m.talk : m.closed);
  if (expression === 'worried') sweat(g);
  outlineInPlace(g);
  return g;
}

export const portraitKip = definePortrait({
  id: 'portrait.kip',
  palette: 'everglow',
  // prettier-ignore
  legend: {
    A: 'skin.b.1', B: 'skin.b.2', C: 'skin.b.3', D: 'skin.b.4',
    H: 'brass.2', I: 'brass.3', J: 'brass.4',
    K: 'ink.3', P: 'pink.3', R: 'red.2', W: 'white.0', U: 'blue.4',
    G: 'gold.1', M: 'gold.3', N: 'gold.4', O: 'gold.0',
  },
  expressions: ['neutral', 'happy', 'worried', 'angry', 'sad'],
  paint,
});
