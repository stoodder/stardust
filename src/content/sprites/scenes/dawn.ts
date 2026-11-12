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

/** The Halls' rock on the left: a craggy wall stepping down toward the ledge (its top at x). */
function hallsTop(x: number): number | undefined {
  if (x > 96) return undefined;
  const slope = 10 + (x / 96) ** 2.4 * 108;
  const crag = Math.abs(Math.sin(x * 0.27)) * 5 + Math.abs(Math.sin(x * 0.11 + 2)) * 6;
  return Math.round(slope + crag + hash01(x >> 1, 2, 7) * 2);
}

/** The Halls' mouth: a tall ragged arch into the dark. Whether (x, y) is inside the opening. */
const MOUTH = { cx: 36, h: 66, w: 21 } as const;
function inMouth(x: number, y: number): boolean {
  const bottom = LEDGE_Y + 1;
  if (y > bottom || y < bottom - MOUTH.h) return false;
  const t = (bottom - y) / MOUTH.h;
  const ragged = (hash01(x >> 1, y >> 2, 13) - 0.5) * 2;
  return Math.abs(x - MOUTH.cx) <= MOUTH.w * Math.sqrt(Math.max(0, 1 - t ** 2.2)) + ragged;
}

function paintHalls(g: CharGrid): void {
  for (let x = 0; x <= 96; x++) {
    const top = hallsTop(x) ?? SCENE_H;
    for (let y = top; y <= LEDGE_Y + 1; y++) {
      if (inMouth(x, y)) {
        // Deep inside, the Halls glow sung gold: warmest low at the back, dark at the arch.
        const d = Math.hypot((x - MOUTH.cx) / 1.25, (y - LEDGE_Y) * 1.1);
        const v = Math.max(0, 1 - d / 40);
        plot(g, x, y, dithered(['F', 'F', 'G', 'J', 'K', 'L'], v, x, y));
        continue;
      }
      // The rock: dark, crags catching the sky's warmth on their east and upper faces.
      const edge = y - top;
      let ch = dithered(['1', '0', 'G', 'F'], Math.min(1, edge / 46 + 0.15), x, y);
      // Ledges in the rock face: a lit step every so often.
      if (hash01(x >> 3, y, 17) < 0.05 && edge > 3) ch = '1';
      if (edge === 0) ch = x > 60 ? 'S' : 'Z';
      else if (edge === 1) ch = x > 60 ? 'Z' : '2';
      // The arch's rim: its east jamb lit by the mouth's glow and the sky, its west in shadow.
      if (inMouth(x - 1, y)) ch = y > LEDGE_Y - 28 ? 'K' : 'J';
      else if (inMouth(x + 1, y)) ch = 'F';
      plot(g, x, y, ch);
    }
  }
  // Natural seams of sung stardust branching through the rock: gold, pink where thickest.
  const seams: readonly (readonly { x: number; y: number }[])[] = [
    [
      { x: 0, y: 46 },
      { x: 6, y: 54 },
      { x: 4, y: 64 },
      { x: 9, y: 76 },
      { x: 7, y: 90 },
    ],
    [
      { x: 6, y: 64 },
      { x: 12, y: 62 },
    ],
    [
      { x: 62, y: 80 },
      { x: 66, y: 90 },
      { x: 64, y: 100 },
      { x: 72, y: 112 },
    ],
    [
      { x: 66, y: 90 },
      { x: 73, y: 94 },
    ],
    [
      { x: 18, y: 26 },
      { x: 26, y: 36 },
      { x: 38, y: 42 },
      { x: 46, y: 40 },
    ],
  ];
  for (const s of seams) {
    for (let i = 1; i < s.length; i++) {
      const a = s[i - 1]!;
      const b = s[i]!;
      eachOnLine(a.x, a.y, b.x, b.y, (x, y) => {
        if (inMouth(x, y) || (hallsTop(x) ?? SCENE_H) > y) return;
        plot(g, x, y, hash01(x, y, 11) < 0.3 ? 'Q' : 'L');
        if (!inMouth(x + 1, y) && at(g, x + 1, y) !== 'L') plot(g, x + 1, y, 'J');
      });
    }
  }
  // A knot of gold crystal where two seams meet, and glints along the rest.
  for (const [x, y] of [
    [66, 90],
    [6, 64],
  ] as const) {
    plot(g, x, y, 'M');
    plot(g, x, y - 1, 'L');
    plot(g, x - 1, y, 'L');
  }
}

