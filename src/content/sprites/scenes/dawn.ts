// The Dawn (`scene.dawn`; finale.md § FIN, `fin_m01_scene_dawn`; art-direction § 6, *The finale's
// stills*): the campaign's last full-screen scene, a still composed from parts on one 320×180
// canvas (shown at 2×). The first sunlight in nineteen days breaks over the Spires behind the
// Halls-mouth ledge: deep violet dark at the top of the sky warming through rose and orange to
// gold at the horizon (`finale.sky`), the sun cresting a saddle in the ridge. On the ledge the
// choir stands in silhouette against it, rim-lit gold, little notes over their heads, Pebble in
// front with her seedling tuft; laid-to-rest motes rise round them. Ves'thara stands tall at the
// choir's end, her woven veil open to the sky behind it. On the left the Deep Halls' mouth glows
// sung gold from deep inside, its rock veined with natural seams. In the foreground, large, the
// Technician from behind, three-quarter, looking into the sunrise: a silhouette, no face.
//
// Frames, one per beat (T810 stages them; staging `dawn`):
// - `dawn`: sunrise, the choir singing (from the scene's start).
// - `mote`: one gold mote stops at Ves'thara's shoulder (Ishael's: `fx.ishael_mote` has no
//   playfield view, so it is drawn here), and her threads light gold, one by one, to her heart.
// - `visor`: as `mote`, with the Technician's visor up: the mirrored plate tipped up off the
//   brow, catching the sunrise. Still no face: the light only finds the helmet's edge.
import type { CharGrid } from '../helpers.ts';
import { at, hash01, plot } from '../helpers.ts';
import {
  copyGrid,
  defineScene,
  dithered,
  eachOnLine,
  fill,
  SCENE_H,
  SCENE_W,
  sceneGrid,
} from './sceneKit.ts';

/*
 * Palette `finale`: 0–4 `finale.ground` (violet-black warming to peach), e0/e1 gold.3/gold.4.
 * Custom: A–E `finale.sky` (night violet → gold), U violet.0 (the top of the sky), F–I ink,
 * J–M gold.1–gold.4, N white.1, O white.0, P–R pink.2–pink.4, S coral.3, Z coral.2, T orange.3,
 * V/W teal.3/teal.4 (Ves'thara's heart knot), X/Y violet.1/violet.2.
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
  I: 'ink.3',
  J: 'gold.1',
  K: 'gold.2',
  L: 'gold.3',
  M: 'gold.4',
  N: 'white.1',
  O: 'white.0',
  P: 'pink.2',
  Q: 'pink.3',
  R: 'pink.4',
  S: 'coral.3',
  T: 'orange.3',
  U: 'violet.0',
  V: 'teal.3',
  W: 'teal.4',
  X: 'violet.1',
  Y: 'violet.2',
  Z: 'coral.2',
} as const;

/** The sun's centre (on the horizon, cresting the ridge's saddle) and its disc's radius. */
export const DAWN_SUN = { x: 226, y: 99, r: 9 } as const;
/** The horizon row the sky's gradient warms toward. */
const HORIZON = 104;
/** The ledge's lip at the choir's feet. */
const LEDGE_Y = 118;

/** The sky's ramp, top of the sky to the sun's heart. */
const SKY = ['U', 'A', 'B', 'C', 'D', 'E', 'M', 'N'] as const;

/** The sky's value at (x, y): darkest at the top, warming to the horizon, brightest by the sun. */
function skyValue(x: number, y: number): number {
  const t = Math.max(0, Math.min(1, y / HORIZON));
  const dx = (x - DAWN_SUN.x) / 1.6;
  const d = Math.hypot(dx, y - DAWN_SUN.y);
  const glow = Math.max(0, 1 - d / 130) ** 2;
  return Math.min(1, t ** 1.6 * 0.66 + glow * 0.42);
}

