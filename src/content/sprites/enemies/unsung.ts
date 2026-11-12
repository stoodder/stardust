// The Unsung (`unsung`, design/enemies.md § 6, story/races.md § The Hollow; the finale's Phase 2):
// every unsung dead run together into one hungry absence. The Hollow's grammar (art-direction §4,
// enemies/hollow.ts) at its largest: **one great drained body that remembers being many**: a
// Skitterkin's round mass with a lumpy crown of the small round heads it is made of (each a pale
// ring where a face should be, each with its own wilting stalk), the cold violet of unsung
// stardust glowing in the seams where they run together, and at its heart **the hollow**: a huge
// pale ring of a face round a dark hole, unsung violet burning deep inside it. Acid eyes scattered
// (never a pair), too many stubby legs, the `ink.0` contour inside the pale (inverted) outline, and
// 1–3 pixels missing from every frame.
//
// One sprite per **form** (render picks it from the boss phase, `UNSUNG_FORM_SPRITE`), each with
// the poses EnemyView plays (walk_<facing> everywhere; every pose in the four facings):
// - **Form 1, it gathers** (`enemy.unsung`; growth `enemy.unsung_g1`–`_g5`, +10% and one more
//   face stuck in its hide per absorb, picked from `Enemy.absorbs` like the Gathering Maw's):
//   `walk` (3 frames, 4 fps: the heads of its crown sinking out of step), `tell` (the gather: the
//   hollow gapes and three tendrils reach out of it to the leading edge), `puff` (drawn in, the
//   hollow shut to a violet slit).
// - **Form 2, it splits** (`enemy.unsung_split`): the same body torn down the middle by a jagged
//   chasm of raw unsung violet, its halves lurching apart; `walk`, `tell` (the chasm flaring wide
//   as a piece tears loose), `puff`. Its pieces are `enemy.unsung_part`: one lump of it torn away,
//   two heads, its torn side raw violet; `walk`, `tell`, `puff`.
// - **Form 3, it phases and burrows** (`enemy.unsung_burrow`): squatter and lower; `walk`, `dig`
//   (the dig-in tell: tipped nose-down, violet spoil flung ahead), `under` (the travelling mound:
//   turned earth split by violet cracks, three heads of its crown and their stalks showing),
//   `surface` (3 frames, once: the mound bursting, the body half out, clods falling),
//   `phase` (thinned to its contour and features, the body clear between), `puff`.
// - **Form 4, the Song** (`enemy.unsung_song`): settled low, its stalks lifting (listening), the
//   hollow open round like a singing mouth with the violet brighter inside; `walk` (3 frames,
//   3 fps), `tell` (its hum pouring out of the hollow in violet arcs: the Silencer adds come),
//   `puff`.
// - **Laid to rest** (`enemy.unsung_rest`): the Song's body turning `stardust.sung` gold from the
//   outline in (`rest_<facing>`, 4 frames, once; restFlip.ts), then `walk_<facing>` the rested gold
//   body, its heart white, breathing (2 frames, 3 fps), held while it rises.
import { defineSprite } from '../defineSprite.ts';
import { at, grid, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';
import type { AnimDef, SpriteDef } from '../types.ts';
import { dropPixels, hollowBody, inkContour } from './hollow.ts';
import { MOTE_BODY_LEGEND } from './mote.ts';
import { greyed, REST_LEGEND, ringed, warmed } from './restFlip.ts';

/** The most the Unsung gathers (its phase-1 `maxAbsorbs`), and its growth per absorb. */
export const UNSUNG_STAGES = 5;
const GROW = 0.1;
/** The Unsung's size over the shapes below: the finale's boss, bigger than the Gathering Maw. */
const SCALE = 1.2;

/** Each form's sprite (render picks it from the boss phase, 1–4); form 1 grows by absorbs. */
export const UNSUNG_FORM_SPRITE = {
  1: 'enemy.unsung',
  2: 'enemy.unsung_split',
  3: 'enemy.unsung_burrow',
  4: 'enemy.unsung_song',
} as const;
/** The laid-to-rest sprite (render swaps to it on the Unsung's `layToRest`). */
export const UNSUNG_REST_SPRITE = 'enemy.unsung_rest';
/** A split piece's sprite. */
export const UNSUNG_PART_SPRITE = 'enemy.unsung_part';

type Form = 'gather' | 'split' | 'burrow' | 'song' | 'part';
type Look = 'walk' | 'tell' | 'puff' | 'dig' | 'under' | 'surface' | 'phase';
type Facing = 'se' | 'ne';

/** An ellipse of the body: its centre offset from the body's centre and its radii (px). */
interface Lobe {
  readonly dx: number;
  readonly dy: number;
  readonly rx: number;
  readonly ry: number;
}

/** The great body. */
const BODY: Lobe = { dx: 0, dy: 0, rx: 17, ry: 11.5 };
/** The small round heads crowding its crown, back to front. */
const HEADS: readonly Lobe[] = [
  { dx: -14, dy: -4.5, rx: 4.5, ry: 4 },
  { dx: -8.5, dy: -9.5, rx: 5, ry: 4 },
  { dx: -1.5, dy: -11.5, rx: 5, ry: 4 },
  { dx: 5.5, dy: -11, rx: 5, ry: 4 },
  { dx: 11.5, dy: -8, rx: 4.5, ry: 4 },
  { dx: 16, dy: -2.5, rx: 4, ry: 3.5 },
];
/** A piece torn loose: one lump and two heads. */
const PART_BODY: Lobe = { dx: 0, dy: 0, rx: 9, ry: 7 };
const PART_HEADS: readonly Lobe[] = [
  { dx: -4, dy: -6, rx: 3.5, ry: 3 },
  { dx: 3, dy: -6.5, rx: 3.5, ry: 3 },
];

/** Room round the body: behind, ahead (tendrils, spoil, arcs), above (stalks), below (legs). */
const BACK = 2;
const AHEAD = 6;
const ABOVE = 5;
const BELOW = 2;
/** The split's chasm widens the canvas by this (its right half lurches away). */
const CHASM_ROOM = 4;

function lobesOf(form: Form): readonly Lobe[] {
  return form === 'part' ? [PART_BODY, ...PART_HEADS] : [BODY, ...HEADS];
}

/** The body's half-extents (px) at scale `s`. */
function extent(lobes: readonly Lobe[], s: number): Record<'l' | 'r' | 'u' | 'd', number> {
  let l = 0;
  let r = 0;
  let u = 0;
  let d = 0;
  for (const b of lobes) {
    l = Math.max(l, (b.rx - b.dx) * s);
    r = Math.max(r, (b.rx + b.dx) * s);
    u = Math.max(u, (b.ry - b.dy) * s);
    d = Math.max(d, (b.ry + b.dy) * s);
  }
  return { l, r, u, d };
}

interface Frame {
  readonly w: number;
  readonly h: number;
  readonly ax: number;
  readonly ay: number;
  readonly cx: number;
  readonly cy: number;
  readonly s: number;
}

/** A form's canvas and ground point at `stage` absorbs. */
function frameOf(form: Form, stage: number): Frame {
  const s = (form === 'part' ? 1 : SCALE) * (1 + GROW * stage);
  const e = extent(lobesOf(form), s);
  const room = form === 'split' ? CHASM_ROOM : 0;
  const w = BACK + Math.ceil(e.l + e.r) + 1 + AHEAD + room + stage;
  const h = ABOVE + Math.ceil(e.u + e.d) + 1 + BELOW;
  const cx = BACK + e.l;
  const cy = ABOVE + e.u;
  return { w, h, ax: Math.round(cx), ay: h - 1, cx, cy, s };
}

/** Where faces stuck in its hide sit (0–1 across, 0–1 down the body's box), in order. */
const FACES: readonly (readonly [number, number])[] = [
  [0.16, 0.5],
  [0.82, 0.36],
  [0.3, 0.74],
  [0.12, 0.28],
  [0.86, 0.66],
  [0.44, 0.22],
  [0.24, 0.92],
];
const FACE = ['.w.', 'wkw', '.w.'] as const;
/** A crown head's face: a wider pale ring, low on its front (the shape of a Skitterkin's face). */
const HEAD_FACE = ['.ww.', 'wkkw', '.ww.'] as const;

/** Acid eyes over the hide (0–1 across, 0–1 down the body's box), never a pair, per facing. */
const EYES: Readonly<Record<Facing, readonly (readonly [number, number, string])[]>> = {
  se: [
    [0.62, 0.12, '*'],
    [0.36, 0.3, '+'],
    [0.94, 0.5, '*'],
    [0.08, 0.6, '+'],
    [0.5, 0.84, '+'],
    [0.76, 0.24, '+'],
    [0.2, 0.42, '*'],
  ],
  ne: [
    [0.3, 0.2, '*'],
    [0.66, 0.3, '+'],
    [0.12, 0.5, '+'],
    [0.86, 0.46, '*'],
    [0.46, 0.62, '+'],
  ],
};

/** Each crown head's sink (px) on each walk step, out of step with its neighbours. */
function sinkOf(i: number, step: number): number {
  return (i + step) % 3 === 0 ? 1 : 0;
}

/** The hollow at its heart (SE only): a pale ring of a face round a dark hole, violet inside. */
function hollowAt(
  g: CharGrid,
  hx: number,
  hy: number,
  rx: number,
  ry: number,
  look: Look,
  form: Form,
  step: number,
): void {
  if (look === 'puff') {
    // Shut to a violet slit in a dark seam.
    line(g, Math.round(hx - rx), Math.round(hy), Math.round(hx + rx), Math.round(hy), 'k');
    plot(g, Math.round(hx), Math.round(hy), 'V');
    plot(g, Math.round(hx) - 1, Math.round(hy), 'V');
    return;
  }
  const song = form === 'song';
  for (let y = Math.floor(hy - ry) - 1; y <= Math.ceil(hy + ry) + 1; y++) {
    for (let x = Math.floor(hx - rx) - 1; x <= Math.ceil(hx + rx) + 1; x++) {
      const d = Math.hypot((x + 0.5 - hx) / rx, (y + 0.5 - hy) / ry);
      if (d > 1) continue;
      // The pale lip (broken: a ring the Hollow can't quite draw), then the dark, then the violet.
      if (d > 0.78) plot(g, x, y, (x * 3 + y + step) % 7 === 0 ? 'k' : 'w');
      else if (d < (song ? 0.42 : 0.3) - (step === 1 ? 0.06 : 0))
        plot(g, x, y, d < 0.18 ? 'U' : 'V');
      else plot(g, x, y, 'k');
    }
  }
}

/** The Unsung's body in `form`, at `stage` absorbs, facing `facing`, on `step` of `look`. */
function unsung(form: Form, stage: number, facing: Facing, step: number, look: Look): string[] {
  const f = frameOf(form, stage);
  if (look === 'under') return dropPixels(mound(f, step, 0), 900 + step);
  if (look === 'surface' && step === 0) return dropPixels(mound(f, 2, 1), 905);
  const s = f.s;
  const g: CharGrid = grid(f.w, f.h);
  const own: number[][] = Array.from({ length: f.h }, () => Array<number>(f.w).fill(-1));
  const tell = look === 'tell';
  const puff = look === 'puff';
  const song = form === 'song';
  const low = form === 'burrow' || song;
  const squeeze = puff ? 0.92 : 1;
  const flat = form === 'burrow' ? 0.86 : song ? 0.94 : 1;
  const sink = (puff ? 1 : 0) + (low ? 2 : 0) - (tell && form === 'gather' ? 1 : 0);
  const lobes = lobesOf(form);
  const centers: { x: number; y: number; rx: number; ry: number }[] = [];
  for (const [i, b] of lobes.entries()) {
    const bob = i === 0 || puff ? 0 : song ? -sinkOf(i, step) : sinkOf(i, step);
    const x = f.cx + b.dx * s * squeeze;
    const y = f.cy + b.dy * s * flat + sink + bob;
    const rx = b.rx * s * squeeze;
    const ry = b.ry * s * squeeze * (i === 0 ? flat : 1);
    const tmp: CharGrid = grid(f.w, f.h);
    hollowBody(tmp, x, y, rx, ry, i === 0 ? 0.3 : 0);
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
  // The great body's own heart isn't the darkest: the hollow (below) is. Its mass sits a step up…
  for (let y = 0; y < f.h; y++) {
    for (let x = 0; x < f.w; x++) {
      const o = own[y]?.[x] ?? -1;
      const c = at(g, x, y);
      // …and each little head of its crown is lit a step more (so its pale face reads on it).
      if (o === 0 && c === '0') plot(g, x, y, '1');
      else if (o > 0 && (c === '0' || c === '1')) plot(g, x, y, c === '0' ? '1' : '2');
    }
  }
  // The seams where its heads run into the body: a dark crease, unsung violet glinting in it.
  for (let y = 0; y < f.h; y++) {
    for (let x = 0; x < f.w; x++) {
      const o = own[y]?.[x] ?? -1;
      if (o < 0) continue;
      const r = own[y]?.[x + 1] ?? -1;
      const d = own[y + 1]?.[x] ?? -1;
      if ((r >= 0 && r !== o) || (d >= 0 && d !== o)) {
        plot(g, x, y, (x + 2 * y + step) % 5 === 0 ? 'U' : (x + y) % 3 === 0 ? 'V' : '0');
      }
    }
  }
  inkContour(g);
  const main = centers[0] ?? { x: f.cx, y: f.cy, rx: 10, ry: 8 };
  const left = Math.round(main.x - main.rx);
  const top = Math.round(main.y - main.ry);
  const bw = Math.round(main.rx * 2);
  const bh = Math.round(main.ry * 2);
  // Each head of its crown: a pale ring where its face should be (facing us).
  if (facing === 'se') {
    for (const [i, c] of centers.entries()) {
      if (i === 0 || (form !== 'part' && i === 1)) continue; // the back head faces away
      stamp(g, Math.round(c.x + c.rx * 0.15) - 2, Math.round(c.y), HEAD_FACE);
    }
  }
  // The faces of what it gathered, stuck in its hide: two already, one more per absorb.
  const faces = form === 'part' ? 1 : 2 + stage;
  for (let i = 0; i < faces; i++) {
    const [px, py] = FACES[i % FACES.length] ?? [0.5, 0.5];
    const fx = facing === 'se' ? px : 1 - px;
    stamp(g, Math.round(left + bw * fx) - 1, Math.round(top + bh * py) - 1, FACE);
  }
  // The hollow at its heart (facing us), or a violet crack down its back.
  const hx = main.x + main.rx * (form === 'part' ? 0.3 : 0.28);
  const hy = main.y + main.ry * 0.18;
  const gape = tell && form !== 'song' ? 1.35 : song ? 1.12 : 1;
  const hrx = main.rx * (form === 'part' ? 0.36 : 0.34) * gape;
  const hry = main.ry * 0.38 * gape;
  if (facing === 'se') hollowAt(g, hx, hy, hrx, hry, look, form, step);
  else {
    const x0 = Math.round(main.x - main.rx * 0.1);
    for (let y = Math.round(main.y - main.ry * 0.7); y < Math.round(main.y + main.ry * 0.5); y++) {
      const jag = (y + step) % 4 < 2 ? 0 : 1;
      if (at(g, x0 + jag, y) !== '.') plot(g, x0 + jag, y, (y + step) % 3 === 0 ? 'U' : 'V');
    }
  }
  // Too many eyes.
  for (const [i, [ex, ey, ch]] of (EYES[facing] ?? []).entries()) {
    if (puff && i % 2 === 1) continue; // half shut
    if (i === 2 && step === 1) continue; // one blinks out of step
    if (form === 'part' && i > 2) continue;
    const x = Math.round(left + bw * ex);
    const y = Math.round(top + bh * ey);
    if (at(g, x, y) !== '.' && at(g, x, y) !== 'w' && at(g, x, y) !== 'k') plot(g, x, y, ch);
  }
  // A stalk from every head: wilting backward and down, one flipping each frame; the Song's lift.
  for (const [i, c] of centers.entries()) {
    if (i === 0) continue;
    const sx = Math.round(c.x);
    let sy = Math.round(c.y - c.ry);
    while (sy < f.h - 1 && at(g, sx, sy) === '.') sy++;
    if (song) {
      const lean = (i + step) % 2 === 0 ? 1 : -1;
      line(g, sx, sy - 1, sx + lean, sy - 4, '3');
      plot(g, sx + lean, sy - 5, 'w');
      continue;
    }
    const flip = (i + step) % 3 === 0;
    const dir = flip ? 2 : -2;
    line(g, sx, sy - 1, sx + dir, sy - 3, puff ? '2' : '3');
    plot(g, sx + dir + Math.sign(dir), sy - 2, 'w');
  }
  // The legs: stubby, too many, popping (half of them still in a tell, a dig, or a puff).
  const nLegs = form === 'part' ? 6 : 13;
  const legLeft = Math.round(main.x - main.rx * 0.7);
  const legSpan = Math.round(main.rx * 1.4);
  const still = tell || puff || look === 'dig';
  for (let i = 0; i < nLegs; i++) {
    if (still && i % 2 === 1) continue;
    const lx = legLeft + Math.round((legSpan * (i + 0.5)) / nLegs) + ((i + step) % 3 === 0 ? 1 : 0);
    const foot = f.h - 1 - ((i + step) % 3 === 0 && !still ? 1 : 0);
    let y = foot;
    while (y > foot - 4 && at(g, lx, y - 1) === '.') y--;
    if (at(g, lx, y - 1) === '.') continue;
    for (let k = y; k <= foot; k++) plot(g, lx, k, k === foot ? '0' : '1');
  }
  // Form 3 has been under: turned earth clings to its lower body in clods.
  if (form === 'burrow' && look !== 'phase') {
    for (let y = Math.round(main.y + main.ry * 0.3); y < f.h - 1; y++) {
      for (let x = 0; x < f.w; x++) {
        const c = at(g, x, y);
        if ('0123K'.includes(c) && c !== '.' && (x * 5 + y * 3 + step) % 7 < 2) {
          plot(g, x, y, (x + y) % 3 === 0 ? 'O' : 'N');
        }
      }
    }
  }
  if (tell && (form === 'gather' || form === 'part')) tendrils(g, f, hx, hy, main, step);
  if (tell && form === 'song') hum(g, f, hx, hy, main, step);
  let out = rows(g);
  if (form === 'split') out = chasm(out, Math.round(main.x), step, tell);
  if (look === 'dig') out = digIn(out, f, step);
  if (look === 'phase') out = phased(out);
  if (look === 'surface') out = surfacing(out, f, step);
  const seed =
    500 +
    stage * 10 +
    (facing === 'se' ? 0 : 5) +
    step +
    ['gather', 'split', 'burrow', 'song', 'part'].indexOf(form) * 40 +
    ['walk', 'tell', 'puff', 'dig', 'under', 'surface', 'phase'].indexOf(look) * 3;
  return dropPixels(out, seed);
}

/** Three tendrils writhing out of the hollow to the leading edge, pale-tipped, kinking each frame. */
function tendrils(
  g: CharGrid,
  f: Frame,
  hx: number,
  hy: number,
  main: { rx: number; ry: number },
  step: number,
): void {
  const ox = Math.round(hx);
  const oy = Math.round(hy);
  const span = Math.max(4, Math.round(main.ry * 0.6));
  for (let t = 0; t < 3; t++) {
    const ey = Math.min(f.h - 2, Math.max(1, oy + (t - 1) * span));
    const mx = Math.round((ox + f.w - 1) / 2) + (t - 1);
    const my = Math.round((oy + ey) / 2) + ((t + step) % 2 === 0 ? -2 : 2);
    line(g, ox, oy, mx, my, t === 1 ? '2' : '1');
    line(g, mx, my, f.w - 1, ey, t === 1 ? '2' : '1');
    plot(g, f.w - 1, ey, 'w');
  }
}

/** The Song's hum pouring out of the hollow: violet arcs ahead of it, moving out a step a frame. */
function hum(
  g: CharGrid,
  f: Frame,
  hx: number,
  hy: number,
  main: { rx: number; ry: number },
  step: number,
): void {
  for (let a = 0; a < 2; a++) {
    const r = main.rx * 0.75 + 2 + a * 3 + step * 2;
    for (let k = -6; k <= 6; k++) {
      const th = (k / 6) * 0.9;
      const x = Math.round(hx + Math.cos(th) * r);
      const y = Math.round(hy + Math.sin(th) * r * 0.6);
      if (x >= f.w || at(g, x, y) !== '.' || (k + a) % 4 === 3) continue;
      plot(g, x, y, a === 0 ? 'U' : 'V');
    }
  }
}

/**
 * The split's chasm: the body torn down the middle along a jagged line at `cx`, its right half
 * lurching away (and sinking on the off step), the gap and the torn edges raw unsung violet.
 */
function chasm(src: readonly string[], cx: number, step: number, tell: boolean): string[] {
  const h = src.length;
  const w = src[0]?.length ?? 0;
  const gap = tell ? 3 : 2;
  const g: CharGrid = grid(w, h);
  const cut = (y: number): number => cx + ([0, 1, 1, 0, -1, -1][(y + step * 2) % 6] ?? 0);
  for (let y = 0; y < h; y++) {
    const c = cut(y);
    for (let x = 0; x < w; x++) {
      const ch = src[y]?.[x] ?? '.';
      if (ch === '.') continue;
      if (x < c) plot(g, x, y, ch);
      else plot(g, x + gap, y + (step === 1 && y < h - 2 ? 1 : 0), ch);
    }
  }
  // Fill the gap where both halves stand, and burn the torn edges.
  for (let y = 0; y < h; y++) {
    const c = cut(y);
    const lft = at(g, c - 1, y) !== '.';
    const rgt = at(g, c + gap, y) !== '.';
    if (lft) plot(g, c - 1, y, 'V');
    if (rgt) plot(g, c + gap, y, 'V');
    if (lft && rgt) for (let k = 0; k < gap; k++) plot(g, c + k, y, (y + k) % 3 === 0 ? 'U' : 'V');
  }
  return rows(g);
}

/** The dig-in tell: tipped nose-down (its top rows pushed forward), violet spoil flung ahead. */
function digIn(src: readonly string[], f: Frame, step: number): string[] {
  const h = src.length;
  const g: CharGrid = grid(f.w, h);
  for (let y = 0; y < h; y++) {
    const shove = Math.round((h - 1 - y) * 0.12);
    for (let x = 0; x < f.w; x++) {
      const ch = src[y]?.[x] ?? '.';
      if (ch !== '.') plot(g, x + shove, y, ch);
    }
  }
  // Spoil: cold violet clods and specks flung up ahead of it, different on each frame.
  const front = f.w - AHEAD - 2;
  const specks: readonly (readonly [number, number, string])[] =
    step === 0
      ? [
          [1, -2, 'V'],
          [3, -5, 'U'],
          [4, -3, '3'],
          [6, -7, 'V'],
          [2, -9, 'U'],
        ]
      : [
          [2, -3, 'U'],
          [4, -6, 'V'],
          [5, -2, '3'],
          [7, -4, 'U'],
          [3, -8, 'V'],
        ];
  for (const [dx, dy, ch] of specks) {
    if (at(g, front + dx, h - 1 + dy) === '.') plot(g, front + dx, h - 1 + dy, ch);
  }
  return rows(g);
}

/** Phased: only its contour and features are left; the body between them clear. */
function phased(src: readonly string[]): string[] {
  const keep = new Set(['K', 'w', 'k', 'V', 'U', '+', '*']);
  return src.map((r, y) =>
    r.replace(/[0-3]/g, (c, x: number) => {
      const edge =
        (src[y]?.[x - 1] ?? '.') === '.' ||
        (src[y]?.[x + 1] ?? '.') === '.' ||
        (src[y - 1]?.[x] ?? '.') === '.' ||
        (src[y + 1]?.[x] ?? '.') === '.';
      return edge || keep.has(c) ? c : (x + y) % 5 === 0 ? '0' : '.';
    }),
  );
}

/** The burrow mound's earth (custom legend: the turned ground, as `fx.burrow_mound`'s). */
const EARTH_LEGEND = { M: 'grime.2', N: 'grime.3', O: 'grime.4' } as const;

/**
 * The travelling mound: a long hump of turned earth split by cold violet cracks, three heads of
 * its crown and their stalks showing over it, and the ground rippling either side. `burst` (the
 * surfacing's first frame) splits it wide, violet light pouring up out of it, clods flung.
 */
function mound(f: Frame, step: number, burst: 0 | 1): string[] {
  const g: CharGrid = grid(f.w, f.h);
  const base = f.h - 2;
  const rx = BODY.rx * f.s * 1.05;
  const ry = 6 * f.s;
  const cx = f.cx;
  for (let y = 0; y <= base; y++) {
    for (let x = 0; x < f.w; x++) {
      const nx = (x + 0.5 - cx) / rx;
      const ny = (y + 0.5 - base) / ry;
      if (nx * nx + ny * ny > 1) continue;
      const hgt = base - y;
      plot(g, x, y, hgt >= 4 ? 'O' : hgt >= 2 ? 'N' : 'M');
    }
  }
  // Three heads of its crown breaking the surface, each with a stalk and a pale ring.
  const crest = Math.round(base - ry);
  for (const [i, fr] of [-0.45, 0, 0.42].entries()) {
    const hx = cx + rx * fr + (i === step % 3 ? 1 : 0);
    const hy = crest + 2 + (i === 1 ? -1 : 0) - burst;
    hollowBody(g, hx, hy, 3.2, 2.6, 0);
    plot(g, Math.round(hx), Math.round(hy), 'w');
    const lean = (i + step) % 2 === 0 ? 2 : -2;
    line(g, Math.round(hx), Math.round(hy - 3), Math.round(hx) + lean, Math.round(hy - 5), '2');
  }
  // Violet cracks through the earth.
  for (let x = Math.round(cx - rx * 0.7); x < Math.round(cx + rx * 0.7); x++) {
    const y = base - 2 - ((x + step) % 4 < 2 ? 0 : 1) - (burst ? 1 : 0);
    if (at(g, x, y) !== '.' && (x + step) % 5 !== 0)
      plot(g, x, y, (x + step) % 3 === 0 ? 'U' : 'V');
  }
  if (burst === 1) {
    // Light pouring up out of the split, and clods flung.
    for (let y = crest - 6; y < base - 1; y++) {
      for (const dx of [-1, 0, 1]) {
        const x = Math.round(cx) + dx + ((y % 3) - 1);
        if (at(g, x, y) === '.' || at(g, x, y) === 'O') plot(g, x, y, dx === 0 ? 'U' : 'V');
      }
    }
    for (const [dx, dy] of [
      [-9, -9],
      [-5, -12],
      [6, -11],
      [10, -8],
      [2, -14],
    ] as const) {
      plot(g, Math.round(cx) + dx, base + dy, 'N');
    }
  }
  // The ripple of disturbed ground either side.
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < 3; i++) {
      const x = Math.round(cx + side * (rx + 1 + i * 2 + step));
      if ((i + step) % 2 === 0) plot(g, x, base + 1, 'M');
    }
  }
  return rows(g);
}