/**
 * The choir's two shapes, back-lit: a grown singer (a tufted fuzzball on stubby feet, its mouth a
 * dark round, singing) and a little one. `x` is solid; `o` a hole (the open mouth, the sky's
 * light through it would be wrong, so it is drawn dark-on-dark: `o` is painted `F`).
 */
const GROWN = [
  '..x.x.x..', //
  '.xxxxxxx.',
  'xxxxxxxxx',
  'xxxxxxxxx',
  'xxxxxxxxx',
  'xxxxxxxxx',
  '.xxxxxxx.',
  '..xx.xx..',
] as const;
const LITTLE = [
  '.x.x..', //
  'xxxxx.',
  'xxxxxx',
  'xxxxxx',
  '.xxxx.',
  '.x..x.',
] as const;

/** Pebble: small, in front, with her two-leaf seedling tuft (the Peeker's, so you know her). */
const PEBBLE = [
  'x...x..', //
  '.x.x...',
  '..x....',
  '..x....',
  '.xxxx..',
  'xxxxxx.',
  'xxxxxxx',
  'xxxxxxx',
  '.xxxxx.',
  '.x...x.',
] as const;

/** A little gold note over a singing head (the choir's sprites wear one: § 6, *The choir*). */
const NOTE = ['..MM', '..ML', '..L.', 'LLL.', 'LL..'] as const;

/** The choir on the ledge, west to east: who stands where, how big, and who wears a note. */
const CHOIR: readonly { x: number; little: boolean; note: number | null }[] = [
  { x: 128, little: false, note: null },
  { x: 137, little: true, note: null },
  { x: 143, little: false, note: 9 },
  { x: 153, little: false, note: null },
  { x: 162, little: true, note: 4 },
  { x: 168, little: false, note: null },
  { x: 178, little: false, note: 12 },
  { x: 188, little: true, note: null },
  { x: 194, little: false, note: null },
  { x: 204, little: false, note: 6 },
  { x: 214, little: true, note: null },
  { x: 220, little: false, note: null },
  { x: 230, little: false, note: 10 },
  { x: 240, little: true, note: null },
  { x: 246, little: false, note: 3 },
];
const PEBBLE_AT = { x: 258 } as const;

/**
 * Stamps a back-lit silhouette: ink inside, a 1 px rim on its sun-facing (east and top) edges, gold
 * nearest the sun, coral further off.
 */
function silhouette(g: CharGrid, x0: number, y0: number, shape: readonly string[]): void {
  const solid = (x: number, y: number): boolean => shape[y]?.charAt(x) === 'x';
  shape.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (!solid(x, y)) continue;
      const gx = x0 + x;
      const toSun = Math.abs(gx - DAWN_SUN.x);
      const rim = !solid(x + 1, y) || !solid(x, y - 1);
      let ch = 'G';
      if (rim) ch = toSun < 22 ? 'M' : toSun < 64 ? 'L' : 'S';
      plot(g, gx, y0 + y, ch);
    }
  });
}

function paintChoir(g: CharGrid): void {
  for (const s of CHOIR) {
    const shape = s.little ? LITTLE : GROWN;
    const y0 = ledgeTop(s.x + 3) - shape.length + 1;
    silhouette(g, s.x, y0, shape);
    if (s.note !== null) stampNote(g, s.x + (s.little ? 2 : 4), y0 - 5 - s.note);
  }
  const py = ledgeTop(PEBBLE_AT.x + 3) - PEBBLE.length + 1;
  silhouette(g, PEBBLE_AT.x, py, PEBBLE);
  stampNote(g, PEBBLE_AT.x + 3, py - 12);
  stampNote(g, PEBBLE_AT.x + 9, py - 20);
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
  for (let i = 0; i < 26; i++) {
    const x = 116 + Math.round(hash01(i, 3, 21) * 190);
    const y = 18 + Math.round(hash01(i, 4, 21) * 80);
    const bright = hash01(i, 5, 21) < 0.35;
    plot(g, x, y, bright ? 'M' : 'L');
    plot(g, x, y + 1, 'Q');
    if (bright) plot(g, x, y + 2, 'P');
  }
}

/** Ves'thara: where she stands (her hem's centre at the lip) and her height. */
const VES = { x: 284, h: 60 } as const;
/** Her shoulder nearer the choir (west): where Ishael's mote stops (`mote` frame on). */
export const DAWN_MOTE = { x: 274, y: ledgeTopPure(284) - 60 + 25 } as const;

function ledgeTopPure(x: number): number {
  return ledgeTop(x);
}

type VesPart = 'veil' | 'face' | 'robe' | 'drape';

