// Kip's portrait (`portrait.kip`; story/characters.md § Kip, art-direction § Portrait roster): Kip
// "The Exterminator" Vandermeer, twenties, #1 on the Pest Bounty Board three quarters running.
// Lanky (a long neck, narrow sloping shoulders) in the Everglow teal technician jumpsuit, collar
// popped, a white Everglow cap on backwards (the snapback's gap on his forehead with a sandy tuft
// through it, the bill sticking out behind), sunglasses pushed up onto it, and the gold
// "#1 EXTERMINATOR" trophy pin on his chest. Breezy: his neutral is a smirk under one raised brow.
// Variant `act2` (Act II, Reclamation Lead at Second Harvest): a white reclamation-plant coat over
// the jumpsuit (its teal collar still popped up out of the coat's), the trophy pin moved to the
// coat's lapel, a pen in the breast pocket, and a faint pink-gold smear of stardust on the pocket.
// Variant `act3` (Act III, A3M5's briefing on; characters.md § Kip, act3.md § A3M5): the cap and
// sunglasses gone, his sandy hair flat and uncombed; the same coat, its collar lying down (nothing
// popped), and the pin gone from his lapel, leaving its two pinholes; tired eyes (heavy lids, bags
// under them), a day's stubble, a quieter face in every expression (no smirk, no toothy grin), and
// the ledger held flat to his chest in both hands: a worn brass-brown binder, a white label, its
// pages' edge showing.
import { grid, line, plot, stamp, type CharGrid } from '../helpers.ts';
import { paintPartyHat } from './partyHat.ts';
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

/**
 * The `act2` reclamation coat over the jumpsuit: white, lit from the left, open in a V on the
 * teal jumpsuit and its zip, broad lapels, the trophy pin on his left lapel, a breast pocket with a
 * pen, and the faint pink-gold smear on it: the plant's product, which he hasn't looked at.
 */
