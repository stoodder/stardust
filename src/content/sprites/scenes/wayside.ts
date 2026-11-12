// Wayside (`scene.wayside`; bible.md § 10, Ending A: The Open Perimeter; art-direction § 6, *The
// finale's stills*): the Stay ending's final image, under the HUD's old status line, which the
// epilogue draws over it in the DOM ("PERIMETER STATUS: OPEN", centred in the top third). The
// top third is calm sky, a morning gradient with nothing in it. Below it Everglow Gardens, now
// Wayside, the morning after: Dome Row with a gap where the domes on the Long Walk came down pane
// by pane (the panes stacked by the road, one dome still a bare frame of ribs), the old road open
// through it to the Spires, and the Skitterkin walking it, small and many, nobody counting.
// Colonists stand by the road humming (a note over them), Goldie's lettuce in rows in front, and
// the colony's old Everglow sign with WAYSIDE painted over its name. One frame, `still`.
import { textPixels, textWidth } from '../font3x5.ts';
import type { CharGrid } from '../helpers.ts';
import { at, hash01, plot } from '../helpers.ts';
import { defineScene, dithered, fill, SCENE_H, SCENE_W, sceneGrid } from './sceneKit.ts';

/*
 * Palette `finale`: 0–4 `finale.ground`, w `finale.light` (light skin), 3 (a deeper skin).
 * Custom: A–E `finale.sky`, F–H ink, I–L steel, M/N white, O/P teal.3/teal.2 (Everglow trim, the
 * colonists' jumpsuits), Q/R gold.3/gold.4, S/T/U coral.3/coral.4/coral.2 (the Skitterkin's fur),
 * V/W/X green.2/green.3/green.1 (lettuce), Y orange.3, Z pink.3.
 */
const LEGEND = {
  A: 'finale.sky.0',
  B: 'finale.sky.1',
  C: 'finale.sky.2',
  D: 'finale.sky.3',
  E: 'finale.sky.4',
  F: 'ink.0',
  G: 'ink.1',
  H: 'ink.2',
  I: 'steel.1',
  J: 'steel.2',
  K: 'steel.3',
  L: 'steel.4',
  M: 'white.0',
  N: 'white.1',
  O: 'teal.3',
  P: 'teal.2',
  Q: 'gold.3',
  R: 'gold.4',
  S: 'coral.3',
  T: 'coral.4',
  U: 'coral.2',
  V: 'green.2',
  W: 'green.3',
  X: 'green.1',
  Y: 'orange.3',
  Z: 'pink.3',
} as const;

/** The horizon, and where the road meets it (its vanishing point). */
const HORIZON = 90;
const VANISH = { x: 168, y: HORIZON } as const;
/** The sun, risen clear of the Spires, low in the east. */
const SUN = { x: 270, y: 70, r: 7 } as const;
/** Dome Row's baseline (the domes' feet). */
const ROW_Y = 118;

const SKY = ['A', 'B', 'C', 'D', 'E', 'R'] as const;

function skyAt(x: number, y: number): string {
  const d = Math.hypot(x - SUN.x, y - SUN.y);
  if (d <= SUN.r - 1.5) return 'N';
  if (d <= SUN.r) return 'R';
  const t = Math.max(0, y / HORIZON);
  const glow = Math.max(0, 1 - Math.hypot((x - SUN.x) / 1.8, y - SUN.y) / 90) ** 2;
  return dithered(SKY, Math.min(1, t ** 1.3 * 0.7 + glow * 0.35), x, y);
}

/** The road's half-width at row y (it narrows to the vanishing point). */
function roadHalf(y: number): number {
  return Math.max(0, ((y - VANISH.y) / (SCENE_H - VANISH.y)) * 40);
}

/** The road's centre at row y: it bends a little on its way north. */
function roadX(y: number): number {
  const t = (y - VANISH.y) / (SCENE_H - VANISH.y);
  return VANISH.x + Math.sin(t * 2.4) * 10 - t * 6;
}

