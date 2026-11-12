// The star map's chart (art-direction.md § 10): Everglow Perimeter Ops' survey of the valley as
// one 640×360 picture from a pure, seeded pixel generator, painted 1:1 into the Sector map's
// <canvas>. A top-down survey lit from the north-west (each relief step's south-east face in the
// phase's shade, its north-west lip in its light, a contour one ramp step darker), with the survey
// grid, the Spires and their rigs, Rig Nine's bore, the plant under the north-east cliff, the
// Terraces, the walled colony, the roads, the Preserve's bowl, the lowlands and the creek, the
// Long Walk's dotted trail under the roads, and the north band where the survey stops. The legs
// between the visible nodes are drawn last. Still: no palette cycles. Same input, same pixels.
import {
  STAR_MAP_LONG_WALK,
  type StarMapChange,
  type StarMapPhase,
} from '../../content/starMap.ts';
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import {
  DAWN_ENDING_COLONY,
  paintDawn,
  type StarMapEnding,
} from '../../content/sprites/starmap/dawn.ts';
import type { RgbaImage } from '../../render/sprites/rasterize.ts';
import { createRng, nextFloat, nextInt, type Rng } from '../../shared/rng.ts';

export const CHART_SEED = 0x5ec7;
const W = 640;
const H = 360;

/** A leg between two nodes, in chart px: steel between cleared nodes, the accent to the frontier. */
export interface ChartLeg {
  readonly from: { readonly x: number; readonly y: number };
  readonly to: { readonly x: number; readonly y: number };
  readonly accent: boolean;
}

type Ramp = readonly [ColorName, ColorName, ColorName, ColorName, ColorName];

/** What a phase paints with (art-direction § 10 *The north edge and the palette by phase*). */
interface PhaseLook {
  readonly ground: Ramp;
  readonly clay: Ramp;
  readonly path: Ramp;
  readonly shade: ColorName;
  readonly light: ColorName;
  readonly accent: ColorName;
  /** The north band's depth, and its wedge over the Diggings' ridge tops. */
  readonly band: number;
  readonly wedge: number;
  /** The Diggings' derricks in `ink.1` silhouette (their lights still on). */
  readonly silhouette: boolean;
  /** The grime mining scar across the Terraces (A2M3's revisit). */
  readonly scar: boolean;
  /** Dome windows: none, lit (`gold.3`), or half dark (`act3.emergency`). */
  readonly windows: 'none' | 'lit' | 'emergency';
  /** The domes' shells: white by day and dusk, steel in the dark at night (Act III). */
  readonly domes: 'day' | 'night';
  /** Cold violet crystal glints on the Spires' peaks (unsung stardust spreading; Act III). */
  readonly glints: boolean;
  /** Violet cracks from the band toward the Terraces (Act III). */
  readonly cracks: boolean;
  /** The Halls' mouth glows (dawn). */
  readonly glow: boolean;
  /** How much of the shade the whole chart takes (the light going: dusk). */
  readonly tint: number;
}

const ACT2: Pick<PhaseLook, 'ground' | 'clay' | 'path'> = {
  ground: ['act2.grass.0', 'act2.grass.1', 'act2.grass.2', 'act2.grass.3', 'act2.grass.4'],
  clay: ['act2.clay.0', 'act2.clay.1', 'act2.clay.2', 'act2.clay.3', 'act2.clay.4'],
  path: ['act2.path.0', 'act2.path.1', 'act2.path.2', 'act2.path.3', 'act2.path.4'],
};
const ACT3_PATH: Ramp = ['act3.path.0', 'act3.path.1', 'act3.path.2', 'act3.path.3', 'act3.path.3'];
/**
 * Act III's cliffs at night: dark rock from the act's ground ramp, the crystal only on the lit
 * upper faces (`act3.crystal` growths, never so bright they outshine the glyphs).
 */
const NIGHT_ROCK: Ramp = [
  'act3.ground.0',
  'act3.ground.2',
  'act3.ground.3',
  'act3.crystal.0',
  'act3.crystal.1',
];