function coat(g: CharGrid, act3 = false): void {
  for (let y = 36; y < S; y++) {
    const t = y - 36;
    const half = Math.min(21, 8 + Math.round(Math.sqrt(t) * 4.6));
    const x0 = Math.round(CX - half);
    const x1 = Math.round(CX + half);
    // The V between the lapels narrows from the collar to a point low on his chest; each lapel's
    // outer fold runs parallel to it, 3 pixels out.
    const open = Math.max(0, 3.6 - t * 0.42);
    for (let x = x0; x <= x1; x++) {
      const dx = Math.abs(x + 0.5 - CX);
      const right = x > CX;
      let ch = right ? (x > CX + 9 ? '2' : '3') : '4';
      if (x - x0 < 1.5) ch = '3';
      if (x1 - x < 2.5) ch = '1';
      if (dx <= open) ch = right ? '7' : '8';
      else if (dx <= open + 3 && t < 9) ch = right ? '3' : '4';
      else if (dx <= open + 4 && t < 9) ch = '1';
      // The lapel's inner edge, where the coat folds back from the V.
      if (dx > open && dx <= open + 1 && t < 10) ch = right ? '2' : '3';
      plot(g, x, y, ch);
    }
  }
  // The jumpsuit's zip down the V.
  line(g, 23, 36, 23, 39, '9');
  line(g, 24, 36, 24, 39, '6');
  // A shade where the coat falls from each shoulder.
  line(g, 11, 43, 10, 47, '3');
  line(g, 37, 42, 38, 47, '1');
  // The breast pocket (his right, screen left): a teal pen clipped in it, the faint pink-gold smear.
  // prettier-ignore
  stamp(g, 12, 42, [
    '..6....',
    '..7....',
    '2222222',
    '..EF...',
    '...E...',
  ]);
  if (act3) {
    // The jumpsuit's collar lies down round his neck now, and the pin is gone: two pinholes in the
    // lapel where it sat.
    stamp(g, 18, 35, ['99888.7766', '.98....76.']);
    for (const [x, y] of KIP_PINHOLES) plot(g, x, y, '1');
    return;
  }
  // The popped jumpsuit collar still stands up out of the coat's.
  stamp(g, 15, 33, ['...99', '..998', '.9988', '99887', '.4887']);
  stamp(g, 28, 33, ['77...', '776..', '7766.', '77663', '7663.']);
  // The pin, still on: on his left lapel.
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

// `act3`: the same stamps' places, a quieter face. Lids heavy (`A`) over every eye, bags under
// them (`B`), the cocked brow and the smirk gone.
// prettier-ignore
const EYES_ACT3: Readonly<Record<string, readonly string[]>> = {
  // Level, low brows; lids half down; looking at you, tired.
  neutral: [
    '..................',
    '..HHHH.....HHHH...',
    '..................',
    '..AAAA.....AAAA...',
    '..kkwk.....kwkk...',
    '...BBB......BBB...',
  ],
  // Not a grin any more: brows eased up, eyes softened half shut.
  happy: [
    '..................',
    '..HHHH.....HHHH...',
    '..................',
    '..AAAA.....AAAA...',
    '..AkkA.....AkkA...',
    '..BBBB.....BBBB...',
  ],
  // Brows up in the middle, eyes wide over the bags.
  worried: [
    '.....HH...HH......',
    '..HHH.......HHH...',
    '..AAAA.....AAAA...',
    '..WWkW.....WkWW...',
    '..WWWW.....WWWW...',
    '...BBB......BBB...',
  ],
  // Brows down, jaw set: angry at himself.
  angry: [
    '..................',
    '..HHH.......HHH...',
    '.....HH...HH......',
    '..AAAAA...AAAAA...',
    '...kwk.....kwk....',
    '...BBB......BBB...',
  ],
  // Inner brows lifted, looking down at the ledger.
  sad: [
    '..................',
    '.....HH...HH......',
    '..HHH.......HHH...',
    '..AAAA.....AAAA...',
    '..AAAA.....AAAA...',
    '..kkw......kkw....',
  ],
};

// prettier-ignore
const MOUTHS_ACT3: Readonly<Record<string, { readonly closed: readonly string[]; readonly talk: readonly string[] }>> = {
  // A flat line: he speaks in complete sentences, quietly.
  neutral: {
    closed: ['..........', '..........', '..AAAAA...', '..........'],
    talk: ['..........', '..AAAAA...', '..AkkkA...', '...AAA....'],
  },
  // A small closed smile.
  happy: {
    closed: ['..........', '..A....A..', '...AAAA...', '..........'],
    talk: ['..........', '..AAAAAA..', '..AkkkkA..', '...AAAA...'],
  },
  // Lips pressed into a wobble.
  worried: {
    closed: ['..........', '...AA.AA..', '..A..A....', '..........'],
    talk: ['..........', '...AAAA...', '..AkkkkA..', '...AAAA...'],
  },
  // Teeth set.
  angry: {
    closed: ['..........', '..AAAAAA..', '..........', '..........'],
    talk: ['..........', '..AAAAAA..', '..AWWWWA..', '..AAAAAA..'],
  },
  sad: {
    closed: ['..........', '...AAAA...', '..A....A..', '..........'],
    talk: ['..........', '...AAAA...', '..AkkkkA..', '..A....A..'],
  },
};

/** `act3`: bare-headed, his sandy hair flat and uncombed, uneven locks falling over his brow. */
function hair(g: CharGrid): void {
  // How far each column's fringe falls (rows), left to right across his brow.
  const fringe = [13, 14, 15, 14, 13, 14, 15, 15, 14, 13, 14, 15, 14, 13, 14, 13, 13];
  for (let y = 7; y <= 15; y++) {
    for (let x = 0; x < S; x++) {
      const nx = (x + 0.5 - CX) / 9.2;
      const ny = (y + 0.5 - 14) / 6.6;
      if (nx * nx + ny * ny > 1) continue;
      const f = fringe[x - 15];
      if (y > 12 && (f === undefined ? y > 14 : y > f)) continue;
      let ch = nx < -0.4 && y < 12 ? 'J' : nx < 0.3 ? 'I' : 'H';
      // Darker strands run through it, and the locks' tips are in shadow.
      if ((x * 3 + y * 5) % 7 === 0) ch = 'H';
      if (f !== undefined && y === f && y > 12) ch = 'H';
      plot(g, x, y, ch);
    }
  }
  // A cowlick that won't lie down.
  stamp(g, 26, 5, ['.H', 'IH']);
}

/** `act3`: a day's stubble along his jaw. */
function stubble(g: CharGrid): void {
  for (const [x, y] of [
    [18, 28],
    [20, 30],
    [22, 31],
    [25, 31],
    [27, 30],
    [29, 28],
    [21, 29],
    [26, 29],
  ] as const)
    plot(g, x, y, 'B');
}

/** `act3`: the two pinholes on his lapel where the #1 pin sat (for the sprite test). */
export const KIP_PINHOLES: readonly (readonly [number, number])[] = [
  [31, 40],
  [33, 40],
];

/** Where the `act3` ledger sits on his chest (for the sprite test). */
export const KIP_LEDGER: Readonly<Record<'x0' | 'y0' | 'x1' | 'y1', number>> = {
  x0: 12,
  y0: 36,
  x1: 29,
  y1: 47,
};

/**
 * `act3`: the ledger, held flat to his chest: a thick, worn brass-brown binder (a dark spine on
 * the left, its top lit), the white edge of its pages along the top and the right, a white label
 * with two ruled lines; one long hand round its spine, the other over the pages' edge.
 */
function ledger(g: CharGrid): void {
  const { x0, y0, x1, y1 } = KIP_LEDGER;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      let ch = x <= x0 + 2 ? 'Y' : 'X';
      if (y === y0 + 1 && x > x0 + 2) ch = 'Z';
      // The pages' edge, white ruled in steel, along the top and the right.
      if (y === y0 && x > x0) ch = x % 2 === 0 ? 'W' : 'V';
      if (x === x1 && y > y0) ch = y % 2 === 0 ? 'W' : 'V';
      if (x === x1 - 1 && y > y0) ch = 'Y';
      plot(g, x, y, ch);
    }
  }
  // Scuffs on the cover.
  plot(g, 24, 45, 'Z');
  plot(g, 25, 46, 'Z');
  // The label: white, two ruled lines.
  // prettier-ignore
  stamp(g, 17, 39, [
    'WWWWWWWW',
    'WTTTTTTW',
    'WWWWWWWW',
    'WTTTTWWW',
    'WWWWWWWW',
  ]);
  // His right hand (screen left) round the spine; his left over the pages' edge.
  stamp(g, 10, 40, ['.CC.', 'CCCC', 'BCCC', 'BCCB', '.BB.']);
  stamp(g, 27, 42, ['.CC.', 'CCCC', 'CCCB', 'BCBB', '.BB.']);
}