/** Surfacing: frame 1 the body half out of the burst mound, frame 2 up with clods falling. */
function surfacing(src: readonly string[], f: Frame, step: number): string[] {
  const g: CharGrid = grid(f.w, f.h);
  stamp(g, 0, 0, src);
  if (step === 1) {
    // Its lower half still in the earth: the mound's hump over its legs and belly.
    const earth = mound(f, 1, 0);
    const line0 = Math.round(f.cy + 2);
    for (let y = line0; y < f.h; y++) {
      for (let x = 0; x < f.w; x++) {
        const e = earth[y]?.[x] ?? '.';
        if (e === 'M' || e === 'N' || e === 'O') plot(g, x, y, e);
        else if (y > line0 + 1) plot(g, x, y, '.');
      }
    }
  } else {
    for (const [dx, dy] of [
      [-12, -4],
      [-7, -1],
      [8, -3],
      [13, 0],
      [3, 1],
    ] as const) {
      const x = Math.round(f.cx) + dx;
      const y = Math.round(f.cy) + dy;
      if (at(g, x, y) === '.') plot(g, x, y, 'N');
    }
  }
  return rows(g);
}

/** The four facings of `look` over `n` frames at `fps` (SE and NE authored, SW and NW mirrored). */
function anims(look: string, n: number, fps: number, loop = true): Record<string, AnimDef> {
  const names = (fc: string): string[] => Array.from({ length: n }, (_, i) => `${look}_${fc}_${i}`);
  const once = loop ? {} : { loop: false };
  return {
    [`${look}_se`]: { frames: names('se'), fps, ...once },
    [`${look}_sw`]: { mirrorOf: `${look}_se` },
    [`${look}_ne`]: { frames: names('ne'), fps, ...once },
    [`${look}_nw`]: { mirrorOf: `${look}_ne` },
  };
}

