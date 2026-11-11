// Silencer (`silencer`, design/enemies.md § 5.4 and § 4): the Hollow's jammer (A3M4 on), which
// hushes towers. The Hollow's grammar (art-direction §4): the shape of a Skitterkin singer it can't
// remember, stood up too tall: a narrow drained body on two stilt legs, a head held too high on a
// long neck, a pale ring for a face with one long finger laid across it (shh), three acid eyes
// (never a pair), a cold violet speck at its heart, and its **tendril**: a black rope coiled behind
// it (`K`, `ink.0`, so the pale outline pass rings it: the "black tendril with an inverted outline"
// of art-direction §8's `disabler` row), pale at its tip. The `ink.0` contour sits inside the pale
// outline (U12), and 1–3 pixels are missing from every frame (`dropPixels`).
// - `walk_<facing>` (3 frames, 5 fps): a stalking stilt walk, the legs popping to new places while
//   the body sways out of step, the coiled tendril swinging behind.
// - `tell_<facing>` (2 frames, 6 fps; the jam tendril's tell and its hush reach, enemyPose `tell`):
//   it stops dead, its ring-face opens, the finger stays at its lips, and the tendril uncoils and
//   reaches forward to the canvas's leading edge, kinking the other way on the second frame (render
//   draws the rope on from there to the tower, render/views/JamView.ts).
// - `heavy_<facing>` (§8 `heavy`, after it hushes someone): swollen and darker, the victim pale
//   inside, its outline doubled, speed lines trailing.
// No death frames: it unravels (render).
import { defineSprite } from '../defineSprite.ts';
import { grid, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';
import { dropPixels, heavyDress, hollowBody, inkContour } from './hollow.ts';
import { MOTE_BODY_LEGEND } from './mote.ts';

/** Authored canvas: room ahead (right, facing SE) for the tendril's reach. */
const W = 19;
const H = 22;
const AX = 7;
const AY = 21;

type Look = 'walk' | 'heavy' | 'tell';
type Facing = 'se' | 'ne';

/** The stilt legs' feet (x) per walk step, and the body's sway (px), out of step with them. */
const STRIDE: readonly { feet: readonly [number, number]; sway: number; bob: number }[] = [
  { feet: [4, 9], sway: 0, bob: 0 },
  { feet: [6, 7], sway: 1, bob: 1 },
  { feet: [3, 10], sway: 0, bob: 0 },
];

/** The tendril trailing behind it on the ground, per walk step: points from its root, 2 px thick. */
const TRAIL: readonly (readonly (readonly [number, number])[])[] = [
  [
    [0, 0],
    [-2, 3],
    [-3, 6],
    [-2, 8],
    [-4, 9],
  ],
  [
    [0, 0],
    [-2, 3],
    [-2, 6],
    [-4, 8],
    [-5, 7],
  ],
  [
    [0, 0],
    [-3, 3],
    [-3, 6],
    [-1, 8],
    [-3, 9],
  ],
];

/** A rope 2 px thick (the pixel under each step too) from (x0, y0) to (x1, y1). */
function rope(g: CharGrid, x0: number, y0: number, x1: number, y1: number, ch: string): void {
  line(g, x0, y0, x1, y1, ch);
  line(g, x0, y0 + 1, x1, y1 + 1, ch);
}

function silencer(facing: Facing, step: 0 | 1 | 2, look: Look): string[] {
  const heavy = look === 'heavy';
  const tell = look === 'tell';
  const g: CharGrid = grid(W, H);
  const s = STRIDE[tell ? 0 : step] ?? { feet: [4, 9] as const, sway: 0, bob: 0 };
  const sway = tell ? 0 : s.sway;
  const bob = tell ? -1 : s.bob;
  // The tendril's root, low on its back, and its rope, drawn before the body (it comes out of it).
  const rx = 5 + sway;
  const ry = 13 + bob;
  if (!tell && !heavy) {
    const trail = TRAIL[step] ?? [];
    for (let i = 1; i < trail.length; i++) {
      const [ax, ay] = trail[i - 1] ?? [0, 0];
      const [bx, by] = trail[i] ?? [0, 0];
      rope(g, rx + ax, ry + ay, rx + bx, ry + by, 'K');
    }
    const [tx, ty] = trail[trail.length - 1] ?? [0, 0];
    plot(g, rx + tx - 1, ry + ty, 'w');
  }
  // The stilt legs, thin and too long (the body hangs over their tops).
  const [f0, f1] = tell ? ([6, 10] as const) : s.feet;
  line(g, 7 + sway, 15 + bob, f0 + 1, H - 1, '1');
  line(g, 9 + sway, 15 + bob, f1 + 1, H - 1, '2');
  // The body: narrow and tall, lit from the upper left, a bite out of its far flank; the head held
  // too high on its neck and a little ahead (behind it, from the back).
  const body: CharGrid = grid(W, H);
  const bite = facing === 'se' ? 0.5 : -0.5;
  hollowBody(body, 8 + sway, 12 + bob, heavy ? 4.8 : 4, heavy ? 6 : 5.4, bite, heavy);
  const hx = (facing === 'se' ? 10 : 7.5) + sway;
  const hy = 4.4 + bob;
  hollowBody(body, hx, hy, 4, 3.6, 0, heavy);
  inkContour(body);
  stamp(g, 0, 0, rows(body));
  const cx = Math.round(hx);
  const cy = Math.round(hy);
  if (facing === 'se') {
    // The ring where a face should be, low on the head: it opens wide in the tell.
    const fx = cx;
    const fy = cy;
    stamp(g, fx - 1, fy - 1, tell ? ['wwww', 'wkkw', 'wkkw', 'wwww'] : ['.w.', 'wkw', '.w.']);
    // One thin arm up out of its chest, a pale finger laid against the ring: shh.
    line(g, 6 + sway, 11 + bob, fx - 2, fy + 3, '3');
    plot(g, fx - 2, fy + 2, 'w');
    plot(g, fx - 2, fy + 1, 'w');
    // Three acid eyes over the crown, never a pair (one blinks out of step).
    plot(g, cx - 2, cy - 2, '*');
    if (step !== 2) plot(g, cx + 2, cy - 2, '+');
    plot(g, cx - 3, cy, '+');
  } else {
    // From behind: a violet seam down its back, and acid eyes on the back of its head anyway.
    for (let y = 9; y < 16; y++) {
      const v = (y + step) % 3 === 0;
      plot(g, 8 + sway + (v ? 1 : 0), y + bob, v ? 'U' : 'V');
    }
    plot(g, cx - 1, cy - 1, '*');
    if (step !== 1) plot(g, cx + 2, cy, '+');
    plot(g, cx, cy + 2, '+');
  }
  // The cold violet speck at its heart.
  if (facing === 'se') plot(g, 8 + sway, 13 + bob, step === 1 ? 'U' : 'V');
  if (tell) {
    // The tendril uncoils from its back, loops up over its shoulder, and reaches for the leading
    // edge at head height, kinking the other way on the second frame; pale at the tip.
    const ey = cy + (facing === 'se' ? 1 : 0);
    const kink = step === 0 ? -2 : 2;
    rope(g, rx - 1, ry, rx - 3, ry - 5, 'K');
    rope(g, rx - 3, ry - 5, rx - 1, 1, 'K');
    rope(g, rx - 1, 1, 14, ey + kink, 'K');
    rope(g, 14, ey + kink, W - 2, ey, 'K');
    plot(g, W - 1, ey, 'w');
    plot(g, W - 1, ey + 1, 'w');
  }
  if (heavy) heavyDress(g, 6 + sway, 11 + bob, 0, 13 + bob, step);
  const seed = (facing === 'se' ? 150 : 160) + step + (heavy ? 5 : tell ? 9 : 0);
  return dropPixels(rows(g), seed);
}

const frames = {
  walk_se_0: silencer('se', 0, 'walk'),
  walk_se_1: silencer('se', 1, 'walk'),
  walk_se_2: silencer('se', 2, 'walk'),
  walk_ne_0: silencer('ne', 0, 'walk'),
  walk_ne_1: silencer('ne', 1, 'walk'),
  walk_ne_2: silencer('ne', 2, 'walk'),
  tell_se_0: silencer('se', 0, 'tell'),
  tell_se_1: silencer('se', 1, 'tell'),
  tell_ne_0: silencer('ne', 0, 'tell'),
  tell_ne_1: silencer('ne', 1, 'tell'),
  heavy_se_0: silencer('se', 0, 'heavy'),
  heavy_se_1: silencer('se', 1, 'heavy'),
  heavy_se_2: silencer('se', 2, 'heavy'),
  heavy_ne_0: silencer('ne', 0, 'heavy'),
  heavy_ne_1: silencer('ne', 1, 'heavy'),
  heavy_ne_2: silencer('ne', 2, 'heavy'),
};

export const enemySilencer = defineSprite({
  id: 'enemy.silencer',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'hollow',
  outline: 'auto',
  legend: MOTE_BODY_LEGEND,
  frames,
  anims: {
    walk_se: { frames: ['walk_se_0', 'walk_se_1', 'walk_se_2'], fps: 5 },
    walk_sw: { mirrorOf: 'walk_se' },
    walk_ne: { frames: ['walk_ne_0', 'walk_ne_1', 'walk_ne_2'], fps: 5 },
    walk_nw: { mirrorOf: 'walk_ne' },
    tell_se: { frames: ['tell_se_0', 'tell_se_1'], fps: 6 },
    tell_sw: { mirrorOf: 'tell_se' },
    tell_ne: { frames: ['tell_ne_0', 'tell_ne_1'], fps: 6 },
    tell_nw: { mirrorOf: 'tell_ne' },
    heavy_se: { frames: ['heavy_se_0', 'heavy_se_1', 'heavy_se_2'], fps: 6 },
    heavy_sw: { mirrorOf: 'heavy_se' },
    heavy_ne: { frames: ['heavy_ne_0', 'heavy_ne_1', 'heavy_ne_2'], fps: 6 },
    heavy_nw: { mirrorOf: 'heavy_ne' },
  },
});
