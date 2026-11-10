// Lightwing (`lightwing`, design/enemies.md § 5.2): a flying, shielded Aelari construct, a woven
// glider. A small sapphire spindle with a ruby crown and a knot of light (the Glimmer's body, in
// small), slung between two long swept wings of open emerald weave with sapphire rim threads, two
// tail threads trailing. Its silhouette is wide and pointed where the Puffwing's is round and
// fluffy, so the two flyers never read alike. Render draws it 12 px up over a shadow; the sprite
// only beats its wings (up, level, down, level; 6 fps) while the threads hum.
// Hurt, it frays (`fray1_`/`fray2_<facing>`, T501d; lattice.ts `frayLooks`).
import { defineSprite } from '../defineSprite.ts';
import { grid, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';
import { frayLooks, hum, outlineOutside, rim, weave, type Mask } from './lattice.ts';

const W = 27;
const H = 19;
const CX = 13.5;
const CY = 9;

/** The wing stroke: 0 up, 1 level, 2 down (the anim plays 0 1 2 1). */
type Stroke = 0 | 1 | 2;

/** Each stroke's wingtip height (rows from the body's centre) and the body's lift against it. */
const STROKES: Readonly<Record<Stroke, { tip: number; lift: number }>> = {
  0: { tip: -6, lift: 1 },
  1: { tip: 0, lift: 0 },
  2: { tip: 5, lift: -1 },
};

/** Whether (px, py) lies inside triangle (a, b, c). */
function inTri(
  px: number,
  py: number,
  a: readonly [number, number],
  b: readonly [number, number],
  c: readonly [number, number],
): boolean {
  const s = (p: readonly [number, number], q: readonly [number, number]): number =>
    (px - q[0]) * (p[1] - q[1]) - (p[0] - q[0]) * (py - q[1]);
  const d1 = s(a, b);
  const d2 = s(b, c);
  const d3 = s(c, a);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}

function lightwing(facing: 'se' | 'ne', stroke: Stroke): string[] {
  const g: CharGrid = grid(W, H);
  const { tip, lift } = STROKES[stroke];
  const cy = CY - lift;
  // The wings: a swept triangle each side, root at the body's shoulder, tip out and back.
  const wing = (side: -1 | 1): Mask => {
    const root = CX + side * 1.5;
    const a = [root, cy - 3] as const;
    const b = [root, cy + 3] as const;
    const c = [CX + side * 12.5, cy + tip - 1] as const;
    // The trailing edge sweeps back from the tip to a point behind the root.
    const d = [CX + side * 6.5, cy + 3 + Math.round(tip / 2)] as const;
    return (x, y) => inTri(x + 0.5, y + 0.5, a, b, c) || inTri(x + 0.5, y + 0.5, b, c, d);
  };
  for (const side of [-1, 1] as const) {
    const m = wing(side);
    weave(
      g,
      m,
      { mode: 'diag', spacing: 3, phase: side < 0 ? 1 : 0, lx: CX, ly: cy, ramp: 's' },
      9,
    );
    rim(g, m, CX, cy - 2);
  }
  // The body: a little spindle over the wing roots.
  const body: Mask = (x, y) => {
    const t = (y + 0.5 - (cy - 4)) / 9;
    if (t < 0 || t > 1) return false;
    const hw = t < 0.4 ? 2.6 * Math.sqrt(t / 0.4) : 2.6 * (1 - (t - 0.4) / 0.6);
    return Math.abs(x + 0.5 - CX) <= hw + 0.2;
  };
  const h = g.length;
  for (let y = 0; y < h; y++) for (let x = 0; x < W; x++) if (body(x, y)) plot(g, x, y, '.');
  weave(g, body, { mode: 'diag', spacing: 3, lx: CX, ly: cy, rise: lift }, 4);
  rim(g, body, CX, cy - 1);
  hum(g, wing(1), stroke === 1 ? 1 : 0, 7);
  const top = Math.round(cy - 4);
  plot(g, 13, top, 'd');
  // Its light: a white heart; facing you, a knot of light for an eye too.
  stamp(g, 13, Math.round(cy), facing === 'se' ? ['*'] : ['+']);
  if (facing === 'se') plot(g, 14, top + 2, 'w');
  // Two tail threads trailing behind and below.
  line(g, 13, top + 9, 11, top + 12, '3');
  line(g, 14, top + 9, 16, top + 12, '3');
  plot(g, 10, top + 12, 'd');
  plot(g, 17, top + 12, 'd');
  outlineOutside(g);
  return rows(g);
}

const frames = {
  walk_se_0: lightwing('se', 0),
  walk_se_1: lightwing('se', 1),
  walk_se_2: lightwing('se', 2),
  walk_ne_0: lightwing('ne', 0),
  walk_ne_1: lightwing('ne', 1),
  walk_ne_2: lightwing('ne', 2),
};
const anims = {
  walk_se: { frames: ['walk_se_0', 'walk_se_1', 'walk_se_2', 'walk_se_1'], fps: 6 },
  walk_sw: { mirrorOf: 'walk_se' },
  walk_ne: { frames: ['walk_ne_0', 'walk_ne_1', 'walk_ne_2', 'walk_ne_1'], fps: 6 },
  walk_nw: { mirrorOf: 'walk_ne' },
};
/** Its fray when hurt (T501d; `fray1_`/`fray2_<facing>`, lattice.ts `frayLooks`). */
const frayed = frayLooks(frames, anims, 7);

export const enemyLightwing = defineSprite({
  id: 'enemy.lightwing',
  size: { w: W, h: H },
  anchor: { x: 14, y: 18 },
  palette: 'aelari',
  // The outline is the weave's own (lattice.ts `outlineOutside`), so the gaps stay see-through.
  outline: 'none',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  frames: { ...frames, ...frayed.frames },
  anims: { ...anims, ...frayed.anims },
});
