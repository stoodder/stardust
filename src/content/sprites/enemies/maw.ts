// Maw (`maw`, design/enemies.md § 5.4): the Hollow's gatherer (Act III). It draws in other Hollow
// pieces, and at most one Skitterkin, and grows +10% with each (max 5). The Hollow's grammar
// (art-direction §4): the shape of a big Skitterkin it can't remember, gone wrong around a mouth.
// A heavy drained body crusted with plates (Armored: dark seams between pale-lit plates), a wide
// crooked mouth low on its front with pale teeth and a cold violet glint swallowed inside, acid
// pinprick eyes scattered over the crown (four, never a pair), two stalks wilting the wrong way,
// too many stubby legs popping to new places each frame, the Mote's `ink.0` contour inside the pale
// (inverted) outline, and 1–3 pixels missing from every frame (`dropPixels`).
// - `walk_<facing>` (3 frames, 4 fps): it lurches, the body sinking out of step with its legs.
// - `tell_<facing>` (the `consumer` tell, its 1 s gather; 2 frames, 6 fps): the mouth gapes and
//   three tendrils writhe out of it to the canvas's leading edge, pale-tipped (render's noose and
//   tendrils run from it to the unit it holds, render/views/HollowView.ts).
// **Growth** (+10% size per absorb, art-direction §8 `consumer`: "sprite grows in pixel steps"):
// each absorb count is its own sprite, `enemy.maw` (none) and `enemy.maw_g1`–`enemy.maw_g5`, the
// body scaled by `1 + 0.1 × absorbs` in whole pixels, with one more pale ring-face of what it took
// stuck in its hide per absorb, so a grown Maw reads by its size and by the faces in it. Render
// picks the sprite from `Enemy.absorbs` (render/views/gatherLook.ts `mawBody`). A Maw never turns
// Heavy (its one hush is a gather), so it has no `heavy_` frames. No death frames: it unravels.
import { defineSprite } from '../defineSprite.ts';
import { grid, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';
import type { SpriteDef } from '../types.ts';
import { dropPixels, hollowBody, inkContour } from './hollow.ts';
import { MOTE_BODY_LEGEND } from './mote.ts';

/** The most a Maw gathers (enemies.md § 5.4 `maxAbsorbs`), and its growth per absorb. */
export const MAW_STAGES = 5;
const GROW = 0.1;

type Look = 'walk' | 'tell';
type Facing = 'se' | 'ne';

/** The body's radii at no absorbs (px). */
const RX = 9;
const RY = 6.4;
/** Room round the body: behind (stalks), ahead (the tendrils' reach, +1 a stage), above, below. */
const BACK = 2;
const AHEAD = 5;
const ABOVE = 3;
const BELOW = 2;

/** A stage's canvas and ground point. */
function frameOf(stage: number): { w: number; h: number; ax: number; ay: number } {
  const s = 1 + GROW * stage;
  const w = BACK + Math.ceil(2 * RX * s) + AHEAD + stage;
  const h = ABOVE + Math.ceil(2 * RY * s) + BELOW;
  return { w, h, ax: BACK + Math.round(RX * s), ay: h - 1 };
}

/** The legs: too many, somewhere new each frame (one row, across the body's width, 0–1). */
const LEGS: readonly (readonly number[])[] = [
  [0.08, 0.27, 0.41, 0.6, 0.78, 0.93],
  [0.14, 0.22, 0.47, 0.66, 0.71, 0.88],
  [0.04, 0.33, 0.38, 0.55, 0.82, 0.97],
];

/** Where each gathered piece's face sits on the hide (0–1 across, 0–1 down the body's box). */
const PIECES: readonly (readonly [number, number])[] = [
  [0.18, 0.42],
  [0.42, 0.14],
  [0.08, 0.66],
  [0.62, 0.3],
  [0.3, 0.7],
];

/** A ring where a face should be: one gathered piece's, stuck in the hide. */
const FACE = ['.w.', 'wkw', '.w.'] as const;

function maw(stage: number, facing: Facing, step: 0 | 1 | 2, look: Look): string[] {
  const { w, h } = frameOf(stage);
  const s = 1 + GROW * stage;
  const tell = look === 'tell';
  const g: CharGrid = grid(w, h);
  const rx = RX * s;
  const ry = RY * s * (tell ? 1.06 : 1);
  // The lurch: the body sinks on one step, rises on the next, never in time with the legs.
  const sink = step === 1 ? 1 : 0;
  const cx = BACK + rx;
  const cy = ABOVE + ry + sink - (tell ? 1 : 0);
  hollowBody(g, cx, cy, rx, ry, facing === 'se' ? 0.5 : -0.4);
  const left = Math.round(cx - rx);
  const top = Math.round(cy - ry);
  const bw = Math.round(2 * rx);
  const bh = Math.round(2 * ry);
  // The plates (Armored): dark seams curving over the crown, each plate lit on its upper left.
  for (const f of [0.3, 0.55, 0.78]) {
    const sx = Math.round(left + bw * f);
    for (let y = top + 1; y < top + Math.round(bh * 0.55); y++) {
      const x = sx + Math.round((y - top) * 0.35);
      if (g[y]?.[x] !== undefined && g[y]?.[x] !== '.') {
        plot(g, x, y, '0');
        if (g[y]?.[x - 1] !== '.' && (y + x) % 2 === 0) plot(g, x - 1, y, '3');
      }
    }
  }
  inkContour(g);
  const fy = Math.round(cy + ry * 0.05);
  if (facing === 'se') {
    // The mouth: a wide crooked gash low on its front (it steps up a pixel halfway, crooked), a
    // row of pale teeth hanging from its top lip, the unsung glint of what it swallowed deep
    // inside. It gapes in the tell, teeth rising from the bottom lip too.
    const mx0 = Math.round(cx - rx * 0.3);
    const mx1 = Math.round(cx + rx * 0.72);
    const depth = tell ? 5 : 3;
    for (let x = mx0; x <= mx1; x++) {
      const y0 = fy - (x > (mx0 + mx1) / 2 ? 1 : 0);
      const d = x === mx0 || x === mx1 ? depth - 2 : depth; // its corners pinch in
      for (let k = 0; k < d; k++) plot(g, x, y0 + k, 'k');
      // Teeth two to a gap, pale against the dark inside; a drained lower lip under it all.
      if ((x - mx0) % 3 !== 2 && x !== mx0 && x !== mx1) plot(g, x, y0, 'w');
      if (tell && (x - mx0) % 3 !== 0 && x !== mx0 && x !== mx1) plot(g, x, y0 + d - 1, 'w');
      plot(g, x, y0 + d - (x === mx0 || x === mx1 ? 1 : 0), '3');
    }
    plot(g, Math.round((mx0 + mx1) / 2), fy + 1, step === 1 ? 'U' : 'V');
    if (tell) plot(g, Math.round((mx0 + mx1) / 2) - 1, fy + 2, 'U');
  } else {
    // From behind: a violet seam down its back where the pieces don't meet.
    for (let y = top + 2; y < top + bh - 2; y++) {
      const x = Math.round(cx + 1 + ((y + step) % 3 === 0 ? 1 : 0));
      plot(g, x, y, (y + step) % 3 === 0 ? 'U' : 'V');
    }
  }
  // The faces of what it gathered, one per absorb, stuck in the hide.
  for (let i = 0; i < stage; i++) {
    const [px, py] = PIECES[i] ?? [0.5, 0.5];
    stamp(g, Math.round(left + bw * px), Math.round(top + bh * py), FACE);
  }
  // Too many eyes: acid pinpricks over the crown (and on its back from behind), never a pair.
  const eyes: readonly (readonly [number, number, string])[] =
    facing === 'se'
      ? [
          [0.58, 0.12, '*'],
          [0.8, 0.28, '+'],
          [0.24, 0.24, '+'],
          [0.92, 0.5, '*'],
        ]
      : [
          [0.36, 0.2, '*'],
          [0.74, 0.4, '+'],
          [0.2, 0.55, '+'],
          [0.86, 0.18, '*'],
        ];
  for (const [i, [ex, ey, ch]] of eyes.entries()) {
    if (i === 3 && step === 2) continue; // one blinks out of step
    plot(g, Math.round(left + bw * ex), Math.round(top + bh * ey), ch);
  }
  // Two stalks the pieces' tufts came back as, wilting backward and down; one flips each frame.
  const st = Math.round(left + bw * 0.38);
  line(g, st, top, st - 2, top - 2, '2');
  plot(g, st - 3, top - 1, '3');
  const st2 = Math.round(left + bw * 0.62);
  if (step === 2) {
    line(g, st2, top + 1, st2 + 2, top - 1, '2');
    plot(g, st2 + 3, top - 1, '3');
  } else {
    line(g, st2, top + 1, st2 - 1, top - 2, '2');
    plot(g, st2 - 2, top - 2, '3');
  }
  // The legs: stubby, too many, in new places each frame (fewer in the tell: it holds still).
  const legs = LEGS[step] ?? [];
  for (const [i, f] of legs.entries()) {
    if (tell && i % 2 === 1) continue;
    const lx = Math.round(left + bw * f);
    const foot = h - 1 - ((i + step) % 3 === 0 ? 1 : 0); // a leg or two lifted, popping
    for (let y = Math.max(Math.round(cy + ry) - 1, h - 3); y <= foot; y++)
      plot(g, lx, y, y === foot ? '0' : '1');
  }
  if (tell) {
    // Three tendrils writhe out of the mouth (or the front, from behind), fanning to the leading
    // edge: one high, one level, one low, each kinked the other way on the second frame.
    const ox = Math.round(cx + rx * 0.55);
    const oy = facing === 'se' ? fy + 1 : Math.round(cy - ry * 0.2);
    const span = Math.max(4, Math.round(ry * 0.9));
    for (let t = 0; t < 3; t++) {
      const ey = Math.min(h - 2, Math.max(1, oy + (t - 1) * span + (facing === 'se' ? 0 : -1)));
      const mx = Math.round((ox + w - 1) / 2) + (t - 1);
      const kink = (t + step) % 2 === 0 ? -2 : 2;
      const my = Math.round((oy + ey) / 2) + kink;
      line(g, ox, oy, mx, my, t === 1 ? '2' : '1');
      line(g, mx, my, w - 1, ey, t === 1 ? '2' : '1');
      plot(g, w - 1, ey, 'w');
    }
  }
  return dropPixels(rows(g), 70 + stage * 10 + (facing === 'se' ? 0 : 5) + step + (tell ? 3 : 0));
}

/** The Maw at `stage` absorbs (0–5): its sprite under `enemy.maw` or `enemy.maw_g<stage>`. */
function mawSprite<const Id extends string>(id: Id, stage: number): SpriteDef<Id> {
  const f = frameOf(stage);
  return defineSprite({
    id,
    size: { w: f.w, h: f.h },
    anchor: { x: f.ax, y: f.ay },
    palette: 'hollow',
    outline: 'auto',
    legend: MOTE_BODY_LEGEND,
    frames: {
      walk_se_0: maw(stage, 'se', 0, 'walk'),
      walk_se_1: maw(stage, 'se', 1, 'walk'),
      walk_se_2: maw(stage, 'se', 2, 'walk'),
      walk_ne_0: maw(stage, 'ne', 0, 'walk'),
      walk_ne_1: maw(stage, 'ne', 1, 'walk'),
      walk_ne_2: maw(stage, 'ne', 2, 'walk'),
      tell_se_0: maw(stage, 'se', 0, 'tell'),
      tell_se_1: maw(stage, 'se', 1, 'tell'),
      tell_ne_0: maw(stage, 'ne', 0, 'tell'),
      tell_ne_1: maw(stage, 'ne', 1, 'tell'),
    },
    anims: {
      walk_se: { frames: ['walk_se_0', 'walk_se_1', 'walk_se_2'], fps: 4 },
      walk_sw: { mirrorOf: 'walk_se' },
      walk_ne: { frames: ['walk_ne_0', 'walk_ne_1', 'walk_ne_2'], fps: 4 },
      walk_nw: { mirrorOf: 'walk_ne' },
      tell_se: { frames: ['tell_se_0', 'tell_se_1'], fps: 6 },
      tell_sw: { mirrorOf: 'tell_se' },
      tell_ne: { frames: ['tell_ne_0', 'tell_ne_1'], fps: 6 },
      tell_nw: { mirrorOf: 'tell_ne' },
    },
  });
}

export const enemyMaw = mawSprite('enemy.maw', 0);
export const enemyMawG1 = mawSprite('enemy.maw_g1', 1);
export const enemyMawG2 = mawSprite('enemy.maw_g2', 2);
export const enemyMawG3 = mawSprite('enemy.maw_g3', 3);
export const enemyMawG4 = mawSprite('enemy.maw_g4', 4);
export const enemyMawG5 = mawSprite('enemy.maw_g5', 5);
