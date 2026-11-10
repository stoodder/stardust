// Goldie's portrait (`portrait.goldie`; story/characters.md § Goldie, art-direction § Portrait
// roster): Marigold Pak, head horticulturist of the domes, in her thirties. Round-faced and
// freckled under a wide straw sun hat (a pink band and a marigold), dark hair in a bob, soil-stained
// green overalls over a white tee, a trowel in her bib pocket, and Duchess, her prize butterhead,
// in a terracotta pot under her arm. Chirpy: her neutral is already a smile.
// Variant `act3` (Act III, the Long Night; characters.md § Goldie): she runs the convoy now. A
// headlamp strapped over her bob, lit, the sun hat pushed off and hanging down her back on its pink
// cord (its brim shows behind her shoulders), and a clipboard in place of Duchess. Her face, brows
// and mouth are the base frame's, so every expression reads as it does there.
import { disc, grid, line, plot, stamp, type CharGrid } from '../helpers.ts';
import { definePortrait, outlineInPlace, PORTRAIT_SIZE, type PaintArgs } from './portrait.ts';

const S = PORTRAIT_SIZE;
/** The face's center column, and its center row. */
const CX = 22.5;
const CY = 25;
/** The eye row. */
const EYE_Y = 24;

/** Inside the round face (a little fuller at the cheeks). */
function inFace(x: number, y: number): boolean {
  const nx = (x + 0.5 - CX) / (y + 0.5 > CY ? 9.6 : 9.2);
  const ny = (y + 0.5 - CY) / 9.4;
  return nx * nx + ny * ny <= 1;
}

/** The overalls bust: shoulders in a white tee, the green bib and straps, soil stains, the trowel. */
function overalls(g: CharGrid): void {
  for (let y = 34; y < S; y++) {
    const t = y - 34;
    const half = Math.min(22, 10 + Math.round(Math.sqrt(t) * 5));
    for (let x = Math.round(CX - half); x <= Math.round(CX + half); x++) {
      const fromL = x - (CX - half);
      let ch = x > CX + 6 ? 'V' : 'W';
      if (fromL < 1.5) ch = 'V';
      plot(g, x, y, ch);
    }
  }
  // The neck, in the shade under her chin.
  for (let y = 32; y <= 35; y++)
    for (let x = 19; x <= 26; x++) plot(g, x, y, x > 24 || y < 34 ? 'A' : 'B');
  // The tee's round neckline.
  line(g, 17, 35, 19, 36, 'V');
  line(g, 26, 36, 28, 35, 'V');
  // The bib, up the middle of her chest, and its straps over the shoulders.
  for (let y = 38; y < S; y++) {
    for (let x = 14; x <= 31; x++) plot(g, x, y, x < 16 ? 'S' : x > 28 ? 'L' : 'N');
  }
  line(g, 14, 38, 31, 38, 'S');
  for (let i = 0; i < 3; i++) {
    line(g, 9 + i, 35, 14 + i, 39, i === 0 ? 'S' : 'N');
    line(g, 34 + i, 35, 30 + i, 39, i === 2 ? 'L' : 'N');
  }
  // Brass buttons where the straps meet the bib.
  plot(g, 15, 39, 'M');
  plot(g, 30, 39, 'M');
  // The bib pocket with a trowel in it, blade up.
  line(g, 17, 43, 25, 43, 'L');
  line(g, 17, 43, 17, 47, 'L');
  line(g, 25, 43, 25, 47, 'L');
  // The trowel, handle up out of the pocket: a wooden grip and a steel ferrule.
  stamp(g, 19, 38, ['.GE', 'GGE', 'GGE', '3E.', '42.']);
  // Soil stains: a smear on the bib, a knee-print of dirt on the strap.
  for (const [x, y] of [
    [26, 44],
    [27, 45],
    [25, 45],
    [27, 46],
    [12, 37],
    [13, 38],
  ] as const)
    plot(g, x, y, 'U');
}

