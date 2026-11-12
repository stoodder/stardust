// The Sector map at dawn (T843; art-direction § 10, the `dawn` row; design/core-loop.md § 1.1):
// what the post-game chart paints over its `dawn` phase. The post-game screen (from the finale's
// lazy chunk, so this stays out of the initial JS) passes `dawnChartLook(C5's answer)` to the
// chart's generator (ui/screens/starMapChart.ts), which paints:
// - Both endings: the first morning's light washes in from the east edge (a warm dither fading
//   west across the valley); the Halls' mouth's sung glow is the `dawn` look's own.
// - **Stay** (Wayside): the Long Walk runs open through the colony, gold, the domes that stood on it
//   taken down to bare footings beside it, and a few Skitterkin walking it from the north gate to
//   the south (coral points, nobody counting). The region label "Everglow Gardens" reading
//   "Wayside" is the screen's (DOM) work, not the chart's.
// - **Go**: the colony unlit (`DAWN_ENDING_COLONY`: no window burns, Dome Row's open doors dark
//   too), and one freighter trail climbing away from it to the east edge.
// Pure pixels on the chart's RGBA buffer: same input, same pixels; no palette cycles.
import { rgbOf, type ColorName } from '../../palettes/master.ts';

/** C5's answer, as the chart reads it. */
export type StarMapEnding = 'stay' | 'go';

/** The chart's pixel buffer (640 wide, RGBA, row-major), as the generator holds it. */
export interface ChartPixels {
  readonly data: Uint8ClampedArray;
}

const W = 640;
const H = 360;

/** The colony's walls and gates on the chart (art-direction § 10's table). */
const COLONY = { x0: 268, y0: 196, x1: 424, y1: 304 } as const;
const NORTH_GATE = { x: 312, y: 196 } as const;
const SOUTH_GATE = { x: 304, y: 304 } as const;

/**
 * How each ending leaves the colony's domes: Stay keeps the windows lit (and Dome Row open);
 * Go leaves them dark. The generator paints the colony with it.
 */
export const DAWN_ENDING_COLONY: Readonly<
  Record<
    StarMapEnding,
    {
      readonly windows: 'lit' | 'none';
      readonly domes: 'day' | 'night';
      readonly domesOpen: boolean;
    }
  >
> = {
  stay: { windows: 'lit', domes: 'day', domesOpen: true },
  // Left behind: the shells gone dull (the night's steel), nothing burning in them.
  go: { windows: 'none', domes: 'night', domesOpen: false },
};

/** 4×4 ordered dither (0–15), the chart's own. */
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5] as const;
function bayer(x: number, y: number): number {
  return BAYER4[(y & 3) * 4 + (x & 3)] ?? 0;
}

function put(c: ChartPixels, x: number, y: number, color: ColorName): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const { r, g, b } = rgbOf(color);
  const i = (y * W + x) * 4;
  c.data[i] = r;
  c.data[i + 1] = g;
  c.data[i + 2] = b;
  c.data[i + 3] = 255;
}

function blend(c: ChartPixels, x: number, y: number, color: ColorName, a: number): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const { r, g, b } = rgbOf(color);
  const i = (y * W + x) * 4;
  c.data[i] = Math.round(c.data[i]! * (1 - a) + r * a);
  c.data[i + 1] = Math.round(c.data[i + 1]! * (1 - a) + g * a);
  c.data[i + 2] = Math.round(c.data[i + 2]! * (1 - a) + b * a);
}

/** The Long Walk's column inside the colony at row y (north gate to south gate). */
export function walkX(y: number): number {
  return Math.round(
    NORTH_GATE.x +
      ((SOUTH_GATE.x - NORTH_GATE.x) * (y - NORTH_GATE.y)) / (SOUTH_GATE.y - NORTH_GATE.y),
  );
}

/**
 * The first morning's light: a warm wash from the east edge fading west (`finale.ground.3`, up to
 * 36%, its edge broken by the chart's dither so it never bands), stronger toward the north where
 * the faces turn to it.
 */
/** Where the morning's wash starts (it fades in from here to the east edge). */
const MORNING_FROM = 180;