export const PHASE_LOOKS: Readonly<Record<StarMapPhase, PhaseLook>> = {
  'act2.gold': {
    ...ACT2,
    shade: 'act2.gold.shade',
    light: 'act2.gold.light',
    accent: 'orange.3',
    band: 24,
    wedge: 40,
    silhouette: false,
    scar: false,
    windows: 'none',
    domes: 'day',
    glints: false,
    cracks: false,
    glow: false,
    tint: 0,
  },
  'act2.dusk': {
    ...ACT2,
    shade: 'act2.dusk.shade',
    light: 'act2.dusk.light',
    accent: 'orange.3',
    band: 36,
    wedge: 64,
    silhouette: true,
    scar: true,
    windows: 'lit',
    domes: 'day',
    glints: false,
    cracks: false,
    glow: false,
    tint: 0.32,
  },
  act3: {
    ground: ['act3.ground.0', 'act3.ground.1', 'act3.ground.2', 'act3.ground.3', 'act3.ground.4'],
    clay: NIGHT_ROCK,
    path: ACT3_PATH,
    shade: 'act3.shade',
    light: 'act3.light',
    accent: 'red.3',
    band: 72,
    wedge: 72,
    silhouette: true,
    scar: true,
    windows: 'emergency',
    domes: 'night',
    glints: true,
    cracks: true,
    glow: false,
    tint: 0,
  },
  dawn: {
    ground: [
      'finale.ground.0',
      'finale.ground.1',
      'finale.ground.2',
      'finale.ground.3',
      'finale.ground.4',
    ],
    clay: ['finale.ground.0', 'finale.ground.1', 'finale.ground.2', 'finale.ground.3', 'gold.4'],
    path: ACT3_PATH,
    shade: 'finale.shade',
    light: 'finale.light',
    accent: 'gold.3',
    band: 16,
    wedge: 16,
    silhouette: false,
    scar: true,
    windows: 'lit',
    domes: 'day',
    glints: false,
    cracks: false,
    glow: true,
    tint: 0,
  },
};

/** The accent a phase draws the frontier's leg in (and its UI theme). */
export function chartAccent(phase: StarMapPhase): ColorName {
  return PHASE_LOOKS[phase].accent;
}

/** 4×4 ordered-dither thresholds (0–15). */
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5] as const;
function bayer(x: number, y: number): number {
  return BAYER4[(y & 3) * 4 + (x & 3)]!;
}

// ── Landmarks (chart px; art-direction § 10's table) ─────────────────────────────────────────

const COLONY = { x0: 268, y0: 196, x1: 424, y1: 304 } as const;
const GATES = [
  { x: 312, y: 196 },
  { x: 424, y: 240 },
  { x: 304, y: 304 },
] as const;
const PLAZA = { x: 336, y: 252 } as const;
const TERRACES = { x0: 228, y0: 140, x1: 300, y1: 188 } as const;
const PRESERVE = { cx: 158, cy: 214, rx: 38, ry: 26 } as const;
export const PLANT = { x: 472, y: 168 } as const;
const BORE = { x: 520, y: 76 } as const;
/** Derricks: Ridge Rigs and Rigs 7 and 8 on the ledge east of it; the Diggings'. */
const RIDGE_DERRICKS = [
  { x: 386, y: 96 },
  { x: 418, y: 92 },
  { x: 428, y: 100 },
] as const;
const DIGGING_DERRICKS = [
  { x: 484, y: 80 },
  { x: 506, y: 98 },
  { x: 536, y: 88 },
] as const;
/** Kept clear of peaks so the rigs, nodes, and roads read (a radius in px). */
const PEAK_CLEAR = [
  { x: 400, y: 100, r: 18 },
  { x: 500, y: 88, r: 18 },
  { x: 520, y: 76, r: 14 },
  { x: 412, y: 60, r: 12 },
  { x: 372, y: 136, r: 12 },
  { x: 472, y: 168, r: 24 },
] as const;

type Pt = { readonly x: number; readonly y: number };
const ROADS: readonly (readonly Pt[])[] = [
  // The Spires road: the north gate up to Ridge Rigs and on to the Diggings.
  [
    { x: 312, y: 196 },
    { x: 316, y: 170 },
    { x: 344, y: 150 },
    { x: 380, y: 120 },
    { x: 400, y: 104 },
    { x: 440, y: 96 },
    { x: 470, y: 90 },
    { x: 498, y: 88 },
  ],
  // The haul road: the Diggings down past the plant to the east gate.
  [
    { x: 500, y: 92 },
    { x: 498, y: 124 },
    { x: 486, y: 150 },
    { x: 472, y: 172 },
    { x: 456, y: 198 },
    { x: 440, y: 226 },
    { x: 424, y: 240 },
  ],
  // Mail Road: the east gate to the east edge.
  [
    { x: 424, y: 240 },
    { x: 456, y: 238 },
    { x: 500, y: 246 },
    { x: 560, y: 244 },
    { x: 640, y: 250 },
  ],
  // Preserve Road: the north-west hills down to the Preserve's gate.
  [
    { x: 96, y: 104 },
    { x: 128, y: 132 },
    { x: 170, y: 160 },
    { x: 192, y: 190 },
    { x: 190, y: 230 },
  ],
];

/** The creek: from the west hills down past the colony's west side. */
const CREEK: readonly Pt[] = [
  { x: 36, y: 156 },
  { x: 64, y: 168 },
  { x: 86, y: 196 },
  { x: 96, y: 236 },
  { x: 126, y: 258 },
  { x: 176, y: 266 },
  { x: 226, y: 284 },
  { x: 250, y: 312 },
  { x: 246, y: 340 },
  { x: 258, y: 360 },
];

// ── The pixel buffer ─────────────────────────────────────────────────────────────────────────

interface Canvas {
  readonly data: Uint8ClampedArray<ArrayBuffer>;
}

