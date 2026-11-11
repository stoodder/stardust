// Zibzab's portrait (`portrait.zibzab`; story/characters.md § Zibzab, story/races.md § Vrell,
// art-direction § Portrait roster and § 4 Vrell): a squat, hermit-crab-like Vrell mollusk in the
// Vrell palette (brass, rust, patina, welding-glow orange). Nothing about him is a human face: a
// soft patina-green dome with no nose, a wide lipless mouth with two feelers at its corners, and
// two eyestalks that move independently (in `neutral` one watches you and the other the goods).
// Behind him rises his enormous patched brass shell, the shop itself: a spiral of bolted plates
// (rust, patina, one scavenged steel plate), a pink neon price tag, a kazoo vent, and a lantern.
// His tiny visor cap sits between the stalks; one oversized hauling claw fills the lower left
// (the faction's one oversized limb) while his two fine counting arms hold a coin.
import { disc, grid, line, plot, stamp, type CharGrid } from '../helpers.ts';
import { paintPartyHat } from './partyHat.ts';
import { definePortrait, outlineInPlace, PORTRAIT_SIZE, type PaintArgs } from './portrait.ts';

const S = PORTRAIT_SIZE;
/** The spiral shell's center. */
const SHELL = { x: 35.5, y: 13.5 } as const;
/** The head dome: center and radii. */
const HEAD = { x: 20.5, y: 30, rx: 11.5, ry: 9 } as const;

/** One eye: where it sits, where the pupil looks, and how the lid falls. */
export interface Eye {
  /** Stalk base on the head, and the eye's center at the stalk's tip. */
  readonly base: readonly [number, number];
  readonly at: readonly [number, number];
  /** Pupil offset from the eye's center (−2..2). */
  readonly look: readonly [number, number];
  /** Upper lid: pixels with y < cy + lid + tilt·(x − cx) are lid; null for none. */
  readonly lid: { readonly y: number; readonly tilt: number } | null;
  /** Lower lid (a smile squint): pixels with y > cy + this are lid. */
  readonly lower?: number;
  /** A tiny, pinned pupil (worried). */
  readonly small?: boolean;
}

export interface Face {
  readonly left: Eye;
  readonly right: Eye;
}

// Stalk bases are fixed on the dome; the eyes move with the expression.
const BL = [16, 22] as const;
const BR = [25, 22] as const;

/** Each expression's eyes (exported for the eyestalk tests). */
export const ZIBZAB_FACES: Readonly<Record<string, Face>> = {
  // One eye on you, one on the goods: the merchant's resting state. Lids a touch heavy.
  neutral: {
    left: { base: BL, at: [12, 9], look: [0, 1], lid: { y: -2.2, tilt: 0 } },
    right: { base: BR, at: [27, 7], look: [2, 1], lid: { y: -2.2, tilt: 0 } },
  },
  // Both eyes on you, squinting up from below: a sale.
  happy: {
    left: { base: BL, at: [11, 8], look: [1, 0], lid: null, lower: -0.6 },
    right: { base: BR, at: [28, 7], look: [-1, 0], lid: null, lower: -0.6 },
  },
  // Stalks splayed and pulled back, eyes wide, pupils pinned.
  worried: {
    left: { base: BL, at: [9, 11], look: [1, 0], lid: null, small: true },
    right: { base: BR, at: [31, 9], look: [-1, 0], lid: null, small: true },
  },
  // Stalks leaning in together, lids slanted down to the middle: both eyes on you, hard.
  angry: {
    left: { base: BL, at: [15, 9], look: [1, 1], lid: { y: -1.6, tilt: 0.7 } },
    right: { base: BR, at: [24, 9], look: [-1, 1], lid: { y: -1.6, tilt: -0.7 } },
  },
  // Stalks drooping out to the sides, lids low, looking down.
  sad: {
    left: { base: BL, at: [9, 14], look: [0, 2], lid: { y: -0.6, tilt: -0.4 } },
    right: { base: BR, at: [31, 13], look: [0, 2], lid: { y: -0.6, tilt: 0.4 } },
  },
};