/** The sky's pixel at (x, y): dithered gradient, the sun's disc, a few last stars up high. */
function skyAt(x: number, y: number): string {
  const d = Math.hypot(x - DAWN_SUN.x, y - DAWN_SUN.y);
  if (d <= DAWN_SUN.r - 1.5) return 'N';
  if (d <= DAWN_SUN.r) return 'M';
  const v = skyValue(x, y);
  if (v < 0.2 && hash01(x, y, 71) < 0.006) return hash01(x, y, 72) < 0.5 ? 'O' : 'X';
  return dithered(SKY, v, x, y);
}

function paintSky(g: CharGrid): void {
  fill(g, 0, 0, SCENE_W - 1, HORIZON + 14, skyAt);
  // The two moons, fading in the light (art-direction § 3): low in the west, the big one pale
  // over its shade, the small one pink.
  for (let y = -3; y <= 3; y++) {
    for (let x = -3; x <= 3; x++) {
      if (Math.hypot(x, y) > 3.2) continue;
      plot(g, 38 + x, 24 + y, x + y > 1 ? 'B' : 'O');
    }
  }
  for (const [x, y, ch] of [
    [57, 15, 'R'],
    [58, 15, 'R'],
    [57, 16, 'R'],
    [58, 16, 'S'],
  ] as const) {
    plot(g, x, y, ch);
  }
  // Long thin clouds catching the light from below: dark tops, rose undersides, gold by the sun.
  for (const c of [
    { x0: 120, x1: 214, y: 58 },
    { x0: 236, x1: 318, y: 66 },
    { x0: 150, x1: 196, y: 78 },
    { x0: 250, x1: 300, y: 84 },
    { x0: 70, x1: 132, y: 72 },
  ]) {
    for (let x = c.x0; x <= c.x1; x++) {
      const k = Math.min(x - c.x0, c.x1 - x);
      if (k < 2 && hash01(x, c.y, 9) < 0.5) continue;
      const near = Math.abs(x - DAWN_SUN.x) < 50 ? 2 : Math.abs(x - DAWN_SUN.x) < 110 ? 1 : 0;
      if (k > 6) plot(g, x, c.y - 1, near === 2 ? 'C' : 'B');
      plot(g, x, c.y, (['P', 'S', 'D'] as const)[near]);
      if (k > 10) plot(g, x, c.y + 1, (['Q', 'D', 'E'] as const)[near]);
    }
  }
}

/** The far ridge's top row at column x: the Spires, a saddle where the sun crests. */
function ridgeTop(x: number): number {
  const saddle = Math.max(0, 1 - Math.abs(x - DAWN_SUN.x) / 26) * 9;
  const peaks =
    Math.abs(Math.sin(x * 0.083) * 7) + Math.abs(Math.sin(x * 0.031 + 1.3) * 9) + hash01(x, 0, 3);
  return Math.round(90 + peaks * 0.9 + saddle);
}

function paintRidge(g: CharGrid): void {
  for (let x = 0; x < SCENE_W; x++) {
    const top = ridgeTop(x);
    const toSun = Math.abs(x - DAWN_SUN.x);
    for (let y = top; y <= LEDGE_Y + 2; y++) {
      // Hazed by distance: the ridge's face a dithered violet-black over a lighter base.
      const v = (y - top) / 26;
      plot(g, x, y, dithered(['X', '1', '0'], v, x, y));
    }
    // Its crest catches the sunrise: gold by the sun, coral then rose away from it.
    plot(g, x, top, toSun < 24 ? 'M' : toSun < 60 ? 'L' : toSun < 120 ? 'S' : 'P');
    if (toSun < 40 && at(g, x, top + 1) !== 'M') plot(g, x, top + 1, 'T');
  }
}

/** The ledge's lip row at column x: level under the choir, rising into the Halls' rock. */
function ledgeTop(x: number): number {
  return LEDGE_Y + Math.round(hash01(x >> 2, 1, 5) * 1.4) - (x > 296 ? (x - 296) >> 2 : 0);
}