function put(c: Canvas, x: number, y: number, color: ColorName): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const { r, g, b } = rgbOf(color);
  const i = ((y | 0) * W + (x | 0)) * 4;
  c.data[i] = r;
  c.data[i + 1] = g;
  c.data[i + 2] = b;
  c.data[i + 3] = 255;
}

function blend(c: Canvas, x: number, y: number, color: ColorName, a: number): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const { r, g, b } = rgbOf(color);
  const i = (y * W + x) * 4;
  c.data[i] = Math.round(c.data[i]! * (1 - a) + r * a);
  c.data[i + 1] = Math.round(c.data[i + 1]! * (1 - a) + g * a);
  c.data[i + 2] = Math.round(c.data[i + 2]! * (1 - a) + b * a);
}

/** Every pixel on the segment a → b (Bresenham), in order. */
function linePixels(a: Pt, b: Pt): Pt[] {
  const out: Pt[] = [];
  let x = Math.round(a.x);
  let y = Math.round(a.y);
  const x1 = Math.round(b.x);
  const y1 = Math.round(b.y);
  const dx = Math.abs(x1 - x);
  const dy = -Math.abs(y1 - y);
  const sx = x < x1 ? 1 : -1;
  const sy = y < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    out.push({ x, y });
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
  return out;
}

function polylinePixels(points: readonly Pt[]): Pt[] {
  const out: Pt[] = [];
  for (let i = 1; i < points.length; i++) {
    const seg = linePixels(points[i - 1]!, points[i]!);
    out.push(...(i === 1 ? seg : seg.slice(1)));
  }
  return out;
}

// ── Noise ────────────────────────────────────────────────────────────────────────────────────

/** A seeded lattice hash in [0, 1). */
function hash(ix: number, iy: number): number {
  let h = (ix * 374761393 + iy * 668265263 + CHART_SEED * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise in [0, 1) with a cell of `cell` px. */
function noise(x: number, y: number, cell: number): number {
  const fx = x / cell;
  const fy = y / cell;
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const tx = fx - ix;
  const ty = fy - iy;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const a = hash(ix, iy) + (hash(ix + 1, iy) - hash(ix, iy)) * sx;
  const b = hash(ix, iy + 1) + (hash(ix + 1, iy + 1) - hash(ix, iy + 1)) * sx;
  return a + (b - a) * sy;
}

/** Two octaves of value noise in [0, 1). */
function fbm(x: number, y: number): number {
  return noise(x, y, 24) * 0.65 + noise(x + 97, y + 31, 9) * 0.35;
}

// ── Relief ───────────────────────────────────────────────────────────────────────────────────

/** The Spires' southern edge at column x: wavy, dipping to the north-east cliff above the plant. */
function ridgeEdge(x: number): number {
  const cliff = Math.max(0, 1 - Math.abs(x - 488) / 64);
  return 112 + 6 * Math.sin(x / 23) + 4 * Math.sin(x / 9 + 1) + 40 * cliff * cliff;
}

/** The lowlands' northern edge at column x (south of the colony). */
function lowlandEdge(x: number): number {
  return 320 + 10 * noise(x, 0, 20) + 2 * Math.sin(x / 7);
}

const HILLS: readonly { readonly x: number; readonly y: number; readonly r: number }[] = [
  { x: 92, y: 104, r: 40 },
  { x: 44, y: 136, r: 30 },
  { x: 150, y: 96, r: 26 },
  { x: 604, y: 168, r: 26 },
  { x: 560, y: 300, r: 22 },
];

/** The relief level at (x, y): 0 lowland and the Preserve's bowl, 1 the valley, 2 hills, 3 the Spires. */
function levelAt(x: number, y: number): number {
  if (y < ridgeEdge(x)) return 3;
  const dx = (x - PRESERVE.cx) / PRESERVE.rx;
  const dy = (y - PRESERVE.cy) / PRESERVE.ry;
  if (dx * dx + dy * dy < 1) return 0;
  for (const h of HILLS) {
    const d = Math.hypot(x - h.x, (y - h.y) * 1.3);
    if (d < h.r * (0.75 + 0.5 * noise(x, y, 14))) return 2;
  }
  if (y > lowlandEdge(x)) return 0;
  return 1;
}

function paintRelief(c: Canvas, look: PhaseLook, rng: Rng): void {
  const level = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) level[y * W + x] = levelAt(x, y);
  const at = (x: number, y: number): number =>
    level[Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))]!;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const l = at(x, y);
      // The act's ground in noise patches of its two darkest steps (scrub and bare soil), with
      // a narrow dither between them and a sparse speckle of the next step up. The Spires' ridge
      // sits mostly in the darker step; their peaks carry the clay (paintSpires).
      const n = fbm(x, y) + (l === 3 ? -0.18 : l === 0 ? -0.24 : 0.07);
      const dark = n < 0.47 + ((bayer(x, y) - 7.5) / 16) * 0.1;
      let step: 0 | 1 | 2 = dark ? 0 : 1;
      if (l !== 0 && n > 0.62 && nextFloat(rng) < 0.05) step = 2;
      put(c, x, y, look.ground[step]);
      if (l === 2) blend(c, x, y, look.ground[2], 0.22);
      if (l === 3) blend(c, x, y, look.clay[1], 0.3);
    }
  }
  // Hill shading: south-east faces in shade, north-west lips in light, contours a step darker.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const l = at(x, y);
      if (at(x + 1, y + 1) < l || at(x + 2, y + 2) < l) blend(c, x, y, look.shade, 0.55);
      else if (at(x - 1, y - 1) < l) blend(c, x, y, look.light, 0.4);
      else if (at(x + 1, y) > l || at(x, y + 1) > l || at(x - 1, y) > l || at(x, y - 1) > l) {
        put(c, x, y, l === 3 ? look.clay[0] : look.ground[0]);
      }
    }
  }
}

