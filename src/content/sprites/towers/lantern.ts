// Seer's Lantern (`lantern`, design/towers.md § Aelari towers): detection and the Mark, attuned in
// Xenotech. On the floating Aelari dais (towers/aelariBase.ts) a woven lantern hangs in the air over
// an emerald cradle: a cage of sapphire threads shaped like a seed (pointed top and bottom), an
// emerald hoop at its crown, a ruby tassel hanging below, and inside it the seer's eye, a white
// light in a teal ring that sees what hides (it answers the Cloaked tell, art-direction §8). It
// doesn't aim: its idle `glow` turns the cage slowly (the strands step round a pixel a frame, the
// Aelari's slow rotation, towers.md §8) while the light breathes and the lantern bobs a pixel
// (4 frames, 3 fps); render draws its light-beam (BeamView). Tiers read on the base. The specs:
// **All-Seeing** (`spec_a`, marks everything in reach) opens the cage round a bigger eye and wears a
// halo of four small eye-knots circling it, over a base with a small lantern hung on a thread arch
// at each corner; **Truthlight** (`spec_b`, one target can't hide) stretches the lantern long and
// narrow into a lens-tipped prism, the light a hard white slit, over a base with a tall white-tipped
// lens post at each corner. Each spec turns at its own pace.
import { defineSprite } from '../defineSprite.ts';
import { grid, plot, rows, type CharGrid } from '../helpers.ts';
import { BASE_ANCHOR, BASE_H, BASE_MOUNT, BASE_W } from './base.ts';
import { aelariBase, aelariSpecBase } from './aelariBase.ts';

const W = 26;
const H = 34;
const CX = 13;
const CY = 31;

type Kit = 't1' | 'allSeeing' | 'truthlight';

/** The cradle: a woven emerald ring the lantern hangs over. */
function cradle(g: CharGrid): void {
  for (let a = 0; a < 28; a++) {
    const t = (a / 28) * Math.PI * 2;
    const x = Math.floor(CX + Math.cos(t) * 4.5);
    const y = Math.floor(CY - 2 + Math.sin(t) * 1.9);
    plot(g, x, y, Math.sin(t) < 0 ? '7' : x < CX ? '9' : '8');
  }
}

function lanternHead(beat: number, kit: Kit): string[] {
  const g = grid(W, H);
  cradle(g);
  const bob = beat === 1 || beat === 2 ? 1 : 0;
  const tall = kit === 'truthlight' ? 18 : kit === 'allSeeing' ? 14 : 13;
  const half = kit === 'truthlight' ? 3.6 : kit === 'allSeeing' ? 5.6 : 4.6;
  const bottom = CY - 5 - bob;
  const top = bottom - tall;
  const mid = (top + bottom) / 2;
  const eyeY = Math.round(mid);
  /** The cage's half-width at row y: a seed, pointed at both ends. */
  const hwAt = (y: number): number => half * Math.sin(((y + 0.5 - top) / (tall + 1)) * Math.PI);
  // The cage: strands that run top to bottom round the seed, stepping round as it turns. A strand
  // at angle a shows at x = cx + sin(a)·hw, lit on the near side and dim on the far.
  const strands = kit === 'allSeeing' ? 5 : 6;
  for (let s = 0; s < strands; s++) {
    const a = ((s + beat / 4) / strands) * Math.PI * 2;
    const near = Math.cos(a) > 0;
    for (let y = top + 1; y < bottom; y++) {
      const x = Math.floor(CX + Math.sin(a) * hwAt(y));
      // All-Seeing's cage stands open: its strands stop short of the middle.
      if (kit === 'allSeeing' && Math.abs(y - mid) < 3 && near) continue;
      plot(g, x, y, near ? (Math.sin(a) < 0 ? '4' : '3') : '1');
    }
  }
  // The outer rim of the cage, lit left.
  for (let y = top + 1; y < bottom; y++) {
    const w = hwAt(y);
    plot(g, Math.floor(CX - w), y, '4');
    plot(g, Math.ceil(CX + w) - 1, y, '2');
  }
  // The light inside, breathing: a white eye in a teal ring (Truthlight's a hard white slit).
  const big = beat % 2 === 0;
  if (kit === 'truthlight') {
    for (let y = eyeY - 4; y <= eyeY + 4; y++)
      plot(g, CX - 1, y, Math.abs(y - eyeY) < 3 ? '*' : '+');
    plot(g, CX, eyeY, '+');
    plot(g, CX - 2, eyeY, '+');
    // The lens at its tip, down toward the road.
    plot(g, CX - 1, bottom + 1, '*');
    plot(g, CX - 1, bottom + 2, '9');
  } else {
    const r = kit === 'allSeeing' ? (big ? 2.6 : 2.1) : big ? 2.1 : 1.6;
    for (let y = eyeY - 3; y <= eyeY + 3; y++) {
      for (let x = CX - 4; x <= CX + 3; x++) {
        const d = Math.hypot(x + 0.5 - CX, y + 0.5 - (eyeY + 0.5));
        if (d <= r) plot(g, x, y, d < r - 1.1 ? '*' : '+');
      }
    }
  }
  // The emerald hoop at its crown and the ruby tassel below.
  plot(g, CX - 1, top, '9');
  plot(g, CX, top, '8');
  plot(g, CX - 1, top - 1, '8');
  plot(g, CX, top - 1, '7');
  if (kit !== 'truthlight') {
    plot(g, CX - 1, bottom, 'd');
    plot(g, CX - 1, bottom + 1, 'c');
    plot(g, CX - 1 + (beat === 3 ? 1 : 0), bottom + 2, 'b');
  }
  if (kit === 'allSeeing') {
    // The halo: four small eye-knots circling it, a quarter turn every four frames.
    for (let k = 0; k < 4; k++) {
      const a = ((k + beat / 4) / 4) * Math.PI * 2;
      const x = Math.floor(CX + Math.cos(a) * 9);
      const y = Math.floor(mid + Math.sin(a) * 4);
      plot(g, x, y, '*');
      plot(g, x - 1, y, '9');
    }
  }
  return rows(g);
}