function paintLedge(g: CharGrid): void {
  for (let x = 0; x < SCENE_W; x++) {
    const top = ledgeTop(x);
    const toSun = Math.abs(x - DAWN_SUN.x);
    for (let y = top; y < SCENE_H; y++) {
      const depth = y - top;
      let ch: string;
      if (depth === 0) ch = toSun < 70 ? '4' : toSun < 140 ? '3' : '2';
      else if (depth === 1) ch = toSun < 70 ? '3' : '2';
      else ch = dithered(['2', '1', '0', 'G', 'F'], Math.min(1, depth / 30), x, y);
      plot(g, x, y, ch);
    }
  }
  // The choir's long shadows fall toward us across the lit lip (the sun is behind them).
  for (let x = 140; x < 262; x += 7) {
    for (let k = 0; k < 9; k++) {
      const y = ledgeTop(x) + k;
      plot(g, x - k * 2, y, k < 2 ? '2' : '1');
      plot(g, x - k * 2 - 1, y, k < 2 ? '2' : '1');
    }
  }
}

/** The Halls' rock wall on the left: its top at column x (undefined right of it). */
function hallsTop(x: number): number | undefined {
  if (x > 92) return undefined;
  return Math.round(14 + (x / 92) ** 2.2 * 104 + hash01(x >> 1, 2, 7) * 2);
}

/** The arch of the Halls' mouth: whether (x, y) is inside the opening. */
function inMouth(x: number, y: number): boolean {
  const cx = 34;
  const bottom = LEDGE_Y;
  const h = 58;
  const w = 19;
  if (y > bottom || y < bottom - h) return false;
  const t = (bottom - y) / h;
  return Math.abs(x - cx) <= w * Math.sqrt(Math.max(0, 1 - t ** 2.4));
}

function paintHalls(g: CharGrid): void {
  for (let x = 0; x <= 92; x++) {
    const top = hallsTop(x) ?? SCENE_H;
    for (let y = top; y <= LEDGE_Y; y++) {
      if (inMouth(x, y)) {
        // Deep inside, the Halls glow sung gold, warmest low at the back.
        const d = Math.hypot((x - 34) / 1.3, y - LEDGE_Y);
        const v = Math.max(0, 1 - d / 34);
        plot(g, x, y, v <= 0 ? 'F' : dithered(['F', 'G', 'J', 'K', 'L'], v * 0.9, x, y));
        continue;
      }
      // The rock: dark, its east-facing edges lit warm by the sky (the north faces take the light).
      const edge = y - top;
      const nearMouth = inMouth(x - 1, y) || inMouth(x - 2, y);
      let ch = dithered(['0', 'G', 'F'], Math.min(1, (y - top) / 40 + 0.2), x, y);
      if (edge === 0) ch = x > 50 ? 'S' : 'Z';
      else if (edge === 1) ch = '2';
      if (nearMouth) ch = inMouth(x - 1, y) ? 'K' : '1';
      plot(g, x, y, ch);
    }
  }
  // Natural seams of sung stardust through the rock: gold veins, pink where they run thickest.
  const seams = [
    [
      { x: 2, y: 40 },
      { x: 9, y: 52 },
      { x: 6, y: 66 },
      { x: 12, y: 84 },
    ],
    [
      { x: 58, y: 70 },
      { x: 64, y: 84 },
      { x: 61, y: 98 },
      { x: 70, y: 112 },
    ],
    [
      { x: 22, y: 30 },
      { x: 30, y: 44 },
      { x: 44, y: 50 },
    ],
  ];
  for (const s of seams) {
    for (let i = 1; i < s.length; i++) {
      const a = s[i - 1]!;
      const b = s[i]!;
      eachOnLine(a.x, a.y, b.x, b.y, (x, y) => {
        if (inMouth(x, y) || (hallsTop(x) ?? SCENE_H) > y) return;
        plot(g, x, y, hash01(x, y, 11) < 0.25 ? 'Q' : 'L');
        if (at(g, x + 1, y) !== 'L' && !inMouth(x + 1, y)) plot(g, x + 1, y, 'J');
      });
    }
  }
}

