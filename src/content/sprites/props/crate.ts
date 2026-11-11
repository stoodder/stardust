// Zibzab's crate (`prop.crate`; A3M6, act3.md § A3M6: "Price first: nothing. ...It's a terrible
// deal. I hate it. Take the crate."): the gift he brings to Dome Row, every Vrell tune-up the player
// doesn't own packed into one shipping crate. A riveted brass Vrell crate, rust at its seams and a
// patina corner plate, a spiral (the shell-shop's mark) stamped on its lit face, rope handles; on its
// shaded face the pale patch where the NO REFUNDS sticker was, its last red corner curling (he
// peeled it off first).
// - `shut`: the lid on, as it arrives.
// - `open`: the lid off, packing straw spilling over the rim and the dark inside glinting orange
//   (the parts, already installed).
// Vrell palette (brass, rust, patina; `e0`/`e1` its orange), so it reads as Zibzab's in every act.
import { defineSprite } from '../defineSprite.ts';
import { grid, isoBox, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';

const W = 32;
const H = 30;
const AX = 15;
const AY = 24;
/** The crate's half-width and height. */
const HW = 10;
const TALL = 11;

function crate(open: boolean): string[] {
  const g: CharGrid = grid(W, H);
  isoBox(g, AX, AY + 1, HW + 1, 0, { top: '_', rim: '_', left: '_', right: '_' });
  isoBox(g, AX, AY, HW, TALL, { top: '3', rim: '4', left: '2', right: '1' });
  // Rust along the box's vertical seams, and its rivets.
  for (let y = AY - TALL + HW / 2 + 1; y <= AY + 4; y++) {
    if ((g[y]?.[AX] ?? '.') !== '.') plot(g, AX, y, '7');
  }
  for (const [x, y] of [
    [AX - 8, AY - TALL + 2],
    [AX - 3, AY - TALL + 5],
    [AX - 8, AY - 2],
    [AX + 3, AY - TALL + 5],
    [AX + 8, AY - TALL + 2],
  ] as const) {
    plot(g, x, y, '0');
  }
  // The shell-shop's spiral stamped on the lit face.
  stamp(g, AX - 7, AY - 7, ['.66.', '6..6', '6.66', '6...', '.666']);
  // Rope handles on each face.
  stamp(g, AX - 9, AY - 6, ['8', '8']);
  stamp(g, AX + 9, AY - 6, ['8', '8']);
  // A patina plate on the near corner.
  stamp(g, AX - 1, AY - 4, ['bc', 'bb', 'ab']);
  // The pale patch where the sticker was, its last red corner curling.
  stamp(g, AX + 3, AY - 7, ['WWWW', 'WWWW', 'WWWR', 'WWRS']);
  if (open) {
    // The lid off: the top shows the dark inside, straw over the rim, parts glinting orange.
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const ch = g[y]?.[x] ?? '.';
        if ((ch === '3' || ch === '4') && y < AY - TALL + 4) {
          const inner =
            Math.abs(x + 0.5 - AX) / (HW - 2) + Math.abs(y + 0.5 - (AY - TALL)) / ((HW - 2) / 2);
          if (inner < 0.7) plot(g, x, y, '0');
          else if (inner < 1) plot(g, x, y, (x + y) % 3 === 0 ? '1' : 'Y');
        }
      }
    }
    // Straw spilling over the rim, and the parts glinting in the dark inside.
    stamp(g, AX - 8, AY - TALL - 1, ['Y.Y', '.YY']);
    stamp(g, AX + 6, AY - TALL + 1, ['YY.', '.YY']);
    plot(g, AX - 1, AY - TALL - 1, '+');
    plot(g, AX, AY - TALL - 1, '*');
    plot(g, AX + 2, AY - TALL, '+');
  } else {
    // The lid's seam round the top, and a stencilled arrow THIS WAY UP.
    line(g, AX - HW, AY - TALL, AX, AY - TALL + HW / 2, '1');
    stamp(g, AX - 1, AY - TALL - 2, ['.6.', '666']);
  }
  return rows(g);
}

export const propCrate = defineSprite({
  id: 'prop.crate',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'vrell',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: { W: 'grime.4', R: 'red.2', S: 'red.3', Y: 'gold.3' },
  frames: { shut: crate(false), open: crate(true) },
});