/** All-Seeing's base: a small lantern hung on a thread arch over each side corner. */
function allSeeingKit(g: CharGrid, cx: number, cy: number): void {
  for (const side of [-1, 1]) {
    const x = cx + side * 11 + (side > 0 ? 1 : 0);
    for (let y = cy - 14; y <= cy - 2; y++) plot(g, x, y, '7');
    plot(g, x - side, cy - 15, '8');
    plot(g, x - 2 * side, cy - 15, '8');
    plot(g, x - 3 * side, cy - 14, '7');
    // The little lantern on the arch's end: a lit cage round a white light.
    const lx = x - 3 * side;
    for (const [dx, dy, c] of [
      [0, -12, '4'],
      [-1, -11, '4'],
      [0, -11, '*'],
      [1, -11, '2'],
      [-1, -10, '3'],
      [0, -10, '+'],
      [1, -10, '2'],
      [0, -9, '3'],
      [0, -8, 'd'],
    ] as const) {
      plot(g, lx + dx, cy + dy, c);
    }
  }
}

/** Truthlight's base: a tall lens post at each side corner, its tip white. */
function truthlightKit(g: CharGrid, cx: number, cy: number): void {
  for (const side of [-1, 1]) {
    const x = cx + side * 11 + (side > 0 ? 1 : 0);
    for (let y = cy - 15; y <= cy - 1; y++) {
      plot(g, x - 1, y, y < cy - 12 ? '9' : '4');
      plot(g, x, y, y < cy - 12 ? '8' : '2');
    }
    plot(g, x - 1, cy - 16, '*');
    plot(g, x, cy - 16, '*');
    plot(g, x - 1, cy - 17, '+');
    plot(g, x - 2, cy - 7, 'd');
    plot(g, x + 1, cy - 7, 'c');
  }
}

export const towerLantern = defineSprite({
  id: 'tower.lantern',
  size: { w: BASE_W, h: BASE_H },
  anchor: BASE_ANCHOR,
  mount: BASE_MOUNT,
  palette: 'aelari',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  frames: {
    t1: aelariBase(1),
    t2: aelariBase(2),
    t3: aelariBase(3),
    spec_a: aelariSpecBase(allSeeingKit),
    spec_b: aelariSpecBase(truthlightKit),
  },
});

const GLOW = [0, 1, 2, 3] as const;

export const towerLanternHead = defineSprite({
  id: 'tower.lantern_head',
  size: { w: W, h: H },
  anchor: { x: CX, y: CY },
  palette: 'aelari',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  frames: Object.fromEntries([
    ...GLOW.map((k) => [`glow_${k}`, lanternHead(k, 't1')]),
    ...GLOW.map((k) => [`glow_spec_a_${k}`, lanternHead(k, 'allSeeing')]),
    ...GLOW.map((k) => [`glow_spec_b_${k}`, lanternHead(k, 'truthlight')]),
  ]),
  anims: {
    // The first anim is the tier 1–3 idle (render's `headStyle`).
    glow: { frames: GLOW.map((k) => `glow_${k}`), fps: 3 },
    glow_spec_a: { frames: GLOW.map((k) => `glow_spec_a_${k}`), fps: 3 },
    // Truthlight turns slower and steadier: it holds one target.
    glow_spec_b: { frames: GLOW.map((k) => `glow_spec_b_${k}`), fps: 2 },
  },
});
