// The last Mandatory Fun Friday banner (`prop.banner_friday`; A3M4 decor, act3.md § A3M4, marker
// `banner_friday`): A1M5's party, the last one, carried down into the Shelters and hung across the
// hall. Two steel poles with orange caps; between them the banner, Evie's party pink faded and
// creased, "FUN FRIDAY" in the 3×5 font in faded gold with a gold Evie sun at its left end. Its right
// tie has come off the pole: that end hangs down and runs out along the floor, where Goldie has
// tucked it over three sleeping kids (small humps under the pink, a head of hair and a hand out of
// it, a stuffed lettuce held by one). `v0`. Everglow-owned, with its cloth and the kids in its own
// legend, so it keeps its colours in every act.
import { defineSprite } from '../defineSprite.ts';
import { textPixels } from '../font3x5.ts';
import { grid, plot, rows, stamp, type CharGrid } from '../helpers.ts';

const W = 68;
const H = 30;
/** The anchor: the banner's foot, between its poles. */
const AX = 28;
const AY = 26;
/** The poles' columns and the banner's top row. */
const POLE_L = 3;
const POLE_R = 53;
const TOP = 5;
/** The cloth's height under its top edge. */
const CLOTH = 9;

/** How far the cloth sags at column x (a shallow curve, deepest mid-span). */
function sag(x: number): number {
  const t = (x - POLE_L) / (POLE_R - POLE_L);
  return Math.round(Math.sin(Math.PI * Math.max(0, Math.min(1, t))) * 2);
}

function banner(): string[] {
  const g: CharGrid = grid(W, H);
  // The poles' shadows and the hump of sleeping kids' shadow, along the floor.
  for (let x = POLE_L - 2; x <= POLE_L + 2; x++) plot(g, x, AY + 1, '_');
  for (let x = POLE_R - 2; x <= W - 2; x++) plot(g, x, AY + 1, '_');
  // The cloth: pink, creased in two places, lit along its top hem, shaded along its bottom.
  for (let x = POLE_L + 1; x < POLE_R; x++) {
    const y0 = TOP + sag(x);
    const crease = x === 17 || x === 33;
    for (let y = y0; y < y0 + CLOTH; y++) {
      let ch = 'P';
      if (y === y0) ch = 'R';
      else if (y === y0 + CLOTH - 1) ch = 'Q';
      else if (crease) ch = 'Q';
      plot(g, x, y, ch);
    }
  }
  // The lettering, level (the cloth sags under it, never the words): the Evie sun, FUN FRIDAY.
  stamp(g, POLE_L + 2, TOP + 2, ['..Y..', '.YWY.', 'YWWWY', '.YWY.', '..Y..']);
  for (const p of textPixels('FUN FRIDAY', POLE_L + 8, TOP + 2)) plot(g, p.x, p.y, 'Y');
  // The loose end: past the right pole, where its tie came off, the banner's tail hangs down to
  // the floor and runs out along it.
  for (let y = TOP + 1; y <= AY - 3; y++) {
    for (let x = POLE_R + 1; x <= POLE_R + 3; x++) {
      plot(g, x, y, x === POLE_R + 3 ? 'Q' : y === TOP + 1 ? 'R' : 'P');
    }
  }
  // On the floor, tucked over three sleeping kids: three humps under the pink.
  for (let x = POLE_R + 1; x <= W - 3; x++) {
    const k = (x - (POLE_R + 1)) / (W - 3 - (POLE_R + 1));
    const hump = Math.round(Math.abs(Math.sin(k * Math.PI * 3)) * 3);
    for (let y = AY - 4 - hump; y <= AY; y++) {
      plot(g, x, y, y === AY - 4 - hump ? 'R' : y === AY ? 'Q' : 'P');
    }
  }
  // A head of hair and a hand out from under it, and a stuffed lettuce hugged by the last one.
  stamp(g, POLE_R + 4, AY - 8, ['.HH.', 'HHHF', '.HFF']);
  stamp(g, W - 3, AY - 1, ['FF']);
  stamp(g, W - 8, AY - 7, ['.LM', 'LML']);
  // The poles: steel, lit left, orange caps; the right one with its tie hanging loose.
  for (const px of [POLE_L, POLE_R]) {
    for (let y = TOP - 2; y <= AY; y++) {
      plot(g, px - 1, y, '3');
      plot(g, px, y, '1');
    }
    stamp(g, px - 1, TOP - 4, ['cc', 'bc']);
    plot(g, px - 2, AY, '2');
    plot(g, px + 1, AY, '0');
  }
  plot(g, POLE_R - 1, TOP + 3, 'W');
  plot(g, POLE_R - 1, TOP + 4, 'W');
  return rows(g);
}

export const propBannerFriday = defineSprite({
  id: 'prop.banner_friday',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'everglow',
  outline: 'auto',
  legend: {
    // The cloth: Evie's party pink, faded a step (lit hem, cloth, crease and shade).
    R: 'pink.3',
    P: 'pink.2',
    Q: 'pink.1',
    // The lettering and the sun, faded gold; the tie's white cord.
    Y: 'gold.3',
    W: 'white.0',
    // The kids: dark hair, warm skin; the stuffed lettuce.
    H: 'skin.c.1',
    F: 'skin.a.3',
    L: 'green.3',
    M: 'green.2',
  },
  frames: { v0: banner() },
});