function face(g: CharGrid, hatted: boolean): void {
  // Ears, peeking out under the bob.
  stamp(g, 12, 24, ['CB', 'CA', 'BA']);
  stamp(g, 32, 24, ['BC', 'AB', 'AB']);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (!inFace(x, y)) continue;
      const nx = (x + 0.5 - CX) / 9.4;
      let ch = 'C';
      if ((nx + 0.45) ** 2 + ((y + 0.5 - 27) / 9.4) ** 2 < 0.04) ch = 'D';
      if (nx > 0.55) ch = 'B';
      // The hat brim's shadow across her brow.
      if (hatted && y < 20) ch = nx > 0.4 ? 'A' : 'B';
      plot(g, x, y, ch);
    }
  }
  // A button nose, and a sprinkle of freckles across it and her cheeks.
  stamp(g, 22, 27, ['.D', 'BB']);
  for (const [x, y] of [
    [17, 27],
    [19, 28],
    [20, 27],
    [25, 27],
    [27, 28],
    [26, 27],
    [21, 26],
  ] as const)
    plot(g, x, y, 'B');
}

/** The bob: dark hair framing the face from under the hat, a fringe across the brow. */
function hair(g: CharGrid): void {
  for (let y = 15; y <= 32; y++) {
    for (let x = 0; x < S; x++) {
      const dx = x + 0.5 - CX;
      const side = Math.abs(dx) <= 12.2 && Math.abs(dx) >= 8.6 - (y > 26 ? (y - 26) * 0.5 : 0);
      const fringe = y <= 20 && Math.abs(dx) <= 10.5;
      if (!side && !fringe) continue;
      if (y > 30 && Math.abs(dx) < 9.5) continue;
      if (fringe && !side && y === 20 && (x + 1) % 4 === 0) continue;
      plot(g, x, y, dx < -2 ? 'G' : dx > 6 ? 'E' : 'F');
    }
  }
  // The fringe's uneven tips.
  for (const x of [15, 19, 23, 27]) plot(g, x, 21, 'F');
}

/** Bare-headed (`act3`): the crown of her bob, where the hat used to sit. */
function crownHair(g: CharGrid): void {
  for (let y = 9; y <= 19; y++) {
    for (let x = 0; x < S; x++) {
      const dx = x + 0.5 - CX;
      const ny = (y + 0.5 - 20) / 9.5;
      if ((dx / 12.4) ** 2 + ny * ny > 1) continue;
      // Lit from the upper left.
      plot(g, x, y, dx < -3 ? 'G' : dx > 5 ? 'E' : 'F');
    }
  }
}

/** The headlamp (`act3`): a dark strap round her head and the lamp on her brow, lit gold-white. */
function headlamp(g: CharGrid): void {
  for (let x = 11; x <= 34; x++) plot(g, x, Math.abs(x + 0.5 - CX) > 9 ? 16 : 15, '1');
  // The lamp housing, its lens lit.
  stamp(g, 20, 12, ['.22.', '2ww2', '2MM2', '.11.']);
}

/** The sun hat, pushed off and hanging down her back on its cord: the brim behind her shoulders. */
function hatOnBack(g: CharGrid): void {
  for (let y = 25; y <= 40; y++) {
    for (let x = 0; x < S; x++) {
      const nx = (x + 0.5 - CX) / 22.5;
      const ny = (y + 0.5 - 32) / 7;
      if (nx * nx + ny * ny > 1) continue;
      let ch = (x + y) % 3 === 0 ? 'I' : 'J';
      if (ny > 0.2) ch = (x + y) % 3 === 0 ? 'H' : 'I';
      if (ny > 0.6 || nx > 0.85) ch = 'K';
      plot(g, x, y, ch);
    }
  }
  // The pink band, round the crown behind her neck.
  for (let x = 4; x <= 10; x++) plot(g, x, 28 + (x > 7 ? 1 : 0), 'P');
  for (let x = 35; x <= 41; x++) plot(g, x, 29 - (x > 38 ? 1 : 0), 'Q');
}

/** The hat's cord, round the front of her neck. */
function hatCord(g: CharGrid): void {
  stamp(g, 19, 33, ['P......Q', '.P....Q.', '..PPPQ..']);
}