function paintLand(g: CharGrid): void {
  fill(g, 0, 0, SCENE_W - 1, HORIZON, skyAt);
  // The Spires far off: hazy violet, their crests catching the morning.
  for (let x = 0; x < SCENE_W; x++) {
    const top = Math.round(
      HORIZON - 6 - Math.abs(Math.sin(x * 0.05 + 1)) * 7 - Math.abs(Math.sin(x * 0.13)) * 3,
    );
    for (let y = top; y <= HORIZON + 2; y++) plot(g, x, y, y === top ? 'D' : 'C');
    if (Math.abs(x - SUN.x) < 40) plot(g, x, top, 'R');
  }
  // The valley floor, nearer and warmer toward us, the road's dust lit down its middle.
  for (let y = HORIZON + 1; y < SCENE_H; y++) {
    const t = (y - HORIZON) / (SCENE_H - HORIZON);
    for (let x = 0; x < SCENE_W; x++) {
      let ch = dithered(['C', '2', '1', '1', '0'], t, x, y);
      // Morning grass in tufts, a few pink blooms.
      const h = hash01(x >> 1, y, 41);
      if (h < 0.04 * t) ch = h < 0.003 ? 'Z' : '2';
      plot(g, x, y, ch);
    }
    const half = roadHalf(y);
    const cx = roadX(y);
    for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
      const k = Math.abs(x - cx) / Math.max(1, half);
      const dust = dithered(['2', '3', '3'], (1 - k) * (0.9 - t * 0.5), x, y);
      plot(g, x, y, k > 0.9 ? '1' : dust);
    }
  }
}

/** A dome: a white shell with pane lines, teal at its foot, a gold-lit door; or bare `ribs`. */
function paintDome(g: CharGrid, cx: number, rx: number, ry: number, ribs = false): void {
  for (let y = ROW_Y - ry; y <= ROW_Y; y++) {
    for (let x = cx - rx; x <= cx + rx; x++) {
      const u = (x - cx) / rx;
      const v = (ROW_Y - y) / ry;
      const r = u * u + v * v;
      if (r > 1) continue;
      const edge = r > 0.86;
      // Panes: a grid of meridians and rings.
      const pane = Math.abs(((Math.asin(Math.max(-1, Math.min(1, u))) * 4) / Math.PI) % 1) < 0.08;
      const ring = Math.abs(((v * 3) % 1) - 0.5) > 0.45;
      if (ribs) {
        // Taken down: only the frame left, the sky and the ground seen through it.
        if (edge || pane || ring) plot(g, x, y, u > 0.3 ? 'L' : 'J');
        continue;
      }
      let ch = u > 0.35 ? 'N' : u > -0.35 ? 'M' : 'L';
      if (pane || ring) ch = u > 0.35 ? 'L' : 'K';
      if (edge) ch = u > 0.2 ? 'M' : 'K';
      if (v < 0.12) ch = u > 0 ? 'O' : 'P';
      plot(g, x, y, ch);
    }
  }
  if (ribs) return;
  // The door, open, warm inside, and a window lit gold.
  for (let y = ROW_Y - 5; y <= ROW_Y; y++) {
    for (let x = cx - 2; x <= cx + 1; x++) plot(g, x, y, y === ROW_Y - 5 ? 'H' : 'Q');
  }
  plot(g, cx - 1, ROW_Y - 3, 'R');
  plot(g, cx + Math.round(rx * 0.45), ROW_Y - Math.round(ry * 0.55), 'Q');
  // Its shadow on the ground, cast west, away from the morning sun.
  for (let x = cx - rx - 6; x < cx - rx + 2; x++) {
    if (at(g, x, ROW_Y + 1) !== '.') plot(g, x, ROW_Y + 1, '1');
  }
}

/** The domes that came down: their panes stacked by the road, leaning in neat piles. */
function paintPanes(g: CharGrid, x0: number, y0: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const x = x0 + i * 2;
    const y = y0 - i;
    for (let dy = 0; dy < 9; dy++) {
      for (let dx = 0; dx < 6; dx++) {
        const edge = dx === 0 || dy === 0 || dx === 5 || dy === 8;
        plot(g, x + dx, y + dy, edge ? (dx === 5 ? 'K' : 'P') : dx < 3 ? 'N' : 'M');
      }
    }
  }
}

