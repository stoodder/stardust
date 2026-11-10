// Blinkstrider (`blinkstrider`, design/enemies.md § 5.2): the Aelari's blinker, A2M4's depth-
// placement teach (2.5 tiles forward every 6 s after a 0.8 s tell). Woven, never plated (art-
// direction §4): the only Aelari that strides. A sapphire lattice body like a wading bird's, a
// pointed prow ahead with a knot of light for an eye, a ruby crest, two tail threads streaming
// behind, high on two long thread legs that bend back at ruby knee knots. Its legs, its forward
// lean, and its height on the road keep it apart from the Glimmer (a hovering spindle) and the
// Veilwalker (a hooded veil) at 1×.
// - `walk_<facing>` (4 frames, 6 fps): a long stride, the body dipping as the legs pass; the hum.
// - `blink_<facing>` (the blink tell, held; enemyPose.ts `blink`): coiled to spring, legs folded
//   under it, the body pressed low and long, the prow thrust forward, and its back already coming
//   undone into loose threads streaming behind (render adds the shimmer, the rim, and the ghost
//   where it lands, art-direction §7).
// Hurt, it frays (`fray1_`/`fray2_<facing>`, T501d).
import { defineSprite } from '../defineSprite.ts';
import { at, grid, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';
import { frayLooks, hum, outlineOutside, rim, weave, type Mask } from './lattice.ts';

const W = 19;
const H = 28;
/** The ground row (its feet). */
const GROUND = 26;

type Pose = 'walk' | 'blink';
type Facing = 'se' | 'ne';

/** One leg: hip, knee (bent back), foot. */
type Leg = readonly [
  readonly [number, number],
  readonly [number, number],
  readonly [number, number],
];

/**
 * The stride's four steps, near leg then far leg (hip x offsets from the body; knee and foot
 * absolute): wide, passing, wide the other way, passing. The body lifts on the passing steps.
 */
const STRIDE: readonly { near: Leg; far: Leg; lift: number }[] = [
  {
    near: [
      [10, 12],
      [8, 19],
      [13, GROUND],
    ],
    far: [
      [7, 12],
      [4, 19],
      [3, GROUND],
    ],
    lift: 0,
  },
  {
    near: [
      [10, 11],
      [6, 18],
      [9, GROUND - 2],
    ],
    far: [
      [7, 11],
      [5, 18],
      [7, GROUND],
    ],
    lift: 1,
  },
  {
    near: [
      [10, 12],
      [6, 19],
      [4, GROUND],
    ],
    far: [
      [7, 12],
      [6, 19],
      [12, GROUND],
    ],
    lift: 0,
  },
  {
    near: [
      [10, 11],
      [7, 18],
      [8, GROUND],
    ],
    far: [
      [7, 11],
      [4, 18],
      [8, GROUND - 2],
    ],
    lift: 1,
  },
];

/** The blink tell's coiled legs: folded under the pressed-low body. */
const COILED: { near: Leg; far: Leg } = {
  near: [
    [10, 17],
    [6, 21],
    [11, GROUND],
  ],
  far: [
    [7, 17],
    [3, 22],
    [6, GROUND],
  ],
};

/**
 * A leg, drawn over the outlined body as a bare thread (no outline round it, so it stays fine): a
 * lit strand with a dark `blue.0` edge on its shaded right side, so it reads on the pale road. The
 * far leg goes behind the body (only into empty pixels) and a step darker.
 */
function drawLeg(g: CharGrid, leg: Leg, near: boolean): void {
  const [hip, knee, foot] = leg;
  const pts: [number, number][] = [];
  const t = grid(W, H);
  line(t, hip[0], hip[1], knee[0], knee[1], 'L');
  line(t, knee[0], knee[1], foot[0], foot[1], 'L');
  plot(t, foot[0] + 1, foot[1], 'L');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (t[y]?.[x] === 'L') pts.push([x, y]);
  const free = (x: number, y: number): boolean =>
    near || at(g, x, y) === '.' || at(g, x, y) === 'x';
  for (const [x, y] of pts) {
    if (!free(x, y)) continue;
    const upper = y < knee[1];
    plot(g, x, y, near ? (upper ? '4' : '3') : upper ? '2' : '1');
  }
  for (const [x, y] of pts) {
    if (at(g, x + 1, y) === '.' && t[y]?.[x + 1] !== 'L') plot(g, x + 1, y, 'x');
  }
  // The ruby knee knot.
  if (free(knee[0], knee[1])) plot(g, knee[0], knee[1], near ? 'd' : 'b');
}

function strider(facing: Facing, step: number, pose: Pose): string[] {
  const g: CharGrid = grid(W, H);
  const coiled = pose === 'blink';
  const s = STRIDE[step] ?? STRIDE[0];
  const lift = coiled ? 0 : (s?.lift ?? 0);
  const legs = coiled ? COILED : { near: s?.near, far: s?.far };
  // The body: a wading bird's teardrop, the prow ahead (lifted facing NE, away from us).
  const cy = coiled ? 15 : 8 - lift;
  const cx = coiled ? 9 : 8.5;
  const rx = coiled ? 6.2 : 5;
  const ry = coiled ? 2.7 : 3.6;
  const tipX = coiled ? 18 : 16;
  const tipY = cy + (facing === 'se' ? 0.5 : -1.5);
  const body: Mask = (x, y) => {
    const px = x + 0.5;
    const py = y + 0.5;
    if (Math.hypot((px - cx) / rx, (py - cy) / ry) <= 1) return true;
    // The prow: a wedge from the body's front to the tip.
    const t = (px - (cx + rx * 0.6)) / (tipX - (cx + rx * 0.6));
    if (t < 0 || t > 1) return false;
    const mid = cy + (tipY - cy) * t;
    return Math.abs(py - mid) <= ry * 0.75 * (1 - t);
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (body(x, y)) plot(g, x, y, '.');
  weave(g, body, { mode: 'diag', spacing: 3, phase: step % 2, rise: lift, lx: cx, ly: cy }, 5);
  rim(g, body, cx, cy - 1);
  hum(g, body, step, facing === 'se' ? 19 : 20);
  // The ruby crest over its back, and the heart.
  const top = Math.round(cy - ry);
  stamp(g, Math.round(cx) - 1, top - 1, coiled ? ['dc'] : ['.d', 'dc']);
  stamp(
    g,
    Math.round(cx) - 1,
    Math.round(cy) - 1,
    facing === 'se' ? ['.+.', '+*+', '.+.'] : ['.+.', '+.+', '.+.'],
  );
  if (facing === 'se') {
    // A knot of light for an eye, at the prow.
    plot(g, Math.round(tipX) - 3, Math.round(tipY) - 1, '*');
    plot(g, Math.round(tipX) - 3, Math.round(tipY), 'w');
  }
  // Two tail threads streaming behind; coiled to blink, its back comes undone into more.
  const rear = Math.round(cx - rx);
  const ry0 = Math.round(cy);
  line(g, rear, ry0 - 1, rear - 3, ry0 - 2 - (step % 2), '3');
  line(g, rear, ry0 + 1, rear - 3, ry0 + 1 + (step % 2), '2');
  plot(g, rear - 4, ry0 - 2 - (step % 2), 'd');
  if (coiled) {
    line(g, rear + 1, ry0 - 2, rear - 2, ry0 - 4, '3');
    line(g, rear + 1, ry0 + 2, rear - 2, ry0 + 4, '2');
    line(g, rear + 2, ry0, rear - 3, ry0, '3');
  }
  outlineOutside(g);
  // The legs over the outlined body: the far one behind it, the near one in front.
  if (legs.far !== undefined) drawLeg(g, legs.far, false);
  if (legs.near !== undefined) drawLeg(g, legs.near, true);
  return rows(g);
}

const frames = {
  walk_se_0: strider('se', 0, 'walk'),
  walk_se_1: strider('se', 1, 'walk'),
  walk_se_2: strider('se', 2, 'walk'),
  walk_se_3: strider('se', 3, 'walk'),
  walk_ne_0: strider('ne', 0, 'walk'),
  walk_ne_1: strider('ne', 1, 'walk'),
  walk_ne_2: strider('ne', 2, 'walk'),
  walk_ne_3: strider('ne', 3, 'walk'),
};
const anims = {
  walk_se: { frames: ['walk_se_0', 'walk_se_1', 'walk_se_2', 'walk_se_3'], fps: 6 },
  walk_sw: { mirrorOf: 'walk_se' },
  walk_ne: { frames: ['walk_ne_0', 'walk_ne_1', 'walk_ne_2', 'walk_ne_3'], fps: 6 },
  walk_nw: { mirrorOf: 'walk_ne' },
};
const frayed = frayLooks(frames, anims, 23);

export const enemyBlinkstrider = defineSprite({
  id: 'enemy.blinkstrider',
  size: { w: W, h: H },
  anchor: { x: 9, y: GROUND + 1 },
  palette: 'aelari',
  // The outline is the weave's own (lattice.ts `outlineOutside`), so the gaps stay see-through.
  outline: 'none',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  frames: {
    ...frames,
    blink_se_0: strider('se', 0, 'blink'),
    blink_ne_0: strider('ne', 0, 'blink'),
    ...frayed.frames,
  },
  anims: {
    ...anims,
    blink_se: { frames: ['blink_se_0'], fps: 1 },
    blink_sw: { mirrorOf: 'blink_se' },
    blink_ne: { frames: ['blink_ne_0'], fps: 1 },
    blink_nw: { mirrorOf: 'blink_ne' },
    ...frayed.anims,
  },
});
