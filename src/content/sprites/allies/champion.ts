// The Champions (`ally.champion`, design/towers.md §8; the Scuttle Den's Brave Hearts spec, T604):
// the bravest of the Den's young, who leap onto flyers. A swarmling a size up (allies/swarmling.ts,
// the same dash and latch), with a red headband tied round its brow, its two tails streaming behind
// as it runs and flapping as it holds on: the one thing it wears, and it wears it proudly. In the
// `skitterkin.ally` palette like every allied Skitterkin; the headband's red is a custom legend, so
// it holds in both palettes.
// - `walk_<facing>` (2 frames, 12 fps) and `latch_<facing>` (2 frames, 10 fps), as the swarmling's.
import { defineSprite } from '../defineSprite.ts';
import { fromRows, plot, rows } from '../helpers.ts';
import { swarmFrame, type SwarmLook, type SwarmShape } from './swarmling.ts';

const CHAMPION: SwarmShape = { w: 13, h: 11, rx: 5, ry: 3.6 };

/** The headband: `R` red.3 round the brow, `S` red.4 its lit knot and tails. */
const LEGEND = { R: 'red.3', S: 'red.4' } as const;

function champion(facing: 'se' | 'ne', step: 0 | 1, look: SwarmLook): string[] {
  const f = swarmFrame(CHAMPION, facing, step, look);
  const g = fromRows(f.rows);
  // The band, a row under the crown, across the body's width.
  const by = f.top + 1;
  const row = g[by] ?? [];
  for (let x = 0; x < row.length; x++) if (row[x] !== '.') plot(g, x, by, 'R');
  // The knot at the back of its head, and its two tails streaming behind (flapping each step).
  const se = facing === 'se';
  const kx = se ? Math.round(f.cx - CHAMPION.rx) + 1 : Math.round(f.cx + CHAMPION.rx) - 2;
  const dir = se ? -1 : 1;
  plot(g, kx, by, 'S');
  plot(g, kx + dir, by - 1, 'S');
  plot(g, kx + 2 * dir, by - 1 - step, 'R');
  plot(g, kx + dir, by + 1, 'S');
  plot(g, kx + 2 * dir, by + 1 + step, 'R');
  return rows(g);
}

export const allyChampion = defineSprite({
  id: 'ally.champion',
  size: { w: CHAMPION.w, h: CHAMPION.h },
  anchor: { x: Math.round(CHAMPION.w / 2), y: CHAMPION.h - 1 },
  palette: 'skitterkin',
  variants: ['skitterkin.ally'],
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: LEGEND,
  frames: {
    walk_se_0: champion('se', 0, 'dash'),
    walk_se_1: champion('se', 1, 'dash'),
    walk_ne_0: champion('ne', 0, 'dash'),
    walk_ne_1: champion('ne', 1, 'dash'),
    latch_se_0: champion('se', 0, 'latch'),
    latch_se_1: champion('se', 1, 'latch'),
    latch_ne_0: champion('ne', 0, 'latch'),
    latch_ne_1: champion('ne', 1, 'latch'),
  },
  anims: {
    walk_se: { frames: ['walk_se_0', 'walk_se_1'], fps: 12 },
    walk_sw: { mirrorOf: 'walk_se' },
    walk_ne: { frames: ['walk_ne_0', 'walk_ne_1'], fps: 12 },
    walk_nw: { mirrorOf: 'walk_ne' },
    latch_se: { frames: ['latch_se_0', 'latch_se_1'], fps: 10 },
    latch_sw: { mirrorOf: 'latch_se' },
    latch_ne: { frames: ['latch_ne_0', 'latch_ne_1'], fps: 10 },
    latch_nw: { mirrorOf: 'latch_ne' },
  },
});
