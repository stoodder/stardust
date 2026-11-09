// The Rig 9 camera feed (A1M5's stinger, act1.md § A1M5; D097 R3): an Everglow CRT monitor showing
// "RIG 9 · CAM 2 · LIVE". The full-screen scene layer (DOM) stages it: the quiet rig at night
// (`live`), a burst of static, six frames of something the wrong shape (`smudge`, ~0.5 s), more
// static, then "NO SIGNAL". The shape is the Hollow's first appearance, so the sprite takes the
// `hollow` palette: its slots carry the drained greys and the reserved acid (art-direction §2,
// hue reservation), drawn with the Hollow's inverted pale outline and pixel dropout (§4). Every
// other colour is a custom legend entry. No outline pass: the monitor's casing is its own edge.
import { defineSprite } from '../defineSprite.ts';
import { textPixels, textWidth } from '../font3x5.ts';
import { grid, hash01, line, plot, rows, type CharGrid } from '../helpers.ts';

const W = 128;
const H = 88;
/** The screen's rectangle inside the casing (its top-left pixel and size). */
const SX = 8;
const SY = 7;
const SW = 112;
const SH = 66;
/** The camera image's horizon row and the rig's footing, in screen pixels. */
const HORIZON = 41;
const RIG_X = 80;
const RIG_FOOT = 50;

// Custom legend: everything that isn't the Hollow (palette slots) is named here.
// A–D ink, F–J steel, K–L white, M–Q violet, R red, S orange, T/U/Z teal, V/W blue, X/Y grime.
const LEGEND = {
  A: 'ink.0',
  B: 'ink.1',
  C: 'ink.2',
  D: 'ink.3',
  E: 'ink.4',
  F: 'steel.0',
  G: 'steel.1',
  H: 'steel.2',
  I: 'steel.3',
  J: 'steel.4',
  K: 'white.0',
  L: 'white.1',
  M: 'violet.0',
  N: 'violet.1',
  O: 'violet.2',
  P: 'violet.3',
  Q: 'violet.4',
  R: 'red.3',
  S: 'orange.3',
  T: 'teal.2',
  U: 'teal.4',
  V: 'blue.0',
  W: 'blue.1',
  X: 'grime.1',
  Y: 'grime.0',
  Z: 'teal.3',
} as const;

/** One step darker: the CRT's odd scanlines. */
const SCAN_DARKER: Readonly<Record<string, string>> = {
  B: 'A',
  C: 'B',
  D: 'C',
  E: 'D',
  G: 'F',
  H: 'G',
  I: 'H',
  J: 'I',
  K: 'J',
  L: 'K',
  N: 'M',
  O: 'N',
  P: 'O',
  Q: 'P',
  U: 'Z',
  Z: 'T',
  X: 'Y',
  W: 'V',
  M: 'B',
  Y: 'B',
};

/** The camera image: a screen-sized grid in screen coordinates. */
type Screen = CharGrid;

function screen(fill = 'B'): Screen {
  return grid(SW, SH, fill);
}

