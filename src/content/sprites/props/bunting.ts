// The banner line (A1M5 decor, act1.md § A1M5: "a strip of party bunting across the merged road
// two-thirds of the way down"; Party Pooper Prevention's marker): two steel poles with a sagging
// string of pennants in every party colour slung across the road between them.
// The marker stands on the decor tile in front of the road (its larger-y side), so the bunting
// sorts in front of the units walking under it (tech-spec § Depth sorting: a multi-tile prop sorts
// by its front-most tile). Frame `x` slings it back across a road at (col − 1, row), toward the
// pole two tiles up-left; `y` (mirrored) across a road at (col, row − 1), up-right.
import { defineSprite } from '../defineSprite.ts';
import { grid, line, plot, rows } from '../helpers.ts';

const W = 40;
const H = 32;
/** The front pole's foot (the anchor) and the back pole's, two tiles back along grid x. */
const FX = 36;
const FY = 30;
const BX = FX - 32;
const BY = FY - 16;
const POLE = 13;
const SAG = 5;
const PENNANTS = ['P', 'G', '7', 'B', 'c'] as const;

function buntingGrid(): string[] {
  const g = grid(W, H);
  for (const [x, y] of [
    [FX, FY],
    [BX, BY],
  ] as const) {
    plot(g, x - 1, y + 1, '_');
    plot(g, x, y + 1, '_');
    plot(g, x + 1, y + 1, '_');
    line(g, x, y - POLE, x, y, '2');
    plot(g, x, y - POLE - 1, 'c'); // an orange cap on each pole
  }
  // The string, sagging between the pole tops, with a pennant hanging every few pixels.
  const n = FX - BX;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = BX + i;
    const y = Math.round(BY - POLE + (FY - BY) * t + SAG * 4 * t * (1 - t));
    plot(g, x, y, '1');
    if (i % 4 === 2 && i < n - 1) {
      const ch = PENNANTS[(i >> 2) % PENNANTS.length] ?? 'P';
      plot(g, x, y + 1, ch);
      plot(g, x + 1, y + 1, ch);
      plot(g, x, y + 2, ch);
    }
  }
  return rows(g);
}

export const propBunting = defineSprite({
  id: 'prop.bunting',
  size: { w: W, h: H },
  anchor: { x: FX, y: FY },
  palette: 'everglow',
  variants: ['everglow.worn'],
  outline: 'auto',
  legend: { P: 'pink.3', G: 'gold.4', B: 'blue.4' },
  frames: { x: buntingGrid(), y: { mirrorOf: 'x' } },
});
