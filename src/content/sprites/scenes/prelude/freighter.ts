// The haul (`scene.freighter`; act1.md § Prelude · Arrival, shot 2; art-direction § 6, *The
// prelude's stills*): the camera pulls back and shot 1's ad is a small screen on the bulkhead of the
// Everglow freighter *Positive Outlook*, day 61. A dark cargo hold, ink and steel with Everglow's
// teal trim, lit warm by the ad alone: the screen (the ad in miniature, 48×27, Evie's billboard face
// 1:1), its glow on the bulkhead, ribs and the trim. On the left a row of crash seats, the
// Technician strapped into the middle one, the helmet far too big, the antenna bent over, the
// boots well short of the deck; above the seats sixty-one days scratched in tallies. On the right
// the cargo, strapped down: crates stencilled CONFETTI, one HELMETS, a corner split and a little
// confetti on the deck. A porthole of stars. One frame, `cabin`.
import { textPixels, textWidth } from '../../font3x5.ts';
import type { CharGrid } from '../../helpers.ts';
import { hash01, plot, stamp } from '../../helpers.ts';
import {
  bayer,
  defineScene,
  dithered,
  eachOnLine,
  fill,
  SCENE_H,
  SCENE_W,
  sceneGrid,
} from '../sceneKit.ts';

/*
 * Palette `act1`: 2–4 `act1.grass` (the ad's land), c `act1.clay`, + pink.3, * pink.4, k ink.0,
 * x `act1.shade`.
 * Custom: A–D ink.1–ink.4, E–I steel.0–steel.4, J/K white.0/white.1, L–O teal.1–teal.4,
 * P–S gold.1–gold.4, T–V orange.1–orange.3, W/X blue.1/blue.2 (the visor), Y/Z `act1.sky.1`/
 * `act1.sky.2` (the ad's sky, the visor's reflection).
 */
const LEGEND = {
  A: 'ink.1',
  B: 'ink.2',
  C: 'ink.3',
  D: 'ink.4',
  E: 'steel.0',
  F: 'steel.1',
  G: 'steel.2',
  H: 'steel.3',
  I: 'steel.4',
  J: 'white.0',
  K: 'white.1',
  L: 'teal.1',
  M: 'teal.2',
  N: 'teal.3',
  O: 'teal.4',
  P: 'gold.1',
  Q: 'gold.2',
  R: 'gold.3',
  S: 'gold.4',
  T: 'orange.1',
  U: 'orange.2',
  V: 'orange.3',
  W: 'blue.1',
  X: 'blue.2',
  Y: 'act1.sky.1',
  Z: 'act1.sky.2',
} as const;

/** The ad's screen: the picture's top-left and size (the ad in miniature). */
export const FREIGHTER_SCREEN = { x: 136, y: 20, w: 48, h: 27 } as const;
/** The deck's first row. */
const DECK_Y = 136;
/** The Technician's helmet: centre and radius. */
const HELMET = { x: 67, y: 64, r: 15 } as const;

/** The ad's light at (x, y), 1 at the screen falling to 0 across the hold. */
function glow(x: number, y: number): number {
  const sx = FREIGHTER_SCREEN.x + FREIGHTER_SCREEN.w / 2;
  const sy = FREIGHTER_SCREEN.y + FREIGHTER_SCREEN.h / 2;
  return Math.max(0, 1 - Math.hypot(x - sx, (y - sy) * 1.25) / 120);
}

/** A surface's pixel lit by the ad: dark steel, lighter toward the screen. */
function lit(x: number, y: number, base: number): string {
  const w = glow(x, y);
  return dithered(['k', 'A', 'B', 'C', 'E', 'F'], Math.min(1, base + w * w * 0.5), x, y);
}

/** An edge turned to the screen: steel in the dark, catching the ad's warm light near it. */
function edge(x: number, y: number): string {
  const w = glow(x, y);
  return w > 0.62 ? 'Q' : w > 0.5 ? 'P' : w > 0.38 ? 'T' : lit(x, y, 0.5);
}