/** Frames of `look`, `n` per facing. */
function frames(form: Form, stage: number, look: Look, n: number): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const fc of ['se', 'ne'] as const) {
    for (let i = 0; i < n; i++) out[`${look}_${fc}_${i}`] = unsung(form, stage, fc, i, look);
  }
  return out;
}

/** A form's sprite: its canvas, the Hollow's palette, and `looks` ([look, frames, fps, loop?]). */
function formSprite<const Id extends string>(
  id: Id,
  form: Form,
  stage: number,
  looks: readonly (readonly [Look, number, number, boolean?])[],
): SpriteDef<Id> {
  const f = frameOf(form, stage);
  const fr: Record<string, string[]> = {};
  const an: Record<string, AnimDef> = {};
  for (const [look, n, fps, loop] of looks) {
    Object.assign(fr, frames(form, stage, look, n));
    Object.assign(an, anims(look, n, fps, loop ?? true));
  }
  return defineSprite({
    id,
    size: { w: f.w, h: f.h },
    anchor: { x: f.ax, y: f.ay },
    palette: 'hollow',
    outline: 'auto',
    legend: { ...MOTE_BODY_LEGEND, ...EARTH_LEGEND },
    frames: fr,
    anims: an,
  });
}

const GATHER_LOOKS = [
  ['walk', 3, 4],
  ['tell', 2, 6],
  ['puff', 1, 2],
] as const;

