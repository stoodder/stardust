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
  // The cape of camouflage panels, hanging off its shoulders behind it and flaring to the knee,
  // flecked with teal hex cells that shift as it walks (from behind, it covers the back).
  for (let y = top + 4; y <= top + 13; y++) {
    const k = y - (top + 4);
    const x0 = se ? 4 - Math.floor(k / 3) : 4;
    const x1 = se ? 6 : 8 + Math.floor(k / 3);
    for (let x = x0; x <= x1; x++) {
      const cell = (x * 2 + y * 3 + step) % 7 === 0;
      plot(g, x, y, cell ? '6' : (se ? x === x0 : x === x1) ? '1' : '2');
    }
  }
  // The torso: narrow, gunmetal lit from the upper left (in front of the cape facing SE).
  for (let y = top + 4; y <= top + 11; y++) {
    for (let x = 6; x <= 8; x++) plot(g, x, y, x === 6 ? '3' : x === 7 ? '2' : '1');
  }
  // The wedge helmet on a short neck, lit along its crest.
  stamp(g, 5, top, se ? ['.33.', '3222', '2221', '.21.'] : ['.33.', '2223', '1222', '.12.']);
  if (se) {
    // One orange lens at the front of the helmet; the REDACTED bar across its chest.
    plot(g, 8, top + 1, 'e');
    plot(g, 9, top + 1, 'd');
    line(g, 6, top + 6, 8, top + 6, 'k');
    plot(g, 9, top + 6, '0');
    // One arm forward, a slim black device in its hand.
    line(g, 8, top + 5, 10, top + 8, '2');
    stamp(g, 10, top + 8, ['00', '0.']);
  } else {
    // From behind: the cape's hood, a teal antenna stub and its status lamp.
    plot(g, 8, top - 1, '7');
    plot(g, 8, top, '+');
    line(g, 4, top + 5, 8, top + 5, '0');
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
