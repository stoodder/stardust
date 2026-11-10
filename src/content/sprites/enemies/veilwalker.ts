// Veilwalker (`veilwalker`, design/enemies.md § 5.2): the Aelari's cloaked construct, A2M4's
// detection teach. Woven, never plated (art-direction §4): a slender sapphire spindle hidden under
// a long hooded veil of open emerald weave, the only Aelari draped in emerald, so it never reads as
// a Glimmer (a bare sapphire spindle) or a Weft Warden (a squared sapphire bell). A pointed hood
// over a shadowed face with two pinpoint knots of light for eyes, a ruby clasp at the throat, the
// veil falling past its heart and swept back behind it as it glides, its ragged hem rippling (the
// hum's beat). It hovers two pixels over its shadow (4 fps). From behind, only the veil and the
// glow of its heart. Cloaked, render draws its baked `cloak` variant (the checker dither in a
// dashed white outline, art-direction §8); Revealed, this body. Hurt, it frays (`fray1_`/`fray2_`).
import { defineSprite } from '../defineSprite.ts';
import { grid, hash01, plot, rows, stamp, type CharGrid } from '../helpers.ts';
import { frayLooks, hum, outlineOutside, rim, weave, type Mask } from './lattice.ts';

const W = 15;
const H = 26;
const CX = 7.5;
const TOP = 1;
/** Where the hood meets the shoulders, and the hem (rows, before the bob). */
const SHOULDER = 8;
const HEM = 20;

/**
 * The veil's extent at row y (bob `b` lifts it): a pointed hood, the drape over the shoulders, then
 * falling wider to the hem and swept back (facing SE, the train streams out to the left, behind
 * it). Returns the left and right edges (pixel edges), or null above the hood or under the hem.
 */
function veil(y: number, b: number): { l: number; r: number } | null {
  const yy = y + 0.5 + b;
  if (yy < TOP || yy > HEM) return null;
  if (yy < 6) {
    const hw = 0.6 + 2.5 * Math.sqrt((yy - TOP) / (6 - TOP));
    return { l: CX + 0.4 - hw, r: CX + 0.4 + hw };
  }
  if (yy < SHOULDER + 1) {
    const hw = 3.1 + ((yy - 6) / (SHOULDER + 1 - 6)) * 1.2;
    return { l: CX + 0.4 - hw, r: CX + 0.4 + hw };
  }
  const t = (yy - SHOULDER - 1) / (HEM - SHOULDER - 1);
  return { l: CX + 0.4 - 4.3 - 2.6 * t, r: CX + 0.4 + 4.3 - 0.4 * t };
}

function veilwalker(facing: 'se' | 'ne', beat: 0 | 1): string[] {
  const g: CharGrid = grid(W, H);
  const b = beat;
  const hemRow = HEM - b;
  /** How far each column of the ragged hem hangs below it (0–2 rows), rippling each beat. */
  const hang = (x: number): number => Math.floor(hash01(x + beat * 2, 3, 71) * 3);
  const mask: Mask = (x, y) => {
    if (y >= hemRow) {
      const v = veil(hemRow - 1, b);
      return v !== null && x + 0.5 >= v.l && x + 0.5 <= v.r && y < hemRow + hang(x);
    }
    const v = veil(y, b);
    return v !== null && x + 0.5 >= v.l && x + 0.5 <= v.r;
  };
  const front = facing === 'se';
  weave(g, mask, { mode: 'diag', spacing: 3, phase: 1, rise: b, lx: CX, ly: 11 - b, ramp: 's' }, 7);
  rim(g, mask, CX, 9 - b, 's');
  // The spindle under the veil: a sapphire seam down its middle, lit at the heart.
  for (let y = SHOULDER + 1; y < HEM - 2; y++) plot(g, 7, y - b, y % 2 === 0 ? '3' : '2');
  hum(g, mask, beat, front ? 13 : 14);
  const top = TOP - b;
  if (front) {
    // The hood's shadowed face (the `eye` slot, blue.0) and two pinpoint eyes of light.
    stamp(g, 6, top + 2, ['.kk.', 'kkkk', 'kkkk', '.kk.']);
    plot(g, 6, top + 3, '*');
    plot(g, 8, top + 3, '*');
  } else {
    // From behind, the hood's crown seam.
    stamp(g, 7, top + 2, ['8', '7', '8']);
  }
  // The ruby clasp at the throat, and the hood's ruby point.
  stamp(g, 7, top + 7, ['cdc']);
  plot(g, 7, top, 'd');
  // The heart, dimmed by the veil (no white core from behind).
  stamp(g, 6, 11 - b, front ? ['.+.', '+*+', '.+.'] : ['.+.', '+.+', '.+.']);
  outlineOutside(g);
  return rows(g);
}

const frames = {
  walk_se_0: veilwalker('se', 0),
  walk_se_1: veilwalker('se', 1),
  walk_ne_0: veilwalker('ne', 0),
  walk_ne_1: veilwalker('ne', 1),
};
const anims = {
  walk_se: { frames: ['walk_se_0', 'walk_se_1'], fps: 4 },
  walk_sw: { mirrorOf: 'walk_se' },
  walk_ne: { frames: ['walk_ne_0', 'walk_ne_1'], fps: 4 },
  walk_nw: { mirrorOf: 'walk_ne' },
};
const frayed = frayLooks(frames, anims, 17);

export const enemyVeilwalker = defineSprite({
  id: 'enemy.veilwalker',
  size: { w: W, h: H },
  anchor: { x: 8, y: H - 1 },
  palette: 'aelari',
  // The outline is the weave's own (lattice.ts `outlineOutside`), so the gaps stay see-through.
  outline: 'none',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  frames: { ...frames, ...frayed.frames },
  anims: { ...anims, ...frayed.anims },
});