/** The clipboard (`act3`), held up against her side where Duchess used to ride. */
function clipboard(g: CharGrid): void {
  // The board.
  for (let y = 29; y < S; y++) for (let x = 32; x <= 45; x++) plot(g, x, y, x > 43 ? 'K' : 'H');
  // The paper, with lines and ticks.
  for (let y = 32; y < S; y++) for (let x = 33; x <= 43; x++) plot(g, x, y, 'W');
  for (const y of [35, 38, 41, 44]) {
    for (let x = 36; x <= 42; x++) plot(g, x, y, 'V');
    stamp(g, 33, y - 1, ['.S', 'S.']);
  }
  // The steel clip.
  stamp(g, 35, 27, ['.2222.', '233332', '211112', '.2222.']);
  // Her hand, holding it.
  stamp(g, 29, 40, ['CCCD', 'CCCC', '.BCC']);
}

/** The sun hat: a wide straw brim, a round crown with a pink band, and a marigold tucked in it. */
function hat(g: CharGrid): void {
  // The brim: a wide, flat ellipse, tipped a little to the right.
  for (let y = 9; y <= 20; y++) {
    for (let x = 0; x < S; x++) {
      const nx = (x + 0.5 - CX - 0.5) / 22.5;
      const ny = (y + 0.5 - 15.5 - (x - CX) * 0.04) / 4;
      if (nx * nx + ny * ny > 1) continue;
      let ch = (x + y) % 3 === 0 ? 'I' : 'J';
      if (ny > 0.25) ch = (x + y) % 3 === 0 ? 'H' : 'I';
      if (ny > 0.7) ch = 'K';
      plot(g, x, y, ch);
    }
  }
  // The crown.
  for (let y = 1; y <= 14; y++) {
    for (let x = 0; x < S; x++) {
      const nx = (x + 0.5 - CX) / 11;
      const ny = (y + 0.5 - 13) / 11.5;
      if (nx * nx + ny * ny > 1) continue;
      let ch = (x * 2 + y) % 4 === 0 ? 'I' : 'J';
      if (nx > 0.35) ch = (x * 2 + y) % 4 === 0 ? 'H' : 'I';
      if (nx > 0.75) ch = 'H';
      plot(g, x, y, ch);
    }
  }
  // The band.
  for (let x = 11; x <= 34; x++) {
    plot(g, x, 11, x > 30 ? 'Q' : 'P');
    plot(g, x, 12, 'Q');
  }
  // A marigold in the band: gold petals round a dark-gold heart.
  disc(g, 15.5, 11.5, 2.7, (d) => (d < 1 ? 'Y' : 'M'));
  plot(g, 14, 10, 'w');
}

/** Duchess, in her terracotta pot under Goldie's left arm (screen right). */
function duchess(g: CharGrid): void {
  // The pot.
  for (let y = 40; y < S; y++) {
    const half = 7 - Math.floor((y - 40) / 3);
    for (let x = 39 - half; x <= 39 + half; x++) plot(g, x, y, x > 39 + half - 3 ? 'X' : 'R');
  }
  for (let x = 31; x <= 47; x++) {
    plot(g, x, 39, x < 34 ? 'O' : 'R');
    plot(g, x, 40, 'X');
  }
  // The butterhead: loose round leaves, lit pale at the heart.
  disc(g, 39.5, 34.5, 7.4, (d, x, y) => {
    const leaf = Math.round(Math.atan2(y + 0.5 - 34.5, x + 0.5 - 39.5) * 2.2);
    if (d > 6.4) return leaf % 2 === 0 ? 'N' : 'L';
    if (d < 2.4) return 'T';
    if (Math.abs(d - 4.4) < 0.6 && leaf % 2 === 0) return 'N';
    return x + y < 72 ? 'T' : 'S';
  });
  line(g, 37, 33, 39, 35, 'S');
  line(g, 42, 32, 40, 35, 'S');
  // Goldie's hand cupping the pot.
  stamp(g, 30, 41, ['CCD', 'CCC', '.BC']);
}

