// Fracture (`fracture`, design/enemies.md § 5.4): A2M6's Hollow splitter (killed, it breaks into
// two Shards, each of which breaks into two Motes). The Hollow's grammar (art-direction §4): the
// shape of a big Skitterkin it can't remember whole, already in two pieces: a round drained body
// split down the middle by a jagged crack that glows cold violet (unsung stardust, §1 principle 6),
// its two halves bobbing out of step with each other, so it plainly comes apart. One half carries
// a pale ring where a face should be and the acid pinprick eyes (three, never a pair), the other a
// stalk that wilts the wrong way; too many legs, popping to new places each frame; a pale
// (inverted) outline with the Mote's `ink.0` contour inside it, the crack lit to the rim (T569);
// 1–3 pixels missing from every frame (`dropPixels`).
// - `walk_<facing>` (3 frames, 5 fps): the halves lurch, one up while the other sinks.
// - `heavy_<facing>` (the `heavy` tell, §8): swollen and darker, the victim pale inside it, the
//   outline doubled, speed lines trailing.
// - `tell_<facing>` (the hush tell, held): the crack yawns, the ring-face opens, two limbs reach.
// No death frames: it splits (the sim spawns its Shards) and the Hollow unravels (render).
import { defineSprite } from '../defineSprite.ts';
import { grid, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';
import { dropPixels, heavyDress, hollowBody, inkContour, reach } from './hollow.ts';
import { MOTE_BODY_LEGEND } from './mote.ts';

/** Authored canvas: room behind the body (left, facing SE) for Heavy's speed lines. */
const W = 20;
const H = 17;
const AX = 12;
const AY = 16;

type Look = 'walk' | 'heavy' | 'tell';
type Facing = 'se' | 'ne';

/** Each step's lurch: the left half's and the right half's sink (px). */
const LURCH: readonly (readonly [number, number])[] = [
  [0, 1],
  [1, 0],
  [1, 1],
];

/** The legs, too many, somewhere new each frame (x offsets from the body's left). */
const LEGS: readonly (readonly string[])[] = [
  ['.0..0.0...0..0', '.0...0....0..0'],
  ['0...0..0.0...0', '0....0.....0..'],
  ['..0.0...0..0.0', '..0......0...0'],
];

/** The crack's zigzag: its column offset from the middle, by row. */
const ZIG = [0, 1, 1, 0, -1, -1] as const;

function fracture(facing: Facing, step: 0 | 1 | 2, look: Look): string[] {
  const heavy = look === 'heavy';
  const tell = look === 'tell';
  const cx = 11.5;
  const cy = 8.5 + (tell ? -1 : 0);
  const rx = heavy ? 6.8 : 6.2;
  const ry = heavy ? 5.6 : tell ? 4.4 : 5;
  const [sinkL, sinkR] = LURCH[step] ?? [0, 0];
  // The two halves, each its own drained body, bobbing out of step.
  const left: CharGrid = grid(W, H);
  const right: CharGrid = grid(W, H);
  hollowBody(left, cx, cy + sinkL, rx, ry, 0, heavy);
  hollowBody(right, cx, cy + sinkR, rx, ry, facing === 'se' ? 0.7 : -0.6, heavy);
  const g: CharGrid = grid(W, H);
  const mid = Math.round(cx) - 1;
  const gap = tell ? 1 : 0; // the crack yawns in the reach
  for (let y = 0; y < H; y++) {
    const c = mid + (ZIG[y % ZIG.length] ?? 0);
    for (let x = 0; x < W; x++) {
      const l = left[y]?.[x] ?? '.';
      const r = right[y]?.[x] ?? '.';
      if (x < c - gap) {
        if (l !== '.') plot(g, x, y, l);
      } else if (x > c + gap) {
        if (r !== '.') plot(g, x, y, r);
      } else if (l !== '.' || r !== '.') {
        // The crack: cold violet glowing between the pieces, twinkling as it walks.
        plot(g, x, y, (y + step) % 3 === 0 ? 'U' : 'V');
      }
    }
  }
  // Its edge inked `ink.0` inside the pale outline, as the Mote's (T569): the crack stays lit.
  inkContour(g);
  const left0 = Math.round(cx - rx);
  // The legs (Heavy plants fewer, the reach three).
  const legs = tell
    ? ['..0....0....0.']
    : heavy
      ? (LEGS[step]?.slice(0, 1) ?? [])
      : (LEGS[step] ?? []);
  stamp(g, left0 - 1, H - legs.length, legs);
  // The stalk on the rear half: it wilts backward and down, flipping between frames.
  const topL = Math.round(cy + sinkL - ry);
  const sx = mid - 3;
  if (step === 1 && !heavy) {
    line(g, sx, topL + 1, sx + 2, topL - 1, '2');
    plot(g, sx + 3, topL - 1, '3');
  } else {
    line(g, sx, topL + 1, sx - 2, topL - 1, '2');
    plot(g, sx - 3, topL, '3');
  }
  const ry0 = Math.round(cy + sinkR);
  const top = Math.round(cy + sinkR - ry);
  if (facing === 'se') {
    // The ring where a face should be: low on the front half. Opened wide in the reach.
    stamp(g, mid + 3, ry0, tell ? ['.ww.', 'wkkw', 'wkkw', '.ww.'] : ['.w.', 'wkw', '.w.']);
    // Acid eyes: two on the front half's crown, one fallen to the rear half's flank.
    plot(g, mid + 2, top + 2, '*');
    plot(g, mid + 5, top + 3, '+');
    if (step !== 2) plot(g, mid - 4, Math.round(cy + sinkL) + 1, '+');
  } else {
    // From behind it looks at you anyway: acid eyes on its back, either side of the crack.
    plot(g, mid + 3, ry0 - 1, '*');
    plot(g, mid - 3, Math.round(cy + sinkL) + 1, '+');
    if (step !== 1) plot(g, mid + 4, ry0 + 2, '+');
  }
  if (tell) reach(g, Math.round(cx + rx) - 1, ry0, W - 1, facing === 'se' ? ry0 + 1 : ry0 - 2);
  if (heavy) heavyDress(g, mid + 1, ry0 - 2, left0 - 4, ry0 - 2, step);
  return dropPixels(rows(g), (facing === 'se' ? 30 : 40) + step + (heavy ? 5 : tell ? 9 : 0));
}

const frames = {
  walk_se_0: fracture('se', 0, 'walk'),
  walk_se_1: fracture('se', 1, 'walk'),
  walk_se_2: fracture('se', 2, 'walk'),
  walk_ne_0: fracture('ne', 0, 'walk'),
  walk_ne_1: fracture('ne', 1, 'walk'),
  walk_ne_2: fracture('ne', 2, 'walk'),
  heavy_se_0: fracture('se', 0, 'heavy'),
  heavy_se_1: fracture('se', 1, 'heavy'),
  heavy_se_2: fracture('se', 2, 'heavy'),
  heavy_ne_0: fracture('ne', 0, 'heavy'),
  heavy_ne_1: fracture('ne', 1, 'heavy'),
  heavy_ne_2: fracture('ne', 2, 'heavy'),
  tell_se_0: fracture('se', 0, 'tell'),
  tell_ne_0: fracture('ne', 0, 'tell'),
};

export const enemyFracture = defineSprite({
  id: 'enemy.fracture',
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
    heavy_se: { frames: ['heavy_se_0', 'heavy_se_1', 'heavy_se_2'], fps: 6 },
    heavy_sw: { mirrorOf: 'heavy_se' },
    heavy_ne: { frames: ['heavy_ne_0', 'heavy_ne_1', 'heavy_ne_2'], fps: 6 },
    heavy_nw: { mirrorOf: 'heavy_ne' },
    tell_se: { frames: ['tell_se_0'], fps: 1 },
    tell_sw: { mirrorOf: 'tell_se' },
    tell_ne: { frames: ['tell_ne_0'], fps: 1 },
    tell_nw: { mirrorOf: 'tell_ne' },
  },
});