/** Form 1 at `stage` absorbs (0–5). */
function gatherSprite<const Id extends string>(id: Id, stage: number): SpriteDef<Id> {
  return formSprite(id, 'gather', stage, GATHER_LOOKS);
}

export const enemyUnsung = gatherSprite('enemy.unsung', 0);
export const enemyUnsungG1 = gatherSprite('enemy.unsung_g1', 1);
export const enemyUnsungG2 = gatherSprite('enemy.unsung_g2', 2);
export const enemyUnsungG3 = gatherSprite('enemy.unsung_g3', 3);
export const enemyUnsungG4 = gatherSprite('enemy.unsung_g4', 4);
export const enemyUnsungG5 = gatherSprite('enemy.unsung_g5', 5);

export const enemyUnsungSplit = formSprite('enemy.unsung_split', 'split', 0, GATHER_LOOKS);

export const enemyUnsungPart = formSprite('enemy.unsung_part', 'part', 0, GATHER_LOOKS);

export const enemyUnsungBurrow = formSprite('enemy.unsung_burrow', 'burrow', 0, [
  ['walk', 3, 4],
  ['dig', 2, 6],
  ['under', 2, 6],
  ['surface', 3, 8, false],
  ['phase', 2, 6],
  ['puff', 1, 2],
]);

