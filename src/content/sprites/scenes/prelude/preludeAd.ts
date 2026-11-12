// The ad (`scene.prelude_ad`; act1.md § Prelude · Arrival, shot 1; art-direction § 6, *The
// prelude's stills*): Everglow's public face, full screen, before the camera pulls back to show it
// playing on a freighter's bulkhead. A candy-coloured brochure: a cyan sky in a sunburst of two
// tones, Evie beaming at the left (the billboard's gold sun with its smile, big), BRIGHTER / EVERY
// DAY! on two pink ribbons, a sunlit white dome with a lettuce window on green terraces of pink
// clay, a NOW HIRING! starburst, sparkles everywhere. Frames:
// - `ad`, `ad_1`: the ad, its sparkles twinkling (anim `ad`, 2 fps).
// - `small_print`, `small_print_1`: the same with the small-print crawl across its foot, a glyph
//   further on each step (anim `small_print`, 2 fps). LETTUCE NOT FOR EXPORT is in it.
import { textPixels, textWidth } from '../../font3x5.ts';
import type { CharGrid } from '../../helpers.ts';
import { plot } from '../../helpers.ts';
import { copyGrid, defineScene, dithered, fill, SCENE_W, sceneGrid } from '../sceneKit.ts';

/*
 * Palette `act1`: 0–4 `act1.grass`, a–e `act1.clay`, 5–9 `act1.path`, + pink.3, * pink.4,
 * x `act1.shade`, w `act1.light`, k ink.0.
 * Custom: A–C `act1.sky`, D–F gold.2–gold.4 (Evie), G/H white.0/white.1, I–K steel.2–steel.4,
 * L–O teal.1–teal.4, P/Q pink.1/pink.2, R–T orange.2–orange.4, U–W green.2–green.4 (lettuce),
 * X coral.3 (Evie's cheeks), Y ink.2, Z `act1.water.2` (the window's glass).
 */
export const AD_LEGEND = {
  A: 'act1.sky.0',
  B: 'act1.sky.1',
  C: 'act1.sky.2',
  D: 'gold.2',
  E: 'gold.3',
  F: 'gold.4',
  G: 'white.0',
  H: 'white.1',
  I: 'steel.2',
  J: 'steel.3',
  K: 'steel.4',
  L: 'teal.1',
  M: 'teal.2',
  N: 'teal.3',
  O: 'teal.4',
  P: 'pink.1',
  Q: 'pink.2',
  R: 'orange.2',
  S: 'orange.3',
  T: 'orange.4',
  U: 'green.2',
  V: 'green.3',
  W: 'green.4',
  X: 'coral.3',
  Y: 'ink.2',
  Z: 'act1.water.2',
} as const;

/** Evie: her face's centre and radius (the rays reach past it). */
export const AD_EVIE = { x: 70, y: 66, r: 25 } as const;
/** The dome: its centre at the ring and its half-width and height. */
const DOME = { x: 214, y: 124, rx: 44, ry: 42 } as const;
/** The NOW HIRING! starburst. */
const BADGE = { x: 289, y: 98, r: 19 } as const;
/** The small-print crawl's band (its top row and height). */
export const CRAWL = { y: 118, h: 11 } as const;
/** The terraces' first lip (the land's top at the dome's foot). */
const LAND_Y = 112;

/** The crawl's words, on a loop (the narrator reads the second). */
export const SMALL_PRINT =
  'TERMS APPLY.  LETTUCE NOT FOR EXPORT.  HELMET PROVIDED. ONE SIZE FITS MOST.  SUNSHINE NOT GUARANTEED.  ';

/** The sky: cyan, lighter toward the land, in a two-tone sunburst turning round Evie. */
function skyAt(x: number, y: number): string {
  const a = Math.atan2(y - AD_EVIE.y, x - AD_EVIE.x);
  const wedge = Math.floor(((a + Math.PI) / (2 * Math.PI)) * 22) % 2 === 0;
  const v = 0.12 + (y / LAND_Y) * 0.5 + (wedge ? 0.32 : 0);
  return dithered(['A', 'B', 'C'], Math.min(1, v), x, y);
}

