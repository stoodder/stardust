// Rift Moth (`riftmoth`, design/enemies.md § 5.4): A2M6's Hollow flyer, which phases out of reach
// for 1.5 s every 5 s. The Hollow's grammar (art-direction §4): a moth drawn wrong. A dark,
// segmented body with a cold violet speck of unsung stardust at its heart, a head crowded with
// acid pinprick eyes, two antennae kinked the wrong ways, and four ragged drained-grey wings veined
// darker, whose eyespots are real eyes (acid in dark rings: two on one forewing, three on the
// other, never a pair); a pale (inverted) outline; 1–3 pixels missing from every frame. Its wings
// beat out of step with each other, the right a quarter-beat behind the left, so its flight looks
// wrong; wide and ragged where the Lightwing is a woven glider, and dark where the Puffwing is a
// fluffy ball, so the three flyers never read alike. Render draws it 12 px up over its shadow.
// - `walk_<facing>` (4 frames, 8 fps): the beat (up, level, down, level), each wing on its own.
// - `phase_<facing>` (2 frames, 6 fps; T503's phasing, art-direction §8 `phasing`): slipping into
//   a rift, its wings folded up edge-on into one tall blade over its body and split down the
//   middle by a violet seam, its eyes shut. Render can draw it while the Moth is Phased (in the
//   baked `cloak` dither, at the Phased alpha; phaseLook.ts), so its shape says "not here" too.
// - `heavy_<facing>` (§8 `heavy`) and `tell_<facing>` (the hush reach, held), as every Hollow unit.
import { defineSprite } from '../defineSprite.ts';
import { grid, hash01, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';
import { dropPixels, heavyDress, reach } from './hollow.ts';
import { MOTE_LEGEND } from './mote.ts';

const W = 25;
const H = 19;
const CX = 12.5;
const CY = 9.5;

type Look = 'walk' | 'heavy' | 'tell';
type Facing = 'se' | 'ne';

/** The beat: each stroke's wingtip height (rows from the body's middle) and the body's lift. */
const STROKES: readonly { tip: number; lift: number }[] = [
  { tip: -6, lift: 1 },
  { tip: -1, lift: 0 },
  { tip: 4, lift: -1 },
  { tip: -1, lift: 0 },
];

type Pt = readonly [number, number];

/** Whether (px, py) lies inside triangle (a, b, c). */
function inTri(px: number, py: number, a: Pt, b: Pt, c: Pt): boolean {
  const s = (p: Pt, q: Pt): number => (px - q[0]) * (p[1] - q[1]) - (p[0] - q[0]) * (py - q[1]);
  const d1 = s(a, b);
  const d2 = s(b, c);
  const d3 = s(c, a);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}

/**
 * One side's two wings (side −1 left, 1 right) at stroke `tip`: a broad forewing from the shoulder
 * out to a point, a smaller hindwing below it, ragged at the edges, veined dark, lit on top.
 */
function wings(g: CharGrid, side: -1 | 1, tip: number, cy: number, dark: boolean): void {
  const root = CX + side * 0.4;
  const tipX = CX + side * 11.8;
  const fore: [Pt, Pt, Pt] = [
    [root, cy - 3.5],
    [root, cy + 1.5],
    [tipX, cy + tip - 4],
  ];
  // The trailing edge rises from the shoulder to the tip, so a notch opens under it.
  const foreBack: [Pt, Pt, Pt] = [
    [root, cy + 1.5],
    [tipX, cy + tip - 4],
    [CX + side * 6, cy + tip / 3 + 0.5],
  ];
  const inFore = (px: number, py: number): boolean =>
    inTri(px, py, ...fore) || inTri(px, py, ...foreBack);
  // The hindwing: a small rounded lobe under the shoulder, swinging a quarter as far, with a gap
  // between the two lobes where the abdomen hangs.
  const hx = CX + side * 3.2;
  const hy = cy + 4 + tip / 4;
  const inHind = (px: number, py: number): boolean =>
    Math.hypot((px - hx) / 2.6, (py - hy) / 2.1) <= 1 && (px - CX) * side > 1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const f = inFore(px, py);
      const hw = inHind(px, py);
      if (!f && !hw) continue;
      // Ragged: a few edge pixels bitten out, the same ones every frame (by place on the wing).
      const edge = f
        ? !inFore(px + side, py) || !inFore(px, py + 1)
        : !inHind(px + side, py) || !inHind(px, py + 1);
      const along = Math.round(Math.abs(px - CX));
      if (edge && !(f && hw) && hash01(along, side + 3 + (f ? 0 : 5), 83) < 0.3) continue;
      // Lit along the forewing's leading edge (its top), drained below; the hindwing darker.
      const lead = f && !inFore(px, py - 1);
      let ch = lead ? '3' : f ? '2' : '1';
      if (dark) ch = String(Math.max(0, Number(ch) - 1));
      plot(g, x, y, ch);
    }
  }
  // Two dark veins from the shoulder out along the forewing.
  const sx = Math.round(CX + side * 1.5);
  line(g, sx, Math.round(cy - 1), Math.round(CX + side * 10), Math.round(cy + tip - 3.5), '0');
  line(g, sx, Math.round(cy + 1), Math.round(CX + side * 7.5), Math.round(cy + tip / 2 + 1), '0');
}

