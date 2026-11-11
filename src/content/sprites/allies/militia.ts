// Colonist militia (`ally.militia`, design/maps.md § 5.4; A3M6 and the finale under C3 Convoy):
// Dome Row's colonists holding a firing post beside the path. Not soldiers: a colonist in a teal
// Everglow work coat under an orange hi-vis vest, a white hard hat with a teal stripe, warm skin,
// holding a long survey rifle (a steel barrel, a brass stock), crouched behind a barricade of
// **lettuce crates** (slatted brass wood, a green head of butterhead peeking out of the top one: the
// colony's crop, now its cover). Small beside Bricks (who is huge) and on no post plate, so the
// militia read as people who stayed, not a tower.
// - `idle_<facing>` (2 frames, 2 fps): a breath, the rifle resting on the crates.
// - `fire_<facing>` (2 frames, 10 fps, once): the shot: a gold muzzle flash and the kick, then
//   back to idle (MilitiaView's tracer runs from the muzzle).
import { defineSprite } from '../defineSprite.ts';
import { grid, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';

const W = 20;
const H = 20;
const CX = 9;
const CY = 18;

type Look = 'idle' | 'fire';

/** The barricade: two lettuce crates side by side, one on top, a lettuce peeking out of it. */
function crates(g: CharGrid, se: boolean): void {
  const x0 = se ? 8 : 2;
  // Bottom row: two crates (slats lit, dark gaps), the top one set back.
  for (const [cx0, cy0, cw] of [
    [x0, 14, 5],
    [x0 + 5, 14, 5],
    [x0 + 2, 10, 6],
  ] as const) {
    for (let y = cy0; y < cy0 + 4; y++) {
      for (let x = cx0; x < cx0 + cw; x++) {
        const edge = x === cx0 || x === cx0 + cw - 1;
        plot(g, x, y, edge ? 'B' : y % 2 === 0 ? 'D' : 'C');
      }
    }
  }
  // The lettuce in the top crate.
  stamp(g, x0 + 3, 8, ['.LM.', 'LMLM']);
}

function militia(facing: 'se' | 'ne', step: 0 | 1, look: Look): string[] {
  const g: CharGrid = grid(W, H);
  const se = facing === 'se';
  const fire = look === 'fire';
  const breath = look === 'idle' && step === 1 ? 1 : 0;
  const kick = fire && step === 0 ? 1 : 0;
  // A soft contact shadow under the post.
  for (let x = 2; x < W - 1; x++) plot(g, x, H - 1, '_');
  // The colonist, crouched (so the crates cover the legs): boots, legs, the coat and vest.
  const bx = se ? 3 : 11;
  const top = 5 + breath;
  // Legs and boots, knelt.
  stamp(g, bx, 15, ['1111.', '00.00']);
  // The coat (teal), lit on the left; the hi-vis vest (orange, a white reflective stripe).
  for (let y = top + 4; y < 15; y++) {
    for (let x = bx; x < bx + 5; x++) plot(g, x, y, x === bx ? '7' : x === bx + 4 ? '5' : '6');
  }
  for (let y = top + 5; y < 13; y++) for (let x = bx + 1; x < bx + 4; x++) plot(g, x, y, 'c');
  line(g, bx + 1, top + 8, bx + 3, top + 8, 'w');
  // The head: warm skin, a white hard hat with a teal stripe, a brim.
  stamp(
    g,
    bx,
    top,
    se
      ? ['.444.', '44884', '0000.', '.EEF.', '.EEF.']
      : ['.444.', '48844', '.0000', '.FEE.', '.FEE.'],
  );
  if (se) {
    plot(g, bx + 3, top + 3, 'k'); // an eye, looking down the barrel
    // The rifle across the crates, aimed down the path: a steel barrel, a brass stock.
    const ry = top + 6 - kick;
    line(g, bx + 2, ry + 1, bx + 4, ry, 'G');
    line(g, bx + 5, ry, W - 3, ry - 1, '2');
    line(g, bx + 5, ry + 1, bx + 8, ry + 1, '1');
    plot(g, bx + 3, ry + 1, 'E'); // the hand on the stock
    if (fire && step === 0) stamp(g, W - 3, ry - 3, ['.e.', 'eee', '.e.', '...']);
  } else {
    // From behind: the coat's back, the rifle's stock against the shoulder, barrel out ahead.
    const ry = top + 6 - kick;
    line(g, bx - 1, ry, 2, ry - 1, '2');
    line(g, bx, ry + 1, bx + 1, ry + 1, 'G');
    if (fire && step === 0) stamp(g, 0, ry - 3, ['.e.', 'eee', '.e.']);
  }
  crates(g, se);
  return rows(g);
}

export const allyMilitia = defineSprite({
  id: 'ally.militia',
  size: { w: W, h: H },
  anchor: { x: CX, y: CY },
  palette: 'everglow',
  outline: 'auto',
  glow: { slots: ['a4'], radius: 1 },
  legend: {
    B: 'brass.1',
    C: 'brass.2',
    D: 'brass.3',
    E: 'skin.b.3',
    F: 'skin.b.2',
    G: 'brass.2',
    L: 'green.4',
    M: 'green.2',
  },
  frames: {
    idle_se_0: militia('se', 0, 'idle'),
    idle_se_1: militia('se', 1, 'idle'),
    fire_se_0: militia('se', 0, 'fire'),
    idle_ne_0: militia('ne', 0, 'idle'),
    idle_ne_1: militia('ne', 1, 'idle'),
    fire_ne_0: militia('ne', 0, 'fire'),
  },
  anims: {
    idle_se: { frames: ['idle_se_0', 'idle_se_1'], fps: 2 },
    idle_sw: { mirrorOf: 'idle_se' },
    idle_ne: { frames: ['idle_ne_0', 'idle_ne_1'], fps: 2 },
    idle_nw: { mirrorOf: 'idle_ne' },
    fire_se: { frames: ['fire_se_0', 'idle_se_0'], fps: 10, loop: false },
    fire_sw: { mirrorOf: 'fire_se' },
    fire_ne: { frames: ['fire_ne_0', 'idle_ne_0'], fps: 10, loop: false },
    fire_nw: { mirrorOf: 'fire_ne' },
  },
});