/**
 * Evie's sun (the billboard's face, big): a gold disc, lighter at its heart, its rim a step darker;
 * twelve rays round it, long and short in turn; two tall eyes with a glint, a wide smile with its
 * ends turned up, coral cheeks.
 */
export function paintEvie(g: CharGrid, ex: number, ey: number, r: number): void {
  for (let y = ey - r - 14; y <= ey + r + 14; y++) {
    for (let x = ex - r - 14; x <= ex + r + 14; x++) {
      const d = Math.hypot(x + 0.5 - ex, y + 0.5 - ey);
      if (d <= r) {
        // Lit from the upper left: the heart pale gold, the rim a ring of dark gold.
        const lit = d + (x - ex + (y - ey)) * 0.18;
        plot(g, x, y, d > r - 1.6 ? 'D' : lit < r * 0.55 ? 'F' : 'E');
        continue;
      }
      if (d < r + 2.5) continue;
      const a = Math.atan2(y + 0.5 - ey, x + 0.5 - ex) + Math.PI / 12;
      const k = Math.round(a / (Math.PI / 6));
      const off = Math.abs(a - k * (Math.PI / 6)) * d;
      const long = k % 2 === 0;
      const reach = long ? r + 14 : r + 9;
      const half = 3.6 * (1 - (d - r - 2.5) / (reach - r - 2.5));
      if (d <= reach && off <= half) plot(g, x, y, off > half - 1 ? 'D' : 'E');
    }
  }
  // The eyes: tall ovals with a glint up and to the left.
  for (const sx of [-1, 1] as const) {
    const cx = ex + sx * 8;
    const cy = ey - 5;
    for (let y = -3; y <= 3; y++) {
      for (let x = -1; x <= 1; x++) {
        if (Math.abs(x) === 1 && Math.abs(y) === 3) continue;
        plot(g, cx + x, cy + y, 'k');
      }
    }
    plot(g, cx - 1, cy - 2, 'H');
    // Cheeks: a coral blush under each eye, dithered on the gold.
    for (let y = 3; y <= 5; y++) {
      for (let x = -3; x <= 3; x++) {
        if (Math.abs(x) + Math.abs(y - 4) > 3) continue;
        if ((x + y) % 2 === 0) plot(g, cx + sx * 4 + x, cy + 6 + y, 'X');
      }
    }
  }
  // The smile: a wide arc two pixels thick, its ends turned up (the billboard's `k....k` / `.kkkk.`).
  for (let x = -11; x <= 11; x++) {
    const y = Math.round(ey + 5 + Math.sqrt(Math.max(0, 1 - (x / 12) ** 2)) * 7);
    plot(g, ex + x, y, 'k');
    if (Math.abs(x) < 10) plot(g, ex + x, y - 1, 'k');
    if (Math.abs(x) < 7) plot(g, ex + x, y - 2, 'Q');
  }
  for (const sx of [-1, 1] as const) {
    plot(g, ex + sx * 12, ey + 4, 'k');
    plot(g, ex + sx * 13, ey + 3, 'k');
  }
}

/** A ribbon: a pink band with notched tails, a darker underside, white letters with a shadow. */
function paintRibbon(g: CharGrid, text: string, cx: number, y: number): void {
  const scale = 3;
  const w = textWidth(text, scale);
  const x0 = cx - Math.round(w / 2) - 8;
  const x1 = cx + Math.round(w / 2) + 7;
  const h = 5 * scale + 8;
  for (let yy = 0; yy < h; yy++) {
    const notch = Math.abs(yy - (h - 1) / 2);
    for (let x = x0 - 6; x <= x1 + 6; x++) {
      const tail = x < x0 || x > x1;
      // The tails sit a little lower and darker, cut in a V.
      if (tail && (yy < 3 || (x < x0 ? x - (x0 - 6) : x1 + 6 - x) < 6 - notch * 0.9)) continue;
      const ch = tail ? 'Q' : yy === 0 ? '*' : yy >= h - 2 ? 'Q' : '+';
      plot(g, x, y + yy + (tail ? 2 : 0), ch);
    }
  }
  const tx = cx - Math.round(w / 2);
  const ty = y + 4;
  for (const p of textPixels(text, tx + 1, ty + 1, scale)) plot(g, p.x, p.y, 'P');
  for (const p of textPixels(text, tx, ty, scale)) plot(g, p.x, p.y, 'H');
}