/** The quiet rig at night: sky, horizon haze, ground, the derrick, its pump house and floodlit apron. */
function rigNight(beacon: boolean): Screen {
  const s = screen('B');
  // Sky: ink.1 with a few cold stars, violet haze dithering in toward the horizon.
  for (let v = 0; v < HORIZON; v++) {
    for (let u = 0; u < SW; u++) {
      const haze = v - (HORIZON - 12);
      if (haze > 0 && hash01(u, v, 3) < haze / 14) plot(s, u, v, 'M');
      else if (v < HORIZON - 14 && hash01(u, v, 4) < 0.012)
        plot(s, u, v, hash01(u, v, 5) < 0.3 ? 'I' : 'G');
    }
  }
  // Ground: dark grime with ink dither, and a low far ridge on the horizon.
  for (let v = HORIZON; v < SH; v++) {
    for (let u = 0; u < SW; u++) plot(s, u, v, hash01(u, v, 6) < 0.35 ? 'C' : 'Y');
  }
  for (let u = 0; u < SW; u++) {
    const ridge = Math.round(2 + 2 * Math.sin(u / 9) + Math.sin(u / 3.7));
    for (let v = HORIZON - ridge; v < HORIZON; v++) plot(s, u, v, 'C');
  }
  // The floodlit apron under the derrick (the pump house's lamp throws a cone down and right).
  for (let v = RIG_FOOT - 4; v < RIG_FOOT + 8; v++) {
    const half = 6 + (v - (RIG_FOOT - 4)) * 1.6;
    for (let u = Math.round(RIG_X + 12 - half); u <= RIG_X + 12 + half; u++) {
      if (hash01(u, v, 7) < 0.7) plot(s, u, v, hash01(u, v, 8) < 0.25 ? 'H' : 'X');
    }
  }
  // A perimeter fence along the horizon, left: posts and a sagging wire.
  for (let u = 4; u < 52; u += 7) {
    line(s, u, HORIZON + 2, u, HORIZON - 3, 'G');
  }
  for (let u = 4; u < 52; u++) plot(s, u, HORIZON - 2 + (u % 7 === 3 ? 1 : 0), 'F');
  // The derrick: two splayed legs, cross braces, a crown, and a beacon.
  const top = 12;
  line(s, RIG_X - 8, RIG_FOOT, RIG_X - 1, top + 3, 'H');
  line(s, RIG_X + 8, RIG_FOOT, RIG_X + 1, top + 3, 'G');
  for (let v = top + 6, k = 0; v < RIG_FOOT - 2; v += 6, k++) {
    const half = 1 + ((v - top) * 7) / (RIG_FOOT - top);
    const l = Math.round(RIG_X - half);
    const r = Math.round(RIG_X + half);
    const v2 = Math.min(RIG_FOOT - 1, v + 6);
    const half2 = 1 + ((v2 - top) * 7) / (RIG_FOOT - top);
    line(s, l, v, r, v, 'G');
    if (k % 2 === 0) line(s, l, v, Math.round(RIG_X + half2), v2, 'F');
    else line(s, r, v, Math.round(RIG_X - half2), v2, 'F');
  }
  for (let u = RIG_X - 3; u <= RIG_X + 3; u++) {
    plot(s, u, top + 2, 'I');
    plot(s, u, top + 3, u < RIG_X ? 'S' : 'H');
  }
  plot(s, RIG_X, top + 1, 'G');
  if (beacon) {
    plot(s, RIG_X, top, 'L');
    for (const [du, dv] of [
      [-1, 0],
      [1, 0],
      [0, -1],
    ] as const) {
      plot(s, RIG_X + du, top + dv, 'U');
    }
    plot(s, RIG_X - 2, top, 'Z');
    plot(s, RIG_X + 2, top, 'Z');
  } else {
    plot(s, RIG_X, top, 'T');
  }
  // The pump house: a white prefab block, its lit face with a big orange 9, a lamp over the door.
  const px = RIG_X + 7;
  const py = RIG_FOOT - 10;
  for (let v = py; v <= RIG_FOOT; v++) {
    for (let u = px; u <= px + 14; u++) plot(s, u, v, u < px + 10 ? 'I' : 'H');
  }
  for (let u = px; u <= px + 14; u++) plot(s, u, py, 'J');
  for (const p of textPixels('9', px + 3, py + 3)) plot(s, p.x, p.y, 'S');
  plot(s, px + 12, py + 4, 'K');
  plot(s, px + 12, py + 5, 'K');
  plot(s, px + 8, py - 1, 'L');
  // A heap of drill spoil by the legs, two cold violet flecks in it (unsung: art-direction §1).
  for (let u = RIG_X - 16; u <= RIG_X - 8; u++) {
    const hgt = Math.round(3 - Math.abs(u - (RIG_X - 12)) * 0.6);
    for (let v = RIG_FOOT - hgt; v <= RIG_FOOT; v++)
      plot(s, u, v, v === RIG_FOOT - hgt ? 'H' : 'G');
  }
  plot(s, RIG_X - 13, RIG_FOOT - 1, 'P');
  plot(s, RIG_X - 10, RIG_FOOT, 'Q');
  return s;
}

/**
 * Something the wrong shape, standing at (cx, foot) and `h` px tall: a spine that bends the wrong
 * way twice, a head with no face (a ring round a hole), and two long thin limbs that bend up
 * before they fall past its feet. Violet body, the Hollow's acid flecks, a pale inverted outline,
 * and pixel dropout (art-direction §4). `seed` re-rolls the dropout; `ghost` doubles the outline.
 */