/** The bulkhead: panels between ribs, two seams, the teal trim, the ceiling's pipe and lights. */
function paintHold(g: CharGrid): void {
  fill(g, 0, 0, SCENE_W - 1, DECK_Y - 1, (x, y) => {
    // Ribs: 4 px beams, their face toward the screen a step lighter.
    const rib = (x + 6) % 46;
    if (rib < 4) {
      const toward = x < 160 ? rib === 3 : rib === 0;
      return toward ? edge(x, y) : lit(x, y, 0.26);
    }
    if (y === 62 || y === 63) return y === 62 ? (glow(x, y) > 0.3 ? 'N' : 'M') : 'L';
    if (y === 104) return lit(x, y, 0.08);
    if (y === 105) return edge(x, y);
    // Rivets along the seams.
    if ((y === 58 || y === 108) && (x + 2) % 8 === 0) return edge(x, y);
    return lit(x, y, 0.22 + (hash01(x >> 4, y >> 4, 3) - 0.5) * 0.06);
  });
  // The ceiling: a pipe along it, lit on top, and teal trim lights.
  fill(g, 0, 0, SCENE_W - 1, 9, (x, y) => {
    if (y <= 2) return 'k';
    if (y === 4) return edge(x, y);
    if (y === 5 || y === 6) return lit(x, y, 0.3);
    if (y === 9) return x % 32 < 3 ? (x % 32 === 1 ? 'O' : 'N') : 'A';
    return 'A';
  });
  // The deck: plates in rows, the light pooled under the screen.
  fill(g, 0, DECK_Y, SCENE_W - 1, SCENE_H - 1, (x, y) => {
    if (y === DECK_Y) return edge(x, y - 50);
    const row = (y - DECK_Y) % 9;
    if (row === 0) return 'k';
    if (row === 1) return lit(x, y - 60, 0.24);
    return dithered(['k', 'A', 'B'], 0.6 - (y - DECK_Y) / 60 + glow(x, y - 70) * 0.4, x, y);
  });
}

/** Evie's billboard face (`prop.billboard`'s `beaming`, 1:1): its sun and smile, at (x, y). */
function paintEvieFace(g: CharGrid, x0: number, y0: number): void {
  for (let y = -5; y <= 5; y++) {
    for (let x = -5; x <= 5; x++) {
      const d = Math.hypot(x + 0.5, y + 0.5 - 0.5);
      if (d > 5) continue;
      plot(g, x0 + x, y0 + y, d > 4.2 ? 'Q' : d > 3.4 ? 'R' : 'S');
    }
  }
  plot(g, x0 - 2, y0 - 2, 'k');
  plot(g, x0 + 1, y0 - 2, 'k');
  stamp(g, x0 - 3, y0, ['k....k', '.kkkk.']);
}

/**
 * The ad in miniature on its screen (shot 1 at 48×27): the cyan sky's sunburst, Evie, the two pink
 * ribbons (their words too small to read: white dashes), the dome, the terraces, the starburst.
 */