/** The terraces' lips, top to bottom: each a little deeper than the last (nearer, so bigger). */
const TERRACES = [0, 5, 11, 19, 29, 42, 58, 80] as const;

/** Terrace `k`'s lip at column x: contours that sway, more at the front. */
function lipAt(k: number, x: number): number {
  const base = TERRACES[k] ?? 99;
  const sway = Math.sin(x * 0.018 + k * 0.9) * (2 + k * 0.9) + Math.sin(x * 0.047 + k) * 1.2;
  return LAND_Y + base + Math.round(sway);
}

/**
 * The land: far hills hazed into the sky, then green terraces stepping down toward us, each lip lit,
 * a pink clay riser under it, butterhead lettuce in rows along them (bigger on the nearer ones).
 */
function paintLand(g: CharGrid): void {
  // Far hills: soft, pale, behind everything.
  for (let x = 0; x < SCENE_W; x++) {
    const top = 96 + Math.round(Math.sin(x * 0.034 + 2) * 5 + Math.sin(x * 0.011) * 5);
    for (let y = top; y < 180; y++) plot(g, x, y, dithered(['C', '4', '3'], (y - top) / 20, x, y));
  }
  for (let k = 0; k < TERRACES.length - 1; k++) {
    for (let x = 0; x < SCENE_W; x++) {
      const top = lipAt(k, x);
      const next = lipAt(k + 1, x);
      const h = next - top;
      const riser = Math.max(2, Math.round(h * 0.28));
      for (let y = top; y < Math.min(180, next); y++) {
        const t = y - top;
        let ch: string;
        if (t === 0) ch = '4';
        else if (t < h - riser) ch = dithered(['3', '3', '2'], t / (h - riser), x, y);
        else if (t === h - riser) ch = '1';
        else ch = t === h - riser + 1 ? 'd' : dithered(['c', 'b'], (t - (h - riser)) / riser, x, y);
        plot(g, x, y, ch);
      }
      if (k === TERRACES.length - 2) {
        for (let y = next; y < 180; y++) plot(g, x, y, y === next ? '4' : '3');
      }
    }
    // Lettuce in a row on the terrace: rosettes lit on top, bigger and wider apart nearer us.
    const size = k < 2 ? 0 : k < 4 ? 1 : 2;
    const gap = [5, 6, 8, 10, 13, 16, 20][k] ?? 20;
    for (let x = (k * 3) % gap; x < SCENE_W; x += gap) {
      const top = lipAt(k, x);
      const h = lipAt(k + 1, x) - top;
      const y = top + Math.max(2, Math.round((h - Math.round(h * 0.28)) * 0.55));
      for (let dy = -size - 1; dy <= size; dy++) {
        for (let dx = -size - 1; dx <= size + 1; dx++) {
          if (Math.abs(dx) + Math.abs(dy + 0.5) > size + 1.6) continue;
          plot(g, x + dx, y + dy, dy < -size ? 'W' : dy === size ? 'U' : dx < 0 ? 'W' : 'V');
        }
      }
    }
  }
}

/**
 * The dome (`prop.dome` big): white, lit from Evie's side, on a steel ring; a teal band with lit
 * slits; on its lit side a round window, sunlit, with lettuce growing inside in rows.
 */
