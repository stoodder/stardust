// Stasis Bloom (`bloom`, design/towers.md § Stasis Bloom): hard control, attuned in Xenotech after
// A3M1. On the floating Aelari dais (towers/aelariBase.ts) in its **ice trim** (pale ice threads
// woven across the dais, an ice rim thread, ice-cyan shards tipped white: the Stasis rim's colours,
// art-direction §8), a **flower of glass** floats over an emerald cradle: six pointed petals of
// stasis crystal fanned up round a white bud, lit pale on the left through ice-cyan to deep on the
// right, each tipped white, the back petals a step darker. It doesn't aim: its idle `pulse` opens
// the petals a little and closes them again while the bud breathes (4 frames, 3 fps), the
// Aelari's light pulsing in time (towers.md §8), and its one-shot `fire` (3 frames, 10 fps, about
// 0.3 s; render plays it on `PulseBurst`) flings the petals wide open on a white flash. The specs:
// **Gravity Well** (`spec_a`, the pulse pulls enemies back) curls the petals inward round a dark
// well, a sapphire-black heart in a white ring, with two teal motes circling it, over a base with
// a dark well-stone in a white ring floating at each corner; **Timeless Garden** (`spec_b`, a
// stronger field, faster pulses) grows a cluster: the bloom between two smaller blooms on stems,
// over a base with a small crystal flower on a tall stem at each corner. Each spec has its own
// `pulse_spec_<a|b>` and `fire_spec_<a|b>`.
import { defineSprite } from '../defineSprite.ts';
import { disc, grid, plot, rows, type CharGrid } from '../helpers.ts';
import { BASE_H, BASE_MOUNT, BASE_W, BASE_ANCHOR } from './base.ts';
import { aelariBase, aelariSpecBase, shard, type Trim } from './aelariBase.ts';

const W = 26;
const H = 32;
const CX = 13;
const CY = 29;

type Kit = 't1' | 'gravityWell' | 'timelessGarden';

/**
 * The Bloom's ice: `L` the lit pale ice, `M` ice-cyan, `N` its shade, `O` the deepest (the master
 * palette's pale water ramp, the Stasis tint's).
 */
const LEGEND = {
  L: 'act1.water.3',
  M: 'act1.water.2',
  N: 'act1.water.1',
  O: 'act1.water.0',
} as const;

/** The Bloom's trim (U5): ice threads and an ice rim, ice shards tipped white. */
export const BLOOM_TRIM: Trim = { rim: 'M', weave: 'L', ramp: ['L', 'M', 'N', 'O'], tip: '*' };

/** The cradle: a woven emerald ring the flower floats over. */
function cradle(g: CharGrid): void {
  for (let a = 0; a < 28; a++) {
    const t = (a / 28) * Math.PI * 2;
    const x = Math.floor(CX + Math.cos(t) * 4.5);
    const y = Math.floor(CY - 2 + Math.sin(t) * 1.9);
    plot(g, x, y, Math.sin(t) < 0 ? '7' : x < CX ? '9' : '8');
  }
}

/**
 * One pointed petal from (bx, by) out at `angle` (radians from straight up, positive to the
 * right), `len` long and `wide` at its widest, shaded across (lit on its left edge) and tipped
 * white; `back` a step darker.
 */
function petal(
  g: CharGrid,
  bx: number,
  by: number,
  angle: number,
  len: number,
  wide: number,
  back: boolean,
): void {
  const ux = Math.sin(angle);
  const uy = -Math.cos(angle);
  for (let s = 0; s <= len * 2; s++) {
    const t = s / (len * 2);
    const hw = wide * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (1 - t * 0.35);
    for (let k = -Math.ceil(hw * 2); k <= Math.ceil(hw * 2); k++) {
      const off = k / 2;
      if (Math.abs(off) > hw) continue;
      const x = Math.floor(bx + ux * t * len - uy * off);
      const y = Math.floor(by + uy * t * len + ux * off);
      const side = off / Math.max(hw, 0.01);
      let ch = side < -0.45 ? 'L' : side < 0.2 ? 'M' : 'N';
      if (back) ch = ch === 'L' ? 'M' : ch === 'M' ? 'N' : 'O';
      plot(g, x, y, ch);
    }
  }
  plot(g, Math.floor(bx + ux * len), Math.floor(by + uy * len), back ? 'L' : '*');
}

/** A flower: `n` petals fanned round (bx, by), opened by `open` (1 = rest), and its bud. */
function flower(
  g: CharGrid,
  bx: number,
  by: number,
  scale: number,
  open: number,
  bud: 'light' | 'well',
  beat: number,
): void {
  const fan = [-1.15, -0.68, -0.24, 0.24, 0.68, 1.15];
  const lens = [8, 10, 11, 11, 10, 8];
  // Back petals (the middle pair, behind the bud), then the outer ones in front.
  for (const i of [2, 3, 1, 4, 0, 5]) {
    const back = i === 2 || i === 3;
    petal(g, bx, by, (fan[i] ?? 0) * open, (lens[i] ?? 8) * scale, 2.2 * scale, back);
  }
  const hy = by - 4 * scale;
  if (bud === 'light') {
    // The bud: a white heart in ice, breathing.
    const r = (beat % 2 === 0 ? 2.4 : 2) * scale;
    disc(g, bx, hy, r, (d) => (d < r - 1.1 ? '*' : d < r - 0.5 ? '+' : 'L'));
  } else {
    // The well: a sapphire-black heart in a white ring.
    disc(g, bx, hy, 3, (d) => (d < 1.8 ? 'x' : d < 2.4 ? '1' : '*'));
  }
}

