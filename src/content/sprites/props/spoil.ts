// Spoil heaps (`prop.spoil`; Act II decor): what the digging leaves. `drill_0`, `drill_1`: drill
// spoil, cold blue-grey tailings (steel lit, violet-black in the shade, so a heap reads off the
// warm gold grass by hue and value, never grey on grey: T501k) dumped beside a bore, flecked cold
// violet (unsung stardust, art-direction §1 principle 6), with a dead drill bit or a burst sack of core samples; the yard
// cut's dressing on A2M1, and Act II's mining apron. `warren`: a warren's own dug earth heaped at
// its mouth, the act's clay (env palette), crumbly and warm, never flecked violet (A2M3's spoil
// over the warren mouth).
import { defineSprite } from '../defineSprite.ts';
import { disc, grid, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';
import { ENV_VARIANTS } from '../tiles/tileGen.ts';

const W = 22;
const H = 14;
const AX = 11;
const AY = 10;

/** A heap: a lumpy mound lit upper left, in `lit`/`mid`/`dark`, a shadow at its foot. */
function heap(g: CharGrid, cx: number, r: number, lit: string, mid: string, dark: string): void {
  disc(g, cx, AY, r, (_d, x, y) => {
    const dx = (x + 0.5 - cx) / r;
    const dy = (y + 0.5 - AY) / (r * 0.7);
    if (dx * dx + dy * dy > 1 || y > AY + 1) return '.';
    const lump = (x * 7 + y * 3) % 5 === 0;
    return dx + dy < -0.5 ? lit : dx > 0.35 || lump ? dark : mid;
  });
  for (let x = Math.round(cx - r); x <= Math.round(cx + r); x++) plot(g, x, AY + 2, '_');
}

function drill(v: 0 | 1): string[] {
  const g = grid(W, H);
  heap(g, AX - 2, 7, 'N', 'M', 'L');
  heap(g, AX + 5, 4.5, 'N', 'M', 'L');
  // Cold violet flecks in the tailings.
  for (const [x, y] of v === 0
    ? [
        [AX - 4, AY - 2],
        [AX + 1, AY],
        [AX + 6, AY - 1],
        [AX - 7, AY - 1],
        [AX - 2, AY - 5],
      ]
    : [
        [AX - 6, AY],
        [AX - 1, AY - 3],
        [AX + 4, AY],
        [AX - 4, AY - 4],
        [AX + 6, AY - 2],
      ])
    plot(g, x ?? 0, y ?? 0, (x ?? 0) % 2 === 0 ? 'V' : 'U');
  if (v === 0) {
    // A worn-out drill bit dumped on the heap.
    line(g, AX + 2, AY - 6, AX + 6, AY - 4, 'S');
    stamp(g, AX + 6, AY - 5, ['TS', 'ST']);
  } else {
    // A burst sack of core samples: grey cylinders rolled out.
    stamp(g, AX - 9, AY - 1, ['BBA', 'BAA']);
    stamp(g, AX - 5, AY + 1, ['MN']);
  }
  return rows(g);
}

function warren(): string[] {
  const g = grid(W, H);
  heap(g, AX - 1, 8, 'd', 'c', 'b');
  heap(g, AX + 6, 4, 'd', 'c', 'b');
  // Clods and a scrape of moss rolled down its side.
  for (const [x, y] of [
    [AX - 8, AY + 1],
    [AX + 9, AY],
    [AX + 2, AY - 4],
  ] as const)
    plot(g, x, y, 'a');
  stamp(g, AX - 4, AY - 4, ['1.1', '.2.']);
  return rows(g);
}

export const propSpoil = defineSprite({
  id: 'prop.spoil',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'act1',
  variants: ENV_VARIANTS,
  outline: 'auto',
  legend: {
    L: 'ink.4',
    M: 'steel.1',
    N: 'steel.2',
    U: 'violet.3',
    V: 'violet.4',
    S: 'steel.3',
    T: 'steel.4',
    A: 'grime.2',
    B: 'grime.4',
  },
  frames: { drill_0: drill(0), drill_1: drill(1), warren: warren() },
});