function paintGrid(c: Canvas, look: PhaseLook): void {
  for (let y = 16; y < H; y += 16) for (let x = 16; x < W; x += 16) put(c, x, y, look.ground[0]);
  for (let x = 32; x < W; x += 32) {
    for (const y of [0, 1, H - 2, H - 1]) put(c, x, y, 'steel.1');
  }
  for (let y = 32; y < H; y += 32) {
    for (const x of [0, 1, W - 2, W - 1]) put(c, x, y, 'steel.1');
  }
}

function paintLowlands(c: Canvas, rng: Rng): void {
  // Pools dither in toward the south edge.
  for (let y = 300; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (y < lowlandEdge(x)) continue;
      const depth = (y - lowlandEdge(x)) / (H - lowlandEdge(x));
      const pool = 0.5 + 0.5 * Math.sin(x / 11 + Math.sin(y / 5) * 2) * Math.sin(y / 6 + x / 31);
      if (pool * depth * 16 > bayer(x, y) + 4) put(c, x, y, 'blue.1');
    }
  }
  for (const p of polylinePixels(CREEK)) {
    // A little meander, and 1–2 px wide.
    const x = p.x + Math.round(2 * Math.sin(p.y / 6) + Math.sin(p.x / 4));
    put(c, x, p.y, 'blue.2');
    if (nextFloat(rng) < 0.45) put(c, x + 1, p.y, 'blue.1');
  }
}

function paintPreserve(c: Canvas): void {
  const { cx, cy, rx, ry } = PRESERVE;
  // The dotted fence, one pixel on and one off, with the gate's gap on the south-east.
  const steps = 260;
  for (let i = 0; i < steps; i += 2) {
    const t = (i / steps) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(t) * (rx + 2));
    const y = Math.round(cy + Math.sin(t) * (ry + 2));
    if (t > 0.55 && t < 0.85) continue;
    put(c, x, y, 'steel.2');
  }
}

function paintTerraces(c: Canvas, look: PhaseLook): void {
  const { x0, y0, x1, y1 } = TERRACES;
  const strip = (y1 - y0) / 4;
  for (let i = 0; i < 4; i++) {
    const top = Math.round(y0 + i * strip);
    const bottom = Math.round(y0 + (i + 1) * strip) - 1;
    const left = x0 + i * 3;
    const right = x1 - (3 - i) * 2;
    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        // Rows of crops: every other row a step lighter.
        put(c, x, y, look.ground[(y - top) % 3 === 1 ? 2 : 1]);
      }
    }
    // The clay lip along each strip's south edge, lit on its north-west, shaded below.
    for (let x = left; x <= right; x++) {
      put(c, x, bottom, look.clay[2]);
      blend(c, x, bottom + 1, look.shade, 0.5);
    }
    for (let y = top; y <= bottom; y++) put(c, left, y, look.clay[3]);
  }
  if (look.scar) {
    // A2M3's mining scar across the strips.
    for (const p of linePixels({ x: 236, y: 144 }, { x: 296, y: 184 })) {
      for (let d = -2; d <= 2; d++) put(c, p.x + d, p.y, Math.abs(d) === 2 ? 'grime.1' : 'grime.2');
    }
  }
}

function paintLongWalk(c: Canvas, look: PhaseLook): void {
  polylinePixels(STAR_MAP_LONG_WALK).forEach((p, i) => {
    if (i % 2 === 0) put(c, p.x, p.y, look.path[4]);
  });
}

function paintRoads(c: Canvas, look: PhaseLook): void {
  for (const road of ROADS) {
    const px = polylinePixels(road);
    for (const p of px) {
      for (let dy = -1; dy <= 2; dy++)
        for (let dx = -1; dx <= 2; dx++) put(c, p.x + dx, p.y + dy, look.path[1]);
    }
    for (const p of px) {
      for (let dy = 0; dy <= 1; dy++)
        for (let dx = 0; dx <= 1; dx++) put(c, p.x + dx, p.y + dy, look.path[2]);
    }
  }
}