/** One singer's silhouette: a fuzzy round body on two feet, lit gold on the sun's side. */
const SINGER = [
  '..xxx..', //
  '.xxxxx.',
  'xxxxxxx',
  'xxxxxxx',
  'xxxxxxx',
  '.xxxxx.',
  '.x...x.',
] as const;

/** Pebble: smaller, with her two-leaf seedling tuft (the Peeker's, so you know her). */
const PEBBLE = [
  '.x.x...', //
  '..x....',
  '..xx...',
  '.xxxx..',
  'xxxxxx.',
  'xxxxxx.',
  '.xxxx..',
  '.x..x..',
] as const;

/** A little gold note over a singing head. */
const NOTE = ['.MM', '.L.', 'LL.', 'L..'] as const;

/** The choir on the ledge, west to east (their feet at the lip), and who wears a note. */
const CHOIR = [
  { x: 132, dy: 0, note: false },
  { x: 140, dy: -2, note: true },
  { x: 148, dy: 0, note: false },
  { x: 156, dy: -1, note: false },
  { x: 164, dy: 0, note: true },
  { x: 172, dy: -2, note: false },
  { x: 180, dy: 0, note: false },
  { x: 188, dy: -1, note: true },
  { x: 196, dy: 0, note: false },
  { x: 204, dy: -2, note: false },
  { x: 212, dy: 0, note: true },
  { x: 220, dy: -1, note: false },
  { x: 228, dy: 0, note: false },
  { x: 236, dy: -2, note: true },
  { x: 244, dy: 0, note: false },
] as const;
const PEBBLE_AT = { x: 254, note: true } as const;

/** Stamps a back-lit silhouette: ink inside, a gold rim on its sun-facing (east and top) edges. */
function silhouette(g: CharGrid, x0: number, y0: number, shape: readonly string[]): void {
  const solid = (x: number, y: number): boolean => shape[y]?.charAt(x) === 'x';
  shape.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (!solid(x, y)) continue;
      const gx = x0 + x;
      const toSun = Math.abs(gx - DAWN_SUN.x);
      const rim = !solid(x + 1, y) || !solid(x, y - 1);
      let ch = 'G';
      if (rim) ch = toSun < 20 ? 'M' : toSun < 60 ? 'L' : 'S';
      else if (!solid(x - 1, y)) ch = 'F';
      plot(g, gx, y0 + y, ch);
    }
  });
}

function paintChoir(g: CharGrid): void {
  for (const s of CHOIR) {
    const y0 = ledgeTop(s.x + 3) - SINGER.length + 1 + s.dy;
    silhouette(g, s.x, y0, SINGER);
    if (s.note) stampNote(g, s.x + 3, y0 - 6 + (s.x % 3));
  }
  const py = ledgeTop(PEBBLE_AT.x + 3) - PEBBLE.length + 1;
  silhouette(g, PEBBLE_AT.x, py, PEBBLE);
  stampNote(g, PEBBLE_AT.x + 4, py - 7);
}

function stampNote(g: CharGrid, x: number, y: number): void {
  NOTE.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx++) {
      const ch = row.charAt(dx);
      if (ch !== '.') plot(g, x + dx, y + dy, ch);
    }
  });
}

/** Motes laid to rest, rising: a gold point over a pink trail, scattered over the choir. */
function paintMotes(g: CharGrid): void {
  for (let i = 0; i < 22; i++) {
    const x = 118 + Math.round(hash01(i, 3, 21) * 180);
    const y = 26 + Math.round(hash01(i, 4, 21) * 78);
    const bright = hash01(i, 5, 21) < 0.35;
    plot(g, x, y, bright ? 'M' : 'L');
    plot(g, x, y + 1, 'Q');
    if (bright) plot(g, x, y + 2, 'P');
  }
}

/** Ves'thara: where she stands (her hem's centre at the lip) and her height. */
const VES = { x: 282, h: 54 } as const;
/** Her shoulder, nearer us (west): where Ishael's mote stops. */
export const DAWN_MOTE = { x: 275, y: 82 } as const;