export function paintMiniAd(g: CharGrid, x0: number, y0: number): void {
  const { w, h } = FREIGHTER_SCREEN;
  const ex = x0 + 11;
  const ey = y0 + 11;
  fill(g, x0, y0, x0 + w - 1, y0 + h - 1, (x, y) => {
    const a = Math.atan2(y - ey, x - ex);
    const wedge = Math.floor(((a + Math.PI) / (2 * Math.PI)) * 14) % 2 === 0;
    return wedge ? 'Z' : 'Y';
  });
  // The land: terraces and a clay riser.
  fill(g, x0, y0 + 19, x0 + w - 1, y0 + h - 1, (x, y) => {
    const t = y - (y0 + 19) - Math.round(Math.sin((x - x0) * 0.2));
    if (t < 0) return null;
    return t === 0 || t === 4 ? '4' : t === 3 || t === 7 ? 'c' : '3';
  });
  // Evie's rays: four short strokes.
  for (const [dx, dy] of [
    [0, -7],
    [0, 7],
    [-7, 0],
    [7, 0],
    [-5, -5],
    [5, -5],
    [-5, 5],
    [5, 5],
  ] as const) {
    plot(g, ex + dx, ey + dy, 'R');
  }
  paintEvieFace(g, ex, ey);
  // The ribbons.
  for (const [rx, ry, len] of [
    [22, 3, 20],
    [20, 9, 24],
  ] as const) {
    for (let x = 0; x < len; x++) {
      for (let y = 0; y < 5; y++) plot(g, x0 + rx + x, y0 + ry + y, y === 4 ? 'U' : '+');
    }
    for (let x = 2; x < len - 2; x++) if (x % 4 !== 3) plot(g, x0 + rx + x, y0 + ry + 2, 'K');
  }
  // The dome on the terraces: white, a teal band, a green window.
  for (let y = -7; y < 0; y++) {
    for (let x = -9; x <= 9; x++) {
      if ((x / 9.5) ** 2 + (y / 7.5) ** 2 > 1) continue;
      plot(g, x0 + 34 + x, y0 + 21 + y, x < 2 ? 'K' : 'I');
    }
  }
  for (let x = -8; x <= 8; x++) plot(g, x0 + 34 + x, y0 + 19, 'N');
  plot(g, x0 + 31, y0 + 16, '3');
  plot(g, x0 + 32, y0 + 16, '4');
  plot(g, x0 + 31, y0 + 17, '2');
  plot(g, x0 + 32, y0 + 17, '3');
  // The starburst and a sparkle.
  for (const [dx, dy] of [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
    [-1, 0],
    [2, 1],
    [0, -1],
    [1, 2],
  ] as const) {
    plot(g, x0 + 44 + dx, y0 + 16 + dy, 'V');
  }
  plot(g, x0 + 4, y0 + 3, 'K');
  plot(g, x0 + 18, y0 + 17, 'K');
}

/** The screen: a steel bezel with a teal lip, brackets to the bulkhead, the ad on it. */
function paintScreen(g: CharGrid): void {
  const { x, y, w, h } = FREIGHTER_SCREEN;
  // The light spilling off the screen onto the bulkhead round it: warm, thinning out.
  fill(g, x - 12, y - 10, x + w + 11, y + h + 12, (px, py) => {
    const d = Math.max(x - 3 - px, px - (x + w + 2), y - 3 - py, py - (y + h + 2));
    if (d <= 0) return null;
    const v = 1 - d / 8;
    if (bayer(px, py) >= v * v * 0.9) return null;
    return d <= 2 ? 'P' : 'T';
  });
  fill(g, x - 3, y - 3, x + w + 2, y + h + 2, (px, py) => {
    const edge = px === x - 3 || px === x + w + 2 || py === y - 3 || py === y + h + 2;
    if (edge) return 'k';
    if (py === y + h + 1) return 'N';
    return py < y ? 'G' : 'F';
  });
  // Brackets up to the ceiling's pipe.
  for (const bx of [x + 6, x + w - 7]) {
    for (let by = 7; by < y - 3; by++) {
      plot(g, bx, by, 'G');
      plot(g, bx + 1, by, 'E');
    }
  }
  paintMiniAd(g, x, y);
  // The screen's own glare in its top corner.
  plot(g, x + 1, y + 1, 'K');
  plot(g, x + 2, y + 1, 'K');
  plot(g, x + 1, y + 2, 'K');
}