/** A dome's colours: its lit rim, its shell, and its shell's south-east shade. */
const DOME_COLORS: Readonly<
  Record<PhaseLook['domes'], { rim: ColorName; shell: ColorName; shade: ColorName }>
> = {
  day: { rim: 'teal.3', shell: 'white.0', shade: 'steel.4' },
  night: { rim: 'steel.1', shell: 'steel.0', shade: 'ink.3' },
};

/**
 * A dome: its shell, rim, and shade, and its window when `lit`. An open dome (`open`, Dome Row
 * once A3M6 is won) burns a warm `gold.3` window whatever the phase, its door a `gold.2` pixel on
 * its south rim, and its light spills on the yard below in a dithered `gold.1`.
 */
function paintDome(
  c: Canvas,
  cx: number,
  cy: number,
  r: number,
  look: PhaseLook,
  lit: boolean,
  open = false,
): void {
  for (let y = -r - 1; y <= r + 1; y++) {
    for (let x = -r - 1; x <= r + 1; x++) {
      const d = Math.hypot(x, y);
      if (d > r + 0.5) continue;
      const rim = d > r - 0.7;
      const shade = x + y > r * 0.6;
      const k = DOME_COLORS[look.domes];
      put(c, cx + x, cy + y, rim ? (shade ? 'ink.1' : k.rim) : shade ? k.shade : k.shell);
    }
  }
  if (open) {
    put(c, cx, cy, 'gold.3');
    put(c, cx, cy + r, 'gold.2');
    for (let dy = 1; dy <= 2; dy++) {
      for (let dx = -dy; dx <= dy; dx++) {
        if (bayer(cx + dx, cy + r + dy) < (dy === 1 ? 10 : 5))
          put(c, cx + dx, cy + r + dy, 'gold.1');
      }
    }
    return;
  }
  if (lit) put(c, cx, cy, look.windows === 'emergency' ? 'act3.emergency' : 'gold.3');
}

/** Whether (x, y) is in one of the colony wall's gate gaps. */
function gate(x: number, y: number): boolean {
  return GATES.some((g) => Math.abs(g.x - x) + Math.abs(g.y - y) <= 3);
}

/** The Long Walk's trail's x at row y inside the colony (north gate to south gate). */
function trailX(y: number): number {
  return 312 + ((304 - 312) * (y - 196)) / (304 - 196);
}

/** One random stream per feature, so a phase's extra pixels never move another feature. */
function stream(k: number): Rng {
  return createRng(CHART_SEED + k);
}

function paintColony(c: Canvas, look: PhaseLook, rng: Rng, domesOpen: boolean): void {
  const { x0, y0, x1, y1 } = COLONY;
  // The paved yard inside the wall, a touch lighter than the valley.
  for (let y = y0 + 1; y < y1; y++)
    for (let x = x0 + 1; x < x1; x++) blend(c, x, y, look.ground[2], 0.18);
  for (let x = x0; x <= x1; x++) {
    if (!gate(x, y0)) put(c, x, y0, 'steel.2');
    if (!gate(x, y1)) put(c, x, y1, 'steel.2');
  }
  for (let y = y0; y <= y1; y++) {
    if (!gate(x0, y)) put(c, x0, y, 'steel.2');
    if (!gate(x1, y)) put(c, x1, y, 'steel.2');
  }
  // The Admin Plaza: a 12×10 paved square, three billboard ticks on its north side.
  for (let y = PLAZA.y - 5; y < PLAZA.y + 5; y++) {
    for (let x = PLAZA.x - 6; x < PLAZA.x + 6; x++) put(c, x, y, look.path[4]);
  }
  for (const dx of [-4, 0, 4]) put(c, PLAZA.x + dx, PLAZA.y - 6, 'gold.4');
  // Domes clear of the plaza, the walk's trail, the roads in, and each other.
  const placed: { x: number; y: number; r: number }[] = [];
  const fits = (x: number, y: number, r: number): boolean =>
    (Math.abs(x - PLAZA.x) > 8 + r || Math.abs(y - PLAZA.y) > 7 + r) &&
    Math.abs(x - trailX(y)) >= r + 3 &&
    !(Math.abs(y - 240) < r + 3 && x > 396) &&
    x - r > x0 + 2 &&
    x + r < x1 - 2 &&
    y - r > y0 + 2 &&
    y + r < y1 - 2 &&
    placed.every((d) => Math.hypot(d.x - x, d.y - y) >= d.r + r + 3);
  // Half the windows go dark in Act III (a fixed half: the layout never depends on the phase).
  const lit = (d: { x: number; y: number }): boolean =>
    look.windows === 'lit' || (look.windows === 'emergency' && hash(d.x, d.y) < 0.5);
  // Dome Row along the south wall.
  for (let x = x0 + 7; x < x1 - 4; x += 10) {
    const r = x % 20 < 10 ? 3 : 2;
    if (!fits(x, y1 - 6, r)) continue;
    placed.push({ x, y: y1 - 6, r });
  }
  const row = placed.length;
  // The rest in clusters around a few squares.
  for (let i = 0; i < 260 && placed.length < 52; i++) {
    const r = 2 + nextInt(rng, 2);
    const x = x0 + 6 + nextInt(rng, x1 - x0 - 12);
    const y = y0 + 6 + nextInt(rng, y1 - y0 - 22);
    if (noise(x, y, 18) < 0.42 || !fits(x, y, r)) continue;
    placed.push({ x, y, r });
  }
  placed.forEach((d, i) =>
    paintDome(c, d.x, d.y, d.r, look, look.windows !== 'none' && lit(d), domesOpen && i < row),
  );
}

