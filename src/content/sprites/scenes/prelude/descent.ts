// Descent (`scene.descent`; act1.md § *Prelude · Arrival*, shot 4; art-direction § 6, *The
// prelude's stills*): the shuttle's view coming down over Tumble IV, 320×300, which the stage tilts
// down 120 px in whole-pixel steps (top rows at the shot's start, bottom rows at its end), so the
// world's shape reads north to south, far to near: cloud at the top, the cyan sky, the hazed far
// ridges and the Spires with Everglow's rigs on their crests (pink clay, pink-gold glints), the
// terraces on the valley's north slope, the colony on the valley floor (Dome Row's domes along the
// road, the turrets' pads, the landing pad's teal ring, Evie's billboard), the perimeter fence, and
// below it the southern grass and the Brightwater wetlands, where a long line of tiny coral
// walkers heads south, all going the same way (the Long Walk, seen and never named). One frame,
// `still`. The clouds are baked into the still: the stage needs no overlay.
import { hash01, plot, type CharGrid } from '../../helpers.ts';
import type { ColorName } from '../../../palettes/master.ts';
import { defineScene, dithered, eachOnLine, fill, SCENE_W, sceneGrid } from '../sceneKit.ts';
import {
  crestNear,
  paintCloud,
  paintRig,
  paintSky,
  paintSpires,
  paintTerraces,
} from './planetside.ts';
import { sceneInk } from './stamp.ts';

/** The descent's height: the stage shows 180 rows of it at a time, panning 0 → 120 px down. */
export const DESCENT_H = 300;
/** How far the stage pans (DESCENT_H − the 180-row view). */
export const DESCENT_PAN = 120;

/*
 * Palette `act1`: p `act1.grass`, s `act1.path`, a `act1.clay`, e0/e1 pink.3/pink.4, outline
 * `act1.shade`, eye ink.0, hi `act1.light`. Custom: A–C `act1.sky`, D/E white.0/white.1, F gold.4,
 * G gold.3, H–K steel.1–steel.4, L–N teal.2–teal.4, O–R coral.1–coral.4 (the walkers),
 * S–V `act1.water.0`–`.3` (the wetlands), W ink.1, X orange.3.
 */
const LEGEND = {
  A: 'act1.sky.0',
  B: 'act1.sky.1',
  C: 'act1.sky.2',
  D: 'white.0',
  E: 'white.1',
  F: 'gold.4',
  G: 'gold.3',
  H: 'steel.1',
  I: 'steel.2',
  J: 'steel.3',
  K: 'steel.4',
  L: 'teal.2',
  M: 'teal.3',
  N: 'teal.4',
  O: 'coral.1',
  P: 'coral.2',
  Q: 'coral.3',
  R: 'coral.4',
  S: 'act1.water.0',
  T: 'act1.water.1',
  U: 'act1.water.2',
  V: 'act1.water.3',
  W: 'ink.1',
  X: 'orange.3',
} as const;

/** The still's ink (exported for the tests, which hold it at no missing colour). */
export const DESCENT_INK = sceneInk('act1', LEGEND);
const c = (n: ColorName): string => DESCENT_INK.char(n);

/** The horizon (the far ridges' foot), the Spires' foot, and the valley's bands below them. */
const HORIZON = 98;
const SPIRES_FOOT = 140;
const TERRACES = { y0: 134, y1: 186 } as const;
/** The valley floor: the colony between the terraces' foot and the fence. */
export const COLONY = { y0: 186, y1: 222 } as const;
/** The perimeter fence's row, and the southern grass below it to the still's foot. */
const FENCE_Y = 224;
/** The road's line: down from the Spires, through the colony, out through the gate, on south. */
const ROAD: readonly (readonly [number, number])[] = [
  [138, 134],
  [146, 160],
  [150, 186],
  [156, 210],
  [162, FENCE_Y],
  [176, 252],
  [196, 300],
];

/** The road's centre column at row y (straight segments between the ROAD points). */
export function roadX(y: number): number {
  for (let i = 1; i < ROAD.length; i++) {
    const [x0, y0] = ROAD[i - 1] ?? [0, 0];
    const [x1, y1] = ROAD[i] ?? [0, 0];
    if (y <= y1) return x0 + ((x1 - x0) * (y - y0)) / Math.max(1, y1 - y0);
  }
  return ROAD.at(-1)?.[0] ?? 0;
}