/**
 * Ves'thara's figure (art-direction § 5's woven face and pointed veil, as a figure): a tall pointed
 * veil of open lattice over a long woven face, the veil falling past her shoulders as a see-through
 * drape, and dark emerald robes, a little wider at the hem.
 */
function inVes(x: number, y: number): VesPart | null {
  const foot = ledgeTop(VES.x);
  const top = foot - VES.h;
  const t = (y - top) / VES.h;
  const dx = x - VES.x;
  if (t < 0 || t > 1) return null;
  const ax = Math.abs(dx);
  // The face: a long oval under the veil's peak.
  if (((dx + 0.5) / 3.2) ** 2 + ((t - 0.22) / 0.085) ** 2 <= 1) return 'face';
  // The veil: a tall point curving out to below the shoulders.
  if (t < 0.5) {
    const half = 1.5 + Math.sin((t / 0.5) * (Math.PI / 2)) ** 1.4 * 10;
    if (ax <= half) return t < 0.33 || ax > 6 ? 'veil' : 'robe';
  }
  // The drape: the veil's lattice hanging free beside the robe, to mid-thigh.
  const robeHalf = t < 0.36 ? 0 : t < 0.42 ? 6 : 5.5 + (t - 0.42) * 7;
  if (ax <= robeHalf) return 'robe';
  if (t < 0.72 && ax <= robeHalf + 4 - (t - 0.5) * 8) return 'drape';
  return null;
}

function paintVesthara(g: CharGrid, lit: boolean): void {
  const foot = ledgeTop(VES.x);
  const top = foot - VES.h;
  const strandAt = (x: number, y: number): boolean => (x + y) % 3 === 0 || (x - y + 99) % 3 === 0;
  for (let y = top; y <= foot; y++) {
    for (let x = VES.x - 16; x <= VES.x + 16; x++) {
      const part = inVes(x, y);
      if (part === null) continue;
      const outside = (dx: number, dy: number): boolean => inVes(x + dx, y + dy) === null;
      const edgeE = outside(1, 0) || outside(0, -1);
      const edgeW = outside(-1, 0);
      if (part === 'face') {
        // The woven face, dark against the sun, lit from inside at its heart once she remembers.
        const heart = Math.abs(x - VES.x) <= 1 && Math.abs(y - (top + 13)) <= 2;
        plot(g, x, y, lit ? (heart ? 'M' : edgeE ? 'L' : 'K') : heart ? 'X' : 'H');
        continue;
      }
      if ((part === 'veil' || part === 'drape') && !edgeE && !edgeW) {
        // Open lattice: strands on two diagonals, real holes between them (the sky shows).
        if (!strandAt(x, y)) {
          plot(g, x, y, skyAt(x, y));
          continue;
        }
        // Her threads: frayed and dark, then lit gold one by one (her `dawn` portrait).
        const relit = lit && hash01(x, y, 31) < 0.8;
        plot(g, x, y, relit ? (y < top + 18 ? 'M' : 'L') : 'H');
        continue;
      }
      let ch = edgeE ? (lit ? 'M' : 'L') : edgeW ? 'F' : 'G';
      if (part === 'robe' && !edgeE && !edgeW && (x - VES.x) % 3 === 0) ch = lit ? 'J' : 'H';
      plot(g, x, y, ch);
    }
  }
  // The ruby knot on her brow and the knot of light at her heart (teal, Aelari).
  plot(g, VES.x, top + 7, lit ? 'R' : 'Q');
  const heart = { x: VES.x, y: top + 28 };
  plot(g, heart.x, heart.y, 'W');
  plot(g, heart.x, heart.y + 1, 'V');
  plot(g, heart.x - 1, heart.y, 'V');
  plot(g, heart.x + 1, heart.y, 'V');
  if (lit) plot(g, heart.x, heart.y - 1, 'V');
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
    [0, 3],
  ] as const) {
    plot(g, x + dx, y + dy, 'L');
  }
  for (const [dx, dy] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const) {
    plot(g, x + dx, y + dy, 'M');
  }
  plot(g, x, y, 'N');
  // Its trail: where it rose from the choir, fading pink.
  for (let k = 4; k <= 14; k++) {
    const tx = x - Math.round((k - 4) * 0.5);
    if (k > 10 && k % 2 === 1) continue;
    plot(g, tx, y + k, k < 8 ? 'Q' : 'P');
  }
}

/**
 * The Technician, from behind, three-quarter, turned toward the sun: the oversized Everglow helmet
 * (art-direction § 5's `player`), the collar, sloped shoulders and arms, the back past the frame.
 */
