// Glimmer (`glimmer`, design/enemies.md § 5.2): the Aelari line unit, a small lumenglass construct
// that glides in formation. A tall woven spindle (art-direction §4: woven, never plated; tall and
// near-symmetric): an open diagonal weave of sapphire thread inside a rim thread, gaps the ground
// shows through, a ruby knot at its crown, a knot of light for an eye, and its inner light at the
// heart. It hovers two pixels over its shadow and never walks: its `walk` is a glide, a 1 px bob
// and the threads' hum (a few strands slide a pixel on alternate frames, 4 fps). Seen from behind
// it shows no eye and a dimmer heart. Its shield bubble (render) sizes itself from this frame.
// Hurt, it frays (`fray1_`/`fray2_<facing>`, T501d): loose thread-ends hang from its edges.
import { defineSprite } from '../defineSprite.ts';
import { grid, plot, rows, stamp, type CharGrid } from '../helpers.ts';
import { frayLooks, hum, outlineOutside, rim, weave, type Mask } from './lattice.ts';

const W = 13;
const H = 19;
const CX = 6.5;
/** The spindle's top and bottom points (rows), before the bob. */
const TOP = 1;
const BOTTOM = 15;

/** Half-width of the spindle at row y (bob `b` lifts it): widest a third of the way down. */
function halfWidth(y: number, b: number): number {
  const t = (y + 0.5 - (TOP - b)) / (BOTTOM - TOP);
  if (t < 0 || t > 1) return -1;
  return t < 0.35 ? 4.6 * Math.sqrt(t / 0.35) : 4.6 * (1 - Math.pow((t - 0.35) / 0.65, 1.4));
}

function glimmer(facing: 'se' | 'ne', beat: 0 | 1): string[] {
  const g: CharGrid = grid(W, H);
  const b = beat; // the bob: up a pixel on the off beat, the weave riding with it
  const mask: Mask = (x, y) => {
    const hw = halfWidth(y, b);
    return hw >= 0 && Math.abs(x + 0.5 - CX) <= hw + 0.25;
  };
  const front = facing === 'se';
  weave(g, mask, { mode: 'diag', spacing: 4, phase: 2, rise: b, lx: CX, ly: 8 - b }, 6);
  rim(g, mask, CX, 7 - b);
  hum(g, mask, beat, front ? 3 : 4);
  const top = TOP - b;
  // The ruby knot at the crown, and a ruby thread down the brow.
  stamp(g, 6, top, ['d']);
  plot(g, 6, top + 1, 'c');
  // The inner light: a white-hot heart in teal; from behind, only its glow shows through.
  stamp(g, 5, top + 7, front ? ['.+.', '+*+', '.+.'] : ['.+.', '+.+', '.+.']);
  // A knot of light for an eye, leaning the way it glides.
  if (front) stamp(g, 8, top + 4, ['*', '4']);
  outlineOutside(g);
  return rows(g);
}

const frames = {
  walk_se_0: glimmer('se', 0),
  walk_se_1: glimmer('se', 1),
  walk_ne_0: glimmer('ne', 0),
  walk_ne_1: glimmer('ne', 1),
};
const anims = {
  walk_se: { frames: ['walk_se_0', 'walk_se_1'], fps: 4 },
  walk_sw: { mirrorOf: 'walk_se' },
  walk_ne: { frames: ['walk_ne_0', 'walk_ne_1'], fps: 4 },
  walk_nw: { mirrorOf: 'walk_ne' },
};
/** Its fray when hurt (T501d; `fray1_`/`fray2_<facing>`, lattice.ts `frayLooks`). */
const frayed = frayLooks(frames, anims, 3);

export const enemyGlimmer = defineSprite({
  id: 'enemy.glimmer',
  size: { w: W, h: H },
  anchor: { x: 7, y: 18 },
  palette: 'aelari',
  // The outline is the weave's own (lattice.ts `outlineOutside`), so the gaps stay see-through.
  outline: 'none',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  frames: { ...frames, ...frayed.frames },
  anims: { ...anims, ...frayed.anims },
});