/** An eyespot: an acid eye in a dark ring. */
const EYESPOT = ['.0.', '0*0', '.0.'] as const;

function moth(facing: Facing, step: number, look: Look): string[] {
  const g: CharGrid = grid(W, H);
  const heavy = look === 'heavy';
  const tell = look === 'tell';
  const left = STROKES[step] ?? STROKES[1];
  const right = STROKES[(step + 3) % 4] ?? STROKES[1];
  const lift = left?.lift ?? 0;
  const cy = CY - lift;
  wings(g, -1, left?.tip ?? 0, cy, heavy);
  wings(g, 1, right?.tip ?? 0, cy, heavy);
  // The eyespots: two on the left forewing, three on the right (never a pair).
  const lt = left?.tip ?? 0;
  const rt = right?.tip ?? 0;
  stamp(g, Math.round(CX - 7.5), Math.round(cy + lt / 2 - 2), EYESPOT);
  plot(g, Math.round(CX - 4), Math.round(cy + lt / 4), '+');
  stamp(g, Math.round(CX + 5), Math.round(cy + rt / 2 - 2), EYESPOT);
  plot(g, Math.round(CX + 9), Math.round(cy + rt - 1), '+');
  if (step !== 2) plot(g, Math.round(CX + 3), Math.round(cy + 2), '+');
  // The body: a dark segmented abdomen, the violet speck at its heart.
  const bodyH = heavy ? 7 : 6;
  for (let y = Math.round(cy - 3); y <= Math.round(cy + bodyH); y++) {
    const wide = y < cy + bodyH - 1 ? (heavy ? 2 : 1) : 0;
    for (let x = 12 - wide; x <= 12 + wide; x++) plot(g, x, y, y % 2 === 0 ? '0' : '1');
  }
  plot(g, 12, Math.round(cy), (step % 2 === 0) !== heavy ? 'V' : 'U');
  // The head, and the antennae kinked the wrong ways.
  const hy = Math.round(cy - 5);
  stamp(g, 11, hy, ['.1.', '121', '.1.']);
  line(g, 11, hy, 9, hy - 2, '2');
  line(g, 9, hy - 2, 10, hy - 4, '2');
  line(g, 13, hy, 15, hy - 3, '2');
  plot(g, 14, hy - 4, '3');
  if (facing === 'se') {
    // Too many eyes, crowded on the head.
    plot(g, 12, hy, '*');
    plot(g, 11, hy + 1, '+');
    plot(g, 13, hy + 1, '+');
  } else {
    // From behind it looks at you anyway: one eye on the back of its head.
    plot(g, 12, hy + 1, '*');
  }
  if (tell) {
    // Limbs it never had dangle down and reach ahead for the living.
    reach(g, 13, Math.round(cy + 3), W - 1, facing === 'se' ? H - 4 : H - 6);
  }
  if (heavy) heavyDress(g, 10, Math.round(cy) - 1, 4, Math.round(cy) + 3, step);
  return dropPixels(rows(g), (facing === 'se' ? 70 : 80) + step + (heavy ? 5 : tell ? 9 : 0));
}

