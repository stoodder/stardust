// Aegis Cantor (`cantor`, design/enemies.md § 5.2): the Aelari's singer, A2M5's shield-aura teach
// ("kill it first"): while it lives, its kin within 2 tiles regain shield, continuously (render
// rings it in a steady dashed `blue.4` circle, ShieldAuraView). Woven, never plated (art-direction
// §4), and built like an instrument, since an Aelari voice is a chord: a living lyre. Two curved
// sapphire horns rise from a woven soundbox and curl outward at their tips, joined by a yoke with
// ruby knots where it meets them; three emerald strings run from the yoke down into the bowl with
// real gaps between them, and in the bowl its heart sings, an open ring of light (from behind, only
// its glow). Open and horned where the Weft Warden is a closed, pointed hood, so the two never read
// alike. It hovers two pixels over its shadow; its `walk` is a slow glide (3 frames, 4 fps) with
// the strings sounding: each beat the middle string bows one way, then the other.
// Hurt, it frays (`fray1_`/`fray2_<facing>`, T501d).
import { defineSprite } from '../defineSprite.ts';
import { grid, plot, rows, stamp, type CharGrid } from '../helpers.ts';
import { frayLooks, hum, outlineOutside, rim, weave, type Mask } from './lattice.ts';

const W = 21;
const H = 26;
/** The lyre's middle column (pixel). */
const MID = 10;
/** The yoke's row and the soundbox's top and bottom (before the bob). */
const YOKE = 5;
const BOX_TOP = 15;
const BOX_BOTTOM = 21;

/** The left horn, from the soundbox up to its outward curl (the right mirrors it). */
const HORN: readonly (readonly [number, number])[] = [
  [7, 16],
  [5, 13],
  [4, 10],
  [4, 7],
  [3, 4],
  [1, 2],
];

/** Distance from (px, py) to segment ab. */
function segDist(
  px: number,
  py: number,
  a: readonly [number, number],
  b: readonly [number, number],
): number {
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((px - a[0]) * vx + (py - a[1]) * vy) / (vx * vx + vy * vy)));
  return Math.hypot(px - a[0] - t * vx, py - a[1] - t * vy);
}

/** Whether pixel (x, y) is on the left horn (lifted by `b`). */
function onHorn(x: number, y: number, b: number): boolean {
  for (let i = 0; i + 1 < HORN.length; i++) {
    const a = HORN[i];
    const c = HORN[i + 1];
    if (a === undefined || c === undefined) continue;
    if (segDist(x, y + b, a, c) <= 0.75) return true;
  }
  return false;
}

/** Strings' columns, and the middle one's bow (px) on each beat. */
const STRINGS = [7, 10, 13] as const;
const BOW = [0, -1, 1] as const;

function cantor(facing: 'se' | 'ne', beat: 0 | 1 | 2): string[] {
  const g: CharGrid = grid(W, H);
  const b = beat === 1 ? 1 : 0; // the bob: up a pixel on the middle beat
  const front = facing === 'se';
  // The soundbox: a woven bowl, flat on top, round below.
  const box: Mask = (x, y) => {
    const yy = y + b;
    if (yy < BOX_TOP || yy > BOX_BOTTOM) return false;
    const t = (yy + 0.5 - BOX_TOP) / (BOX_BOTTOM + 1 - BOX_TOP);
    const hw = 6.4 * Math.sqrt(Math.max(0, 1 - t * t));
    return Math.abs(x - MID) <= hw;
  };
  weave(g, box, { mode: 'diag', spacing: 3, phase: 1, rise: b, lx: MID + 0.5, ly: 17 - b }, 5);
  rim(g, box, MID + 0.5, 16 - b);
  hum(g, box, beat, front ? 29 : 30);
  // The horns, lit on their outer (left) face, and the yoke across them.
  const horn: Mask = (x, y) => onHorn(x, y, b) || onHorn(2 * MID - x, y, b);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!horn(x, y) || box(x, y)) continue;
      const outer = x < MID ? !horn(x - 1, y) : !horn(x + 1, y);
      plot(g, x, y, outer ? (x < MID ? '4' : '2') : '3');
    }
  }
  const yoke = YOKE - b;
  for (let x = 4; x <= 2 * MID - 4; x++) plot(g, x, yoke, x === MID ? '+' : '3');
  plot(g, 4, yoke, 'd');
  plot(g, 2 * MID - 4, yoke, 'd');
  // The horn tips' ruby knots.
  plot(g, 1, 2 - b, 'c');
  plot(g, 2 * MID - 1, 2 - b, 'c');
  // The strings, yoke to bowl, the middle one bowing as it sounds.
  for (const sx of STRINGS) {
    for (let y = yoke + 1; y < BOX_TOP - b; y++) {
      const midRow = Math.abs(y - (yoke + BOX_TOP - b) / 2) < 2;
      const bow = sx === MID && midRow ? BOW[beat] : 0;
      plot(g, sx + bow, y, front ? (y < 10 ? '9' : '8') : '7');
    }
  }
  // Its heart in the bowl: facing us, an open ring of light (it sings); from behind, its glow.
  stamp(g, MID - 2, 16 - b, front ? ['.+*+.', '+*.*+', '.+*+.'] : ['..+..', '.+.+.', '..+..']);
  // Two thread tassels hang from the bowl's foot, swinging with the beat.
  const foot = BOX_BOTTOM + 1 - b;
  plot(g, MID - 1 + (beat === 2 ? -1 : 0), foot, '2');
  plot(g, MID + 1 + (beat === 2 ? -1 : 0), foot, '2');
  plot(g, MID - 1 + (beat === 2 ? -1 : beat === 1 ? 1 : 0), foot + 1, 'd');
  plot(g, MID + 1 + (beat === 2 ? -1 : beat === 1 ? 1 : 0), foot + 1, 'd');
  outlineOutside(g);
  return rows(g);
}

const frames = {
  walk_se_0: cantor('se', 0),
  walk_se_1: cantor('se', 1),
  walk_se_2: cantor('se', 2),
  walk_ne_0: cantor('ne', 0),
  walk_ne_1: cantor('ne', 1),
  walk_ne_2: cantor('ne', 2),
};
const anims = {
  walk_se: { frames: ['walk_se_0', 'walk_se_1', 'walk_se_2', 'walk_se_1'], fps: 4 },
  walk_sw: { mirrorOf: 'walk_se' },
  walk_ne: { frames: ['walk_ne_0', 'walk_ne_1', 'walk_ne_2', 'walk_ne_1'], fps: 4 },
  walk_nw: { mirrorOf: 'walk_ne' },
};
const frayed = frayLooks(frames, anims, 29);

export const enemyCantor = defineSprite({
  id: 'enemy.cantor',
  size: { w: W, h: H },
  anchor: { x: MID + 1, y: H - 1 },
  palette: 'aelari',
  // The outline is the weave's own (lattice.ts `outlineOutside`), so the gaps stay see-through.
  outline: 'none',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  frames: { ...frames, ...frayed.frames },
  anims: { ...anims, ...frayed.anims },
});
