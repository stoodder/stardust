// Mindspike Obelisk (`mindspike`, design/towers.md § Aelari towers): armor-ignoring Psionic DPS, the
// anti-Hollow answer, attuned in Xenotech. On the floating Aelari dais (towers/aelariBase.ts) a
// dark obelisk floats point-up over a woven emerald cradle: deep sapphire glass, lit on its left
// edge, carved down its face with a column of ruby knots, and near its tip the mind-eye, a knot of
// psionic violet (art-direction §7: Psionic is violet and pink, ripples, no solid projectile) that
// turns to its target (low on its right facing us, high facing away). Firing, the eye flares white
// and a violet ripple rings the tip. From tier 2 the obelisk stands taller and two thorn-shards float
// at its sides. The specs: **Echo Spike** (`spec_a`) is a chord of three, the obelisk flanked by two
// smaller echoes of itself, each with its own eye, a ring of violet knots round them, over a base
// with a small floating spike at each corner; **Dread** (`spec_b`, Unnerved) is heavier and darker,
// crowned with three ruby-tipped thorns over a great open violet eye, over a base with jagged dark
// thorns jutting from its corners.
import { defineSprite } from '../defineSprite.ts';
import { grid, plot, rows, type CharGrid } from '../helpers.ts';
import { BASE_ANCHOR, BASE_H, BASE_MOUNT, BASE_W } from './base.ts';
import { aelariBase, aelariSpecBase } from './aelariBase.ts';

const W = 26;
const H = 38;
const CX = 13;
const CY = 35;

type Facing = 'se' | 'ne';
type Kit = 't1' | 't2' | 'echo' | 'dread';

/** The cradle: a woven emerald ring the obelisk floats over, ruby knots at its sides. */
function cradle(g: CharGrid, rx: number): void {
  for (let a = 0; a < 32; a++) {
    const t = (a / 32) * Math.PI * 2;
    const x = Math.floor(CX + Math.cos(t) * rx);
    const y = Math.floor(CY - 2 + Math.sin(t) * (rx / 2.4));
    plot(g, x, y, Math.sin(t) < 0 ? '7' : x < CX ? '9' : '8');
  }
  plot(g, CX - Math.round(rx) - 1, CY - 2, 'd');
  plot(g, CX + Math.round(rx), CY - 2, 'c');
}

/**
 * An obelisk centred on column `cx` (pixel edges), its foot at `foot`, `tall` rows to its point,
 * `hw` px half-wide at the foot: dark glass lit on its left edge, a pyramidion at the top.
 */
function obelisk(g: CharGrid, cx: number, foot: number, tall: number, hw: number): void {
  const capH = Math.max(2, Math.round(hw * 1.4));
  for (let k = 0; k < tall; k++) {
    const y = foot - k;
    const shaft = hw - (k / tall) * hw * 0.45;
    const w = k >= tall - capH ? (shaft * (tall - k)) / (capH + 0.5) : shaft;
    for (let x = Math.floor(cx - w); x < Math.ceil(cx + w); x++) {
      const u = (x + 0.5 - cx) / Math.max(0.5, w);
      const cap = k >= tall - capH;
      plot(g, x, y, u < -0.5 ? (cap ? '4' : '3') : u < 0.2 ? (cap ? '3' : '1') : cap ? '1' : '0');
    }
  }
}

/** The carved knots down its face. */
function knots(g: CharGrid, cx: number, foot: number, tall: number): void {
  for (let y = foot - 3; y > foot - tall + 6; y -= 4) {
    plot(g, Math.floor(cx) - 1, y, 'd');
    plot(g, Math.floor(cx), y, 'b');
  }
}

/** The mind-eye at (x, y): a violet diamond, white-cored when it fires (bigger for Dread). */
function eye(g: CharGrid, x: number, y: number, fire: boolean, big = false): void {
  const r = big ? 2 : 1;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const d = Math.abs(dx) + Math.abs(dy);
      if (d > r) continue;
      plot(
        g,
        x + dx,
        y + dy,
        d === 0 ? (fire ? 'w' : 'U') : d < r ? (fire ? 'w' : 'U') : fire ? 'U' : 'V',
      );
    }
  }
}