function wrongShape(s: Screen, cx: number, foot: number, h: number, seed: number, ghost = 0): void {
  const mask = grid(SW, SH, '.');
  const thick = Math.max(1, h / 9);
  const joints = [
    { x: cx, y: foot },
    { x: cx + h * 0.22, y: foot - h * 0.34 },
    { x: cx - h * 0.18, y: foot - h * 0.66 },
    { x: cx + h * 0.06, y: foot - h * 0.86 },
  ];
  const brush = (x: number, y: number, r: number): void => {
    for (let v = Math.floor(y - r); v <= Math.ceil(y + r); v++) {
      for (let u = Math.floor(x - r); u <= Math.ceil(x + r); u++) {
        if (Math.hypot(u + 0.5 - x, v + 0.5 - y) <= r) plot(mask, u, v, '#');
      }
    }
  };
  const stroke = (
    a: { x: number; y: number },
    b: { x: number; y: number },
    r0: number,
    r1: number,
  ): void => {
    const n = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      brush(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, r0 + (r1 - r0) * t);
    }
  };
  for (let i = 0; i < joints.length - 1; i++) {
    const a = joints[i];
    const b = joints[i + 1];
    if (a !== undefined && b !== undefined)
      stroke(a, b, thick * (1 - i * 0.2), thick * (0.8 - i * 0.2));
  }
  const crown = joints[3] ?? { x: cx, y: foot - h };
  const headR = Math.max(1.5, h / 8);
  const head = { x: crown.x + headR * 0.9, y: crown.y - headR * 0.6 };
  brush(head.x, head.y, headR);
  // The limbs: from the upper bend, up and out, then a long fall past the feet.
  const shoulder = joints[2] ?? crown;
  for (const side of [-1, 1] as const) {
    const elbow = { x: shoulder.x + side * h * 0.34, y: shoulder.y - h * 0.16 };
    const hand = { x: elbow.x + side * h * 0.08, y: foot + h * 0.08 };
    stroke(shoulder, elbow, Math.max(0.5, thick * 0.45), Math.max(0.5, thick * 0.3));
    stroke(elbow, hand, Math.max(0.5, thick * 0.3), 0.5);
  }
  // The face is a hole.
  const holeR = headR * 0.45;
  for (let v = 0; v < SH; v++) {
    for (let u = 0; u < SW; u++) {
      if (Math.hypot(u + 0.5 - head.x, v + 0.5 - head.y) <= holeR) plot(mask, u, v, '.');
    }
  }
  const inMask = (u: number, v: number): boolean => mask[v]?.[u] === '#';
  // Paint: the pale outline first (also `ghost` px to the right, sparser), then the body.
  for (const off of ghost > 0 ? [ghost, 0] : [0]) {
    for (let v = 0; v < SH; v++) {
      for (let u = 0; u < SW; u++) {
        if (inMask(u - off, v)) continue;
        const edge =
          inMask(u - off - 1, v) ||
          inMask(u - off + 1, v) ||
          inMask(u - off, v - 1) ||
          inMask(u - off, v + 1);
        if (!edge) continue;
        if (hash01(u, v, seed + off * 17) < (off > 0 ? 0.6 : 0.4)) continue;
        plot(s, u, v, off > 0 ? '3' : 'x');
      }
    }
  }
  // The smear: the tube can't hold the shape, so it ghosts to the right (a CRT trail).
  for (let v = 0; v < SH; v++) {
    for (let u = 0; u < SW; u++) {
      if (!inMask(u, v)) continue;
      const len = 1 + Math.floor(hash01(v, seed, 11) * Math.max(2, h / 8));
      for (let d = 1; d <= len; d++) {
        if (inMask(u + d, v) || hash01(u + d, v, seed + 5) < d / (len + 1)) continue;
        plot(s, u + d, v, d === 1 ? 'N' : 'M');
      }
    }
  }
  for (let v = 0; v < SH; v++) {
    for (let u = 0; u < SW; u++) {
      if (!inMask(u, v)) continue;
      const r = hash01(u, v, seed);
      if (r < 0.14) continue; // dropout: the feed shows through
      const shade = inMask(u + 1, v) && inMask(u + 2, v) ? 'O' : 'N';
      plot(s, u, v, r > 0.94 ? 'd' : r > 0.9 ? 'c' : r > 0.86 ? 'P' : shade);
    }
  }
}

/** Fills the given screen rows with static (ink to white noise; seed re-rolls it). */
function staticRows(s: Screen, from: number, to: number, seed: number): void {
  for (let v = Math.max(0, from); v < Math.min(SH, to); v++) {
    for (let u = 0; u < SW; u++) {
      const r = hash01(u, v, seed);
      plot(s, u, v, r < 0.3 ? 'A' : r < 0.55 ? 'C' : r < 0.75 ? 'G' : r < 0.9 ? 'I' : 'K');
    }
  }
}