// Mouths: a 13×4 stamp from (14, 31), closed and talking. `a` is the deep patina shadow, `e` the
// lit lower lip, `B` his tongue.
// prettier-ignore
const MOUTHS: Readonly<Record<string, { readonly closed: readonly string[]; readonly talk: readonly string[] }>> = {
  // A long, flat, faintly pleased line: patter at rest.
  neutral: {
    closed: ['.............', 'a...........a', '.aaaaaaaaaaa.', '..eeeeeeeee..'],
    talk: ['a...........a', '.aaaaaaaaaaa.', '.akkkkkkkkka.', '..aaBBBBBaa..'],
  },
  // A huge crescent grin, wider than his face has any right to be.
  happy: {
    closed: ['aa.........aa', '.aaaaaaaaaaa.', '..akkkkkkka..', '...aaaaaaa...'],
    talk: ['aa.........aa', '.aaaaaaaaaaa.', '.akkkkkkkkka.', '..akkBBBkka..'],
  },
  // A wobble.
  worried: {
    closed: ['.............', '...aaa.aaa...', '..a...a...a..', '.............'],
    talk: ['.............', '...aaaaaaa...', '..akkkkkkka..', '...aaaaaaa...'],
  },
  // Turned down hard over a row of small flat teeth.
  angry: {
    closed: ['.............', '..aaaaaaaaa..', '.aWaWaWaWaWa.', 'a...........a'],
    talk: ['.............', '..aaaaaaaaa..', '.aWWWWWWWWWa.', '.akkkkkkkkka.'],
  },
  // A slow, long droop.
  sad: {
    closed: ['.............', '....aaaaa....', '..aa.....aa..', '.a.........a.'],
    talk: ['.............', '....aaaaa....', '...akkkkka...', '..aa.....aa..'],
  },
};

/** The spiral shell behind him: whorls of lit brass, a groove, bolted patches, the shop's dressing. */
function shell(g: CharGrid): void {
  const b = 1.5; // the spiral's growth, px per radian
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = x + 0.5 - SHELL.x;
      const dy = y + 0.5 - SHELL.y;
      // The shell: a great round whorl, running on down the frame's right side behind him.
      const inWhorl = Math.hypot(dx / 19, dy / 18) <= 1;
      const inLower = x >= 27 && y >= SHELL.y && x - 27 >= (y - 40) * 0.6;
      if (!inWhorl && !inLower) continue;
      const r = Math.hypot(dx, dy);
      const theta = Math.atan2(dy, dx) + Math.PI; // 0..2π
      const t = (r / b - theta) / (2 * Math.PI);
      const u = t - Math.floor(t); // 0..1 across one whorl band
      let ch = u < 0.14 ? '1' : u < 0.42 ? '2' : u < 0.85 ? '3' : '2';
      // Lit from the upper left: the whorl tops catch a highlight; the right side falls to shade.
      if (u > 0.55 && u < 0.75 && dx + dy < -6) ch = '4';
      if (dx + dy * 0.4 > 10 && ch !== '1') ch = ch === '3' ? '2' : '1';
      if (r < 2) ch = '1';
      if (!inWhorl) ch = x > 40 ? '1' : '2';
      plot(g, x, y, ch);
    }
  }
  // The shell's rim where he comes out of it: a thick rust lip.
  for (let y = 18; y < S; y++) {
    const x = 31 + Math.round((y - 18) * 0.12);
    plot(g, x, y, '7');
    plot(g, x + 1, y, '6');
  }
  // Bolted patches: rust, patina, and one scavenged steel plate with a teal chevron.
  patch(g, 38, 29, 7, 6, '7', '6');
  patch(g, 21, 3, 6, 5, 'c', 'b');
  patch(g, 40, 39, 6, 6, 'S', 'R');
  plot(g, 42, 41, 'T');
  plot(g, 43, 42, 'T');
  plot(g, 44, 41, 'T');
  // The kazoo vent: an exposed patina pipe out of the top, its horn flared.
  line(g, 44, 2, 44, 6, 'c');
  line(g, 45, 2, 45, 6, 'b');
  stamp(g, 42, 0, ['edcb.', '.dc..']);
  // The neon price tag hung on the shell: a pink outline tag with a punched hole and a string.
  // prettier-ignore
  stamp(g, 34, 18, [
    '..PPPPPPP',
    '.PQ.....P',
    'PQ.k.QQ.P',
    '.PQ.....P',
    '..PPPPPPP',
  ]);
}

/** A bolted plate: fill, a darker lower-right edge, a lit rivet at each corner. */
function patch(g: CharGrid, x0: number, y0: number, w: number, h: number, c: string, d: string) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      plot(g, x, y, x === x0 + w - 1 || y === y0 + h - 1 ? d : c);
    }
  }
  for (const [x, y] of [
    [x0, y0],
    [x0 + w - 2, y0],
    [x0, y0 + h - 2],
    [x0 + w - 2, y0 + h - 2],
  ] as const)
    plot(g, x, y, '4');
}

/** The lantern hanging off the shell's lip in the upper left, glowing welding orange. */
function lantern(g: CharGrid): void {
  line(g, 4, 0, 4, 2, '1');
  // prettier-ignore
  stamp(g, 2, 3, [
    '.333.',
    '3+*+2',
    '3***2',
    '2+*+1',
    '.212.',
  ]);
}

