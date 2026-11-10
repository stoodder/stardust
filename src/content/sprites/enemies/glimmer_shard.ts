// Glimmer-shard (`glimmer_shard`, design/enemies.md § 6, the Sunderglass Penitent): one of the three
// cloaked pieces the Penitent's shield wall breaks into, which re-form its shield while any lives.
// Woven, never plated (art-direction §4), and broken: a small jagged kite of open sapphire weave
// torn from a larger lattice, its torn edge (the lower right) unravelling into loose thread-ends,
// a ruby thread still hanging from it, and a small light at its heart. It tumbles slowly as it
// floats two pixels over its shadow (4 frames at 3 fps: it tips one way, rights itself, tips the
// other), so it never reads as a whole Glimmer (an upright spindle with a crown and an eye). It
// never faces anyone: its NE frames are its SE ones from the back, the heart only a glow. Cloaked,
// render draws its baked `cloak` variant; Revealed, this body. Hurt, it frays (`fray1_`/`fray2_`).
import { defineSprite } from '../defineSprite.ts';
import { grid, line, plot, rows, type CharGrid } from '../helpers.ts';
import { frayLooks, hum, outlineOutside, rim, weave, type Mask } from './lattice.ts';

const W = 13;
const H = 17;
const CX = 6.5;
const CY = 7;

/** The shard's corners round its middle (pixel edges): a jagged, lopsided kite. */
const CORNERS: readonly (readonly [number, number])[] = [
  [0.4, -6],
  [3.4, -1.5],
  [2.2, 0.5],
  [3.6, 2.4],
  [-1.2, 5.6],
  [-4, -0.6],
];

/** Each tumble step's tilt (radians) and lift. */
const TUMBLE: readonly { tilt: number; lift: number }[] = [
  { tilt: -0.22, lift: 0 },
  { tilt: 0, lift: 1 },
  { tilt: 0.22, lift: 1 },
  { tilt: 0, lift: 0 },
];

/** Whether (px, py) lies inside the polygon `pts` (even-odd). */
function inPoly(px: number, py: number, pts: readonly (readonly [number, number])[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i];
    const b = pts[j];
    if (a === undefined || b === undefined) continue;
    if (a[1] > py !== b[1] > py && px < ((b[0] - a[0]) * (py - a[1])) / (b[1] - a[1]) + a[0]) {
      inside = !inside;
    }
  }
  return inside;
}

function shard(facing: 'se' | 'ne', step: number): string[] {
  const g: CharGrid = grid(W, H);
  const { tilt, lift } = TUMBLE[step] ?? { tilt: 0, lift: 0 };
  const cy = CY - lift;
  const pts = CORNERS.map(([x, y]) => {
    const c = Math.cos(tilt);
    const s = Math.sin(tilt);
    return [CX + x * c - y * s, cy + x * s + y * c] as const;
  });
  const mask: Mask = (x, y) => inPoly(x + 0.5, y + 0.5, pts);
  weave(g, mask, { mode: 'diag', spacing: 3, phase: step, rise: lift, lx: CX - 1, ly: cy - 1 }, 4);
  rim(g, mask, CX - 1, cy - 1);
  hum(g, mask, step, facing === 'se' ? 37 : 38);
  // The torn edge: the rim gone ragged at the lower right, two thread-ends hanging out of it.
  const tear = pts[3] ?? [CX, cy];
  const tx = Math.round(tear[0]);
  const ty = Math.round(tear[1]);
  plot(g, tx - 1, ty, '.');
  // Its heart: a small light (from behind, only the glow).
  const hx = Math.round(CX - 0.5);
  const hy = Math.round(cy);
  plot(g, hx, hy, facing === 'se' ? '*' : '+');
  plot(g, hx - 1, hy, '+');
  plot(g, hx + 1, hy, '+');
  plot(g, hx, hy - 1, '+');
  outlineOutside(g);
  // Loose threads from the tear, and the ruby thread it was knotted with, drawn bare.
  line(g, tx, ty, tx + 1, ty + 2, '2');
  plot(g, tx + 1, ty + 3, '1');
  line(g, tx - 2, ty + 2, tx - 2, ty + 4 + (step % 2), 'c');
  plot(g, tx - 2, ty + 5 + (step % 2), 'd');
  return rows(g);
}

const frames = {
  walk_se_0: shard('se', 0),
  walk_se_1: shard('se', 1),
  walk_se_2: shard('se', 2),
  walk_se_3: shard('se', 3),
  walk_ne_0: shard('ne', 0),
  walk_ne_1: shard('ne', 1),
  walk_ne_2: shard('ne', 2),
  walk_ne_3: shard('ne', 3),
};
const anims = {
  walk_se: { frames: ['walk_se_0', 'walk_se_1', 'walk_se_2', 'walk_se_3'], fps: 3 },
  walk_sw: { mirrorOf: 'walk_se' },
  walk_ne: { frames: ['walk_ne_0', 'walk_ne_1', 'walk_ne_2', 'walk_ne_3'], fps: 3 },
  walk_nw: { mirrorOf: 'walk_ne' },
};
const frayed = frayLooks(frames, anims, 41);

export const enemyGlimmerShard = defineSprite({
  id: 'enemy.glimmer_shard',
  size: { w: W, h: H },
  anchor: { x: 7, y: H - 1 },
  palette: 'aelari',
  // The outline is the weave's own (lattice.ts `outlineOutside`), so the gaps stay see-through.
  outline: 'none',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  frames: { ...frames, ...frayed.frames },
  anims: { ...anims, ...frayed.anims },
});
