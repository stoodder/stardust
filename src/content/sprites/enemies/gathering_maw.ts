// The Gathering Maw (`gathering_maw`, design/enemies.md § 6): A3M6's boss, the Hollow's great
// gatherer, coming up the road behind the sheltering Skitterkin. The Maw's grammar (art-direction
// §4, enemies/maw.ts) made huge and plural: **three Maw bodies fused into one**, a big lobe in the
// middle and two smaller ones crowding its flanks, the seams where they meet glowing cold violet
// (`stardust.unsung`: where it will tear apart in phase 2), each lobe plated (Armored) with its own
// crooked toothy mouth, a crown of wilting stalks, acid eyes scattered everywhere (never a pair),
// many gathered faces already stuck in its hide (pale rings), too many stubby legs, the `ink.0`
// contour inside the pale (inverted) outline, and 1–3 pixels missing from every frame.
// - `walk_<facing>` (3 frames, 4 fps): it lurches, each lobe sinking out of step with the others.
// - `tell_<facing>` (2 frames, 6 fps; phase 1's gather tell, `gatherTelling`): every mouth gapes
//   and three tendrils writhe out of the middle one to the leading edge, pale-tipped.
// - `panic_<facing>` (3 frames, 8 fps; the **merged** Maw, phase 3, enraged): the lobes jammed
//   back together crooked, heaving against each other, the seams blazing, every mouth agape.
// - `puff_<facing>` (1 frame; invulnerable between phases): drawn in on itself, mouths shut.
// **Growth** (+10% per absorb, as the Maw's): `enemy.gathering_maw` and
// `enemy.gathering_maw_g1`–`_g5`, one sprite per absorb, one more face in its hide each; render
// picks it from `Enemy.absorbs` (gatherLook.ts). **Its parts** (`enemy.gathering_maw_part`, phase 2's
// split): one lobe torn loose, its torn side raw violet, a single mouth; `walk`, `tell` (the merge
// tell, `mergeTelling`: tendrils reaching back for the others), `puff`. No death frames: it unravels.
import { defineSprite } from '../defineSprite.ts';
import { at, grid, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';
import type { AnimDef, SpriteDef } from '../types.ts';
import { dropPixels, hollowBody, inkContour } from './hollow.ts';
import { MOTE_BODY_LEGEND } from './mote.ts';

/** The most the Gathering Maw gathers (its phase-1 `maxAbsorbs`), and its growth per absorb. */
export const GATHERING_MAW_STAGES = 5;
const GROW = 0.1;

type Look = 'walk' | 'tell' | 'panic' | 'puff';
type Facing = 'se' | 'ne';

/** One lobe: its centre offset from the body's centre and its radii, at no growth (px). */
interface Lobe {
  readonly dx: number;
  readonly dy: number;
  readonly rx: number;
  readonly ry: number;
}

/** The whole Maw's three lobes: back flank, front flank, the big middle one (drawn in that order). */
const LOBES: readonly Lobe[] = [
  { dx: -9, dy: 1.5, rx: 7.5, ry: 6.5 },
  { dx: 9, dy: 2, rx: 7.5, ry: 6.5 },
  { dx: 0, dy: -1, rx: 10, ry: 8.5 },
];
/** A part: one lobe torn loose. */
const PART: readonly Lobe[] = [{ dx: 0, dy: 0, rx: 10.5, ry: 8.5 }];

/** Room round the body: behind, ahead (the tendrils' reach), above (stalks), below (legs). */
const BACK = 2;
const AHEAD = 6;
const ABOVE = 4;
const BELOW = 2;

/** The body's half-extents (px) at scale `s`. */
function extent(
  lobes: readonly Lobe[],
  s: number,
): { left: number; right: number; up: number; down: number } {
  let left = 0;
  let right = 0;
  let up = 0;
  let down = 0;
  for (const l of lobes) {
    left = Math.max(left, (l.rx - l.dx) * s);
    right = Math.max(right, (l.rx + l.dx) * s);
    up = Math.max(up, (l.ry - l.dy) * s);
    down = Math.max(down, (l.ry + l.dy) * s);
  }
  return { left, right, up, down };
}

/** A canvas and its ground point, for `lobes` at `stage` absorbs. */
function frameOf(
  lobes: readonly Lobe[],
  stage: number,
): { w: number; h: number; ax: number; ay: number; cx: number; cy: number } {
  const s = 1 + GROW * stage;
  const e = extent(lobes, s);
  const w = BACK + Math.ceil(e.left + e.right) + 1 + AHEAD + stage;
  const h = ABOVE + Math.ceil(e.up + e.down) + 1 + BELOW;
  const cx = BACK + e.left;
  const cy = ABOVE + e.up;
  return { w, h, ax: Math.round(cx), ay: h - 1, cx, cy };
}

/** Where gathered faces sit on the hide (0–1 across, 0–1 down the body's box), in order. */
const FACES: readonly (readonly [number, number])[] = [
  [0.14, 0.45],
  [0.5, 0.18],
  [0.82, 0.5],
  [0.3, 0.68],
  [0.64, 0.32],
  [0.08, 0.62],
  [0.72, 0.66],
  [0.38, 0.3],
];
const FACE = ['.w.', 'wkw', '.w.'] as const;

/** Acid eyes over the hide (0–1 across, 0–1 down), never a pair, per facing. */
const EYES: Readonly<Record<Facing, readonly (readonly [number, number, string])[]>> = {
  se: [
    [0.46, 0.1, '*'],
    [0.62, 0.16, '+'],
    [0.26, 0.24, '+'],
    [0.88, 0.34, '*'],
    [0.1, 0.36, '+'],
    [0.7, 0.04, '+'],
  ],
  ne: [
    [0.34, 0.14, '*'],
    [0.58, 0.3, '+'],
    [0.16, 0.42, '+'],
    [0.82, 0.22, '*'],
    [0.48, 0.5, '+'],
  ],
};

/** The lurch: each lobe's sink (px) on each step, out of step with the others. */
const SINK: readonly (readonly number[])[] = [
  [0, 1, 0],
  [1, 0, 0],
  [0, 0, 1],
];
/** The merged Maw heaving: each lobe's shove (dx, dy) on each step. */
const HEAVE: readonly (readonly (readonly [number, number])[])[] = [
  [
    [1, -2],
    [-1, 1],
    [0, 0],
  ],
  [
    [0, 1],
    [1, -2],
    [0, -1],
  ],
  [
    [2, 0],
    [0, 0],
    [-1, 1],
  ],
];

/** A crooked toothy mouth from x0 to x1 at row y; gaping deeper in `open`. */
function mouth(g: CharGrid, x0: number, x1: number, y: number, open: boolean, glint: string): void {
  const depth = open ? 4 : 2;
  for (let x = x0; x <= x1; x++) {
    const y0 = y - (x > (x0 + x1) / 2 ? 1 : 0);
    const d = x === x0 || x === x1 ? Math.max(1, depth - 2) : depth;
    for (let k = 0; k < d; k++) plot(g, x, y0 + k, 'k');
    if ((x - x0) % 3 !== 2 && x !== x0 && x !== x1) plot(g, x, y0, 'w');
    if (open && (x - x0) % 3 !== 0 && x !== x0 && x !== x1) plot(g, x, y0 + d - 1, 'w');
  }
  plot(g, Math.round((x0 + x1) / 2), y + 1, glint);
}

function gatheringMaw(
  lobes: readonly Lobe[],
  part: boolean,
  stage: number,
  facing: Facing,
  step: 0 | 1 | 2,
  look: Look,
): string[] {
  const f = frameOf(lobes, stage);
  const s = 1 + GROW * stage;
  const g: CharGrid = grid(f.w, f.h);
  const own: number[][] = Array.from({ length: f.h }, () => Array<number>(f.w).fill(-1));
  const tell = look === 'tell';
  const panic = look === 'panic';
  const puff = look === 'puff';
  const centers: { x: number; y: number; rx: number; ry: number }[] = [];
  // The lobes, back to front, each its own drained body; who owns each pixel, for the seams.
  for (const [i, l] of lobes.entries()) {
    const sink = puff ? 0 : panic ? (HEAVE[step]?.[i]?.[1] ?? 0) : (SINK[step]?.[i] ?? 0);
    const shove = panic ? (HEAVE[step]?.[i]?.[0] ?? 0) : 0;
    const squeeze = puff ? 0.9 : 1;
    const x = f.cx + (l.dx * s + shove) * squeeze;
    const y = f.cy + l.dy * s + sink - (tell ? 1 : 0) + (puff ? 1 : 0);
    const rx = l.rx * s * squeeze;
    const ry = l.ry * s * (tell ? 1.05 : 1) * squeeze;
    const tmp: CharGrid = grid(f.w, f.h);
    hollowBody(tmp, x, y, rx, ry, i === 0 ? 0.4 : 0);
    for (let py = 0; py < f.h; py++) {
      for (let px = 0; px < f.w; px++) {
        const c = at(tmp, px, py);
        if (c === '.') continue;
        plot(g, px, py, c);
        own[py]![px] = i; // py < h, px < w
      }
    }
    centers.push({ x, y, rx, ry });
  }
  // The plates on each lobe (Armored): dark seams curving over its crown.
  for (const c of centers) {
    for (const fr of [0.35, 0.65]) {
      const sx = Math.round(c.x - c.rx + 2 * c.rx * fr);
      for (let y = Math.round(c.y - c.ry) + 1; y < Math.round(c.y); y++) {
        const x = sx + Math.round((y - c.y + c.ry) * 0.3);
        if (at(g, x, y) !== '.') plot(g, x, y, '0');
      }
    }
  }
  // The seams where lobes meet, glowing cold violet (blazing in the merged Maw).
  for (let y = 0; y < f.h; y++) {
    for (let x = 0; x < f.w; x++) {
      const o = own[y]?.[x] ?? -1;
      if (o < 0) continue;
      const r = own[y]?.[x + 1] ?? -1;
      const d = own[y + 1]?.[x] ?? -1;
      if ((r >= 0 && r !== o) || (d >= 0 && d !== o)) {
        plot(g, x, y, panic || (x + y + step) % 4 === 0 ? 'U' : 'V');
      }
    }
  }
  inkContour(g);
  const left = Math.round(f.cx - extent(lobes, s).left);
  const top = Math.round(f.cy - extent(lobes, s).up);
  const bw = Math.round(extent(lobes, s).left + extent(lobes, s).right);
  const bh = Math.round(extent(lobes, s).up + extent(lobes, s).down);
  // A part's torn side (the trailing flank): raw unsung violet where it tore from the others.
  if (part) {
    const c = centers[0];
    if (c !== undefined) {
      const tx = facing === 'se' ? Math.round(c.x - c.rx) + 1 : Math.round(c.x + c.rx) - 2;
      for (let y = Math.round(c.y - c.ry * 0.6); y <= Math.round(c.y + c.ry * 0.5); y++) {
        const jag = (y + step) % 3 === 0 ? 1 : 0;
        plot(g, tx + (facing === 'se' ? jag : -jag), y, (y + step) % 2 === 0 ? 'U' : 'V');
      }
    }
  }
  // The faces of what it gathered, stuck in the hide: three already, and one per absorb.
  const faces = (part ? 1 : 3) + stage;
  for (let i = 0; i < faces; i++) {
    const [px, py] = FACES[i % FACES.length] ?? [0.5, 0.5];
    stamp(g, Math.round(left + bw * px) - 1, Math.round(top + bh * py) - 1, FACE);
  }
  // The mouths: every lobe facing us has one, the middle one widest; gaping in a tell or rage.
  const open = tell || panic;
  if (facing === 'se') {
    for (const [i, c] of centers.entries()) {
      if (i === 0 && !part) continue; // the back flank faces away
      if (puff) {
        line(
          g,
          Math.round(c.x),
          Math.round(c.y + c.ry * 0.25),
          Math.round(c.x + c.rx * 0.6),
          Math.round(c.y + c.ry * 0.25),
          'k',
        );
        continue;
      }
      mouth(
        g,
        Math.round(c.x - c.rx * 0.2),
        Math.round(c.x + c.rx * 0.7),
        Math.round(c.y + c.ry * 0.15),
        open,
        step === 1 ? 'U' : 'V',
      );
    }
  }
  // Too many eyes.
  for (const [i, [ex, ey, ch]] of (EYES[facing] ?? []).entries()) {
    if (i === 3 && step === 2 && !panic) continue; // one blinks out of step
    if (part && i > 3) continue;
    plot(g, Math.round(left + bw * ex), Math.round(top + bh * ey), panic ? '*' : ch);
  }
  // The crown of stalks, wilting backward and down, one flipping each frame.
  const stalks = part ? [0.4, 0.62] : [0.3, 0.45, 0.58, 0.72];
  for (const [i, fr] of stalks.entries()) {
    const sx = Math.round(left + bw * fr);
    let sy = Math.round(f.cy - extent(lobes, s).up) + 1;
    while (sy < f.h - 1 && at(g, sx, sy) === '.') sy++;
    const flip = (i + step) % 3 === 0;
    line(g, sx, sy, sx + (flip ? 2 : -2), sy - 3, '2');
    plot(g, sx + (flip ? 3 : -3), sy - 2, '3');
  }
  // The legs: stubby, too many, popping (fewer in a tell or a puff: it holds still).
  const nLegs = part ? 6 : 11;
  for (let i = 0; i < nLegs; i++) {
    if ((tell || puff) && i % 2 === 1) continue;
    const fr = (i + 0.5) / nLegs + ((i + step) % 3 === 0 ? 0.02 : -0.02);
    const lx = Math.round(left + bw * fr);
    const foot = f.h - 1 - ((i + step) % 3 === 0 && !puff ? 1 : 0);
    // Up to the body above it (a leg needs a body over it within a few pixels).
    let y = foot;
    while (y > foot - 5 && at(g, lx, y - 1) === '.') y--;
    if (at(g, lx, y - 1) === '.') continue;
    for (let k = y; k <= foot; k++) plot(g, lx, k, k === foot ? '0' : '1');
  }
  if (tell) {
    // Three tendrils writhe out to the leading edge (a whole Maw's from its middle mouth; a part's
    // reaching back for the others from its torn side), pale-tipped, kinking each frame.
    const c = centers[centers.length - 1] ?? { x: f.cx, y: f.cy, rx: 6, ry: 5 };
    const ox = Math.round(c.x + c.rx * 0.5);
    const oy = Math.round(c.y + c.ry * 0.2);
    const span = Math.max(4, Math.round(c.ry * 0.8));
    for (let t = 0; t < 3; t++) {
      const ey = Math.min(f.h - 2, Math.max(1, oy + (t - 1) * span));
      const mx = Math.round((ox + f.w - 1) / 2) + (t - 1);
      const my = Math.round((oy + ey) / 2) + ((t + step) % 2 === 0 ? -2 : 2);
      line(g, ox, oy, mx, my, t === 1 ? '2' : '1');
      line(g, mx, my, f.w - 1, ey, t === 1 ? '2' : '1');
      plot(g, f.w - 1, ey, 'w');
    }
  }
  const seed =
    200 +
    stage * 10 +
    (facing === 'se' ? 0 : 5) +
    step +
    (part ? 60 : 0) +
    ['walk', 'tell', 'panic', 'puff'].indexOf(look) * 3;
  return dropPixels(rows(g), seed);
}

/** The four facings of `look` over `n` frames at `fps` (SE and NE authored, SW and NW mirrored). */
function anims(look: Look, n: number, fps: number): Record<string, AnimDef> {
  const names = (fc: string): string[] => Array.from({ length: n }, (_, i) => `${look}_${fc}_${i}`);
  return {
    [`${look}_se`]: { frames: names('se'), fps },
    [`${look}_sw`]: { mirrorOf: `${look}_se` },
    [`${look}_ne`]: { frames: names('ne'), fps },
    [`${look}_nw`]: { mirrorOf: `${look}_ne` },
  };
}

/** Frames of `look`, `n` per facing. */
function frames(
  lobes: readonly Lobe[],
  part: boolean,
  stage: number,
  look: Look,
  n: number,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const fc of ['se', 'ne'] as const) {
    for (let i = 0; i < n; i++)
      out[`${look}_${fc}_${i}`] = gatheringMaw(lobes, part, stage, fc, i as 0 | 1 | 2, look);
  }
  return out;
}