// Brows and eyes, a 17×6 stamp at (14, EYE_Y − 4). F is the hair color (brows), `k` the eyes,
// `w` their glints, A the lids' shadow.
// prettier-ignore
const EYES: Readonly<Record<string, readonly string[]>> = {
  // Bright and open, brows up: she's pleased to see you.
  neutral: [
    '.................',
    '..FFF......FFF...',
    '.................',
    '...kk.......kk...',
    '...wk.......wk...',
    '...kk.......kk...',
  ],
  // Squeezed shut with delight.
  happy: [
    '..FFF......FFF...',
    '.................',
    '.................',
    '...kk.......kk...',
    '..k..k.....k..k..',
    '.................',
  ],
  // Brows up in the middle, eyes wide.
  worried: [
    '....FF....FF.....',
    '..FF........FF...',
    '...AA.......AA...',
    '..kwk......kwk...',
    '..kkk......kkk...',
    '...k........k....',
  ],
  // Brows down hard: the organizer.
  angry: [
    '..F..........F...',
    '...FFF.....FFF...',
    '......F...F......',
    '..AkkA.....AkkA..',
    '...wk.......wk...',
    '.................',
  ],
  // Inner brows lifted, lids low, looking down.
  sad: [
    '.................',
    '.....F.....F.....',
    '..FFF.......FFF..',
    '...AA.......AA...',
    '...kk.......kk...',
    '...wk.......wk...',
  ],
};

// Mouths: an 9×4 stamp from (18, 29), closed and talking. Z is the lip, `k` the open mouth.
// prettier-ignore
const MOUTHS: Readonly<Record<string, { readonly closed: readonly string[]; readonly talk: readonly string[] }>> = {
  // A small, ready smile.
  neutral: {
    closed: ['.........', '.A.....A.', '..AAAAA..', '.........'],
    talk: ['.........', '.AAAAAAA.', '..AkkkA..', '...AZA...'],
  },
  // A big open grin.
  happy: {
    closed: ['.AAAAAAA.', '.AWWWWWA.', '..AkZkA..', '...AAA...'],
    talk: ['.AAAAAAA.', '.AWWWWWA.', '..AkkkA..', '..AZZZA..'],
  },
  // A wobbly, uncertain line.
  worried: {
    closed: ['.........', '..AA.AA..', '.A..A..A.', '.........'],
    talk: ['.........', '...AAA...', '..AkkkA..', '...AAA...'],
  },
  // Set flat and firm.
  angry: {
    closed: ['.........', '.........', '.AAAAAAA.', '.........'],
    talk: ['.........', '.AAAAAAA.', '.AWWWWWA.', '..AkkkA..'],
  },
  // Turned down.
  sad: {
    closed: ['.........', '...AAA...', '..A...A..', '.A.....A.'],
    talk: ['.........', '...AAA...', '..AkkkA..', '.A.....A.'],
  },
};

function paint({ expression, variant, mouth }: PaintArgs): CharGrid {
  const g = grid(S, S);
  const act3 = variant === 'act3';
  if (act3) hatOnBack(g);
  overalls(g);
  if (act3) hatCord(g);
  face(g, !act3);
  if (act3) crownHair(g);
  hair(g);
  if (act3) headlamp(g);
  else hat(g);
  // Rosy cheeks: rosier when she's happy.
  const cheek = expression === 'happy' ? 'O' : expression === 'sad' ? null : 'O';
  if (cheek !== null) {
    stamp(g, 15, 28, [cheek + cheek]);
    stamp(g, 28, 28, [cheek + cheek]);
  }
  stamp(g, 14, EYE_Y - 4, EYES[expression] ?? EYES['neutral'] ?? []);
  const m = MOUTHS[expression] ?? MOUTHS['neutral'];
  if (m !== undefined) stamp(g, 18, 29, mouth === 'talk' ? m.talk : m.closed);
  if (act3) clipboard(g);
  else duchess(g);
  outlineInPlace(g);
  return g;
}

export const portraitGoldie = definePortrait({
  id: 'portrait.goldie',
  palette: 'everglow',
  // prettier-ignore
  legend: {
    A: 'skin.a.1', B: 'skin.a.2', C: 'skin.a.3', D: 'skin.a.4',
    E: 'skin.c.0', F: 'skin.c.1', G: 'skin.c.2',
    H: 'brass.2', I: 'brass.3', J: 'brass.4', K: 'brass.1',
    P: 'pink.3', Q: 'pink.2', M: 'gold.3', Y: 'orange.2',
    O: 'coral.3', R: 'coral.2', X: 'coral.1', Z: 'red.2',
    L: 'green.1', N: 'green.2', S: 'green.3', T: 'green.4',
    W: 'white.0', V: 'steel.3', U: 'grime.2',
  },
  expressions: ['neutral', 'happy', 'worried', 'angry', 'sad'],
  variants: ['act3'],
  paint,
});