function paintSkyAndSpires(g: CharGrid): void {
  paintSky(g, DESCENT_INK, 0, HORIZON);
  // The far valley under the ridges, hazed green toward the sky.
  fill(g, 0, HORIZON - 2, SCENE_W - 1, SPIRES_FOOT + 2, (x, y) =>
    dithered(
      [c('act1.sky.2'), c('act1.grass.3'), c('act1.grass.2')],
      (y - HORIZON + 2) / (SPIRES_FOOT - HORIZON),
      x,
      y,
    ),
  );
  // The far ridges, hazed nearly to the sky.
  paintSpires(
    g,
    DESCENT_INK,
    HORIZON + 4,
    [
      { x: 20, w: 120, h: 14 },
      { x: 120, w: 140, h: 18 },
      { x: 250, w: 130, h: 16 },
      { x: 330, w: 80, h: 12 },
    ],
    41,
    0.75,
  );
  // The Spires, near and tall, rigs on their crests.
  const tops = paintSpires(
    g,
    DESCENT_INK,
    SPIRES_FOOT,
    [
      { x: 40, w: 150, h: 74 },
      { x: 150, w: 100, h: 48 },
      { x: 250, w: 140, h: 80 },
      { x: 320, w: 70, h: 44 },
    ],
    43,
    0,
  );
  for (const [x, h] of [
    [30, 12],
    [62, 9],
    [150, 10],
    [236, 13],
    [272, 10],
  ] as const) {
    const [rx, top] = crestNear(tops, x, 12);
    paintRig(g, DESCENT_INK, rx, top + 1, h);
  }
}

/** A dome seen from high up: a small white half-disc, a teal band, a lit slit. */
function paintTinyDome(g: CharGrid, cx: number, foot: number, r: number): void {
  fill(g, cx - r - 1, foot - r, cx + r + 1, foot + 1, (x, y) => {
    if (y === foot + 1) return x > cx - r && x <= cx + r + 1 ? c('act1.grass.0') : null;
    const u = (x - cx) / r;
    const v = (foot - y) / r;
    const d = u * u + v * v;
    if (d > 1) return null;
    if (v < 0.25) return u < 0 ? c('teal.3') : c('teal.2');
    if (d > 0.7) return u < -0.2 ? c('steel.4') : c('steel.2');
    return u < 0.2 ? c('white.1') : c('steel.4');
  });
  plot(g, cx + 1, foot - 1, c('teal.4'));
}

/** The colony on the valley floor: the road, Dome Row, the pads, the landing pad, the billboard. */
function paintColony(g: CharGrid): void {
  fill(g, 0, COLONY.y0, SCENE_W - 1, FENCE_Y, (x, y) => {
    const t = (y - COLONY.y0) / (FENCE_Y - COLONY.y0);
    let ch = dithered([c('act1.grass.1'), c('act1.grass.2')], 0.55 + t * 0.2, x, y);
    // Lettuce plots in rows west of the road.
    if (x > 40 && x < 110 && y > COLONY.y0 + 6 && y < FENCE_Y - 6 && (y >> 1) % 2 === 0) {
      ch = (x >> 2) % 3 === 0 ? c('act1.path.1') : c('act1.grass.3');
    }
    return ch;
  });
  // The terraces' foot: a lit lip, then its shadow.
  for (let x = 0; x < SCENE_W; x++) {
    plot(g, x, COLONY.y0, c('act1.grass.3'));
    plot(g, x, COLONY.y0 + 1, c('act1.grass.0'));
  }
  // Dome Row: domes along the road's east side, smaller farther up.
  const domes: readonly (readonly [number, number, number])[] = [
    [164, 195, 5],
    [178, 198, 6],
    [194, 202, 6],
    [211, 206, 7],
    [229, 211, 7],
    [134, 196, 5],
    [124, 206, 6],
    [112, 217, 7],
  ];
  // The turrets' pads: steel diamonds with a teal dot, west of the road.
  for (const [px, py] of [
    [140, 210],
    [146, 219],
    [168, 214],
  ] as const) {
    for (let dy = -2; dy <= 2; dy++) {
      const half = 3 - Math.abs(dy);
      for (let dx = -half; dx <= half; dx++)
        plot(g, px + dx, py + dy, dy > 0 ? c('steel.2') : c('steel.3'));
    }
    plot(g, px, py - 1, c('teal.4'));
  }
  // The landing pad, east of Dome Row: a steel disc with its teal ring, where the shuttle is going.
  fill(g, 252, 196, 300, 220, (x, y) => {
    const u = (x - 276) / 22;
    const v = (y - 208) / 9;
    const r = u * u + v * v;
    if (r > 1) return null;
    if (Math.abs(r - 0.45) < 0.12) return c('teal.4');
    if (r > 0.85) return v > 0 ? c('steel.1') : c('steel.4');
    return c('steel.3');
  });
  // Evie's billboard: a white panel on legs, the gold sun on it.
  for (let y = 192; y <= 199; y++) {
    for (let x = 240; x <= 250; x++) {
      const edge = y === 192 || y === 199 || x === 240 || x === 250;
      plot(g, x, y, edge ? c('teal.3') : c('white.1'));
    }
  }
  plot(g, 243, 195, c('gold.4'));
  plot(g, 244, 195, c('gold.4'));
  plot(g, 243, 196, c('gold.3'));
  plot(g, 247, 196, c('pink.3'));
  plot(g, 248, 195, c('pink.3'));
  for (let y = 200; y <= 203; y++) {
    plot(g, 242, y, c('steel.1'));
    plot(g, 248, y, c('steel.1'));
  }
  paintRoad(g, COLONY.y0 - 52, 300);
  for (const [x, y, r] of domes) paintTinyDome(g, x, y, r);
}