/** Whether (x, y) is inside Ves'thara's figure: robe, shoulders, the tall pointed veil. */
function inVes(x: number, y: number): 'robe' | 'veil' | null {
  const foot = ledgeTop(VES.x);
  const top = foot - VES.h;
  const dx = Math.abs(x - VES.x);
  if (y > foot || y < top) return null;
  const t = (y - top) / VES.h; // 0 at the veil's point, 1 at the hem
  if (t < 0.42) {
    // The veil: a tall point widening to the shoulders.
    const half = 1 + (t / 0.42) * 8;
    return dx <= half ? 'veil' : null;
  }
  // Shoulders, then the robe falling straight and flaring a little at the hem.
  const half = t < 0.5 ? 9 : 7 + (t - 0.5) * 6;
  return dx <= half ? 'robe' : null;
}

function paintVesthara(g: CharGrid, lit: boolean): void {
  const foot = ledgeTop(VES.x);
  const top = foot - VES.h;
  for (let y = top; y <= foot; y++) {
    for (let x = VES.x - 12; x <= VES.x + 12; x++) {
      const part = inVes(x, y);
      if (part === null) continue;
      const edgeE = inVes(x + 1, y) === null || inVes(x, y - 1) === null;
      const edgeW = inVes(x - 1, y) === null;
      if (part === 'veil' && !edgeE && !edgeW) {
        // Open lattice: strands on two diagonals, real holes between them (the sky shows).
        const strand = (x + y) % 4 === 0 || (x - y + 64) % 4 === 0;
        if (!strand) {
          plot(g, x, y, skyAt(x, y));
          continue;
        }
        plot(g, x, y, lit && hash01(x, y, 31) < 0.85 ? (y < top + 10 ? 'M' : 'L') : 'H');
        continue;
      }
      let ch = edgeE ? 'M' : edgeW ? 'F' : 'G';
      // Her robe's woven seams, lit gold once she remembers.
      if (part === 'robe' && !edgeE && !edgeW && (x - VES.x) % 4 === 0 && lit) ch = 'K';
      plot(g, x, y, ch);
    }
  }
  // The ruby knot on her brow and the knot of light at her heart.
  plot(g, VES.x, top + 16, lit ? 'R' : 'Q');
  plot(g, VES.x, top + 29, 'W');
  plot(g, VES.x, top + 30, 'V');
  if (lit) {
    plot(g, VES.x - 1, top + 29, 'V');
    plot(g, VES.x + 1, top + 29, 'V');
  }
}

/** Ishael's mote: a white-hot cross in gold with a gold halo, its pink trail below it. */
function paintIshaelMote(g: CharGrid): void {
  const { x, y } = DAWN_MOTE;
  for (const [dx, dy] of [
    [-2, -2],
    [2, -2],
    [-2, 2],
    [2, 2],
    [-3, 0],
    [3, 0],
    [0, -3],
  ] as const) {
    plot(g, x + dx, y + dy, 'L');
  }
  for (const [dx, dy] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-2, 0],
    [2, 0],
    [0, -2],
  ] as const) {
    plot(g, x + dx, y + dy, 'M');
  }
  plot(g, x, y, 'N');
  for (let k = 3; k <= 9; k++) plot(g, x - (k > 6 ? 1 : 0), y + k, k < 6 ? 'Q' : 'P');
}

/** The Technician: the helmet's centre and size, from behind, three-quarter, facing the sun. */
const HELM = { cx: 104, cy: 66, rx: 16, ry: 15 } as const;

function inHelmet(x: number, y: number): boolean {
  return ((x - HELM.cx) / HELM.rx) ** 2 + ((y - HELM.cy) / HELM.ry) ** 2 <= 1;
}