/** Worried: a bead of sweat by his temple. */
function sweat(g: CharGrid): void {
  stamp(g, 12, 15, ['.w', 'wU', 'UU']);
}

function paint({ expression, variant, mouth }: PaintArgs): CharGrid {
  const g = grid(S, S);
  const act3 = variant === 'act3';
  jumpsuit(g);
  if (variant === 'act2' || act3) coat(g, act3);
  head(g);
  if (act3) {
    hair(g);
    stubble(g);
  } else cap(g);
  const eyes = act3 ? EYES_ACT3 : EYES;
  const mouths = act3 ? MOUTHS_ACT3 : MOUTHS;
  stamp(g, 15, EYE_Y - 4, eyes[expression] ?? eyes['neutral'] ?? []);
  const m = mouths[expression] ?? mouths['neutral'];
  if (m !== undefined) stamp(g, 19, 26, mouth === 'talk' ? m.talk : m.closed);
  if (expression === 'worried') sweat(g);
  if (act3) ledger(g);
  if (variant === 'party_hat') {
    // On top of the backwards cap, naturally.
    paintPartyHat(g, {
      base: [16, 7],
      tip: [8, 0],
      halfWidth: 4.5,
      ink: { stripe: 'd', stripeShade: 'c', gold: 'M', goldShade: 'L', pom: 'w', pomShade: '4' },
    });
  }
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
    E: 'pink.4', F: 'gold.4',
    T: 'steel.1', V: 'steel.3', X: 'brass.1', Y: 'brass.0', Z: 'brass.2',
    // The party hat's shaded gold (`party_hat`).
    L: 'gold.2',
  },
  expressions: ['neutral', 'happy', 'worried', 'angry', 'sad'],
  variants: ['act2', 'act3', 'party_hat'],
  paint,
});
