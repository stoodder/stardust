// Gloop Spitter (`gloop`, design/towers.md § Gloop Spitter): "a big, round, happy Skitterkin (an
// ex-Chonk, recognizably) who spits sticky acid", a gift of the warrens. The head is the Chonk
// itself, sat down on the warren footing (towers/warrenBase.ts) in the `skitterkin.ally` palette
// (its tuft gone teal): the same round coral body, butter belly, and armadillo bands of steel-rimmed
// scutes across its back the player used to plink, now with a wide happy grin, green acid on its
// lip, and its cheeks working. It **aims**: `se`/`ne` (mirrored `sw`/`nw`), and each shot (`fire_*`,
// ~0.4 s) is the spit, its mouth thrown open, a glob leaving it in a spray of droplets (facing NE,
// from behind, the glob arcs up off its far side). From tier 2 (`_t2`) it wears a gourd of acid on
// its back, a cork of moss in its neck; **Big Glorp** (`_spec_a`) is bigger still, drooling a
// long rope of acid off its chin; **Corrosive Kiss** (`_spec_b`) puckers pink lips and bats lashes.
// The base (one lantern per tier, like every warren gift): T2 sets a clay gourd of acid at each
// side corner, green sloshing at its mouth; T3 grows a pitcher plant (a tall green tube with a pink
// lip, acid glinting inside) on the left one; Big Glorp's base has two big acid vats spilling a
// puddle down the front; Corrosive Kiss's a pink-lipped pitcher at both corners.
import { defineSprite } from '../defineSprite.ts';
import { disc, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';
import { skitterBody } from '../enemies/skitter.ts';
import { BASE_ANCHOR, BASE_H, BASE_MOUNT, BASE_W } from './base.ts';
import { WARREN_LEGEND, warrenBase, warrenSpecBase } from './warrenBase.ts';

/** The warren's colours plus the acid's brightest green (`A`) and a clay gourd's (`M`, `N`, `O`). */
const LEGEND = {
  ...WARREN_LEGEND,
  A: 'green.4',
  M: 'brass.3',
  N: 'brass.2',
  O: 'brass.1',
} as const;

const SEED = 57;

// ---- The base ---------------------------------------------------------------------------------

/** A clay gourd of acid at (x, foot): a round brass-clay belly, a neck, green sloshing at its lip. */
function gourd(g: CharGrid, x: number, foot: number, r: number): void {
  const cy = foot - r;
  disc(g, x, cy, r, (d, px, py) => {
    const lit = -0.6 * (px + 0.5 - x) - 0.8 * (py + 0.5 - cy);
    return lit > r * 0.35 && d < r - 0.8 ? 'M' : lit > -r * 0.3 ? 'N' : 'O';
  });
  const neck = Math.round(cy - r);
  const nx = Math.round(x - 1);
  for (let k = 0; k < 3; k++) plot(g, nx + k, neck, k === 0 ? 'N' : 'O');
  // The acid at its mouth, and a drip down its flank.
  plot(g, nx, neck - 1, 'G');
  plot(g, nx + 1, neck - 1, 'A');
  plot(g, nx + 2, neck - 1, 'G');
  plot(g, nx + 2, neck + 1, 'G');
  plot(g, nx + 2, neck + 2, 'H');
}

/** T2: an acid gourd at each side corner. */
function gourds(g: CharGrid, cx: number, cy: number): void {
  gourd(g, cx - 10, cy + 1, 3.4);
  gourd(g, cx + 10, cy + 2, 3.4);
}

/**
 * A pitcher plant from row `foot` up to row `top` at column x: a bulbous green jug, lit left and
 * veined pink, narrowing to a neck, its mouth rolled pink (`P`) round dark with acid glinting in
 * it, a leaf lid tipped back over it.
 */
function pitcher(g: CharGrid, x: number, foot: number, top: number): void {
  const bulb = foot - 3;
  disc(g, x, bulb, 3.2, (d, px, py) => {
    const lit = -0.6 * (px + 0.5 - x) - 0.8 * (py + 0.5 - bulb);
    return lit > 1 && d < 2.3 ? 'G' : lit > -1 ? 'H' : 'I';
  });
  for (let y = top + 3; y <= bulb - 2; y++) {
    plot(g, x - 1, y, 'G');
    plot(g, x, y, 'H');
    plot(g, x + 1, y, 'I');
  }
  // Pink veins on the bulb.
  plot(g, x - 1, bulb, 'P');
  plot(g, x + 1, bulb + 1, 'P');
  plot(g, x, bulb - 2, 'P');
  // The mouth: a pink rolled lip round dark, the acid glinting in it.
  line(g, x - 2, top + 2, x + 2, top + 2, 'P');
  plot(g, x - 2, top + 1, 'P');
  plot(g, x + 2, top + 1, 'P');
  plot(g, x - 1, top + 1, 'k');
  plot(g, x, top + 1, 'A');
  plot(g, x + 1, top + 1, 'k');
  // The lid: a leaf tipped back over the mouth.
  line(g, x - 1, top, x + 2, top - 1, 'G');
  plot(g, x + 3, top - 1, 'H');
  plot(g, x + 3, top - 2, 'G');
}

/** T3: a pitcher plant on the left gourd's corner. */
function leftPitcher(g: CharGrid, cx: number, cy: number): void {
  pitcher(g, cx - 12, cy - 1, cy - 16);
}

/** A big acid vat: a squat clay pot, a lip of acid brimming over and spilling down its face. */
function vat(g: CharGrid, x: number, foot: number): void {
  gourd(g, x, foot, 4.2);
  const top = Math.round(foot - 8.4);
  for (let dx = -3; dx <= 2; dx++) plot(g, Math.round(x) + dx, top, dx === -1 ? 'A' : 'G');
  // Spilling over the lip and down the front.
  for (let k = 1; k <= 5; k++) plot(g, Math.round(x) + 2, top + k, k < 4 ? 'G' : 'H');
  plot(g, Math.round(x) - 3, top + 1, 'G');
  plot(g, Math.round(x) - 3, top + 2, 'H');
}

/** Big Glorp's base: two big vats and a puddle spilling down the front onto the ground. */
function bigGlorpKit(g: CharGrid, cx: number, cy: number): void {
  vat(g, cx - 10, cy + 2);
  vat(g, cx + 10, cy + 3);
  // The puddle: an iso pool round the front corner, its far side under the footing.
  const px = cx - 3;
  const py = cy + 5;
  for (let y = py - 2; y <= py + 2; y++) {
    for (let x = px - 9; x <= px + 9; x++) {
      const d = Math.abs(x + 0.5 - px) / 9 + Math.abs(y + 0.5 - py) / 2.4;
      if (d > 1) continue;
      const here = g[y]?.[x];
      if (here !== undefined && here !== '.' && here !== '_') continue;
      plot(g, x, y, d > 0.75 ? 'H' : (x + y) % 5 === 0 ? 'A' : 'G');
    }
  }
}

/** Corrosive Kiss's base: a pink-lipped pitcher at both corners. */
function corrosiveKissKit(g: CharGrid, cx: number, cy: number): void {
  pitcher(g, cx - 11, cy, cy - 15);
  pitcher(g, cx + 11, cy + 1, cy - 13);
  // A kiss print on the footing's left face.
  stamp(g, Math.round(cx - 6), Math.round(cy + 1), ['PP.PP', '.PPP.']);
}

const KITS = { t2: gourds, t3: leftPitcher } as const;

export const towerGloop = defineSprite({
  id: 'tower.gloop',
  size: { w: BASE_W, h: BASE_H },
  anchor: BASE_ANCHOR,
  mount: BASE_MOUNT,
  palette: 'skitterkin.ally',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: LEGEND,
  frames: {
    t1: warrenBase(1, KITS, SEED),
    t2: warrenBase(2, KITS, SEED),
    t3: warrenBase(3, KITS, SEED),
    spec_a: warrenSpecBase(bigGlorpKit, SEED),
    spec_b: warrenSpecBase(corrosiveKissKit, SEED),
  },
});

// ---- The head ---------------------------------------------------------------------------------

const W = 26;
const H = 22;
/** The head's anchor, on the base's mount (the footing's top face). */
const CX = 13;
const CY = 20;

type Look = 't1' | 't2' | 'bigGlorp' | 'kiss';

/**
 * The Chonk's armadillo bands across the upper back (enemies/chonk.ts, T117): rows of separate
 * steel-rimmed plates, each row staggered half a plate, a dark seam under each.
 */
function scutes(
  g: CharGrid,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  until: number,
  phase: number,
): void {
  const top = Math.ceil(cy - ry);
  for (let y = top + 1; y < until; y++) {
    for (let x = 0; x < W; x++) {
      const ch = g[y]?.[x];
      if (ch === undefined || ch === '.' || ch === '7' || ch === '8' || ch === '9') continue;
      const dx = (x + 0.5 - cx) / rx;
      if (Math.abs(dx) > 0.82) continue;
      const rowY = y - top + Math.round(dx * dx * 3);
      const band = Math.floor(rowY / 4);
      const r = rowY % 4;
      const along = x + (band % 2) * 3 + phase + 5;
      const k = ((along % 5) + 5) % 5;
      const rim = k >= 1 && k <= 3;
      if (r === 3) plot(g, x, y, '1');
      else if (r === 0 && rim) plot(g, x, y, dx < 0.2 ? 'V' : 'S');
      else if (r === 0 || k === 0) plot(g, x, y, '1');
      else plot(g, x, y, dx < -0.1 ? '4' : dx < 0.5 ? '3' : '2');
    }
  }
}

/** The happy face, facing SE: big eyes, a wide grin with acid on its lip (open wide to spit). */
function face(g: CharGrid, x: number, y: number, look: Look, spit: boolean): void {
  const kiss = look === 'kiss';
  // Eyes: glints, and for the Kiss a lash flicked up off each.
  for (const ex of [x, x + 5]) {
    if (spit) {
      // Squeezed shut with the effort: two happy arcs.
      plot(g, ex, y + 1, 'k');
      plot(g, ex + 1, y, 'k');
      plot(g, ex + 2, y + 1, 'k');
    } else {
      stamp(g, ex, y, ['wk', 'kk', 'kk']);
    }
    if (kiss) plot(g, ex + 2, y - 1, 'k');
  }
  const my = y + 5;
  if (spit) {
    // Thrown wide open: dark mouth, a green tongue of acid, droplets spraying out ahead.
    stamp(g, x, my - 1, ['.kkkkk.', 'kkAGAkk', 'kGGGGGk', '.kkkkk.']);
    return;
  }
  if (kiss) {
    // Puckered pink lips, a green glint between them.
    stamp(g, x + 2, my - 1, ['.PP.', 'PRRP', '.PP.']);
    plot(g, x + 3, my, 'A');
    return;
  }
  // The grin, its corners turned up, acid pooled on the lower lip.
  stamp(g, x, my - 1, ['k.....k', '.kkkkk.', '..GAG..']);
  if (look === 'bigGlorp') {
    // A long rope of drool off the chin.
    for (let k = 0; k < 4; k++) plot(g, x + 3, my + 2 + k, k < 2 ? 'A' : 'G');
    plot(g, x + 2, my + 5, 'G');
    plot(g, x + 4, my + 5, 'H');
  }
}

/** The gourd of acid riding on its back from tier 2. */
function backGourd(g: CharGrid, x: number, y: number): void {
  disc(g, x, y, 2.8, (d, px, py) => (px + py < x + y - 1 && d < 2 ? 'M' : d < 2.2 ? 'N' : 'O'));
  plot(g, Math.floor(x), Math.floor(y - 3), 'G');
  plot(g, Math.floor(x) + 1, Math.floor(y - 3), 'A');
}

/** One head frame: facing `se` or `ne`, at rest or mid-spit. */
function gloopHead(facing: 'se' | 'ne', look: Look, spit: boolean): string[] {
  const big = look === 'bigGlorp';
  const cx = 13;
  const cy = big ? 11.5 : 12.5;
  const rx = big ? 11.5 : 10.5;
  const ry = (big ? 8.5 : 7.5) + (spit ? -0.5 : 0);
  const g = skitterBody({ w: W, h: H, cx, cy, rx, ry, facing, belly: 0.55 });
  scutes(g, cx, cy, rx, ry, facing === 'se' ? Math.round(cy) - 1 : Math.round(cy) + 2, 0);
  // The teal tuft on its crown (the moss tuft, gone teal in the alliance palette).
  stamp(g, Math.round(cx) - 3, Math.round(cy - ry) - 1, ['.dc.', 'cdcb']);
  if (look !== 't1') {
    // From tier 2 its own gourd rides on its back: left shoulder facing SE, right facing NE.
    if (facing === 'se') backGourd(g, cx - 7.5, cy - 4.5);
    else backGourd(g, cx + 6, cy - 5);
  }
  // Two front paws planted on the footing.
  const foot = Math.round(cy + ry) - 1;
  for (const px of facing === 'se' ? [cx - 2, cx + 6] : [cx - 6, cx + 2]) {
    stamp(g, Math.round(px), foot, ['232', '.2.']);
  }
  if (facing === 'se') {
    face(g, Math.round(cx) + 1, Math.round(cy) - 1, look, spit);
    if (spit) {
      // The glob leaving ahead and droplets in a spray.
      disc(g, cx + 11, cy + 1.5, 2.1, (d) => (d < 0.8 ? 'w' : 'A'));
      plot(g, Math.round(cx) + 9, Math.round(cy) - 1, 'G');
      plot(g, Math.round(cx) + 11, Math.round(cy) - 2, 'A');
    }
  } else {
    // From behind: the gold spots down its back glow, and a spit arcs up off its far side.
    stamp(g, Math.round(cx) - 3, Math.round(cy) + 2, ['+...+', '..*..']);
    if (spit) {
      disc(g, cx + 8, cy - 8, 2.1, (d) => (d < 0.8 ? 'w' : 'A'));
      plot(g, Math.round(cx) + 6, Math.round(cy) - 6, 'G');
      plot(g, Math.round(cx) + 10, Math.round(cy) - 7, 'A');
      // Its cheeks bulge out past its sides with the effort.
      plot(g, Math.round(cx - rx) - 1, Math.round(cy), '2');
      plot(g, Math.round(cx + rx), Math.round(cy), '2');
    }
  }
  return rows(g);
}

const LOOKS: readonly (readonly [string, Look])[] = [
  ['', 't1'],
  ['_t2', 't2'],
  ['_spec_a', 'bigGlorp'],
  ['_spec_b', 'kiss'],
];

const headFrames: Record<string, string[]> = {};
const headAnims: Record<
  string,
  { frames: string[]; fps: number; loop: false } | { mirrorOf: string }
> = {};
for (const [suffix, look] of LOOKS) {
  for (const facing of ['se', 'ne'] as const) {
    headFrames[`${facing}${suffix}`] = gloopHead(facing, look, false);
    headFrames[`${facing}${suffix}_fire`] = gloopHead(facing, look, true);
  }
  // The spit: the open mouth held a beat (0.6 shots/s), then back to rest.
  headAnims[`fire_se${suffix}`] = {
    frames: [`se${suffix}_fire`, `se${suffix}_fire`, `se${suffix}`],
    fps: 8,
    loop: false,
  };
  headAnims[`fire_sw${suffix}`] = { mirrorOf: `fire_se${suffix}` };
  headAnims[`fire_ne${suffix}`] = {
    frames: [`ne${suffix}_fire`, `ne${suffix}_fire`, `ne${suffix}`],
    fps: 8,
    loop: false,
  };
  headAnims[`fire_nw${suffix}`] = { mirrorOf: `fire_ne${suffix}` };
}

export const towerGloopHead = defineSprite({
  id: 'tower.gloop_head',
  size: { w: W, h: H },
  anchor: { x: CX, y: CY },
  palette: 'skitterkin.ally',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: LEGEND,
  frames: headFrames,
  anims: headAnims,
});