/** A peak: a jagged triangle in the clay ramp, its south-east side in shade. */
function paintPeak(c: Canvas, bx: number, by: number, h: number, look: PhaseLook, rng: Rng): void {
  const half = Math.round(h * 0.75);
  for (let dy = 0; dy < h; dy++) {
    const y = by - dy;
    const span = Math.round(half * (1 - dy / h)) + (nextInt(rng, 3) === 0 ? 1 : 0);
    for (let dx = -span; dx <= span; dx++) {
      const x = bx + dx;
      const lit = dx < 0;
      put(c, x, y, lit ? look.clay[dy > h * 0.7 ? 3 : 2] : look.clay[1]);
      if (!lit && dx > span / 2) blend(c, x, y, look.shade, 0.5);
    }
    put(c, bx - span - 1, y, look.clay[0]);
  }
  put(c, bx, by - h, look.light);
}

function paintSpires(c: Canvas, look: PhaseLook, rng: Rng, glints: Rng): void {
  const peaks: { x: number; y: number; h: number }[] = [];
  for (let x = 196; x < 620; x += 9 + nextInt(rng, 7)) {
    const edge = ridgeEdge(x);
    const top = x < 204 ? 56 : x > 508 ? 44 : 40;
    const y = Math.round(top + nextFloat(rng) * (edge - 6 - top));
    const h = 8 + nextInt(rng, 13);
    const near = PEAK_CLEAR.some((p) => Math.hypot(p.x - x, p.y - (y - h / 2)) < p.r + h / 2);
    if (near || y - h < 30) continue;
    peaks.push({ x, y, h });
  }
  peaks.sort((a, b) => a.y - b.y);
  for (const p of peaks) paintPeak(c, p.x, p.y, p.h, look, rng);
  if (!look.glints) return;
  // Crystal growing on the lit faces (its own stream, so the peaks stand where they always do):
  // a bright point with a dimmer one under it, on a little over half the peaks.
  for (const p of peaks) {
    if (nextFloat(glints) > 0.55) continue;
    const x = p.x - 1 - nextInt(glints, Math.max(1, Math.round(p.h / 4)));
    const y = p.y - Math.round(p.h * (0.3 + 0.4 * nextFloat(glints)));
    put(c, x, y, 'act3.crystal.3');
    put(c, x, y + 1, 'act3.crystal.2');
  }
}

function paintDerrick(c: Canvas, x: number, y: number, look: PhaseLook, dark: boolean): void {
  // 5×7: legs, cross-braces, and the light on top.
  const rows = ['..o..', '..s..', '.s.s.', '.sss.', '.s.s.', 's.s.s', 's...s'];
  rows.forEach((row, dy) => {
    row.split('').forEach((ch, dx) => {
      const px = x - 2 + dx;
      const py = y - 6 + dy;
      if (ch === 'o') put(c, px, py, 'orange.3');
      else if (ch === 's') put(c, px, py, dark ? 'ink.1' : dx < 2 ? 'steel.3' : 'steel.2');
    });
  });
  void look;
}

function paintRigs(c: Canvas, look: PhaseLook): void {
  for (const d of RIDGE_DERRICKS) paintDerrick(c, d.x, d.y, look, false);
  for (const d of DIGGING_DERRICKS) paintDerrick(c, d.x, d.y, look, look.silhouette);
  // Rig Nine's bore: a dark mouth on a grime spoil heap, with a few cold violet pixels in it.
  for (let y = -6; y <= 6; y++) {
    for (let x = -11; x <= 11; x++) {
      if ((x / 11) ** 2 + (y / 6) ** 2 > 1) continue;
      put(c, BORE.x + x, BORE.y + 3 + y, y < -2 ? 'grime.3' : x + y > 6 ? 'grime.1' : 'grime.2');
    }
  }
  for (let y = 0; y < 6; y++)
    for (let x = 0; x < 9; x++) {
      const corner = (x === 0 || x === 8) && (y === 0 || y === 5);
      if (!corner) put(c, BORE.x - 4 + x, BORE.y - 3 + y, 'ink.0');
    }
  for (const [dx, dy] of [
    [-9, 4],
    [7, 6],
    [10, 1],
    [-5, 7],
  ] as const) {
    put(c, BORE.x + dx, BORE.y + 3 + dy, 'violet.3');
  }
}