/** Slipping into a rift: the wings folded up edge-on into one tall blade, split by a violet seam. */
function phased(facing: Facing, beat: 0 | 1): string[] {
  const g: CharGrid = grid(W, H);
  const cx = 12;
  // The blade: the folded wings, tall and thin over the body, narrowing to a point at the top.
  for (let y = 0; y < H - 2; y++) {
    const t = y / (H - 3);
    const hw = Math.round(0.5 + 2.6 * Math.sin(Math.PI * Math.min(1, t * 1.1)));
    for (let x = cx - hw; x <= cx + hw; x++) {
      const outer = x === cx - hw || x === cx + hw;
      plot(g, x, y, outer ? (x < cx ? '3' : '1') : x < cx ? '2' : '1');
    }
  }
  // The rift: a violet seam down the middle, twinkling as it goes.
  for (let y = 1 + beat; y < H - 3; y++) plot(g, cx, y, (y + beat) % 3 === 0 ? 'U' : 'V');
  // Its eyes shut: pale slits where the eyespots were, one fewer than it should have.
  plot(g, cx - 2, 7, 'w');
  plot(g, cx + 2, 9 + beat, 'w');
  plot(g, cx - 2, 11, 'w');
  // The antennae, still kinked, over the blade's tip.
  line(g, cx - 1, 1, cx - 3, 0, '2');
  if (facing === 'se') plot(g, cx + 1, 2, '+');
  return dropPixels(rows(g), (facing === 'se' ? 90 : 95) + beat);
}

const frames = {
  walk_se_0: moth('se', 0, 'walk'),
  walk_se_1: moth('se', 1, 'walk'),
  walk_se_2: moth('se', 2, 'walk'),
  walk_se_3: moth('se', 3, 'walk'),
  walk_ne_0: moth('ne', 0, 'walk'),
  walk_ne_1: moth('ne', 1, 'walk'),
  walk_ne_2: moth('ne', 2, 'walk'),
  walk_ne_3: moth('ne', 3, 'walk'),
  heavy_se_0: moth('se', 0, 'heavy'),
  heavy_se_1: moth('se', 1, 'heavy'),
  heavy_se_2: moth('se', 2, 'heavy'),
  heavy_se_3: moth('se', 3, 'heavy'),
  heavy_ne_0: moth('ne', 0, 'heavy'),
  heavy_ne_1: moth('ne', 1, 'heavy'),
  heavy_ne_2: moth('ne', 2, 'heavy'),
  heavy_ne_3: moth('ne', 3, 'heavy'),
  tell_se_0: moth('se', 1, 'tell'),
  tell_ne_0: moth('ne', 1, 'tell'),
  phase_se_0: phased('se', 0),
  phase_se_1: phased('se', 1),
  phase_ne_0: phased('ne', 0),
  phase_ne_1: phased('ne', 1),
};

const beat = (f: string): string[] => [0, 1, 2, 3].map((i) => `${f}_${i}`);

export const enemyRiftmoth = defineSprite({
  id: 'enemy.riftmoth',
  size: { w: W, h: H },
  anchor: { x: 13, y: H - 1 },
  palette: 'hollow',
  outline: 'auto',
  legend: MOTE_LEGEND,
  frames,
  anims: {
    walk_se: { frames: beat('walk_se'), fps: 8 },
    walk_sw: { mirrorOf: 'walk_se' },
    walk_ne: { frames: beat('walk_ne'), fps: 8 },
    walk_nw: { mirrorOf: 'walk_ne' },
    heavy_se: { frames: beat('heavy_se'), fps: 9 },
    heavy_sw: { mirrorOf: 'heavy_se' },
    heavy_ne: { frames: beat('heavy_ne'), fps: 9 },
    heavy_nw: { mirrorOf: 'heavy_ne' },
    tell_se: { frames: ['tell_se_0'], fps: 1 },
    tell_sw: { mirrorOf: 'tell_se' },
    tell_ne: { frames: ['tell_ne_0'], fps: 1 },
    tell_nw: { mirrorOf: 'tell_ne' },
    phase_se: { frames: ['phase_se_0', 'phase_se_1'], fps: 6 },
    phase_sw: { mirrorOf: 'phase_se' },
    phase_ne: { frames: ['phase_ne_0', 'phase_ne_1'], fps: 6 },
    phase_nw: { mirrorOf: 'phase_ne' },
  },
});