/** The psionic ripple ringing the tip when it fires: a broken violet ellipse. */
function ripple(g: CharGrid, cx: number, cy: number, r: number): void {
  for (let a = 0; a < 20; a++) {
    if (a % 5 === 4) continue;
    const t = (a / 20) * Math.PI * 2;
    plot(
      g,
      Math.floor(cx + Math.cos(t) * r),
      Math.floor(cy + Math.sin(t) * r * 0.55),
      a % 2 === 0 ? 'U' : 'V',
    );
  }
}

/** A thorn-shard floating free: a slim dark spike, point up, lit left. */
function thorn(g: CharGrid, x: number, foot: number, tall: number, tip = '4'): void {
  for (let k = 0; k < tall; k++) {
    plot(g, x - 1, foot - k, k === tall - 1 ? '.' : '3');
    plot(g, x, foot - k, k === tall - 1 ? tip : '1');
  }
}

function mindspikeHead(facing: Facing, fire: boolean, kit: Kit = 't1'): string[] {
  const g = grid(W, H);
  cradle(g, kit === 't1' ? 4.5 : 5.5);
  const foot = CY - 4;
  const tall = kit === 't1' ? 21 : kit === 'dread' ? 24 : 26;
  const hw = kit === 'dread' ? 4.6 : kit === 't1' ? 3.4 : 3.8;
  if (kit === 'echo') {
    // Two smaller echoes of itself, each with its own eye.
    for (const side of [-1, 1]) {
      const ex = CX + side * 7;
      obelisk(g, ex, foot - 3, 14, 2.2);
      eye(g, Math.floor(ex) + (side < 0 ? 0 : 0), foot - 13, fire);
    }
  }
  obelisk(g, CX, foot, tall, hw);
  knots(g, CX, foot, tall);
  const tip = foot - tall + 1;
  // The eye, turned to the target: low on its right facing us, high on its right facing away.
  const ex = Math.floor(CX + hw * 0.5);
  const ey = facing === 'se' ? tip + 7 : tip + 4;
  if (kit === 'dread') {
    // The crown of thorns over a great open eye.
    for (const [dx, t] of [
      [-3, 5],
      [0, 7],
      [3, 5],
    ] as const) {
      thorn(g, CX + dx, tip + 2, t, 'd');
    }
    eye(g, ex - 1, ey + 1, fire, true);
  } else {
    eye(g, ex, ey, fire);
  }
  if (kit === 't2') {
    thorn(g, CX - 7, foot - 6, 8);
    thorn(g, CX + 8, foot - 4, 7);
  }
  if (kit === 'echo') {
    // A ring of violet knots round the chord.
    for (let a = 0; a < 8; a++) {
      const t = (a / 8) * Math.PI * 2 + 0.3;
      plot(g, Math.floor(CX + Math.cos(t) * 10), Math.floor(foot - 12 + Math.sin(t) * 5), 'V');
    }
  }
  if (fire) {
    ripple(g, ex, ey, kit === 'dread' ? 6 : 5);
    if (kit === 'echo') ripple(g, ex, ey, 9);
  }
  return rows(g);
}

/** Echo Spike's base: a small floating spike over each side corner, a violet knot under it. */
function echoKit(g: CharGrid, cx: number, cy: number): void {
  for (const side of [-1, 1]) {
    const x = cx + side * 11 + (side > 0 ? 1 : 0);
    for (let k = 0; k < 9; k++) {
      const y = cy - 5 - k;
      const w = k > 6 ? 0 : 1;
      for (let dx = -w - 1; dx <= w; dx++) plot(g, x + dx, y, dx < -w ? '4' : dx < 0 ? '3' : '1');
    }
    plot(g, x - 1, cy - 2, 'V');
    plot(g, x, cy - 2, 'U');
    plot(g, x - 1, cy - 9, 'V');
  }
}

/** Dread's base: jagged dark thorns jutting out of each side corner, ruby-tipped. */
function dreadKit(g: CharGrid, cx: number, cy: number): void {
  for (const side of [-1, 1]) {
    const x = cx + side * 10 + (side > 0 ? 1 : 0);
    for (const [ox, t, lean] of [
      [0, 11, 1],
      [side * 3, 7, 2],
      [-side * 2, 6, 0],
    ] as const) {
      for (let k = 0; k < t; k++) {
        const px = x + ox + side * Math.floor((k * lean) / 4);
        plot(g, px - 1, cy - 1 - k, k === t - 1 ? 'd' : '4');
        plot(g, px, cy - 1 - k, k === t - 1 ? 'c' : '2');
      }
    }
  }
}

