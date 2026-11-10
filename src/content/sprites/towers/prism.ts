// Prism Spire (`prism`, design/towers.md § Aelari towers): Ves'thara's gift, the ramping beam, "I
// will hold the light." On the floating Aelari dais (towers/aelariBase.ts) in its **ruby-pink trim**
// (a pink rim thread, pink tier shards), a squat cut gem floats over a woven emerald cradle: broad
// and six-sided, its ruby-pink facets lit pink-white on the left and deep ruby on the right, a
// sapphire thread wound round it (the Aelari weave), and a white heart at the height the beam leaves
// it (render's `MUZZLE_PX`, 14 px over the tile: 9 over the mount). Squat and warm where the
// Mindspike is a violet needle and the Lantern a round gold-lit cage (U5). It aims by the lens it
// turns to the target, a bright facet low on its right facing us (SE), high on its right facing away
// (NE); firing (each lock of the beam) blazes the heart and throws a spark of light off the lens.
// From tier 2 the gem grows broader and taller and two small pink satellite shards float beside it.
// The specs: **Refractor** (`spec_a`, three beams) is a triad, the gem flanked by two smaller gems
// leaning out, a heart in each, over a base with a forked pink crystal at each corner; **Sunlance**
// (`spec_b`, the boss killer) is a long thin lance of ruby crystal in a ring of light knots (a small
// sun round its heart), over a base with a tall lance at each corner.
import { defineSprite } from '../defineSprite.ts';
import { grid, plot, rows, type CharGrid } from '../helpers.ts';
import { BASE_ANCHOR, BASE_H, BASE_MOUNT, BASE_W } from './base.ts';
import { aelariBase, aelariSpecBase, floatingCrystal, shard, type Trim } from './aelariBase.ts';

const W = 26;
const H = 38;
const CX = 13;
const CY = 35;
/** The heart's row: the beam leaves here (9 px over the mount). */
const HEART = CY - 9;

type Facing = 'se' | 'ne';
type Kit = 't1' | 't2' | 'refractor' | 'sunlance';

/** The Prism's trim (U5): ruby-pink, its light white. */
export const PRISM_TRIM: Trim = { rim: 'd', ramp: ['e', 'd', 'c', 'b'], tip: '*' };

/** The cradle: a woven emerald ring the crystal floats over, ruby knots at its sides. */
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
 * A six-sided ruby-pink gem from `top` to `bottom` (pointed at both ends, the caps `cap` rows),
 * `hw` px half-wide, centred on column `cx` (pixel edges): its left facet lit pink-white, the middle
 * pink, the right ruby and deep ruby, the ridge between the lit facets catching white light, and a
 * table of lit pink across its crown.
 */
function crystal(
  g: CharGrid,
  cx: number,
  top: number,
  bottom: number,
  hw: number,
  cap = Math.max(2, Math.round(hw)),
): void {
  for (let y = top; y <= bottom; y++) {
    const w = Math.min(hw, (y - top + 0.5) * (hw / cap), (bottom - y + 0.5) * (hw / cap));
    for (let x = Math.floor(cx - w); x < Math.ceil(cx + w); x++) {
      const u = (x + 0.5 - cx) / Math.max(1, w);
      plot(g, x, y, u < -0.45 ? 'e' : u < 0.1 ? 'd' : u < 0.55 ? 'c' : 'b');
    }
  }
  // The ridge between the lit and plain facets catches the light.
  for (let y = top + 1; y < bottom; y++) {
    const x = Math.floor(cx - hw * 0.45);
    if (g[y]?.[x] === 'e' || g[y]?.[x] === 'd') plot(g, x, y, y < (top + bottom) / 2 ? 'w' : 'e');
  }
}

/** The heart (white, in a teal ring), blazing when it fires. */
function heart(g: CharGrid, cx: number, cy: number, fire: boolean): void {
  const x = Math.floor(cx);
  if (fire) {
    for (const [dx, dy, c] of [
      [-1, -1, '+'],
      [0, -1, '*'],
      [-2, 0, '+'],
      [-1, 0, '*'],
      [0, 0, '*'],
      [1, 0, '+'],
      [-1, 1, '*'],
      [0, 1, '+'],
    ] as const) {
      plot(g, x + dx, cy + dy, c);
    }
    plot(g, x - 1, cy - 2, '+');
    plot(g, x, cy + 2, '+');
  } else {
    plot(g, x - 1, cy, '*');
    plot(g, x, cy, '+');
    plot(g, x - 1, cy - 1, '+');
  }
}