const HELM = { cx: 92, cy: 72, rx: 15, ry: 14 } as const;

function inHelmet(x: number, y: number): boolean {
  return ((x - HELM.cx) / HELM.rx) ** 2 + ((y - HELM.cy) / HELM.ry) ** 2 <= 1;
}

/** The back: collar, then shoulders rounding out, arms hanging, a little narrower at the waist. */
function backHalf(t: number): number {
  if (t < 3) return 8;
  if (t < 14) return 8 + Math.sqrt((t - 3) / 11) * 25;
  return 33 - Math.min(4, (t - 14) / 12);
}

function inBody(x: number, y: number): boolean {
  const collar = HELM.cy + HELM.ry - 4;
  if (y < collar) return false;
  const half = backHalf(y - collar);
  // Turned toward the sun: the far (east) shoulder a little narrower than the near one.
  return x >= HELM.cx - half && x <= HELM.cx + half * 0.86;
}

function inTechnician(x: number, y: number): boolean {
  return inHelmet(x, y) || inBody(x, y);
}

/** The gap between arm and torso: a dark line down each side, below the shoulder. */
function armSeam(x: number, y: number): boolean {
  const collar = HELM.cy + HELM.ry - 4;
  const t = y - collar;
  if (t < 18) return false;
  const half = backHalf(t);
  return x === Math.round(HELM.cx - half + 8) || x === Math.round(HELM.cx + half * 0.86 - 7);
}

function paintTechnician(g: CharGrid, visorUp: boolean): void {
  const collarY = HELM.cy + HELM.ry - 4;
  for (let y = HELM.cy - HELM.ry - 1; y < SCENE_H; y++) {
    for (let x = HELM.cx - 40; x <= HELM.cx + 40; x++) {
      if (!inTechnician(x, y)) continue;
      const helmet = inHelmet(x, y) && y < collarY + 2;
      const eastEdge = !inTechnician(x + 1, y);
      const topEdge = !inTechnician(x, y - 1);
      let ch = 'G';
      if (helmet) {
        // The shell catches a little sky on its crown.
        const crown = ((x - HELM.cx + 4) / 9) ** 2 + ((y - HELM.cy + 9) / 4) ** 2 <= 1;
        ch = crown ? 'I' : 'G';
        if (!inTechnician(x + 2, y) && !eastEdge) ch = 'Z';
      } else if (armSeam(x, y)) ch = 'F';
      else if (!inTechnician(x + 2, y) && !eastEdge) ch = 'Z';
      else if (y > 150) ch = dithered(['G', 'F'], (y - 150) / 30, x, y);
      if (eastEdge) ch = y < collarY ? 'M' : y < collarY + 30 ? 'L' : 'S';
      else if (topEdge) ch = x > HELM.cx - 4 ? (helmet ? 'S' : 'Z') : 'P';
      plot(g, x, y, ch);
    }
  }
  // The collar ring under the helmet.
  for (let x = HELM.cx - 9; x <= HELM.cx + 8; x++) {
    if (inTechnician(x + 1, collarY) && inTechnician(x - 1, collarY)) plot(g, x, collarY, 'H');
  }
  if (!visorUp) {
    // Visor down: its mirrored edge wraps round the far side, full of the sunrise.
    for (let y = HELM.cy - 7; y <= HELM.cy + 5; y++) {
      for (let x = HELM.cx + 8; x <= HELM.cx + HELM.rx; x++) {
        if (!inHelmet(x, y) || inHelmet(x + 2, y) || !inHelmet(x + 1, y)) continue;
        plot(g, x, y, dithered(['C', 'D', 'E', 'M'], (y - HELM.cy + 7) / 12, x, y));
      }
    }
    return;
  }
  // Visor up: the plate tipped back off the brow, standing over the helmet's front, its mirror full
  // of sky. Where it was, only the helmet's edge in shadow, rimmed by the light: no face.
  for (let k = 0; k < 16; k++) {
    const x = HELM.cx + 1 + k;
    const y = HELM.cy - HELM.ry - 4 + Math.round((k / 15) ** 2 * 10);
    plot(g, x, y - 1, 'G');
    plot(g, x, y, k > 9 ? 'N' : 'M');
    plot(g, x, y + 1, k > 11 ? 'E' : 'D');
    plot(g, x, y + 2, 'C');
  }
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
  return { dawn, mote, visor };
}

export const sceneDawn = defineScene({
  id: 'scene.dawn',
  palette: 'finale',
  legend: LEGEND,
  paint: paintDawn,
});