function paintMorning(c: ChartPixels): void {
  for (let y = 0; y < H; y++) {
    for (let x = MORNING_FROM; x < W; x++) {
      const t = (x - MORNING_FROM) / (W - MORNING_FROM);
      const a = t ** 1.5 * (0.36 - (y / H) * 0.12);
      if (a <= 0) continue;
      blend(c, x, y, bayer(x, y) < 8 ? 'finale.ground.3' : 'orange.1', a);
    }
  }
}

/**
 * Stay: the Long Walk open through Wayside. Its trail runs gold from the north gate to the south
 * gate, bare footings (`steel.1` rings) where the domes on it stood, and Skitterkin walking it.
 */
function paintStay(c: ChartPixels): void {
  for (let y = COLONY.y0 + 1; y < COLONY.y1; y++) {
    const x = walkX(y);
    // Clear a lane two pixels either side of the trail, then the trail in gold, 1 on 1 off.
    for (let dx = -2; dx <= 2; dx++) blend(c, x + dx, y, 'finale.ground.2', 0.5);
    if (y % 2 === 0) put(c, x, y, 'gold.3');
  }
  // The footings, pane by pane taken down: small rings beside the trail.
  for (const [dy, side] of [
    [16, -1],
    [34, 1],
    [52, -1],
    [70, 1],
    [88, -1],
  ] as const) {
    const y = COLONY.y0 + dy;
    const cx = walkX(y) + side * 6;
    for (const [ox, oy] of [
      [-1, -1],
      [0, -1],
      [1, -1],
      [-1, 0],
      [1, 0],
      [-1, 1],
      [0, 1],
      [1, 1],
    ] as const) {
      put(c, cx + ox, y + oy, 'steel.1');
    }
  }
  // Skitterkin walking through: a coral body lit on its east side, every so often along the walk,
  // in through the north gate and out of the south one, and a few still coming down from the Gap.
  for (const y of [204, 222, 241, 259, 278, 296]) {
    const x = walkX(y);
    put(c, x, y, 'coral.3');
    put(c, x + 1, y, 'coral.4');
  }
  for (const [x, y] of [
    [346, 160],
    [334, 172],
    [322, 184],
  ] as const) {
    put(c, x, y, 'coral.3');
    put(c, x + 1, y, 'coral.4');
  }
}

/** Go: one freighter's trail climbing away from the colony to the east edge, brightest at its head. */
function paintGo(c: ChartPixels): void {
  const from = { x: 404, y: 270 };
  const to = { x: 628, y: 314 };
  const n = to.x - from.x;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = from.x + i;
    // A gentle climb: the trail bows north on its way out.
    const y = Math.round(from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * 18);
    const color: ColorName =
      t < 0.35 ? 'steel.1' : t < 0.7 ? 'steel.2' : t < 0.92 ? 'steel.3' : 'white.0';
    if (t < 0.35 && i % 2 === 1) continue;
    put(c, x, y, color);
  }
  put(c, to.x, to.y - 1, 'white.1');
  put(c, to.x + 1, to.y - 1, 'white.0');
}

/**
 * Paints the dawn's light and the ending's landmarks over a `dawn` chart (after its landmarks,
 * before its north band, edges, and legs). With no ending (a save that won the finale before C5
 * was asked), only the light.
 */
export function paintDawn(c: ChartPixels, ending: StarMapEnding | null): void {
  paintMorning(c);
  if (ending === 'stay') paintStay(c);
  else if (ending === 'go') paintGo(c);
}

/** What the chart's generator takes for the `dawn` phase: the colony's look and the painter. */
export interface DawnChartLook {
  /** How the ending leaves the domes, or null (no answer yet: the phase's own look). */
  readonly colony: (typeof DAWN_ENDING_COLONY)[StarMapEnding] | null;
  /** Paints the light and the ending's landmarks (`paintDawn`). */
  readonly paint: (c: ChartPixels) => void;
}

/**
 * The `dawn` chart's look for C5's answer. The post-game screen builds it from the finale's lazy
 * chunk and hands it to `starMapChart`, so none of this module reaches the initial JS.
 */
export function dawnChartLook(ending: StarMapEnding | null): DawnChartLook {
  return {
    colony: ending === null ? null : DAWN_ENDING_COLONY[ending],
    paint: (c) => paintDawn(c, ending),
  };
}
