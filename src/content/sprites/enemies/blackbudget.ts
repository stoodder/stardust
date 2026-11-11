// Black Budget Operative (`blackbudget`, design/enemies.md § 5.3): Everglow Security's stealth unit
// (Act III), cloaked and armored, off the books. Everglow's shape language (art-direction §4) with
// the paint left off: a slim, tall, angular biped in matte gunmetal (the steel ramp's lower steps,
// lit enough to sit in Act III's unit band), a hooded cowl of optical-camouflage panels flecked
// with teal hex cells, a wedge helmet with **one orange lens**, a black REDACTED bar across its
// chest where the logo plate should be, and long reverse-kneed legs that step softly. Thin and dark
// where every other Everglow walker is white and boxy.
// - `walk_<facing>` (4 frames, 8 fps): a soft stalking step, the cowl's camouflage cells shifting.
// It bakes the `cloak` derived variant (`cloak: true`, tech-spec § What the baker produces), which
// render draws while it is cloaked and unrevealed. No death frames: it shuts down (render).
import { defineSprite } from '../defineSprite.ts';
import { grid, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';

const W = 13;
const H = 21;
const AX = 6;
const AY = 20;

/** The feet's x offsets from the hips (near, far) per step, and the body's dip. */
const STEP: readonly { near: number; far: number; dip: number }[] = [
  { near: 2, far: -2, dip: 0 },
  { near: 0, far: 0, dip: 1 },
  { near: -2, far: 2, dip: 0 },
  { near: 0, far: 0, dip: 1 },
];

function leg(g: CharGrid, hx: number, hy: number, fx: number, near: boolean): void {
  const kx = hx + 1;
  const ky = hy + 3;
  line(g, hx, hy, kx, ky, near ? '2' : '1');
  line(g, kx, ky, fx, H - 2, near ? '2' : '1');
  plot(g, kx, ky, near ? '3' : '2');
  plot(g, fx, H - 1, near ? '2' : '1');
  plot(g, fx + 1, H - 1, '0');
}

function operative(facing: 'se' | 'ne', step: 0 | 1 | 2 | 3): string[] {
  const g: CharGrid = grid(W, H);
  const se = facing === 'se';
  const { near, far, dip } = STEP[step] ?? { near: 0, far: 0, dip: 0 };
  const top = 2 + dip;
  leg(g, 5, top + 11, 5 + far, false);
  // The torso: a narrow wedge, gunmetal lit from the upper left.
  for (let y = top + 5; y <= top + 12; y++) {
    const half = y < top + 9 ? 3 : 2;
    for (let x = 6 - half; x <= 6 + half; x++) plot(g, x, y, x - 6 + (y - top - 5) < 0 ? '3' : x < 7 ? '2' : '1');
  }
  // The cowl over its shoulders: angular camouflage panels with teal hex cells that shift.
  for (let y = top + 3; y <= top + 6; y++) {
    const half = y === top + 3 ? 3 : 5;
    for (let x = 6 - half; x <= 6 + half; x++) {
      const cell = (x * 2 + y + step) % 5 === 0;
      plot(g, x, y, cell ? '6' : x < 5 ? '2' : '1');
    }
  }
  line(g, 2, top + 6, 10, top + 6, '0');
  // The wedge helmet, lit along its crest.
  stamp(g, 4, top, ['.333.', '32221', '22211', '.211.']);
  if (se) {
    // One orange lens at the front of the helmet, a teal sensor line under it.
    plot(g, 7, top + 2, 'e');
    plot(g, 8, top + 2, 'd');
    plot(g, 6, top + 3, '7');
    // The REDACTED bar across its chest, where the logo plate should be.
    line(g, 4, top + 8, 8, top + 8, 'k');
    plot(g, 9, top + 8, '0');
  } else {
    // From behind: a slim pack and a teal antenna stub, its status lamp.
    stamp(g, 4, top + 7, ['111', '101', '111']);
    plot(g, 8, top + 1, '+');
    plot(g, 8, top, '7');
  }
  leg(g, 7, top + 11, 7 + near, true);
  return rows(g);
}

export const enemyBlackBudget = defineSprite({
  id: 'enemy.blackbudget',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'everglow',
  outline: 'auto',
  cloak: true,
  glow: { slots: ['e0', 'e1'], radius: 1 },
  frames: {
    walk_se_0: operative('se', 0),
    walk_se_1: operative('se', 1),
    walk_se_2: operative('se', 2),
    walk_se_3: operative('se', 3),
    walk_ne_0: operative('ne', 0),
    walk_ne_1: operative('ne', 1),
    walk_ne_2: operative('ne', 2),
    walk_ne_3: operative('ne', 3),
  },
  anims: {
    walk_se: { frames: ['walk_se_0', 'walk_se_1', 'walk_se_2', 'walk_se_3'], fps: 8 },
    walk_sw: { mirrorOf: 'walk_se' },
    walk_ne: { frames: ['walk_ne_0', 'walk_ne_1', 'walk_ne_2', 'walk_ne_3'], fps: 8 },
    walk_nw: { mirrorOf: 'walk_ne' },
  },
});