/** The shoulders and back: a broad trapezoid from the collar down past the frame's foot. */
function inBody(x: number, y: number): boolean {
  const collar = HELM.cy + HELM.ry - 3;
  if (y < collar) return false;
  const t = y - collar;
  const half = t < 4 ? 9 + t : Math.min(52, 13 + Math.sqrt(t - 4) * 9);
  // Turned toward the sun: the far (east) shoulder a little narrower.
  return x >= HELM.cx - 2 - half && x <= HELM.cx + 2 + half * 0.82;
}

function inTechnician(x: number, y: number): boolean {
  return inHelmet(x, y) || inBody(x, y);
}

function paintTechnician(g: CharGrid, visorUp: boolean): void {
  for (let y = HELM.cy - HELM.ry - 1; y < SCENE_H; y++) {
    for (let x = HELM.cx - 64; x <= HELM.cx + 64; x++) {
      if (!inTechnician(x, y)) continue;
      const eastEdge = !inTechnician(x + 1, y);
      const topEdge = !inTechnician(x, y - 1);
      const inner = !inTechnician(x + 2, y);
      let ch = dithered(['G', 'F'], Math.min(1, (y - 50) / 90), x, y);
      if (eastEdge) ch = y < HELM.cy + HELM.ry ? 'L' : 'S';
      else if (inner && y < HELM.cy + HELM.ry + 20) ch = 'Z';
      else if (topEdge) ch = x > HELM.cx ? 'S' : 'P';
      plot(g, x, y, ch);
    }
  }
  // The helmet's seam: a dark ring where shell meets collar, and its teal JPT-1 stripe, dim.
  for (let x = HELM.cx - 11; x <= HELM.cx + 12; x++) plot(g, x, HELM.cy + 11, 'H');
  for (let y = HELM.cy - 10; y <= HELM.cy + 6; y++) plot(g, HELM.cx - 3, y, 'H');
  if (!visorUp) {
    // Visor down: its mirrored edge wraps round the far side, reflecting the sunrise.
    for (let y = HELM.cy - 6; y <= HELM.cy + 6; y++) {
      for (let x = HELM.cx + 9; x <= HELM.cx + HELM.rx; x++) {
        if (!inHelmet(x, y) || !inHelmet(x + 1, y)) continue;
        if (!inHelmet(x + 3, y)) {
          plot(g, x, y, dithered(['C', 'D', 'E', 'M'], (y - HELM.cy + 6) / 12, x, y));
        }
      }
    }
    return;
  }
  // Visor up: the plate tipped back off the brow, standing over the helmet's front, its mirror
  // full of sky. Where it was, the helmet's edge in shadow, rimmed by the light: no face.
  for (let k = 0; k < 15; k++) {
    const x = HELM.cx + 2 + k;
    const y = HELM.cy - HELM.ry - 3 + Math.round((k / 14) ** 2 * 9);
    plot(g, x, y - 1, 'H');
    plot(g, x, y, k > 9 ? 'N' : 'M');
    plot(g, x, y + 1, k > 9 ? 'E' : 'D');
    plot(g, x, y + 2, 'C');
  }
  plot(g, HELM.cx + 17, HELM.cy - HELM.ry + 6, 'L');
}

/** Every frame of the Dawn. */
function paintDawn(): Record<string, CharGrid> {
  const g = sceneGrid();
  paintSky(g);
  paintRidge(g);
  paintLedge(g);
  paintMotes(g);
  paintHalls(g);
  paintChoir(g);
  const dawn = copyGrid(g);
  paintVesthara(dawn, false);
  paintTechnician(dawn, false);

  const mote = copyGrid(g);
  paintVesthara(mote, true);
  paintIshaelMote(mote);
  paintTechnician(mote, false);

  const visor = copyGrid(g);
  paintVesthara(visor, true);
  paintIshaelMote(visor);
  paintTechnician(visor, true);
  for (const f of [dawn, mote, visor]) {
    if (f.length !== SCENE_H) throw new Error('scene.dawn: bad height');
  }
  return { dawn, mote, visor };
}

export const sceneDawn = defineScene({
  id: 'scene.dawn',
  palette: 'finale',
  legend: LEGEND,
  paint: paintDawn,
});