function paintDome(g: CharGrid): void {
  const { x: cx, y: by, rx, ry } = DOME;
  const inShell = (x: number, y: number): boolean =>
    y < by && Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - by) / ry) <= 1;
  // The ring: a low steel band under the shell, its shadow on the terrace.
  for (let x = cx - rx - 3; x <= cx + rx + 3; x++) {
    const left = x < cx - rx / 3;
    plot(g, x, by + 4, '1');
    plot(g, x, by + 3, 'x');
    plot(g, x, by + 2, left ? 'J' : 'I');
    plot(g, x, by + 1, left ? 'K' : 'J');
    plot(g, x, by, left ? 'G' : 'K');
  }
  for (let y = by - ry - 1; y < by; y++) {
    for (let x = cx - rx - 1; x <= cx + rx + 1; x++) {
      if (!inShell(x, y)) continue;
      if (!inShell(x - 1, y) || !inShell(x + 1, y) || !inShell(x, y - 1)) {
        plot(g, x, y, 'x');
        continue;
      }
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - by) / ry;
      const lit = -0.8 * dx - 0.55 * dy;
      plot(
        g,
        x,
        y,
        dithered(['I', 'J', 'K', 'G', 'H'], Math.max(0, Math.min(1, 0.45 + lit * 0.7)), x, y),
      );
    }
  }
  // The band and its slits.
  for (let x = cx - rx; x <= cx + rx; x++) {
    if (!inShell(x - 1, by - 9) || !inShell(x + 1, by - 9)) continue;
    plot(g, x, by - 10, x < cx - 8 ? 'O' : 'N');
    plot(g, x, by - 9, x < cx - 8 ? 'N' : 'M');
    plot(g, x, by - 8, x < cx + 20 ? 'M' : 'L');
  }
  for (let x = cx - rx + 8; x < cx + rx - 6; x += 10) {
    if (Math.abs(x - (cx - 15)) < 15) continue;
    plot(g, x, by - 14, 'O');
    plot(g, x + 1, by - 14, 'H');
  }
  // The window: a round pane on the lit side, steel-framed, lettuce rows in the sun inside.
  const wx = cx - 15;
  const wy = by - 24;
  const r = 13;
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const d = Math.hypot(x, y);
      if (d > r) continue;
      let ch =
        d > r - 1.2
          ? 'x'
          : d > r - 2.4
            ? 'J'
            : d > r - 3.2
              ? 'H'
              : dithered(['Z', 'C'], (-x - y) / 18 + 0.35, wx + x, wy + y);
      const inner = d <= r - 3.2;
      if (inner && y >= -3) {
        // Rows of butterhead in the window, nearer rows lower and bigger.
        const row = Math.floor((y + 3) / 4);
        const t = (y + 3) % 4;
        const leaf = (x + row * 3 + 40) % 6;
        if (t === 0) ch = leaf < 3 ? 'W' : ch;
        else if (t < 3) ch = leaf === 5 ? 'U' : leaf < 2 ? 'W' : 'V';
        else ch = '2';
      }
      plot(g, wx + x, wy + y, ch);
    }
  }
  // The pane's glare: a diagonal streak.
  for (let k = -6; k <= 0; k++) plot(g, wx + k, wy - 5 - k, 'H');
  for (let k = -5; k <= -2; k++) plot(g, wx + k + 2, wy - 5 - k, 'C');
}

/** The NOW HIRING! starburst: a sixteen-pointed orange star, white words, a lit upper edge. */
function paintBadge(g: CharGrid): void {
  const { x: cx, y: cy, r } = BADGE;
  for (let y = cy - r - 1; y <= cy + r + 1; y++) {
    for (let x = cx - r - 1; x <= cx + r + 1; x++) {
      const a = Math.atan2(y + 0.5 - cy, x + 0.5 - cx);
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const edge = r - 2.6 + Math.abs(Math.cos(a * 8)) * 2.6;
      if (d > edge) continue;
      const lit = x - cx + (y - cy) < -r * 0.6;
      plot(g, x, y, d > edge - 1 ? (lit ? 'T' : 'R') : 'S');
    }
  }
  for (const [word, dy] of [
    ['NOW', -7],
    ['HIRING!', 1],
  ] as const) {
    const tx = cx - Math.floor(textWidth(word) / 2);
    for (const p of textPixels(word, tx + 1, cy + dy + 1)) plot(g, p.x, p.y, 'R');
    for (const p of textPixels(word, tx, cy + dy)) plot(g, p.x, p.y, 'H');
  }
}

/** A sparkle: a white heart and four arms, `size` 1 or 2 long. */
function sparkle(g: CharGrid, x: number, y: number, size: number, arm: string): void {
  plot(g, x, y, 'H');
  for (let k = 1; k <= size; k++) {
    const ch = k === size && size > 1 ? arm : 'H';
    plot(g, x + k, y, ch);
    plot(g, x - k, y, ch);
    plot(g, x, y + k, ch);
    plot(g, x, y - k, ch);
  }
}