/** Okonkwo's Gap (A3M3's node at 372,136): the notch it cuts in the ridge above its node. */
const GAP = { x: 372, foot: 106 } as const;
/** The Long Night's shelters (A3M4's node at 296,248): three bunker humps over the node. */
const SHELTERS = { x: 283, y: 229 } as const;

/**
 * Act III's landmarks (T631; art-direction § 10): the Gap, a dark notch cut down into the ridge's
 * lowest edge with its two doors as lit ticks at its foot (the convoy's `gold.3`, the warren's
 * `green.3`), its walls catching the light; the shelters, three low flat steel bunkers, each with a
 * dark doorway under a warm `gold.3` lamp (the domes round them burn emergency red). Both sit clear
 * of their nodes' glyphs and name plates.
 */
function paintAct3Landmarks(c: Canvas, look: PhaseLook): void {
  const notch = 14;
  for (let dy = 0; dy < notch; dy++) {
    const y = GAP.foot - dy;
    const span = Math.max(1, Math.round(4 * (1 - dy / notch)) + 1);
    for (let dx = -span; dx <= span; dx++) put(c, GAP.x + dx, y, 'ink.0');
    // The cut's walls catch the moonlight: the west face lit, the east one a step down.
    put(c, GAP.x - span - 1, y, look.clay[3]);
    put(c, GAP.x + span + 1, y, look.clay[2]);
  }
  for (const dy of [0, 1]) {
    put(c, GAP.x - 3, GAP.foot + 1 + dy, 'gold.3');
    put(c, GAP.x + 3, GAP.foot + 1 + dy, 'green.3');
  }
  for (let i = 0; i < 3; i++) {
    const bx = SHELTERS.x + i * 9;
    const rows = ['.sssss.', 'sssssss', 'sss.sss'];
    rows.forEach((row, dy) => {
      row.split('').forEach((ch, dx) => {
        if (ch !== 's') return;
        put(c, bx + dx, SHELTERS.y + dy, dy === 0 ? 'steel.3' : dx < 3 ? 'steel.2' : 'steel.1');
      });
    });
    put(c, bx + 3, SHELTERS.y + 2, 'ink.0');
    put(c, bx + 3, SHELTERS.y + 1, 'gold.3');
  }
}

/** The vats' centres from the plant's. */
export const VATS = [
  { x: -14, y: 6 },
  { x: 24, y: 6 },
  { x: -26, y: 2 },
] as const;

/**
 * The vats by phase and story (art-direction § 10): by day and dusk a `violet.3` core with one
 * `violet.4` pixel; through the Long Night at full blaze, the whole core `violet.4` in a dithered
 * `violet.2` halo (A3M5's maximum throughput); once A3M5 is won, opened and cold, an `ink.0` core
 * in a `steel.1` ring with nothing burning.
 */
type VatLook = 'day' | 'blaze' | 'dark';

function paintPlant(c: Canvas, vats: VatLook): void {
  // Gold seams in the cliff face above it.
  for (const [dx, dy, col] of [
    [-22, -20, 'pink.3'],
    [-21, -19, 'gold.4'],
    [-6, -24, 'gold.4'],
    [12, -21, 'pink.3'],
    [13, -22, 'gold.4'],
    [26, -18, 'pink.3'],
  ] as const) {
    put(c, PLANT.x + dx, PLANT.y + dy, col);
  }
  const blocks = [
    { x: -20, y: -9, w: 11, h: 8 },
    { x: -4, y: 6, w: 13, h: 7 },
    { x: 11, y: -8, w: 9, h: 9 },
  ];
  for (const b of blocks) {
    for (let y = 0; y < b.h; y++) {
      for (let x = 0; x < b.w; x++) {
        const edge = x === b.w - 1 || y === b.h - 1;
        put(
          c,
          PLANT.x + b.x + x,
          PLANT.y + b.y + y,
          edge ? 'steel.1' : y === 0 ? 'steel.3' : 'steel.2',
        );
      }
    }
  }
  // The stack.
  for (let y = -16; y < -8; y++) put(c, PLANT.x + 17, PLANT.y + y, 'steel.3');
  // Three 5 px vats: violet cores, one brighter pixel each (VatLook).
  const core: ColorName = vats === 'day' ? 'violet.3' : vats === 'blaze' ? 'violet.4' : 'ink.0';
  for (const v of VATS) {
    const vx = PLANT.x + v.x;
    const vy = PLANT.y + v.y;
    if (vats === 'blaze') {
      for (let y = -4; y <= 4; y++) {
        for (let x = -4; x <= 4; x++) {
          const d = Math.hypot(x, y);
          if (d > 2.9 && d <= 4.2 && bayer(vx + x, vy + y) < 7) put(c, vx + x, vy + y, 'violet.2');
        }
      }
    }
    for (let y = -2; y <= 2; y++) {
      for (let x = -2; x <= 2; x++) {
        if (Math.abs(x) === 2 && Math.abs(y) === 2) continue;
        const ring = Math.abs(x) === 2 || Math.abs(y) === 2;
        const rim: ColorName = vats === 'dark' ? 'steel.1' : 'steel.2';
        put(c, vx + x, vy + y, ring ? rim : core);
      }
    }
    if (vats === 'day') put(c, vx, vy - 1, 'violet.4');
  }
}