/** The road: a dusty-rose track a few pixels wide, widening as it comes nearer. */
function paintRoad(g: CharGrid, y0: number, y1: number): void {
  for (let y = y0; y <= y1; y++) {
    const cx = roadX(y);
    const half = 0.8 + Math.max(0, (y - 140) / 160) * 3;
    for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
      const k = Math.abs(x - cx) / half;
      plot(g, x, y, k > 0.85 ? c('act1.path.1') : k < 0.35 ? c('act1.path.4') : c('act1.path.3'));
    }
  }
}

/** The perimeter fence across the valley, its gate where the road goes through. */
function paintFence(g: CharGrid): void {
  const gate = roadX(FENCE_Y);
  for (let x = 0; x < SCENE_W; x++) {
    if (Math.abs(x - gate) < 6) continue;
    const y = FENCE_Y + Math.round(Math.sin(x * 0.02) * 1.5);
    plot(g, x, y, c('steel.2'));
    if (x % 8 === 0) {
      plot(g, x, y - 1, c('steel.4'));
      plot(g, x, y - 2, c('steel.4'));
      plot(g, x, y + 1, c('ink.1'));
    }
  }
  for (const dx of [-6, 6]) {
    const x = Math.round(gate + dx);
    for (let y = FENCE_Y - 4; y <= FENCE_Y + 1; y++) plot(g, x, y, c('white.1'));
    plot(g, x, FENCE_Y - 5, c('teal.4'));
  }
}

/** The southern grass and the Brightwater wetlands, nearer and darker toward the still's foot. */
function paintWilds(g: CharGrid): void {
  fill(g, 0, FENCE_Y + 1, SCENE_W - 1, DESCENT_H - 1, (x, y) => {
    const t = (y - FENCE_Y) / (DESCENT_H - FENCE_Y);
    // Long grass in wind-combed swathes, the near grass deeper in shade.
    const comb = Math.sin(x * 0.045 + y * 0.11) * 0.18 + Math.sin(x * 0.013 - y * 0.03) * 0.12;
    let ch = dithered(
      [c('act1.grass.0'), c('act1.grass.1'), c('act1.grass.2'), c('act1.grass.3')],
      Math.max(0, Math.min(1, 0.62 - t * 0.5 + comb)),
      x,
      y,
    );
    // The wetlands: winding meres of Brightwater, lit by the sky, rimmed dark.
    const mere = Math.sin(x * 0.03 + Math.sin(y * 0.05) * 2) + Math.sin(y * 0.09 + x * 0.01) * 0.9;
    const wet = x < 120 ? 1.45 : 1.68;
    if (mere > wet) {
      const deep = mere > wet + 0.15;
      ch = deep
        ? hash01(x, y, 3) < 0.15
          ? c('act1.water.3')
          : c('act1.water.2')
        : c('act1.water.0');
    }
    // Flowers in the grass.
    const h = hash01(x, y, 61);
    if (h > 0.996) ch = h > 0.998 ? c('pink.4') : c('gold.4');
    return ch;
  });
}

/**
 * The walkers: a long line of tiny coral points coming out of the terraces east of the colony,
 * skirting it, and on south across the grass, all going the same way. Farther up they are single
 * pixels; nearer they are 2 px bodies with a lit top and a dark foot.
 */