/** Sixty-one days in tallies, scratched into the panel over the seats. */
function paintTallies(g: CharGrid): void {
  for (let day = 0; day < 61; day++) {
    const group = Math.floor(day / 5);
    const k = day % 5;
    const gx = 14 + (group % 6) * 11;
    const gy = 26 + Math.floor(group / 6) * 12;
    if (k < 4) {
      for (let y = 0; y < 7; y++)
        plot(g, gx + k * 2, gy + y + (k % 2 === 0 ? 0 : y === 6 ? -1 : 0), 'H');
    } else {
      eachOnLine(gx - 1, gy + 5, gx + 7, gy + 1, (px, py) => plot(g, px, py, 'I'));
    }
  }
}

/** One crash seat: a padded back and headrest in teal, steel frame, a seat pan, a pedestal. */
function paintSeat(g: CharGrid, x0: number): void {
  const w = 26;
  // The pedestal to the deck.
  fill(g, x0 + 10, 113, x0 + 15, DECK_Y - 1, (x) =>
    x === x0 + 10 ? 'k' : x === x0 + 11 ? 'F' : 'E',
  );
  // The back and headrest: a steel frame round teal padding, quilted.
  fill(g, x0, 68, x0 + w - 1, 112, (x, y) => {
    const fx = x - x0;
    if (y < 76 && (fx < 6 || fx > w - 7)) return null;
    const rim = fx === 0 || fx === w - 1 || y === 68 || (y === 76 && (fx < 7 || fx > w - 8));
    if (rim) return 'k';
    if (fx === 1 || fx === w - 2 || y === 69) return lit(x, y, 0.4);
    const quilt = (y - 70) % 8 === 0 || fx === 13;
    return quilt ? 'A' : dithered(['A', 'L', 'M'], 0.35 + glow(x, y) * 0.6, x, y);
  });
  // The seat pan, seen edge on.
  fill(g, x0 - 2, 110, x0 + w + 1, 113, (x, y) =>
    y === 110 ? lit(x, y, 0.5) : y === 113 ? 'k' : lit(x, y, 0.3),
  );
}

/**
 * The Technician, strapped in, facing us: the oversized Everglow helmet (white, a teal stripe, the
 * mirrored visor down and full of the ad's light), its antenna bent over and tipped pink, a small
 * teal jumpsuit under it in an orange harness, arms on the straps, boots dangling short of the deck.
 */