/** Inside the head dome (the body widens below it to the frame's bottom edge). */
function inBody(x: number, y: number): boolean {
  const nx = (x + 0.5 - HEAD.x) / HEAD.rx;
  const ny = (y + 0.5 - HEAD.y) / HEAD.ry;
  if (y + 0.5 <= HEAD.y) return nx * nx + ny * ny <= 1;
  return Math.abs(x + 0.5 - HEAD.x) <= HEAD.rx + (y - HEAD.y) * 0.25;
}

function body(g: CharGrid): void {
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (!inBody(x, y)) continue;
      const nx = (x + 0.5 - HEAD.x) / HEAD.rx;
      const ny = (y + 0.5 - (HEAD.y - 2)) / HEAD.ry;
      // Soft and wet: a broad lit top, a sheen on the dome, the right flank in shade.
      let ch = 'c';
      if (nx < 0.25 && ny < 0.2) ch = 'd';
      if ((nx + 0.35) ** 2 + (ny + 0.65) ** 2 < 0.05) ch = 'e';
      if (nx > 0.55 || ny > 1.4) ch = 'b';
      plot(g, x, y, ch);
    }
  }
  // Mottled spots across the dome: a mollusk, not a face.
  for (const [x, y] of [
    [13, 25],
    [14, 27],
    [27, 25],
    [26, 27],
    [11, 30],
    [29, 30],
    [20, 23],
  ] as const)
    plot(g, x, y, 'b');
  // The mantle: a fleshy frill where the dome meets the body, scalloped.
  for (let x = 9; x <= 32; x++) {
    if (!inBody(x, 37)) continue;
    plot(g, x, 37, x % 3 === 0 ? 'b' : 'c');
    plot(g, x, 38, x % 3 === 0 ? 'a' : 'b');
  }
}

/** A stalk from the dome to an eye: two pixels thick, lit left, curving a little outward. */
function stalk(g: CharGrid, eye: Eye): void {
  const [bx, by] = eye.base;
  const [ex, ey] = eye.at;
  // A quadratic curve bowing away from the head's center line.
  const mx = (bx + ex) / 2 + (ex < HEAD.x ? -1.5 : 1.5);
  const my = (by + ey) / 2;
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const x = (1 - t) ** 2 * bx + 2 * (1 - t) * t * mx + t * t * ex;
    const y = (1 - t) ** 2 * by + 2 * (1 - t) * t * my + t * t * ey;
    plot(g, Math.round(x), Math.round(y), 'd');
    plot(g, Math.round(x) + 1, Math.round(y), 'b');
  }
}

/** The eyeball's radius. */
const EYE_R = 4.2;

/** Under the smile squint's lower lid, an arc bowed up in the middle (a happy ∩)? */
function lowerLid(eye: Eye, px: number, py: number): boolean {
  if (eye.lower === undefined) return false;
  const cx = eye.at[0] + 0.5;
  const cy = eye.at[1] + 0.5;
  return py > cy + eye.lower + 0.22 * (px - cx) ** 2;
}

/** An eyeball at a stalk's tip: lit white, a lid of skin, a pupil and its glint. */
function eyeball(g: CharGrid, eye: Eye): void {
  const cx = eye.at[0] + 0.5;
  const cy = eye.at[1] + 0.5;
  disc(g, cx, cy, EYE_R, (_d, x, y) => {
    const px = x + 0.5;
    const py = y + 0.5;
    if (eye.lid !== null && py < cy + eye.lid.y + eye.lid.tilt * (px - cx)) return 'c';
    if (lowerLid(eye, px, py)) return 'c';
    return px - cx + (py - cy) > 2.5 ? 'W' : 'w';
  });
  // The lid's edge, dark, so a lidded eye reads at 1×.
  disc(g, cx, cy, EYE_R, (_d, x, y) => {
    const px = x + 0.5;
    const py = y + 0.5;
    const above = (yy: number): boolean =>
      eye.lid !== null && yy < cy + eye.lid.y + eye.lid.tilt * (px - cx);
    const below = (yy: number): boolean => lowerLid(eye, px, yy);
    if (above(py) && !above(py + 1)) return 'a';
    if (below(py) && !below(py - 1)) return 'a';
    return g[y]?.[x] ?? '.';
  });
  const [lx, ly] = eye.look;
  const px = eye.at[0] + lx;
  const py = eye.at[1] + ly;
  const visible = (x: number, y: number): boolean => g[y]?.[x] === 'w' || g[y]?.[x] === 'W';
  if (eye.small === true) {
    if (visible(px, py)) plot(g, px, py, 'k');
    return;
  }
  for (const [x, y] of [
    [px, py],
    [px - 1, py],
    [px, py - 1],
    [px - 1, py - 1],
  ] as const)
    if (visible(x, y)) plot(g, x, y, 'k');
}