/** The ad's sparkles: where, and which twinkle big on the even beat (the rest on the odd). */
const SPARKLES: readonly (readonly [number, number, string])[] = [
  [30, 22, 'F'],
  [116, 30, 'F'],
  [104, 98, 'O'],
  [24, 98, 'F'],
  [168, 70, 'O'],
  [196, 86, 'H'],
  [250, 78, 'O'],
  [304, 60, 'F'],
  [262, 112, 'F'],
  [150, 104, 'O'],
  [10, 60, 'O'],
  [228, 98, 'H'],
];

function paintSparkles(g: CharGrid, beat: 0 | 1): void {
  SPARKLES.forEach(([x, y, arm], i) => {
    const big = (i + beat) % 2 === 0;
    sparkle(g, x, y, big ? 2 : 1, big ? arm : 'H');
    if (!big) plot(g, x, y, arm);
  });
}

/** The wordmark, top left: EVERGLOW GARDENS in white over a teal shadow. */
function paintWordmark(g: CharGrid): void {
  const word = 'EVERGLOW GARDENS';
  for (const p of textPixels(word, 9, 7)) plot(g, p.x, p.y, 'L');
  for (const p of textPixels(word, 8, 6)) plot(g, p.x, p.y, 'H');
  // The Evie sun as the logo's dot.
  for (const [dx, dy, ch] of [
    [0, 0, 'E'],
    [1, 0, 'E'],
    [0, 1, 'D'],
    [1, 1, 'D'],
  ] as const) {
    plot(g, 3 + dx, 7 + dy, ch);
  }
}

/**
 * The small-print crawl: a teal band across the ad's foot, white words on it (font3x5), `shift`
 * glyphs further on than the first step.
 */
export function paintCrawl(g: CharGrid, shift: number): void {
  const { y, h } = CRAWL;
  fill(g, 0, y, SCENE_W - 1, y + h - 1, (_x, yy) =>
    yy === y ? 'N' : yy === y + h - 1 ? 'Y' : 'L',
  );
  const text = SMALL_PRINT.repeat(3);
  const start = -(shift * 4) - 2;
  for (const p of textPixels(text, start, y + 3)) {
    if (p.x >= 0 && p.x < SCENE_W) plot(g, p.x, p.y, 'G');
  }
}

/** Every frame of the ad. */
function paintAd(): Record<string, CharGrid> {
  const g = sceneGrid();
  fill(g, 0, 0, SCENE_W - 1, 179, skyAt);
  paintLand(g);
  paintDome(g);
  paintEvie(g, AD_EVIE.x, AD_EVIE.y, AD_EVIE.r);
  paintRibbon(g, 'BRIGHTER', 214, 12);
  paintRibbon(g, 'EVERY DAY!', 214, 38);
  paintBadge(g);
  paintWordmark(g);
  // A thin teal frame: it is a screen.
  for (let x = 0; x < SCENE_W; x++) {
    plot(g, x, 0, 'L');
    plot(g, x, 179, 'L');
  }
  for (let y = 0; y < 180; y++) {
    plot(g, 0, y, 'L');
    plot(g, SCENE_W - 1, y, 'L');
  }
  const frames: Record<string, CharGrid> = {};
  for (const beat of [0, 1] as const) {
    const ad = copyGrid(g);
    paintSparkles(ad, beat);
    frames[beat === 0 ? 'ad' : 'ad_1'] = ad;
  }
  for (const beat of [0, 1] as const) {
    const sp = copyGrid(frames[beat === 0 ? 'ad' : 'ad_1']!);
    paintCrawl(sp, beat * 2);
    frames[beat === 0 ? 'small_print' : 'small_print_1'] = sp;
  }
  return frames;
}

export const scenePreludeAd = defineScene({
  id: 'scene.prelude_ad',
  palette: 'act1',
  legend: AD_LEGEND,
  paint: paintAd,
  anims: {
    // The sparkles twinkle (2 fps); under the small print the crawl steps on with them.
    ad: { frames: ['ad', 'ad_1'], fps: 2 },
    small_print: { frames: ['small_print', 'small_print_1'], fps: 2 },
  },
});
