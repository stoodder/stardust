// A shelter bay (`prop.shelter_bay`; A3M4 decor, act3.md § A3M4: "concrete tunnels and blast-door
// bays around a central hall"; any `bay_<n>` marker): one of the Shelters' bays, where the colony
// sleeps tonight. A ferrocrete alcove the size of a tile, its two back walls standing on the tile's
// north edges (coursed grime, lit along their tops) over a swept concrete floor, open to the front.
// - `v0`: a cot with a teal Everglow blanket and a pillow, a lantern burning warm on a crate beside
//   it (its light on the wall behind).
// - `v1`: two lettuce crates stacked against the back wall, a bedroll laid out in front of them,
//   and a small coral plush (a Skitterkin, someone's) sitting up on it.
// Everglow-owned (ferrocrete and the bay's things in its own legend): it keeps its colours in
// every act. The lantern's flame is `e0`/`e1`, drawn in `everglow.jailbroken` so it bakes warm.
import { defineSprite } from '../defineSprite.ts';
import { grid, inTileMask, isoBox, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';

const W = 32;
const H = 30;
/** The floor diamond's top row (the tile mask fills rows TOPD..TOPD+15). */
const TOPD = 14;
/** The walls' height over the floor. */
const WALL = 13;

function bay(look: 'v0' | 'v1'): string[] {
  const g: CharGrid = grid(W, H);
  // The floor: swept concrete, its back edges in the walls' shade.
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < W; x++) {
      if (!inTileMask(x, y)) continue;
      const shade = y < 4 + Math.abs(x - 15.5) / 2 - 3;
      plot(g, x, TOPD + y, shade ? 'J' : (x + y * 3) % 7 === 0 ? 'L' : 'M');
    }
  }
  // The back walls: the left one on the tile's north-west edge (lit), the right one on its
  // north-east edge (in shade), coursed, a lit cap along each top.
  for (let x = 0; x <= 15; x++) {
    const foot = TOPD + 8 - Math.floor(x / 2);
    for (let y = foot - WALL; y <= foot; y++) {
      const cap = y === foot - WALL;
      plot(g, x, y, cap ? 'N' : (foot - y) % 5 === 0 ? 'L' : 'M');
    }
  }
  for (let x = 16; x < W; x++) {
    const foot = TOPD + Math.floor((x - 16) / 2);
    for (let y = foot - WALL; y <= foot; y++) {
      const cap = y === foot - WALL;
      plot(g, x, y, cap ? 'N' : (foot - y) % 5 === 0 ? 'J' : 'L');
    }
  }
  // The corner where they meet, a step lit.
  line(g, 15, TOPD - WALL, 15, TOPD, 'N');
  if (look === 'v0') {
    // A cot along the left wall: steel legs, a teal blanket, a white pillow.
    isoBox(g, 11, TOPD + 11, 7, 2, { top: '8', rim: '9', left: '7', right: '6' });
    stamp(g, 6, TOPD + 5, ['WW', 'WV']);
    plot(g, 5, TOPD + 12, '1');
    plot(g, 16, TOPD + 12, '1');
    // A crate by the right wall, a lantern on it burning warm, its light on the wall.
    isoBox(g, 22, TOPD + 9, 3, 3, { top: 'C', rim: 'D', left: 'C', right: 'B' });
    stamp(g, 21, TOPD + 1, ['.1.', '1+1', '1*1', '111']);
    for (const [x, y] of [
      [19, TOPD - 1],
      [24, TOPD],
      [21, TOPD - 3],
    ] as const) {
      plot(g, x, y, 'O');
    }
  } else {
    // Two lettuce crates stacked against the back wall, a head peeking out of the top one.
    isoBox(g, 17, TOPD + 6, 5, 4, { top: 'D', rim: 'D', left: 'C', right: 'B' });
    isoBox(g, 17, TOPD + 2, 4, 4, { top: 'D', rim: 'D', left: 'C', right: 'B' });
    stamp(g, 15, TOPD - 5, ['.GH.', 'GHGH']);
    // A bedroll in front of them, a coral plush sitting up on it.
    isoBox(g, 13, TOPD + 11, 5, 1, { top: 'P', rim: 'Q', left: 'Q', right: 'R' });
    stamp(g, 15, TOPD + 6, ['.ss.', 'ssss', 'skks', '.ss.']);
  }
  return rows(g);
}

export const propShelterBay = defineSprite({
  id: 'prop.shelter_bay',
  size: { w: W, h: H },
  anchor: { x: 16, y: TOPD + 8 },
  palette: 'everglow.jailbroken',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: {
    // Ferrocrete: the lit cap, the face, the coursing and shade, the deepest shade.
    N: 'grime.4',
    M: 'grime.2',
    L: 'grime.1',
    J: 'grime.0',
    // The bay's things: the pillow, the crates' slats, the lettuce, the bedroll, the lamplight.
    W: 'white.0',
    V: 'steel.3',
    B: 'brass.1',
    C: 'brass.2',
    D: 'brass.3',
    G: 'green.2',
    H: 'green.3',
    P: 'blue.2',
    Q: 'blue.1',
    R: 'blue.0',
    O: 'orange.1',
    s: 'coral.3',
  },
  frames: { v0: bay('v0'), v1: bay('v1') },
});