/** The lens it turns to the target, and on firing the spark of light thrown off it. */
function lens(g: CharGrid, facing: Facing, hw: number, fire: boolean): void {
  const lx = Math.floor(CX + hw) - 2;
  const ly = facing === 'se' ? HEART + 2 : HEART - 3;
  plot(g, lx, ly, '9');
  plot(g, lx + 1, ly, '*');
  plot(g, lx, ly + 1, '8');
  if (!fire) return;
  const dy = facing === 'se' ? 1 : -1;
  plot(g, lx + 2, ly, '*');
  plot(g, lx + 3, ly + dy, '+');
  plot(g, lx + 2, ly - dy, '+');
  plot(g, lx + 4, ly + dy, '*');
}

/** The sapphire thread wound round the gem (the Aelari weave), on the diagonal across its front. */
function windings(g: CharGrid, cx: number, top: number, bottom: number, hw: number): void {
  for (let y = top + 3; y <= bottom - 2; y += 4) {
    const n = Math.round(hw * 2);
    for (let k = 0; k < n; k++) {
      const x = Math.floor(cx - hw) + k;
      const yy = y + Math.floor((k * 2) / n);
      const c = g[yy]?.[x];
      if (c !== undefined && c !== '.') plot(g, x, yy, k < n / 2 ? '4' : '2');
    }
  }
}

function prismHead(facing: Facing, fire: boolean, kit: Kit = 't1'): string[] {
  const g = grid(W, H);
  const big = kit !== 't1';
  cradle(g, big ? 6.5 : 5.5);
  if (kit === 'refractor') {
    // Two smaller gems leaning out to either side, a heart in each: three beams.
    for (const side of [-1, 1]) {
      const sx = CX + side * 7.5;
      crystal(g, sx, HEART - 7, HEART + 4, 2.6, 2);
      heart(g, sx - side, HEART, fire);
    }
  }
  if (kit === 'sunlance') {
    // The sun: a ring of light knots round the lance's heart.
    for (let a = 0; a < 12; a++) {
      const t = (a / 12) * Math.PI * 2;
      plot(
        g,
        Math.floor(CX + Math.cos(t) * 7),
        Math.floor(HEART + Math.sin(t) * 6),
        a % 3 === 0 ? '*' : '+',
      );
    }
  }
  // Squat: a broad gem with short caps (T1 13 rows × 11 px; T2 and the triad 16 × 13); the
  // Sunlance is the one long lance.
  const hw = kit === 'sunlance' ? 2.6 : big ? 6.5 : 5.5;
  const top = kit === 'sunlance' ? 2 : big ? HEART - 10 : HEART - 7;
  const bottom = CY - 4;
  crystal(g, CX, top, bottom, hw, kit === 'sunlance' ? 3 : 3);
  windings(g, CX, top, bottom, hw);
  if (kit === 't2') {
    // Two satellite shards floating beside it.
    floatingCrystal(g, CX - 9, HEART - 5, 2, PRISM_TRIM);
    floatingCrystal(g, CX + 10, HEART - 3, 2, PRISM_TRIM);
  }
  heart(g, CX, HEART, fire);
  // The triad turns its middle lens; the side gems throw their own light when it fires.
  lens(g, facing, hw, fire);
  return rows(g);
}

/** Refractor's base: a forked crystal at each side corner, its light split three ways. */
function refractorKit(g: CharGrid, cx: number, cy: number): void {
  for (const side of [-1, 1]) {
    const x = cx + side * 11 + (side > 0 ? 1 : 0);
    shard(g, x, cy - 1, 8, PRISM_TRIM);
    shard(g, x - side * 2, cy - 1, 5, PRISM_TRIM);
    shard(g, x + side * 2, cy - 1, 5, PRISM_TRIM);
  }
}