export const WALK: readonly (readonly [number, number])[] = [
  [300, 150],
  [306, 180],
  [304, 210],
  [286, 236],
  [252, 254],
  [222, 270],
  [208, 300],
];

/** The walkers' positions along the line (every few pixels, a gap here and there). */
export function walkerPoints(): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let i = 1; i < WALK.length; i++) {
    const [x0, y0] = WALK[i - 1] ?? [0, 0];
    const [x1, y1] = WALK[i] ?? [0, 0];
    const len = Math.hypot(x1 - x0, y1 - y0);
    const gap = 3 + Math.round((1 - y0 / 300) * 2);
    for (let s = 0; s < len; s += gap) {
      if (hash01(Math.round(s), i, 71) < 0.12) continue;
      const t = s / len;
      const wob = Math.round((hash01(Math.round(s), i, 72) - 0.5) * 2);
      out.push({ x: Math.round(x0 + (x1 - x0) * t) + wob, y: Math.round(y0 + (y1 - y0) * t) });
    }
  }
  return out;
}

function paintWalkers(g: CharGrid): void {
  for (const p of walkerPoints()) {
    if (p.y < 200) {
      plot(g, p.x, p.y, c('coral.3'));
      continue;
    }
    // A 2×2 body: lit top-left, its foot in shade, and its shadow on the grass.
    plot(g, p.x, p.y, c('coral.4'));
    plot(g, p.x + 1, p.y, c('coral.3'));
    plot(g, p.x, p.y + 1, c('coral.2'));
    plot(g, p.x + 1, p.y + 1, c('coral.1'));
    plot(g, p.x + 2, p.y + 1, c('act1.grass.0'));
    if (p.y > 260) {
      // The nearest show a tuft.
      plot(g, p.x + 1, p.y - 1, c('coral.4'));
    }
  }
}

/** The clouds the shuttle is coming down through: a bank across the top, wisps lower down. */
function paintClouds(g: CharGrid): void {
  // The deck the shuttle has just dropped out of: across the top, its underside lumpy and shaded.
  fill(g, 0, 0, SCENE_W - 1, 24, (x, y) => {
    const edge =
      12 + Math.sin(x * 0.07) * 3 + Math.sin(x * 0.19 + 1) * 2 + Math.abs(Math.sin(x * 0.035)) * 5;
    if (y > edge + 1) return null;
    if (y > edge) return c('act1.sky.1');
    if (y > edge - 2) return c('act1.sky.2');
    return dithered([c('act1.sky.2'), c('white.0'), c('white.1')], 1 - y / (edge + 4), x, y);
  });
  paintCloud(g, DESCENT_INK, 40, 18, 90, 1);
  paintCloud(g, DESCENT_INK, 270, 14, 110, 2);
  paintCloud(g, DESCENT_INK, 160, 6, 70, 3);
  paintCloud(g, DESCENT_INK, 96, 52, 40, 4);
  paintCloud(g, DESCENT_INK, 226, 64, 34, 5);
  // A low wisp's shadow drifting over the terraces.
  fill(g, 40, 150, 120, 160, (x, y) => {
    const d = Math.hypot((x - 80) / 40, (y - 155) / 5);
    return d < 1 && dithered(['.', '#'], 1 - d, x, y) === '#' ? c('act1.grass.0') : null;
  });
  // A rig's haul-line strung down the Spires to the colony.
  eachOnLine(236, 104, 186, 186, (x, y) => {
    if ((x + y) % 2 === 0) plot(g, x, y, c('steel.1'));
  });
}

function paintDescent(): Record<string, CharGrid> {
  const g = sceneGrid('.', DESCENT_H);
  paintSkyAndSpires(g);
  fill(g, 0, TERRACES.y0, SCENE_W - 1, TERRACES.y1, () => c('act1.grass.1'));
  paintTerraces(g, DESCENT_INK, TERRACES.y0, TERRACES.y1, 7, 2.1);
  paintColony(g);
  paintWilds(g);
  paintFence(g);
  paintRoad(g, FENCE_Y + 2, DESCENT_H - 1);
  paintWalkers(g);
  paintClouds(g);
  return { still: g };
}

export const sceneDescent = defineScene({
  id: 'scene.descent',
  palette: 'act1',
  h: DESCENT_H,
  legend: LEGEND,
  paint: paintDescent,
});