function bloomHead(kit: Kit, beat: number, firing: number | null): string[] {
  const g = grid(W, H);
  cradle(g);
  const bob = beat === 1 || beat === 2 ? 1 : 0;
  const by = CY - 5 - bob;
  // Breathing open and closed; a pulse flings the petals wide (`firing` 0–2).
  const breathe = [1, 1.06, 1.1, 1.04][beat] ?? 1;
  const flare = firing === null ? 1 : ([1.3, 1.4, 1.15][firing] ?? 1);
  if (kit === 'gravityWell') {
    // Curled inward round the dark well.
    flower(g, CX, by, 0.95, 0.55 * breathe * (firing === null ? 1 : 1.2), 'well', beat);
    // Two teal motes circling it, a quarter turn a beat.
    for (let k = 0; k < 2; k++) {
      const a = ((k * 2 + beat) / 4) * Math.PI * 2;
      plot(g, Math.floor(CX + Math.cos(a) * 8), Math.floor(by - 4 + Math.sin(a) * 3), '+');
    }
  } else if (kit === 'timelessGarden') {
    // A cluster: two small blooms on stems either side of the main one.
    for (const side of [-1, 1]) {
      const sx = CX + side * 8;
      const sy = by + 1;
      for (let y = sy; y <= CY - 2; y++) plot(g, sx - (y > sy + 2 ? side : 0), y, '8');
      flower(g, sx, sy, 0.5, breathe * flare, 'light', (beat + 1) % 4);
    }
    flower(g, CX, by - 1, 0.85, breathe * flare, 'light', beat);
  } else {
    flower(g, CX, by, 1, breathe * flare, 'light', beat);
  }
  if (firing === 0) {
    // The pulse's flash at the bud.
    disc(g, CX, by - 4, 3.2, (d) => (d < 2 ? 'w' : '*'));
  }
  return rows(g);
}

/** Gravity Well's base: a dark well-stone in a white ring floating over a shard at each corner. */
function gravityWellKit(g: CharGrid, cx: number, cy: number): void {
  for (const side of [-1, 1]) {
    const x = cx + side * 11 + (side > 0 ? 1 : 0);
    shard(g, x, cy - 1, 4, BLOOM_TRIM);
    disc(g, x, cy - 10, 3, (d) => (d < 1.6 ? 'x' : d < 2.3 ? '1' : '*'));
    plot(g, x - 4, cy - 10, '+');
    plot(g, x + 3, cy - 12, '+');
  }
}

/** Timeless Garden's base: a small crystal flower on a tall stem at each corner. */
function timelessGardenKit(g: CharGrid, cx: number, cy: number): void {
  for (const side of [-1, 1]) {
    const x = cx + side * 11 + (side > 0 ? 1 : 0);
    for (let y = cy - 12; y <= cy - 1; y++) plot(g, x, y, y % 4 === 0 ? '9' : '8');
    plot(g, x - side, cy - 5, '9');
    plot(g, x - 2 * side, cy - 6, '8');
    for (const [dx, dy, c] of [
      [-2, -15, 'L'],
      [-1, -16, 'L'],
      [0, -16, 'M'],
      [1, -15, 'N'],
      [-2, -13, 'M'],
      [1, -13, 'N'],
      [-1, -14, '*'],
      [0, -14, '+'],
      [-1, -13, 'L'],
      [0, -13, 'M'],
      [-1, -17, '*'],
    ] as const) {
      plot(g, x + dx, cy + dy, c);
    }
  }
}

export const towerBloom = defineSprite({
  id: 'tower.bloom',
  size: { w: BASE_W, h: BASE_H },
  anchor: BASE_ANCHOR,
  mount: BASE_MOUNT,
  palette: 'aelari',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: LEGEND,
  frames: {
    t1: aelariBase(1, BLOOM_TRIM),
    t2: aelariBase(2, BLOOM_TRIM),
    t3: aelariBase(3, BLOOM_TRIM),
    spec_a: aelariSpecBase(gravityWellKit, BLOOM_TRIM),
    spec_b: aelariSpecBase(timelessGardenKit, BLOOM_TRIM),
  },
});

const BEATS = [0, 1, 2, 3] as const;
const FIRE = [0, 1, 2] as const;
const KITS = [
  ['', 't1'],
  ['_spec_a', 'gravityWell'],
  ['_spec_b', 'timelessGarden'],
] as const;

export const towerBloomHead = defineSprite({
  id: 'tower.bloom_head',
  size: { w: W, h: H },
  anchor: { x: CX, y: CY },
  palette: 'aelari',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: LEGEND,
  frames: Object.fromEntries(
    KITS.flatMap(([suffix, kit]) => [
      ...BEATS.map((k) => [`pulse${suffix}_${k}`, bloomHead(kit, k, null)]),
      ...FIRE.map((k) => [`fire${suffix}_${k}`, bloomHead(kit, 0, k)]),
    ]),
  ),
  anims: {
    // The first anim is the tier 1–3 idle (render's `headStyle`).
    pulse: { frames: BEATS.map((k) => `pulse_${k}`), fps: 3 },
    pulse_spec_a: { frames: BEATS.map((k) => `pulse_spec_a_${k}`), fps: 3 },
    // Timeless Garden pulses faster (every 6 s, not 8).
    pulse_spec_b: { frames: BEATS.map((k) => `pulse_spec_b_${k}`), fps: 4 },
    // The pulse burst (~0.3 s, once): render plays it on `PulseBurst` (T630a), then the idle.
    fire: { frames: FIRE.map((k) => `fire_${k}`), fps: 10, loop: false },
    fire_spec_a: { frames: FIRE.map((k) => `fire_spec_a_${k}`), fps: 10, loop: false },
    fire_spec_b: { frames: FIRE.map((k) => `fire_spec_b_${k}`), fps: 10, loop: false },
  },
});