/** Tears a band of rows sideways by `by` px (wrapping), the way a losing signal does. */
function tear(s: Screen, from: number, to: number, by: number): void {
  for (let v = Math.max(0, from); v < Math.min(SH, to); v++) {
    const row = s[v];
    if (row === undefined) continue;
    const copy = [...row];
    for (let u = 0; u < SW; u++) row[u] = copy[(((u - by) % SW) + SW) % SW] ?? 'B';
  }
}

/** Darkens every other row one step (the CRT's scanlines). */
function scanlines(s: Screen): void {
  for (let v = 1; v < SH; v += 2) {
    const row = s[v];
    if (row === undefined) continue;
    for (let u = 0; u < SW; u++) row[u] = SCAN_DARKER[row[u] ?? ''] ?? row[u] ?? 'B';
  }
}

/** Text with a 1 px ink drop shadow, so the on-screen display reads over anything. */
function osdText(s: Screen, text: string, u: number, v: number, ch: string, scale = 1): void {
  for (const p of textPixels(text, u + 1, v + 1, scale)) plot(s, p.x, p.y, 'A');
  for (const p of textPixels(text, u, v, scale)) plot(s, p.x, p.y, ch);
}

/** The camera's on-screen display: "RIG 9 · CAM 2", the LIVE tally (its dot blinks), a timestamp. */
function osd(s: Screen, dot: boolean): void {
  osdText(s, 'RIG 9 · CAM 2', 3, 3, 'K');
  const live = 'LIVE';
  const lx = SW - 3 - textWidth(live);
  osdText(s, live, lx, 3, 'K');
  if (dot) {
    for (const [du, dv] of [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 1],
      [0, 2],
      [2, 2],
      [0, 0],
      [2, 0],
    ] as const) {
      plot(s, lx - 5 + du, 4 + dv, 'R');
    }
  }
  const stamp = '02:14:07';
  osdText(s, stamp, SW - 4 - textWidth(stamp), SH - 8, 'I');
}

/** The monitor: an Everglow steel casing round the screen, a chin with a grille, knobs, and a lamp. */
function monitor(sc: Screen, lamp: boolean): string[] {
  const g = grid(W, H, '.');
  const cut = 3;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = Math.min(x, W - 1 - x);
      const dy = Math.min(y, H - 1 - y);
      if (dx + dy < cut) continue; // chamfered corners
      const edge = dx === 0 || dy === 0 || dx + dy === cut;
      let ch = edge ? 'A' : 'G';
      if (!edge && (y === 1 || (x === 1 && y < H - 2))) ch = 'I';
      else if (!edge && (y === H - 2 || x === W - 2)) ch = 'F';
      plot(g, x, y, ch);
    }
  }
  // The screen's recess: an ink ring with a lit lower lip.
  for (let y = SY - 2; y < SY + SH + 2; y++) {
    for (let x = SX - 2; x < SX + SW + 2; x++) plot(g, x, y, y >= SY + SH ? 'H' : 'C');
  }
  for (let x = SX - 2; x < SX + SW + 2; x++) plot(g, x, SY - 2, 'F');
  // The screen, its corners rounded by the tube.
  for (let v = 0; v < SH; v++) {
    for (let u = 0; u < SW; u++) {
      const du = Math.min(u, SW - 1 - u);
      const dv = Math.min(v, SH - 1 - v);
      if (du + dv < 2) continue;
      plot(g, SX + u, SY + v, sc[v]?.[u] ?? 'B');
    }
  }
  // Glass glare in the top-left corner.
  for (let i = 0; i < 6; i++) plot(g, SX + 3 + i, SY + 10 - i, i % 2 === 0 ? 'H' : 'G');
  plot(g, SX + 3, SY + 12, 'G');
  // The chin: a teal Everglow chevron and the power lamp left, a grille, two knobs right.
  const cy = SY + SH + 6;
  for (const [dx, dy] of [
    [0, 0],
    [1, 1],
    [2, 2],
    [3, 1],
    [4, 0],
  ] as const) {
    plot(g, 8 + dx, cy - 1 + dy, 'Z');
  }
  plot(g, 17, cy, lamp ? 'U' : 'T');
  plot(g, 18, cy, lamp ? 'Z' : 'T');
  for (let x = 30; x < 88; x += 2) {
    for (let y = cy - 2; y <= cy + 2; y += 2) plot(g, x, y, 'C');
  }
  for (const kx of [102, 112]) {
    for (let y = cy - 3; y <= cy + 3; y++) {
      for (let x = kx - 3; x <= kx + 3; x++) {
        const d = Math.hypot(x - kx, y - cy);
        if (d <= 3.2) plot(g, x, y, d > 2.4 ? 'A' : x + y < kx + cy ? 'J' : 'H');
      }
    }
    plot(g, kx, cy - 2, 'A');
    plot(g, kx, cy - 1, 'A');
  }
  // Two feet.
  for (const fx of [14, W - 18]) {
    for (let x = fx; x < fx + 4; x++) {
      plot(g, x, H - 1, 'A');
    }
  }
  return rows(g);
}

