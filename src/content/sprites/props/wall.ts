// The colony's north wall (`prop.wall`; A2M6 decor, act2.md § A2M6, render's wall row between the
// `wall_west_end` and `wall_east_end` markers): a low ferrocrete parapet along the back (outer,
// north-east) edge of each wall-walk tile, crenellated, an Everglow teal stripe under its cap, so
// the row reads as a wall with the walk in front of it and the Hollow's roads outside. It stands on
// the tile's outer edge only, so a pad on the walk keeps its plate clear and a tower on it draws in
// front of the parapet; it is low (7 px, 9 at a merlon) so a unit walking the road behind it shows
// over it. Frames, each one tile wide (anchored at the tile center):
// - `walk_0`, `walk_1`: the parapet (two variants of chips and scuffs).
// - `lamp_w`, `lamp_e`: a gatepost at the tile's west (−x) or east (+x) end of the parapet, a
//   hazard-chevroned pillar with a lantern on top, lit warm (the lamps stay on all night;
//   T530b draws their glow, the sim's light disc is `map.lights`). Render puts the post on the side
//   that meets the gate.
// - `end_w`, `end_e`: the wall's end at the grid's west or east edge, a squat buttress.
import { defineSprite } from '../defineSprite.ts';
import { grid, isoBox, plot, rows, type CharGrid } from '../helpers.ts';

const W = 34;
const H = 34;
/** The tile's top vertex in this canvas (its footprint fills 32 × 16 below it). */
const TX = 17;
const TY = 17;
/** The parapet's height, and a merlon's extra. */
const WALL_H = 7;
const MERLON_H = 2;
/** Its thickness, in steps of (−2, +1) px in from the tile's north-east edge. */
const THICK = 2;

/**
 * The parapet: columns over its footprint (a strip along the tile's north-east edge, from the top
 * vertex to the right vertex, `THICK` steps deep), drawn back to front. `u` runs 0 → 1 along the
 * edge (west → east), `v` 0 → 1 from the outer edge in. Columns over `[u0, u1]` only.
 */
function parapet(g: CharGrid, seed: number, u0 = 0, u1 = 1): void {
  const cells: { x: number; y: number; u: number; v: number }[] = [];
  for (let y = TY - 2; y <= TY + 12; y++) {
    for (let x = TX - 6; x <= TX + 17; x++) {
      const dx = x + 0.5 - TX;
      const dy = y + 0.5 - TY;
      const u = (dx / 2 + dy) / 16;
      const v = (dy - dx / 2) / (2 * THICK);
      if (u < u0 || u > u1 || v < 0 || v > 1) continue;
      cells.push({ x, y, u, v });
    }
  }
  cells.sort((a, b) => a.y - b.y);
  for (const c of cells) {
    const along = Math.floor(c.u * 16);
    const merlon = Math.floor(along / 2) % 2 === 0;
    const h = WALL_H + (merlon ? MERLON_H : 0);
    for (let k = 0; k <= h; k++) {
      const y = c.y - k;
      let ch: string;
      if (k === h) ch = 'D'; // the cap
      else if (k === h - 1) ch = merlon ? 'C' : 'D';
      else if (k === h - 2 && !merlon) ch = '7'; // the teal stripe under the cap
      else if (k === h - 2) ch = 'C';
      else ch = (k + along) % 6 === 0 || along % 8 === 0 ? 'B' : 'C'; // courses and joints
      if (c.u > 0.97) ch = k === h ? 'C' : 'A'; // the shaded east end
      plot(g, c.x, y, ch);
    }
  }
  // Chips and scuffs on the face.
  for (const [x, y] of seed === 0
    ? [
        [TX + 3, TY - 1],
        [TX + 11, TY + 3],
      ]
    : [
        [TX + 6, TY + 1],
        [TX + 1, TY - 3],
      ])
    plot(g, x, y, 'A');
}

/** The tile point at fraction `u` along the north-east edge, `v` of the way in. */
function edgeAt(u: number, v: number): readonly [number, number] {
  return [TX + 16 * u - 2 * THICK * v, TY + 8 * u + THICK * v];
}

/** A gatepost at end `u` (0 west, 1 east): a chevroned pillar with a warm lantern on top. */
function gatepost(g: CharGrid, u: 0 | 1): void {
  const [px, py] = edgeAt(u, 0.5);
  const cx = Math.round(px) + (u === 1 ? -2 : 2);
  const cy = Math.round(py) + 1;
  isoBox(g, cx, cy + 1, 4, 0, { top: '_', rim: '_', left: '_', right: '_' });
  isoBox(g, cx, cy, 3, 14, { top: 'D', rim: 'E', left: 'C', right: 'B' });
  // Hazard chevrons down the lit face.
  for (let k = 2; k < 12; k++) {
    for (let x = cx - 3; x < cx; x++) {
      const y = cy - k + Math.round((cx - x) / 2);
      if ((k + x) % 4 < 2) plot(g, x, y, 'O');
    }
  }
  // The lamp on top: a lantern under a little cap, lit warm.
  // prettier-ignore
  const lamp = [
    '.BBB.',
    'BGHGB',
    'BHwHB',
    'BGHGB',
    '.BBB.',
  ];
  lamp.forEach((r, j) =>
    [...r].forEach((ch, i) => ch !== '.' && plot(g, cx - 3 + i, cy - 21 + j, ch)),
  );
}

/** The wall's end at the grid edge: a squat buttress at end `u`. */
function buttress(g: CharGrid, u: 0 | 1): void {
  const [px, py] = edgeAt(u, 0.5);
  const cx = Math.round(px) + (u === 1 ? -2 : 2);
  const cy = Math.round(py) + 1;
  isoBox(g, cx, cy + 1, 5, 0, { top: '_', rim: '_', left: '_', right: '_' });
  isoBox(g, cx, cy, 4, 11, { top: 'D', rim: 'E', left: 'C', right: 'B' });
  plot(g, cx - 2, cy - 6, 'A');
  plot(g, cx - 1, cy - 6, 'A');
}

type WallFrame = 'walk_0' | 'walk_1' | 'lamp_w' | 'lamp_e' | 'end_w' | 'end_e';

function wallGrid(f: WallFrame): string[] {
  const g = grid(W, H);
  if (f === 'walk_0' || f === 'walk_1') parapet(g, f === 'walk_0' ? 0 : 1);
  else if (f === 'lamp_w') {
    parapet(g, 0, 0.25, 1);
    gatepost(g, 0);
  } else if (f === 'lamp_e') {
    parapet(g, 0, 0, 0.75);
    gatepost(g, 1);
  } else if (f === 'end_w') {
    parapet(g, 1, 0.2, 1);
    buttress(g, 0);
  } else {
    parapet(g, 1, 0, 0.8);
    buttress(g, 1);
  }
  return rows(g);
}

export const propWall = defineSprite({
  id: 'prop.wall',
  size: { w: W, h: H },
  // The tile's center.
  anchor: { x: TX, y: TY + 8 },
  palette: 'everglow',
  outline: 'auto',
  legend: {
    A: 'grime.1',
    B: 'grime.2',
    C: 'grime.3',
    D: 'grime.4',
    E: 'steel.3',
    O: 'orange.2',
    G: 'gold.3',
    H: 'gold.4',
  },
  frames: {
    walk_0: wallGrid('walk_0'),
    walk_1: wallGrid('walk_1'),
    lamp_w: wallGrid('lamp_w'),
    lamp_e: wallGrid('lamp_e'),
    end_w: wallGrid('end_w'),
    end_e: wallGrid('end_e'),
  },
});