function paintTechnician(g: CharGrid): void {
  const { x: hx, y: hy, r } = HELMET;
  // The body: shoulders tucked under the helmet's rim, the harness crossing them.
  fill(g, hx - 9, hy + 12, hx + 9, 110, (x, y) => {
    const t = y - (hy + 12);
    const half = Math.min(9, 6 + t * 0.6);
    const dx = x - hx;
    if (Math.abs(dx) > half) return null;
    if (Math.abs(dx) >= half - 0.5) return 'k';
    const strap = Math.abs(Math.abs(dx) - (5 - t * 0.12)) < 1.2 && y < 100;
    if (strap) return dx > 0 ? 'V' : 'U';
    if (y >= 100 && y <= 101) return y === 100 ? 'V' : 'U';
    return dithered(['L', 'M', 'N'], 0.35 + glow(x, y) * 0.8 - (dx < 0 ? 0.15 : 0), x, y);
  });
  // The harness buckle.
  plot(g, hx, 100, 'I');
  plot(g, hx + 1, 100, 'H');
  // Arms on the straps: two teal sleeves, white gloves gripping.
  for (const side of [-1, 1] as const) {
    eachOnLine(hx + side * 8, hy + 16, hx + side * 9, hy + 27, (x, y) => {
      plot(g, x, y, side > 0 ? 'N' : 'M');
      plot(g, x + side, y, 'k');
    });
    plot(g, hx + side * 5, hy + 28, 'J');
    plot(g, hx + side * 6, hy + 28, 'J');
    plot(g, hx + side * 5, hy + 29, 'I');
  }
  // The legs over the seat's edge and the boots, dangling.
  for (const lx of [hx - 6, hx + 2]) {
    fill(g, lx, 112, lx + 4, 122, (x) =>
      x === lx || x === lx + 4 ? 'k' : x === lx + 3 ? 'M' : 'L',
    );
    fill(g, lx - 1, 123, lx + 5, 127, (x, y) =>
      y === 127 || x === lx - 1 || x === lx + 5 ? 'k' : y === 123 ? 'G' : 'F',
    );
  }
  // The antenna, bent over under the ceiling of its own weight, tipped pink.
  for (const [ax, ay, bx, by] of [
    [hx - 7, hy - 12, hx - 10, hy - 22],
    [hx - 10, hy - 22, hx - 15, hy - 25],
  ] as const) {
    eachOnLine(ax, ay, bx, by, (x, y) => {
      plot(g, x, y, 'H');
      plot(g, x - 1, y, 'E');
    });
  }
  plot(g, hx - 16, hy - 25, '+');
  plot(g, hx - 17, hy - 25, '+');
  plot(g, hx - 16, hy - 26, '*');
  // The helmet: white, lit from the screen (up and to the right), a teal stripe over the crown.
  for (let y = hy - r; y <= hy + r; y++) {
    for (let x = hx - r; x <= hx + r; x++) {
      const d = Math.hypot(x + 0.5 - hx, (y + 0.5 - hy) * 1.06);
      if (d > r) continue;
      if (d > r - 1) {
        plot(g, x, y, 'k');
        continue;
      }
      const l = ((x - hx) * 0.5 - (y - hy)) / r;
      let ch = dithered(['F', 'G', 'H', 'I', 'J'], 0.5 + l * 0.45, x, y);
      if (Math.abs(x - hx + 1) <= 1 && y < hy - 6) ch = x - hx + 1 === 1 ? 'N' : 'M';
      plot(g, x, y, ch);
    }
  }
  // The visor: a wide dark mirror, its reflection the ad's light: sky, a gold point, the glint.
  for (let y = hy - 5; y <= hy + 8; y++) {
    for (let x = hx - 11; x <= hx + 11; x++) {
      const t = (y - (hy - 5)) / 13;
      const half = 11 - Math.max(0, t - 0.6) * 12;
      if (Math.abs(x - hx) > half) continue;
      const rim = Math.abs(x - hx) > half - 1 || y === hy - 5 || y === hy + 8;
      plot(g, x, y, rim ? 'k' : dithered(['W', 'X', 'Y'], 0.8 - t * 0.9, x, y));
    }
  }
  plot(g, hx + 4, hy - 2, 'R');
  plot(g, hx + 5, hy - 2, 'S');
  plot(g, hx + 4, hy - 1, 'R');
  plot(g, hx - 7, hy - 3, 'K');
  plot(g, hx - 6, hy - 3, 'Z');
  plot(g, hx - 7, hy - 2, 'Z');
}

/** A crate: orange slats in a dark frame, its stencil, lit from the screen's side. */
function paintCrate(
  g: CharGrid,
  x0: number,
  y0: number,
  w: number,
  h: number,
  word: string,
  white = false,
): void {
  fill(g, x0, y0, x0 + w - 1, y0 + h - 1, (x, y) => {
    const fx = x - x0;
    const fy = y - y0;
    if (fx === 0 || fy === 0 || fx === w - 1 || fy === h - 1) return 'k';
    const frame = fx === 1 || fx === w - 2 || fy === 1 || fy === h - 2;
    const v = 0.4 + glow(x, y) * 0.7 - (fx > w - 6 ? 0.2 : 0);
    if (white)
      return frame ? dithered(['E', 'F', 'G'], v, x, y) : dithered(['F', 'G', 'H', 'J'], v, x, y);
    if (frame) return dithered(['T', 'U'], v, x, y);
    return (fy - 2) % 5 === 4 ? 'T' : dithered(['T', 'U', 'V'], v, x, y);
  });
  const tx = x0 + Math.round((w - textWidth(word)) / 2);
  const ty = y0 + Math.round((h - 5) / 2);
  for (const p of textPixels(word, tx, ty)) {
    plot(g, p.x, p.y, white ? 'B' : 'A');
  }
}