/** The whole Gathering Maw at `stage` absorbs (0–5). */
function wholeSprite<const Id extends string>(id: Id, stage: number): SpriteDef<Id> {
  const f = frameOf(LOBES, stage);
  return defineSprite({
    id,
    size: { w: f.w, h: f.h },
    anchor: { x: f.ax, y: f.ay },
    palette: 'hollow',
    outline: 'auto',
    legend: MOTE_BODY_LEGEND,
    frames: {
      ...frames(LOBES, false, stage, 'walk', 3),
      ...frames(LOBES, false, stage, 'tell', 2),
      ...frames(LOBES, false, stage, 'panic', 3),
      ...frames(LOBES, false, stage, 'puff', 1),
    },
    anims: {
      ...anims('walk', 3, 4),
      ...anims('tell', 2, 6),
      ...anims('panic', 3, 8),
      ...anims('puff', 1, 2),
    },
  });
}

export const enemyGatheringMaw = wholeSprite('enemy.gathering_maw', 0);
export const enemyGatheringMawG1 = wholeSprite('enemy.gathering_maw_g1', 1);
export const enemyGatheringMawG2 = wholeSprite('enemy.gathering_maw_g2', 2);
export const enemyGatheringMawG3 = wholeSprite('enemy.gathering_maw_g3', 3);
export const enemyGatheringMawG4 = wholeSprite('enemy.gathering_maw_g4', 4);
export const enemyGatheringMawG5 = wholeSprite('enemy.gathering_maw_g5', 5);

const partFrame = frameOf(PART, 0);

export const enemyGatheringMawPart = defineSprite({
  id: 'enemy.gathering_maw_part',
  size: { w: partFrame.w, h: partFrame.h },
  anchor: { x: partFrame.ax, y: partFrame.ay },
  palette: 'hollow',
  outline: 'auto',
  legend: MOTE_BODY_LEGEND,
  frames: {
    ...frames(PART, true, 0, 'walk', 3),
    ...frames(PART, true, 0, 'tell', 2),
    ...frames(PART, true, 0, 'puff', 1),
  },
  anims: {
    ...anims('walk', 3, 4),
    ...anims('tell', 2, 6),
    ...anims('puff', 1, 2),
  },
});