/** The live feed: the rig at night, its beacon on or off, the LIVE dot with it. */
function liveFrame(beacon: boolean): string[] {
  const s = rigNight(beacon);
  scanlines(s);
  osd(s, beacon);
  return monitor(s, true);
}

/** Static: noise across the whole tube, with a brighter rolling band. */
function staticFrame(k: number): string[] {
  const s = screen();
  staticRows(s, 0, SH, 40 + k);
  const band = (k * 23 + 9) % SH;
  for (let v = band; v < band + 5 && v < SH; v++) {
    for (let u = 0; u < SW; u++) if (hash01(u, v, 50 + k) < 0.5) plot(s, u, v, 'K');
  }
  osd(s, true);
  return monitor(s, true);
}

/**
 * The six frames of the wrong shape (~0.5 s at 12 fps): far off by the fence, then nearer the rig
 * (its beacon goes out), in front of it, then too close, then the signal tears away from it.
 */
function smudgeFrame(k: number): string[] {
  const beacon = k < 2;
  const s = rigNight(beacon);
  const seed = 70 + k;
  switch (k) {
    case 0:
      wrongShape(s, 30, HORIZON + 4, 12, seed);
      tear(s, HORIZON - 8, HORIZON - 5, 2);
      staticRows(s, 52, 55, seed);
      break;
    case 1:
      wrongShape(s, 40, HORIZON + 6, 15, seed, 2);
      staticRows(s, 20, 22, seed);
      break;
    case 2:
      wrongShape(s, 56, HORIZON + 9, 22, seed, 2);
      tear(s, 30, 34, -3);
      break;
    case 3:
      wrongShape(s, 68, RIG_FOOT + 4, 32, seed);
      tear(s, 12, 15, 4);
      staticRows(s, 58, 60, seed);
      break;
    case 4:
      wrongShape(s, 58, SH + 6, 62, seed, 3);
      tear(s, 24, 30, -5);
      tear(s, 44, 47, 6);
      break;
    default:
      wrongShape(s, 52, SH + 10, 70, seed, 4);
      tear(s, 0, SH, 7);
      staticRows(s, 6, 22, seed);
      staticRows(s, 30, 46, seed + 1);
      staticRows(s, 52, 64, seed + 2);
      break;
  }
  scanlines(s);
  osd(s, true);
  return monitor(s, true);
}

/** The tube's own "NO SIGNAL" card: dark blue, big letters, the camera's name; the text dims to blink. */
function noSignalFrame(lit: boolean): string[] {
  const s = screen('V');
  for (let v = 1; v < SH; v += 2) for (let u = 0; u < SW; u++) plot(s, u, v, 'A');
  for (let v = 0; v < SH; v += 2)
    for (let u = 0; u < SW; u++) if (hash01(u, v, 90) < 0.05) plot(s, u, v, 'W');
  const text = 'NO SIGNAL';
  const tw = textWidth(text, 2);
  osdText(s, text, Math.floor((SW - tw) / 2), 26, lit ? 'L' : 'H', 2);
  osdText(s, 'RIG 9 · CAM 2', 3, 3, 'I');
  return monitor(s, true);
}

const SMUDGE = [0, 1, 2, 3, 4, 5].map((k) => `smudge_${k}`);
const STATIC = [0, 1, 2].map((k) => `static_${k}`);

export const sceneRig9Feed = defineSprite({
  id: 'scene.rig9_feed',
  size: { w: W, h: H },
  anchor: { x: W / 2, y: H },
  palette: 'hollow',
  outline: 'none',
  legend: LEGEND,
  frames: {
    live_0: liveFrame(true),
    live_1: liveFrame(false),
    ...Object.fromEntries(STATIC.map((name, k) => [name, staticFrame(k)])),
    ...Object.fromEntries(SMUDGE.map((name, k) => [name, smudgeFrame(k)])),
    no_signal_0: noSignalFrame(true),
    no_signal_1: noSignalFrame(false),
  },
  anims: {
    live: { frames: ['live_0', 'live_1'], fps: 2 },
    static: { frames: STATIC, fps: 12 },
    smudge: { frames: SMUDGE, fps: 12, loop: false },
    no_signal: { frames: ['no_signal_0', 'no_signal_1'], fps: 1 },
  },
});