/** A walker: a coral fuzzball from behind, its tuft up, scaled by distance (1 near, small far). */
function paintWalker(g: CharGrid, cx: number, foot: number, size: number, note: boolean): void {
  const r = size / 2;
  for (let y = foot - size; y <= foot; y++) {
    for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
      const u = (x - cx) / r;
      const v = (y - (foot - r - 1)) / r;
      const d = u * u + v * v;
      if (d > 1) continue;
      let ch = u > 0.3 && v < 0.2 ? 'T' : u < -0.4 || v > 0.6 ? 'U' : 'S';
      if (d > 0.72 && size >= 5) ch = u > 0.3 && v < 0.3 ? 'T' : u < 0 || v > 0.3 ? 'G' : 'U';
      plot(g, x, y, ch);
    }
  }
  if (size >= 4) {
    plot(g, Math.round(cx), foot - size - 1, 'S');
    if (size >= 7) plot(g, Math.round(cx) + 1, foot - size - 2, 'T');
  }
  if (size >= 6) {
    // Little feet, mid-step.
    plot(g, Math.round(cx - r / 2), foot + 1, 'U');
    plot(g, Math.round(cx + r / 2), foot, 'U');
  }
  if (note) {
    const nx = Math.round(cx + r);
    const ny = foot - size - 7;
    for (const [dx, dy, ch] of [
      [1, 0, 'R'],
      [2, 0, 'R'],
      [1, 1, 'Q'],
      [1, 2, 'Q'],
      [0, 3, 'Q'],
      [1, 3, 'Q'],
      [0, 4, 'Q'],
    ] as const) {
      plot(g, nx + dx, ny + dy, ch);
    }
  }
}

/** The Skitterkin on the road, far to near: where along it (0 at the horizon) and who hums. */
const WALKERS = [
  { t: 0.04, dx: -1 },
  { t: 0.07, dx: 1 },
  { t: 0.1, dx: 0 },
  { t: 0.14, dx: -2 },
  { t: 0.17, dx: 2 },
  { t: 0.22, dx: -1 },
  { t: 0.27, dx: 3 },
  { t: 0.31, dx: -4 },
  { t: 0.37, dx: 1 },
  { t: 0.44, dx: -6 },
  { t: 0.5, dx: 5 },
  { t: 0.58, dx: -3 },
  { t: 0.67, dx: 8 },
  { t: 0.78, dx: -10 },
  { t: 0.86, dx: 12 },
] as const;

function paintWalkers(g: CharGrid): void {
  for (const w of WALKERS) {
    const y = Math.round(VANISH.y + w.t * (SCENE_H - VANISH.y));
    const size = Math.max(2, Math.round(2 + w.t * 12));
    const x = roadX(y) + w.dx * (0.4 + w.t);
    paintWalker(g, x, y, size, w.t > 0.4 && w.t < 0.7);
  }
}

/** A colonist by the road: jumpsuit, head, hair; `arm` raises a hand. */
function paintColonist(
  g: CharGrid,
  x: number,
  foot: number,
  h: number,
  skin: string,
  arm: boolean,
): void {
  const headY = foot - h;
  for (let y = headY; y < headY + 4; y++) {
    for (let dx = -1; dx <= 2; dx++) {
      const corner = (y === headY || y === headY + 3) && (dx === -1 || dx === 2);
      if (!corner) plot(g, x + dx, y, y === headY ? 'G' : dx === 2 ? 'w' : skin);
    }
  }
  for (let y = headY + 4; y <= foot; y++) {
    const leg = y > foot - Math.round(h * 0.4);
    for (let dx = -2; dx <= 3; dx++) {
      if (leg && (dx === -2 || dx === 3 || dx === 0 || dx === 1)) continue;
      plot(g, x + dx, y, dx >= 2 ? 'O' : dx <= -2 ? 'G' : 'P');
    }
  }
  if (arm) {
    for (let k = 0; k < 4; k++) plot(g, x + 4 + (k > 1 ? 1 : 0), headY + 4 - k, 'O');
    plot(g, x + 5, headY - 1, skin);
  }
}