// Psionic: violet (art-direction §7), outside the Aelari's own ramps.
const LEGEND = { V: 'violet.3', U: 'violet.4' } as const;

export const towerMindspike = defineSprite({
  id: 'tower.mindspike',
  size: { w: BASE_W, h: BASE_H },
  anchor: BASE_ANCHOR,
  mount: BASE_MOUNT,
  palette: 'aelari',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: LEGEND,
  frames: {
    t1: aelariBase(1),
    t2: aelariBase(2),
    t3: aelariBase(3),
    spec_a: aelariSpecBase(echoKit),
    spec_b: aelariSpecBase(dreadKit),
  },
});

export const towerMindspikeHead = defineSprite({
  id: 'tower.mindspike_head',
  size: { w: W, h: H },
  anchor: { x: CX, y: CY },
  palette: 'aelari',
  outline: 'auto',
  // The eye's white core glows when it fires (the `hi` slot), and the cradle's light.
  glow: { slots: ['hi', 'e0'], radius: 1 },
  legend: LEGEND,
  frames: {
    se: mindspikeHead('se', false),
    se_fire: mindspikeHead('se', true),
    ne: mindspikeHead('ne', false),
    ne_fire: mindspikeHead('ne', true),
    se_t2: mindspikeHead('se', false, 't2'),
    se_t2_fire: mindspikeHead('se', true, 't2'),
    ne_t2: mindspikeHead('ne', false, 't2'),
    ne_t2_fire: mindspikeHead('ne', true, 't2'),
    se_spec_a: mindspikeHead('se', false, 'echo'),
    se_spec_a_fire: mindspikeHead('se', true, 'echo'),
    ne_spec_a: mindspikeHead('ne', false, 'echo'),
    ne_spec_a_fire: mindspikeHead('ne', true, 'echo'),
    se_spec_b: mindspikeHead('se', false, 'dread'),
    se_spec_b_fire: mindspikeHead('se', true, 'dread'),
    ne_spec_b: mindspikeHead('ne', false, 'dread'),
    ne_spec_b_fire: mindspikeHead('ne', true, 'dread'),
  },
  anims: {
    fire_se: { frames: ['se_fire', 'se'], fps: 10, loop: false },
    fire_sw: { mirrorOf: 'fire_se' },
    fire_ne: { frames: ['ne_fire', 'ne'], fps: 10, loop: false },
    fire_nw: { mirrorOf: 'fire_ne' },
    fire_se_t2: { frames: ['se_t2_fire', 'se_t2'], fps: 10, loop: false },
    fire_sw_t2: { mirrorOf: 'fire_se_t2' },
    fire_ne_t2: { frames: ['ne_t2_fire', 'ne_t2'], fps: 10, loop: false },
    fire_nw_t2: { mirrorOf: 'fire_ne_t2' },
    fire_se_spec_a: { frames: ['se_spec_a_fire', 'se_spec_a'], fps: 10, loop: false },
    fire_sw_spec_a: { mirrorOf: 'fire_se_spec_a' },
    fire_ne_spec_a: { frames: ['ne_spec_a_fire', 'ne_spec_a'], fps: 10, loop: false },
    fire_nw_spec_a: { mirrorOf: 'fire_ne_spec_a' },
    // Dread's stare holds a beat longer.
    fire_se_spec_b: {
      frames: ['se_spec_b_fire', 'se_spec_b_fire', 'se_spec_b'],
      fps: 10,
      loop: false,
    },
    fire_sw_spec_b: { mirrorOf: 'fire_se_spec_b' },
    fire_ne_spec_b: {
      frames: ['ne_spec_b_fire', 'ne_spec_b_fire', 'ne_spec_b'],
      fps: 10,
      loop: false,
    },
    fire_nw_spec_b: { mirrorOf: 'fire_ne_spec_b' },
  },
});