export const enemyUnsungSong = formSprite('enemy.unsung_song', 'song', 0, [
  ['walk', 3, 3],
  ['tell', 2, 5],
  ['puff', 1, 2],
]);

/** The flip's depths from the outline in, one per frame (the last turns all of it). */
const REST_DEPTHS = [0, 2, 5, Infinity] as const;

const restFrame = frameOf('song', 0);

/** The rest's frames: the flip from the Song's grey body, then the gold body breathing. */
function restFrames(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const fc of ['se', 'ne'] as const) {
    const grey = ringed(greyed(unsung('song', 0, fc, 0, 'walk')));
    REST_DEPTHS.forEach((d, i) => (out[`rest_${fc}_${i}`] = warmed(grey, d)));
    const gold = warmed(grey, Infinity);
    out[`walk_${fc}_0`] = gold;
    // The breath: its white heart swells a step into the gold.
    out[`walk_${fc}_1`] = gold.map((r, y) =>
      r.replace(/G/g, (c, x: number) =>
        (gold[y - 1]?.[x] ?? '') === 'W' || (gold[y + 1]?.[x] ?? '') === 'W' ? '+' : c,
      ),
    );
  }
  return out;
}

export const enemyUnsungRest = defineSprite({
  id: 'enemy.unsung_rest',
  // Ringed by hand (the flip turns the outline first), so the canvas is the Song's plus the ring.
  size: { w: restFrame.w + 2, h: restFrame.h + 2 },
  anchor: { x: restFrame.ax + 1, y: restFrame.ay + 1 },
  // `skitterkin`'s emissives are gold, so the sung gold glows; every pixel is custom or e0/e1.
  palette: 'skitterkin',
  outline: 'none',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: REST_LEGEND,
  frames: restFrames(),
  anims: {
    ...anims('rest', REST_DEPTHS.length, 8, false),
    ...anims('walk', 2, 3),
  },
});

/** The Unsung's sprites in gallery order. */
export const UNSUNG_SPRITES = [
  enemyUnsung,
  enemyUnsungG1,
  enemyUnsungG2,
  enemyUnsungG3,
  enemyUnsungG4,
  enemyUnsungG5,
  enemyUnsungSplit,
  enemyUnsungPart,
  enemyUnsungBurrow,
  enemyUnsungSong,
  enemyUnsungRest,
] as const;