function paintColonists(g: CharGrid): void {
  paintColonist(g, 100, 150, 17, '3', false);
  paintColonist(g, 109, 152, 18, 'w', true);
  paintColonist(g, 117, 151, 11, 'w', false);
  // Humming: a note over them.
  for (const [dx, dy, ch] of [
    [1, 0, 'R'],
    [2, 0, 'R'],
    [1, 1, 'Q'],
    [1, 2, 'Q'],
    [0, 3, 'Q'],
    [1, 3, 'Q'],
    [0, 4, 'Q'],
  ] as const) {
    plot(g, 104 + dx, 124 + dy, ch);
  }
}

/** Goldie's garden, the only one: lettuce in furrowed rows in the near left corner. */
const LETTUCE = ['.WW.', 'WRWV', 'VWVX', '.XX.'] as const;

function paintLettuce(g: CharGrid): void {
  for (let row = 0; row < 3; row++) {
    const y = 156 + row * 8;
    // The furrow under the row.
    for (let x = 2 + row * 4; x < 76 - row * 3; x++) plot(g, x, y + 4, '0');
    for (let x = 4 + row * 4; x < 72 - row * 3; x += 7) {
      LETTUCE.forEach((r, dy) => {
        for (let dx = 0; dx < r.length; dx++) {
          const ch = r.charAt(dx);
          if (ch !== '.') plot(g, x + dx, y + dy, ch);
        }
      });
    }
  }
}

/** The colony's old sign: Everglow's plate, its name painted out, WAYSIDE lettered over it. */
const SIGN = { x: 230, y: 128, w: 44, h: 17 } as const;

function paintSign(g: CharGrid): void {
  const { x, y, w, h } = SIGN;
  // Two posts.
  for (let py = y + h; py <= y + h + 12; py++) {
    plot(g, x + 4, py, 'J');
    plot(g, x + 5, py, 'I');
    plot(g, x + w - 6, py, 'J');
    plot(g, x + w - 5, py, 'I');
  }
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      const frame = py === y || py === y + h - 1 || px === x || px === x + w - 1;
      plot(g, px, py, frame ? (py === y + h - 1 ? 'P' : 'O') : 'M');
    }
  }
  // The old name, painted out in brush strokes of steel.
  for (let px = x + 3; px < x + w - 3; px++) {
    plot(g, px, y + 3, 'K');
    if (hash01(px, 1, 5) < 0.7) plot(g, px, y + 4, 'L');
  }
  // WAYSIDE, hand-lettered in orange with a gold highlight.
  const word = 'WAYSIDE';
  const tx = x + Math.round((w - textWidth(word)) / 2);
  for (const p of textPixels(word, tx, y + 8)) {
    plot(g, p.x, p.y, 'Y');
    if (at(g, p.x, p.y - 1) === 'M') plot(g, p.x, p.y - 1, 'R');
  }
  for (const p of textPixels(word, tx, y + 8)) plot(g, p.x, p.y, 'Y');
}

function paintWayside(): Record<string, CharGrid> {
  const g = sceneGrid();
  paintLand(g);
  // Dome Row, its middle gone: domes west and east of the road, a frame of ribs, the panes.
  paintDome(g, 28, 22, 18);
  paintDome(g, 72, 18, 15);
  paintDome(g, 118, 13, 11, true);
  paintDome(g, 222, 15, 13);
  paintDome(g, 264, 20, 17);
  paintDome(g, 306, 18, 16);
  // Bare foundations where the domes on the road stood.
  for (let x = 150; x < 196; x++) {
    if (Math.abs(x - roadX(ROW_Y)) > roadHalf(ROW_Y) + 2 && x % 3 !== 0) plot(g, x, ROW_Y, 'J');
  }
  paintPanes(g, 134, 112, 4);
  paintPanes(g, 196, 113, 3);
  paintWalkers(g);
  paintColonists(g);
  paintLettuce(g);
  paintSign(g);
  return { still: g };
}

export const sceneWayside = defineScene({
  id: 'scene.wayside',
  palette: 'finale',
  legend: LEGEND,
  paint: paintWayside,
});
