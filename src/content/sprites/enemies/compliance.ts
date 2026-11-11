// Compliance Drone (`compliance`, design/enemies.md § 5.3): Everglow Security's walker (Act III),
// sent up the path to repossess the colony core. Everglow's shape language (art-direction §4):
// rounded rectangles, panel lines, chevrons, the clean white-and-teal brand. A squat white box
// strutting on two backward-kneed steel legs, a teal visor slit across its front with one glint,
// steel shoulder plates bolted on (Armored), a little orange PA horn on its crown (the polite
// announcements: "Please remain compliant"), a teal logo chevron on its flank, and an orange-and-
// ink hazard skirt. A walker, not a flyer: it never reads as Gerald's round rotor capsule or as
// Prim's hovering auditor box.
// - `walk_<facing>` (4 frames, 8 fps): a brisk strut, a leg forward each step, the box bobbing.
// No death frames: Everglow Security shuts down (render's `shutdown`, the power-off and the tag).
import { defineSprite } from '../defineSprite.ts';
import { grid, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';

const W = 14;
const H = 16;
const AX = 7;
const AY = 15;

/** Each step's legs: the near and far foot's x offsets from the hips (px), and the bob. */
const STRUT: readonly { near: number; far: number; bob: number }[] = [
  { near: 2, far: -2, bob: 0 },
  { near: 0, far: 0, bob: 1 },
  { near: -2, far: 2, bob: 0 },
  { near: 0, far: 0, bob: 1 },
];

/** A backward-kneed leg from the hip (hx, hy) to the foot at (fx, ground). */
function leg(g: CharGrid, hx: number, hy: number, fx: number, near: boolean): void {
  const kx = hx + 1; // the knee bends back (toward the tail)
  const ky = hy + 3;
  line(g, hx, hy, kx, ky, near ? '2' : '1');
  line(g, kx, ky, fx, H - 2, near ? '1' : '0');
  // The foot: a flat steel pad.
  plot(g, fx - 1, H - 1, '0');
  plot(g, fx, H - 1, near ? '1' : '0');
  plot(g, fx + 1, H - 1, '0');
}

function drone(facing: 'se' | 'ne', step: 0 | 1 | 2 | 3): string[] {
  const g: CharGrid = grid(W, H);
  const { near, far, bob } = STRUT[step] ?? { near: 0, far: 0, bob: 0 };
  const top = 3 + bob;
  // The far leg behind the box, then the box, then the near leg in front.
  leg(g, 5, top + 7, 5 + far, false);
  // The box: white paint lit from the upper left, a steel panel line, rounded corners.
  for (let y = top; y < top + 8; y++) {
    for (let x = 2; x < 12; x++) {
      const corner = (y === top || y === top + 7) && (x === 2 || x === 11);
      if (corner) continue;
      const lit = x + (y - top) < 9 ? '4' : x < 9 ? '3' : '2';
      plot(g, x, y, y === top + 7 ? '2' : lit);
    }
  }
  line(g, 3, top + 4, 10, top + 4, '2'); // the panel line round its middle
  // The steel shoulder plates (Armored), bolted at each end.
  line(g, 2, top, 11, top, '1');
  line(g, 3, top + 1, 10, top + 1, '2');
  plot(g, 3, top, 'w');
  plot(g, 10, top, '0');
  // The hazard skirt: orange and ink stripes along its bottom edge.
  for (let x = 3; x < 11; x++) plot(g, x, top + 6, (x + step) % 4 < 2 ? 'c' : 'x');
  // The PA horn on its crown, flaring toward the facing.
  if (facing === 'se') stamp(g, 7, top - 3, ['.cd', 'cdd', '.b.']);
  else stamp(g, 4, top - 3, ['dc.', 'ddc', '.b.']);
  if (facing === 'se') {
    // The visor slit across its front, a glint riding it; the logo chevron on its flank.
    line(g, 6, top + 2, 11, top + 2, '7');
    line(g, 6, top + 3, 11, top + 3, '6');
    plot(g, 7 + (step % 2), top + 2, 'w');
    plot(g, 10, top + 2, '*');
    stamp(g, 3, top + 4, ['8.8', '.8.']);
  } else {
    // From behind: a vent grille and its status lamp; the chevron on the near flank.
    stamp(g, 5, top + 2, ['000', '...', '000'].map((r) => r.replace(/\./g, '1')));
    plot(g, 9, top + 2, '+');
    stamp(g, 9, top + 4, ['8.8', '.8.']);
  }
  leg(g, 8, top + 7, 8 + near, true);
  return rows(g);
}

export const enemyCompliance = defineSprite({
  id: 'enemy.compliance',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'everglow',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  frames: {
    walk_se_0: drone('se', 0),
    walk_se_1: drone('se', 1),
    walk_se_2: drone('se', 2),
    walk_se_3: drone('se', 3),
    walk_ne_0: drone('ne', 0),
    walk_ne_1: drone('ne', 1),
    walk_ne_2: drone('ne', 2),
    walk_ne_3: drone('ne', 3),
  },
  anims: {
    walk_se: { frames: ['walk_se_0', 'walk_se_1', 'walk_se_2', 'walk_se_3'], fps: 8 },
    walk_sw: { mirrorOf: 'walk_se' },
    walk_ne: { frames: ['walk_ne_0', 'walk_ne_1', 'walk_ne_2', 'walk_ne_3'], fps: 8 },
    walk_nw: { mirrorOf: 'walk_ne' },
  },
});
