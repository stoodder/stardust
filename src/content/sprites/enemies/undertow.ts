// Undertow (`undertow`, design/enemies.md § 5.4): the Hollow's burrower (Act III), heavily armored,
// that dives under the road every 7 s for 3 s and leaves a ripple trail. The Hollow's grammar
// (art-direction §4): the shape of a long Skitterkin warren-runner it can't remember, gone low and
// eel-like: a long drained body that ripples as it goes, a row of dorsal plates standing up like
// fins (Armored: each a pale-lit plate on a dark seam), a ring where a face should be low on its
// nose, a lateral line of cold violet `stardust.unsung` specks down its side, three acid eyes
// (never a pair), too many little legs, the `ink.0` contour inside the pale (inverted) outline,
// and 1–3 pixels missing from every frame (`dropPixels`).
// - `walk_<facing>` (3 frames, 6 fps): the body undulates, a wave running back along it.
// - `dig_<facing>` (the `burrower` tell, its 0.8 s dig-in; 2 frames, 6 fps): its nose plunges into
//   the road, its tail up, dark clods flung and a pale ripple opening round the nose.
// - `under_<facing>` (burrowed, the Undertow's ripple; 2 frames, 4 fps): only its dorsal plates
//   cut the surface inside a pale ripple ring, the road bulging dark round them. Render draws it in
//   place of the generic mound, and HollowView trails three small ripples behind it.
// - `heavy_<facing>` (§8 `heavy`, after it hushes someone) and `tell_<facing>` (the hush reach), as
//   every Hollow unit that hushes.
// No death frames: it unravels (render).
import { defineSprite } from '../defineSprite.ts';
import { at, grid, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';
import { dropPixels, heavyDress, hollowBody, inkContour, reach } from './hollow.ts';
import { MOTE_BODY_LEGEND } from './mote.ts';

const W = 20;
const H = 13;
const AX = 10;
const AY = 12;

type Look = 'walk' | 'heavy' | 'tell' | 'dig';
type Facing = 'se' | 'ne';

/** The wave along its body: its tail's and its head's lift (px) by step, out of step. */
const WAVE: readonly (readonly [number, number])[] = [
  [1, 0],
  [0, 0],
  [0, 1],
];

/** The dorsal plates: their columns along the body (0–1, tail to nose) and heights (px). */
const FINS: readonly (readonly [number, number])[] = [
  [0.22, 2],
  [0.4, 3],
  [0.58, 3],
  [0.74, 2],
];

/** Dirt flung by the dig-in, and the ground bulging under the burrowed body (custom legend). */
export const UNDERTOW_LEGEND = { ...MOTE_BODY_LEGEND, G: 'grime.2', H: 'grime.4' } as const;

/** The body: long, low, its tail tapering behind (left, facing SE), lit from the upper left. */
function body(g: CharGrid, cy: number, rx: number, ry: number, dark: boolean): void {
  const tmp: CharGrid = grid(W, H);
  const cx = 10;
  hollowBody(tmp, cx, cy, rx, ry, 0, dark);
  // The tail tapers: the rear third loses its top and bottom rows the further back it goes.
  for (let x = 0; x < W; x++) {
    const back = (cx - rx * 0.35 - (x + 0.5)) / (rx * 0.65);
    if (back <= 0) continue;
    const trim = Math.round(back * ry * 0.8);
    for (let y = 0; y < H; y++) {
      if (Math.abs(y + 0.5 - cy) > ry - trim) plot(tmp, x, y, '.');
    }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (at(tmp, x, y) !== '.') plot(g, x, y, at(tmp, x, y));
}

function undertow(facing: Facing, step: 0 | 1 | 2, look: Look): string[] {
  const heavy = look === 'heavy';
  const tell = look === 'tell';
  const dig = look === 'dig';
  const flat: CharGrid = grid(W, H);
  const rx = heavy ? 9.2 : 8.6;
  const ry = heavy ? 3.6 : 3.1;
  const cy = 8.2 + (tell ? -1 : 0);
  body(flat, cy, rx, ry, heavy);
  const left = Math.round(10 - rx);
  const span = 2 * rx;
  const top = Math.round(cy - ry);
  // The dorsal plates, each a fin of pale-lit plate on a dark seam.
  for (const [f, hgt] of FINS) {
    const fx = Math.round(left + span * f);
    for (let k = 1; k <= hgt; k++) {
      plot(flat, fx, top - k + 1, k === hgt ? '3' : '2');
      plot(flat, fx + 1, top - k + 1, k === 1 ? '1' : k === hgt ? '.' : '1');
    }
    plot(flat, fx - 1, top + 1, '0'); // the seam between plates
  }
  inkContour(flat);
  // The lateral line: cold violet specks down its side, twinkling as it goes.
  for (let x = left + 3; x < left + span - 3; x += 3) {
    plot(flat, x, Math.round(cy) + (facing === 'se' ? 1 : 0), (x + step) % 2 === 0 ? 'U' : 'V');
  }
  const nose = Math.round(left + span) - 2;
  const fy = Math.round(cy);
  if (facing === 'se') {
    // A ring where a face should be, low on the nose (opened wide in the reach); acid eyes.
    stamp(flat, nose - 3, fy, tell ? ['.ww.', 'wkkw', 'wkkw', '.ww.'] : ['.w.', 'wkw', '.w.']);
    plot(flat, nose - 2, top + 1, '*');
    plot(flat, nose - 5, top + 2, '+');
    if (step !== 1) plot(flat, nose, fy - 1, '+');
  } else {
    // From behind it looks at you anyway: acid eyes along its back, between the plates.
    plot(flat, Math.round(left + span * 0.5), top + 1, '*');
    plot(flat, Math.round(left + span * 0.66), fy, '+');
    if (step !== 2) plot(flat, Math.round(left + span * 0.3), fy - 1, '+');
  }
  // The legs: too many, little, every other one lifted each step.
  for (let x = left + 3, i = 0; x < left + span - 2; x += 3, i++) {
    if ((i + step) % 2 === 0) plot(flat, x, Math.round(cy + ry), '0');
  }
  // The wave: each column lifted by the ripple running along it (the dig tips it nose-down).
  const g: CharGrid = grid(W, H);
  for (let x = 0; x < W; x++) {
    const [tail, head] = WAVE[step] ?? [0, 0];
    const lift = dig
      ? Math.round(((x - W / 2) / (W / 2)) * -2.4) // tail up, nose down
      : heavy || tell
        ? 0
        : x < left + span * 0.4
          ? tail
          : x > left + span * 0.7
            ? head
            : 0;
    for (let y = 0; y < H; y++) {
      const c = at(flat, x, y);
      if (c !== '.') plot(g, x, y - lift, c);
    }
  }
  if (dig) {
    // The nose gone under: a pale ripple opening round it, dark clods flung up behind.
    for (let x = nose - 3; x <= W - 1; x++) plot(g, x, H - 1, x % 2 === 0 ? 'w' : '3');
    plot(g, nose - 4, H - 2, 'w');
    const clods = step === 0 ? [[nose - 1, 2], [nose + 2, 1], [nose - 4, 0]] : [[nose, 0], [nose + 3, 3], [nose - 3, 1]];
    for (const [x, y] of clods) {
      plot(g, x ?? 0, y ?? 0, 'G');
      plot(g, (x ?? 0) + 1, y ?? 0, 'H');
    }
  }
  if (tell) reach(g, nose, fy, W - 1, facing === 'se' ? fy + 1 : fy - 2);
  if (heavy) heavyDress(g, Math.round(left + span * 0.45), fy - 2, 0, fy - 3, step);
  const seed = (facing === 'se' ? 110 : 120) + step + (heavy ? 5 : tell ? 9 : dig ? 13 : 0);
  return dropPixels(rows(g), seed);
}

/**
 * Burrowed: the dorsal plates cutting the road over a dark bulge, which the pale outline rings as
 * a ripple; the plates and the ripple shift a pixel between the two frames.
 */
function under(facing: Facing, step: 0 | 1): string[] {
  const g: CharGrid = grid(W, H);
  const cy = 10;
  // The bulge of dark ground over it (the outline pass rings it pale: the ripple), wider on step 1.
  const rx = step === 0 ? 7.6 : 8.4;
  const ry = step === 0 ? 2.2 : 2.5;
  for (let y = 6; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const d = Math.hypot((x + 0.5 - 10) / rx, (y + 0.5 - cy) / ry);
      if (d <= 1) plot(g, x, y, d > 0.75 ? 'H' : d > 0.45 ? 'G' : 'K');
    }
  }
  // The plates breaking the surface, back to front (a pixel along on step 1).
  const fins = facing === 'se' ? [5, 8, 11, 14] : [6, 9, 12, 15];
  for (const [i, fx0] of fins.entries()) {
    const fx = fx0 + step - 1;
    const hgt = i === 1 || i === 2 ? 3 : 2;
    for (let k = 0; k < hgt; k++) {
      plot(g, fx, cy - 1 - k, k === hgt - 1 ? '3' : '2');
      if (k < hgt - 1) plot(g, fx + 1, cy - 1 - k, '1');
    }
  }
  // One acid eye watching from just under the surface; one violet speck.
  plot(g, facing === 'se' ? 14 + step : 5 + step, cy, '*');
  plot(g, 9 + step, cy + 1, 'V');
  return rows(g);
}

const frames = {
  walk_se_0: undertow('se', 0, 'walk'),
  walk_se_1: undertow('se', 1, 'walk'),
  walk_se_2: undertow('se', 2, 'walk'),
  walk_ne_0: undertow('ne', 0, 'walk'),
  walk_ne_1: undertow('ne', 1, 'walk'),
  walk_ne_2: undertow('ne', 2, 'walk'),
  dig_se_0: undertow('se', 0, 'dig'),
  dig_se_1: undertow('se', 1, 'dig'),
  dig_ne_0: undertow('ne', 0, 'dig'),
  dig_ne_1: undertow('ne', 1, 'dig'),
  under_se_0: under('se', 0),
  under_se_1: under('se', 1),
  under_ne_0: under('ne', 0),
  under_ne_1: under('ne', 1),
  heavy_se_0: undertow('se', 0, 'heavy'),
  heavy_se_1: undertow('se', 1, 'heavy'),
  heavy_se_2: undertow('se', 2, 'heavy'),
  heavy_ne_0: undertow('ne', 0, 'heavy'),
  heavy_ne_1: undertow('ne', 1, 'heavy'),
  heavy_ne_2: undertow('ne', 2, 'heavy'),
  tell_se_0: undertow('se', 0, 'tell'),
  tell_ne_0: undertow('ne', 0, 'tell'),
};

export const enemyUndertow = defineSprite({
  id: 'enemy.undertow',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'hollow',
  outline: 'auto',
  legend: UNDERTOW_LEGEND,
  frames,
  anims: {
    walk_se: { frames: ['walk_se_0', 'walk_se_1', 'walk_se_2'], fps: 6 },
    walk_sw: { mirrorOf: 'walk_se' },
    walk_ne: { frames: ['walk_ne_0', 'walk_ne_1', 'walk_ne_2'], fps: 6 },
    walk_nw: { mirrorOf: 'walk_ne' },
    dig_se: { frames: ['dig_se_0', 'dig_se_1'], fps: 6 },
    dig_sw: { mirrorOf: 'dig_se' },
    dig_ne: { frames: ['dig_ne_0', 'dig_ne_1'], fps: 6 },
    dig_nw: { mirrorOf: 'dig_ne' },
    under_se: { frames: ['under_se_0', 'under_se_1'], fps: 4 },
    under_sw: { mirrorOf: 'under_se' },
    under_ne: { frames: ['under_ne_0', 'under_ne_1'], fps: 4 },
    under_nw: { mirrorOf: 'under_ne' },
    heavy_se: { frames: ['heavy_se_0', 'heavy_se_1', 'heavy_se_2'], fps: 7 },
    heavy_sw: { mirrorOf: 'heavy_se' },
    heavy_ne: { frames: ['heavy_ne_0', 'heavy_ne_1', 'heavy_ne_2'], fps: 7 },
    heavy_nw: { mirrorOf: 'heavy_ne' },
    tell_se: { frames: ['tell_se_0'], fps: 1 },
    tell_sw: { mirrorOf: 'tell_se' },
    tell_ne: { frames: ['tell_ne_0'], fps: 1 },
    tell_nw: { mirrorOf: 'tell_ne' },
  },
});