/** Sunlance's base: a tall thin lance at each side corner, a light knot at each tip. */
function sunlanceKit(g: CharGrid, cx: number, cy: number): void {
  for (const side of [-1, 1]) {
    const x = cx + side * 11 + (side > 0 ? 1 : 0);
    // A crystal foot the lance stands in.
    shard(g, x, cy - 1, 4, PRISM_TRIM);
    for (let y = cy - 16; y <= cy - 4; y++) {
      plot(g, x - 1, y, 'e');
      plot(g, x, y, 'c');
    }
    plot(g, x - 1, cy - 17, '*');
    plot(g, x, cy - 17, '+');
    plot(g, x - 2, cy - 17, '+');
    plot(g, x - 1, cy - 18, '+');
    plot(g, x - 1, cy - 9, '4');
    plot(g, x, cy - 9, '2');
  }
}

export const towerPrism = defineSprite({
  id: 'tower.prism',
  size: { w: BASE_W, h: BASE_H },
  anchor: BASE_ANCHOR,
  mount: BASE_MOUNT,
  palette: 'aelari',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  frames: {
    t1: aelariBase(1, PRISM_TRIM),
    t2: aelariBase(2, PRISM_TRIM),
    t3: aelariBase(3, PRISM_TRIM),
    spec_a: aelariSpecBase(refractorKit, PRISM_TRIM),
    spec_b: aelariSpecBase(sunlanceKit, PRISM_TRIM),
  },
});

export const towerPrismHead = defineSprite({
  id: 'tower.prism_head',
  size: { w: W, h: H },
  anchor: { x: CX, y: CY },
  palette: 'aelari',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  frames: {
    se: prismHead('se', false),
    se_fire: prismHead('se', true),
    ne: prismHead('ne', false),
    ne_fire: prismHead('ne', true),
    se_t2: prismHead('se', false, 't2'),
    se_t2_fire: prismHead('se', true, 't2'),
    ne_t2: prismHead('ne', false, 't2'),
    ne_t2_fire: prismHead('ne', true, 't2'),
    se_spec_a: prismHead('se', false, 'refractor'),
    se_spec_a_fire: prismHead('se', true, 'refractor'),
    ne_spec_a: prismHead('ne', false, 'refractor'),
    ne_spec_a_fire: prismHead('ne', true, 'refractor'),
    se_spec_b: prismHead('se', false, 'sunlance'),
    se_spec_b_fire: prismHead('se', true, 'sunlance'),
    ne_spec_b: prismHead('ne', false, 'sunlance'),
    ne_spec_b_fire: prismHead('ne', true, 'sunlance'),
  },
  anims: {
    // A lock: the heart blazes, then holds (the beam itself is render's, BeamView).
    fire_se: { frames: ['se_fire', 'se'], fps: 8, loop: false },
    fire_sw: { mirrorOf: 'fire_se' },
    fire_ne: { frames: ['ne_fire', 'ne'], fps: 8, loop: false },
    fire_nw: { mirrorOf: 'fire_ne' },
    fire_se_t2: { frames: ['se_t2_fire', 'se_t2'], fps: 8, loop: false },
    fire_sw_t2: { mirrorOf: 'fire_se_t2' },
    fire_ne_t2: { frames: ['ne_t2_fire', 'ne_t2'], fps: 8, loop: false },
    fire_nw_t2: { mirrorOf: 'fire_ne_t2' },
    fire_se_spec_a: { frames: ['se_spec_a_fire', 'se_spec_a'], fps: 8, loop: false },
    fire_sw_spec_a: { mirrorOf: 'fire_se_spec_a' },
    fire_ne_spec_a: { frames: ['ne_spec_a_fire', 'ne_spec_a'], fps: 8, loop: false },
    fire_nw_spec_a: { mirrorOf: 'fire_ne_spec_a' },
    fire_se_spec_b: { frames: ['se_spec_b_fire', 'se_spec_b'], fps: 8, loop: false },
    fire_sw_spec_b: { mirrorOf: 'fire_se_spec_b' },
    fire_ne_spec_b: { frames: ['ne_spec_b_fire', 'ne_spec_b'], fps: 8, loop: false },
    fire_nw_spec_b: { mirrorOf: 'fire_ne_spec_b' },
  },
});
