// Liability-Class Enforcer (`liability`, design/enemies.md § 5.3): Everglow Security's heavy (Act
// III), 600 HP under armor 12, slow. Everglow's shape language (art-direction §4) at its bulkiest:
// a hulking two-legged riot walker, broad as a wall, its body hidden behind a **riot shield** of
// pale steel slabs (the `armored` tell's `steel.4`, §8) bolted on in courses with dark seams, an
// orange hazard chevron down the shield's face and a slit of teal viewport, a little teal visor
// peering over the top, a rivet row, and two thick piston legs stomping under it. From behind:
// the same slabs across its back round an orange heat vent, glowing. The biggest Everglow walker,
// read at 1× by its width and its flat slab front.
// - `walk_<facing>` (4 frames, 5 fps): a heavy stomp: a leg lifts, plants, and the whole hull
//   sinks a pixel on each plant.
// No death frames: Everglow Security shuts down (render's `shutdown`).
import { defineSprite } from '../defineSprite.ts';
import { grid, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';

const W = 24;
const H = 24;
const AX = 12;
const AY = 23;

/** Each step: the near and far foot's lift (px), and the hull's sink. */
const STOMP: readonly { near: number; far: number; sink: number }[] = [
  { near: 2, far: 0, sink: 0 },
  { near: 0, far: 0, sink: 1 },
  { near: 0, far: 2, sink: 0 },
  { near: 0, far: 0, sink: 1 },
];

/** A piston leg from the hull at x down to its foot, lifted by `lift`. */
function leg(g: CharGrid, x: number, hullBottom: number, lift: number, near: boolean): void {
  const foot = H - 1 - lift;
  for (let y = hullBottom; y < foot - 1; y++) {
    plot(g, x, y, near ? '3' : '2');
    plot(g, x + 1, y, near ? '2' : '1');
    plot(g, x + 2, y, '1');
  }
  // The knee guard (orange) and the wide foot.
  plot(g, x + 1, hullBottom + 1, 'c');
  stamp(g, x - 1, foot - 1, [near ? '13331' : '12221', '01110']);
}

function liability(facing: 'se' | 'ne', step: 0 | 1 | 2 | 3): string[] {
  const g: CharGrid = grid(W, H);
  const se = facing === 'se';
  const { near, far, sink } = STOMP[step] ?? { near: 0, far: 0, sink: 0 };
  const top = 4 + sink;
  const bottom = 17 + sink;
  // The far leg behind the hull.
  leg(g, se ? 6 : 15, bottom - 1, far, false);
  // The hull: broad shoulders, its slab armor in courses (pale steel, lit upper left, dark seams).
  for (let y = top; y <= bottom; y++) {
    const inset = y === top ? 3 : y === top + 1 ? 1 : y >= bottom - 1 ? 2 : 0;
    for (let x = 1 + inset; x < W - 1 - inset; x++) {
      const course = (y - top) % 4 === 3;
      const joint = (x + Math.floor((y - top) / 4) * 3) % 7 === 0;
      let ch = x + (y - top) < 12 ? 'T' : x < 16 ? 'S' : '3';
      if (course || joint) ch = '1';
      plot(g, x, y, ch);
    }
  }
  // The shoulders' top edge lit white, a rivet row under it.
  line(g, 4, top, W - 5, top, 'w');
  for (let x = 4; x < W - 4; x += 3) plot(g, x, top + 1, '0');
  if (se) {
    // The little teal visor peering over the shield, a glint on it.
    stamp(g, 13, top - 3, ['.1111.', '177771', '176671']);
    plot(g, 14 + step, top - 2, 'w'); // the glint sweeps the visor
    // The riot shield's face: a hazard chevron down it, a teal viewport slit.
    for (let k = 0; k < 4; k++) {
      plot(g, 8 + k, top + 5 + k, 'c');
      plot(g, 15 - k, top + 5 + k, 'c');
      plot(g, 8 + k, top + 6 + k, 'x');
      plot(g, 15 - k, top + 6 + k, 'x');
    }
    line(g, 9, top + 3, 14, top + 3, '7');
    plot(g, 11 + (step % 2), top + 3, '*');
    // The shield's lower lip, scuffed, and Everglow's chevron on its corner.
    line(g, 3, bottom, W - 4, bottom, '1');
    stamp(g, 3, top + 4, ['8.8', '.8.']);
  } else {
    // From behind: the heat vent between the slabs, glowing orange, and a hazard band.
    stamp(g, 8, top + 4, ['xxxxxxxx', 'xdcdcdcx', 'xcdcdcdx', 'xxxxxxxx']);
    for (let x = 3; x < W - 3; x++) plot(g, x, bottom - 2, (x + step) % 4 < 2 ? 'c' : 'x');
    stamp(g, 17, top + 4, ['8.8', '.8.']);
    // The visor's back: a steel cowl and a status lamp.
    stamp(g, 9, top - 2, ['.1111.', '122221']);
    plot(g, 11, top - 1, '+');
  }
  // The near leg in front.
  leg(g, se ? 14 : 7, bottom - 1, near, true);
  return rows(g);
}

export const enemyLiability = defineSprite({
  id: 'enemy.liability',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'everglow',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: { S: 'white.0', T: 'steel.4' },
  frames: {
    walk_se_0: liability('se', 0),
    walk_se_1: liability('se', 1),
    walk_se_2: liability('se', 2),
    walk_se_3: liability('se', 3),
    walk_ne_0: liability('ne', 0),
    walk_ne_1: liability('ne', 1),
    walk_ne_2: liability('ne', 2),
    walk_ne_3: liability('ne', 3),
  },
  anims: {
    walk_se: { frames: ['walk_se_0', 'walk_se_1', 'walk_se_2', 'walk_se_3'], fps: 5 },
    walk_sw: { mirrorOf: 'walk_se' },
    walk_ne: { frames: ['walk_ne_0', 'walk_ne_1', 'walk_ne_2', 'walk_ne_3'], fps: 5 },
    walk_nw: { mirrorOf: 'walk_ne' },
  },
});