/** The cargo, strapped down: CONFETTI crates, a HELMETS crate, a split corner and its spill. */
function paintCargo(g: CharGrid): void {
  const rows: readonly (readonly [number, number, number, number, string, boolean?])[] = [
    [196, 112, 38, 24, 'CONFETTI'],
    [235, 112, 38, 24, 'CONFETTI'],
    [274, 112, 40, 24, 'CONFETTI'],
    [214, 88, 38, 24, 'CONFETTI'],
    [253, 88, 38, 24, 'CONFETTI'],
    [232, 66, 36, 22, 'HELMETS', true],
  ];
  for (const [x, y, w, h, word, white] of rows) paintCrate(g, x, y, w, h, word, white === true);
  // The cargo straps: teal webbing over the stack, buckled at the deck.
  for (const [ax, ay, bx, by] of [
    [196, 98, 268, 72],
    [268, 72, 313, 104],
    [205, 135, 222, 89],
    [300, 135, 288, 89],
  ] as const) {
    eachOnLine(ax, ay, bx, by, (x, y) => {
      plot(g, x, y, 'M');
      plot(g, x, y + 1, 'L');
    });
  }
  // A split corner on the end crate, confetti spilling out onto the deck.
  for (const [x, y] of [
    [312, 113],
    [311, 113],
    [312, 114],
    [313, 115],
  ] as const) {
    plot(g, x, y, 'k');
  }
  const bits = ['+', 'R', 'N', '*', 'K', 'V'] as const;
  for (let i = 0; i < 26; i++) {
    const x = 284 + Math.round(hash01(i, 1, 41) * 34);
    const y = DECK_Y + 1 + Math.round(hash01(i, 2, 41) * hash01(i, 3, 41) * 8);
    plot(g, x, y, bits[i % bits.length]!);
  }
  for (let i = 0; i < 6; i++) plot(g, 313 + (i % 3), 116 + i * 3, bits[i]!);
}

/** A porthole on the hull: a steel ring with bolts round a disc of stars. */
function paintPorthole(g: CharGrid): void {
  const cx = 294;
  const cy = 36;
  for (let y = -12; y <= 12; y++) {
    for (let x = -12; x <= 12; x++) {
      const d = Math.hypot(x, y);
      if (d > 12) continue;
      let ch: string;
      if (d > 11) ch = 'k';
      else if (d > 8.5)
        ch = (Math.atan2(y, x) * 4) % 1 < 0.15 && d > 9.4 && d < 10.4 ? 'H' : x + y < 0 ? 'G' : 'E';
      else if (d > 7.6) ch = 'k';
      else {
        const h = hash01(cx + x, cy + y, 77);
        ch = h < 0.05 ? 'K' : h < 0.1 ? 'H' : x - y > 6 ? 'A' : 'k';
      }
      plot(g, cx + x, cy + y, ch);
    }
  }
  plot(g, cx - 4, cy - 4, 'D');
  plot(g, cx - 3, cy - 5, 'D');
}

/** The ship's name stencilled on the bulkhead under the trim. */
function paintName(g: CharGrid): void {
  const word = 'POSITIVE OUTLOOK';
  const tx = 160 - Math.floor(textWidth(word) / 2);
  for (const p of textPixels(word, tx, 70)) plot(g, p.x, p.y, glow(p.x, p.y) > 0.55 ? 'H' : 'G');
}

function paintFreighter(): Record<string, CharGrid> {
  const g = sceneGrid();
  paintHold(g);
  paintName(g);
  paintTallies(g);
  paintPorthole(g);
  for (const x of [14, 54, 94]) paintSeat(g, x);
  paintCargo(g);
  paintScreen(g);
  paintTechnician(g);
  return { cabin: g };
}

export const sceneFreighter = defineScene({
  id: 'scene.freighter',
  palette: 'act1',
  legend: LEGEND,
  paint: paintFreighter,
});