/** The tiny visor cap between the stalks: a rust crown and a welding-orange brim, hand-outlined. */
function cap(g: CharGrid): void {
  // prettier-ignore
  stamp(g, 16, 17, [
    '...xxx...',
    '..x887x..',
    '.x88876x.',
    'x+**+++7x',
    '.xxxxxxx.',
  ]);
}

/** The big hauling claw, raised in the lower left: rust-armored, brass-lit, pincers open. */
function claw(g: CharGrid): void {
  // The forearm, up from the frame's bottom-left corner.
  for (let i = 0; i < 4; i++) line(g, i, S - 1, 4 + i, 40, i < 1 ? '7' : i < 3 ? '6' : '5');
  // The palm: a big armored oval.
  disc(g, 7.5, 36.5, 6.2, (d, x, y) => {
    if (d > 5.4) return '6';
    return x + y < 40 ? '8' : x + y < 45 ? '7' : '6';
  });
  // The pincers: an upper finger hooking right, a lower one under it, a gap between.
  // prettier-ignore
  stamp(g, 10, 30, [
    '..778....',
    '.77887...',
    '.6777887.',
    '..66677788',
    '.......66.',
    '..........',
    '..........',
    '.7777.....',
    '.677778...',
    '..66667...',
  ]);
  // Brass knuckle plates bolted on (Vrell repairs), lit.
  plot(g, 4, 33, '4');
  plot(g, 5, 33, '3');
  plot(g, 4, 34, '3');
  plot(g, 6, 38, '4');
}

/** The two counting arms, holding up a gold coin in front of him. */
function coin(g: CharGrid): void {
  line(g, 14, 47, 18, 43, 'b');
  line(g, 27, 47, 24, 43, 'b');
  disc(g, 21.5, 42.5, 3.1, (d, x, y) => (d > 2.4 ? 'I' : x + y < 63 ? 'H' : 'G'));
  plot(g, 21, 42, 'I');
  plot(g, 21, 43, 'I');
  plot(g, 20, 41, 'w');
  // Three-fingered hands on the coin's rim.
  stamp(g, 17, 41, ['d.', 'dd', 'd.']);
  stamp(g, 25, 41, ['.c', 'cc', '.c']);
}

/** Worry: a bead of sweat on the dome. */
function sweat(g: CharGrid): void {
  stamp(g, 29, 22, ['.w.', 'wUw', 'UUU']);
}

function paint({ expression, variant, mouth }: PaintArgs): CharGrid {
  const g = grid(S, S);
  const face = ZIBZAB_FACES[expression] ?? ZIBZAB_FACES['neutral'];
  if (face === undefined) throw new Error(`zibzab: no face ${expression}`);
  shell(g);
  lantern(g);
  body(g);
  if (variant === 'party_hat') {
    // His own stock, two stardust (honestly, one), in place of the visor cap, behind the stalks.
    paintPartyHat(g, {
      base: [20.5, 19],
      tip: [22, 8],
      halfWidth: 4.5,
      ink: { stripe: 'V', stripeShade: 'X', gold: 'H', goldShade: 'G', pom: 'w', pomShade: 'W' },
    });
  }
  stalk(g, face.left);
  stalk(g, face.right);
  eyeball(g, face.left);
  eyeball(g, face.right);
  if (variant !== 'party_hat') cap(g);
  const m = MOUTHS[expression] ?? MOUTHS['neutral'];
  if (m !== undefined) stamp(g, 14, 31, mouth === 'talk' ? m.talk : m.closed);
  // The feelers at the mouth's corners.
  line(g, 13, 33, 12, 36, 'a');
  line(g, 27, 33, 28, 36, 'a');
  if (expression === 'worried') sweat(g);
  claw(g);
  coin(g);
  outlineInPlace(g);
  return g;
}

export const portraitZibzab = definePortrait({
  id: 'portrait.zibzab',
  palette: 'vrell',
  // prettier-ignore
  legend: {
    W: 'white.0', B: 'red.2', P: 'pink.3', Q: 'pink.4', U: 'blue.4',
    G: 'gold.2', H: 'gold.3', I: 'gold.1', R: 'steel.1', S: 'steel.2', T: 'teal.3',
    // The party hat's violet stripes (`party_hat`).
    V: 'violet.3', X: 'violet.2',
  },
  expressions: ['neutral', 'happy', 'worried', 'angry', 'sad'],
  variants: ['party_hat'],
  paint,
});