function paintNorthBand(c: Canvas, look: PhaseLook): void {
  // Its depth by column: the phase's band, with a wedge over the Diggings' ridge tops.
  const depthAt = (x: number): number => {
    const w = Math.max(0, 1 - Math.abs(x - 504) / 44);
    return Math.round(look.band + (look.wedge - look.band) * w);
  };
  for (let x = 0; x < W; x++) {
    const d = depthAt(x);
    for (let y = 0; y < d + 8 && y < H; y++) {
      if (y >= d && bayer(x, y) >= ((d + 8 - y) / 8) * 16) continue;
      put(c, x, y, (x + y) % 4 === 0 ? 'ink.2' : 'ink.0');
    }
  }
  if (look.cracks) {
    for (const crack of [
      [
        { x: 250, y: 72 },
        { x: 258, y: 104 },
        { x: 252, y: 140 },
      ],
      [
        { x: 340, y: 72 },
        { x: 330, y: 110 },
      ],
    ]) {
      polylinePixels(crack).forEach((p, i) =>
        put(c, p.x, p.y, i % 3 === 0 ? 'violet.3' : 'violet.2'),
      );
    }
  }
  if (look.glow) {
    for (let y = -4; y <= 4; y++) {
      for (let x = -4; x <= 4; x++) {
        if (Math.hypot(x, y) > 4.5) continue;
        if (bayer(x + 412, y + 60) < 8)
          put(c, 412 + x, 60 + y, (x + y) % 2 === 0 ? 'gold.3' : 'pink.3');
      }
    }
  }
}

function paintEdges(c: Canvas): void {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const d = Math.min(x, W - 1 - x, H - 1 - y);
      if (d < 4 && bayer(x, y) >= d * 4) put(c, x, y, 'ink.0');
    }
  }
}

/** How far short of a node's glyph centre a leg stops: the glyph's half-width plus 6 px. */
export const LEG_STOP = 12;

/** Dashed legs: 2 on, 2 off, in whole pixels, stopping LEG_STOP short of each end. */
function paintLegs(c: Canvas, legs: readonly ChartLeg[], accent: ColorName): void {
  for (const leg of legs) {
    const px = linePixels(leg.from, leg.to);
    let n = 0;
    for (const p of px) {
      const near =
        Math.hypot(p.x - leg.from.x, p.y - leg.from.y) < LEG_STOP ||
        Math.hypot(p.x - leg.to.x, p.y - leg.to.y) < LEG_STOP;
      if (near) continue;
      if (n % 4 < 2) put(c, p.x, p.y, leg.accent ? accent : 'steel.3');
      n++;
    }
  }
}

/**
 * The chart for a phase, its legs, and what the won maps changed on it (`STAR_MAP_CHANGES`): a
 * 640×360 opaque image.
 *
 * `ending` (T843; the post-game chart, T863 passes it): C5's answer, read only in the `dawn` phase.
 * It paints the first morning's light and the ending's landmarks (content/sprites/starmap/dawn.ts):
 * `stay`, the Long Walk open and gold through Wayside with Skitterkin walking it; `go`, the colony
 * unlit and one freighter's trail leaving east. Omitted or null (the finale won before C5 was
 * asked), the light alone.
 */
export function starMapChart(
  phase: StarMapPhase,
  legs: readonly ChartLeg[] = [],
  changes: readonly StarMapChange[] = [],
  ending: StarMapEnding | null = null,
): RgbaImage {
  const base = PHASE_LOOKS[phase];
  const colony = phase === 'dawn' && ending !== null ? DAWN_ENDING_COLONY[ending] : null;
  const look: PhaseLook = colony === null ? base : { ...base, windows: colony.windows };
  const night = phase === 'act3' || phase === 'dawn';
  const c: Canvas = { data: new Uint8ClampedArray(W * H * 4) };
  paintRelief(c, look, stream(1));
  paintGrid(c, look);
  paintLowlands(c, stream(2));
  paintPreserve(c);
  paintTerraces(c, look);
  paintLongWalk(c, look);
  paintRoads(c, look);
  paintColony(c, look, stream(3), (colony?.domesOpen ?? true) && changes.includes('domes_open'));
  paintSpires(c, look, stream(4), stream(5));
  paintRigs(c, look);
  paintPlant(c, changes.includes('plant_dark') ? 'dark' : night ? 'blaze' : 'day');
  if (night) paintAct3Landmarks(c, look);
  if (phase === 'dawn') paintDawn(c, ending);
  if (look.tint > 0) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) blend(c, x, y, look.shade, look.tint);
  }
  paintNorthBand(c, look);
  paintEdges(c);
  paintLegs(c, legs, look.accent);
  return { w: W, h: H, data: c.data };
}
