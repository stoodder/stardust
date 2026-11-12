// Touchdown (`scene.touchdown`; act1.md § *Prelude · Arrival*, shot 5; art-direction § 6, *The
// prelude's stills*): the landing pad under the Long Afternoon's cyan sky, the Spires and the
// terraces behind. On the left the shuttle's white hull stands on the pad with its hatch open and
// its ramp down; beyond the pad Evie's billboard beams (`prop.billboard` `beaming`, stamped 1:1);
// on the right the colony's sign, DAYS WITHOUT A PEST INCIDENT, on a flip counter. Something small
// with one ear tuft watches from a rock in the corner (`prop.peeker` `peek_0`). Frames:
// - `one`: the counter reads 1.
// - `zero`: a Nibbler (`enemy.nibbler`) skitters across in front of the sign, kicking up dust, and
//   the counter has just flipped to 0.
// The bottom band is the grass in shadow, so the line panel sits on dark.
import { textPixels, textWidth } from '../../font3x5.ts';
import { at, hash01, plot, type CharGrid } from '../../helpers.ts';
import { enemyNibbler } from '../../enemies/nibbler.ts';
import { propBillboard } from '../../props/billboard.ts';
import { propPeeker } from '../../props/peeker.ts';
import type { ColorName } from '../../../palettes/master.ts';
import { copyGrid, defineScene, dithered, fill, SCENE_H, SCENE_W, sceneGrid } from '../sceneKit.ts';
import { crestNear, paintCloud, paintRig, paintSky, paintSpires, paintTerraces } from './planetside.ts';
import { sceneInk, stampSprite } from './stamp.ts';

/*
 * Palette `everglow`: the slots carry the shuttle, the pad and the sign (steel up to white.0,
 * teal, orange, ink.0 / ink.1, white.1). Custom: A–C `act1.sky`, D–G `act1.grass.0`–`.3`, H–L
 * `act1.clay`, M `act1.shade`, N–R `coral` (the Nibbler, the Peeker), S–U `gold.2`–`.4` (Evie's
 * sun, the Skitterkin's shimmer), V/W `pink.2`/`.3`, X–Z `green.1`–`.3` (the Skitterkin's sprouts).
 */
const LEGEND = {
  A: 'act1.sky.0',
  B: 'act1.sky.1',
  C: 'act1.sky.2',
  D: 'act1.grass.0',
  E: 'act1.grass.1',
  F: 'act1.grass.2',
  G: 'act1.grass.3',
  H: 'act1.clay.0',
  I: 'act1.clay.1',
  J: 'act1.clay.2',
  K: 'act1.clay.3',
  L: 'act1.clay.4',
  M: 'act1.shade',
  N: 'coral.0',
  O: 'coral.1',
  P: 'coral.2',
  Q: 'coral.3',
  R: 'coral.4',
  S: 'gold.2',
  T: 'gold.3',
  U: 'gold.4',
  V: 'pink.2',
  W: 'pink.3',
  X: 'green.1',
  Y: 'green.2',
  Z: 'green.3',
} as const;

/** The still's ink (exported for the tests, which hold it at no missing colour). */
export const TOUCHDOWN_INK = sceneInk('everglow', LEGEND);
const c = (n: ColorName): string => TOUCHDOWN_INK.char(n);

/** Where the sky meets the far ridges, and where the near grass begins. */
const HORIZON = 72;
const GRASS_Y = 96;
/** The landing pad: an ellipse on the grass. */
export const PAD = { cx: 122, cy: 126, rx: 80, ry: 19 } as const;
/** The colony's sign: its board's box and the flip counter's card. */
export const SIGN = { x: 220, y: 72, w: 84, h: 44 } as const;
const CARD = { x: SIGN.x + 34, y: SIGN.y + 20, w: 17, h: 21 } as const;
/** The Nibbler's anchor on `zero` (in front of the sign, running east) and the Peeker's rock. */
export const NIBBLER_AT = { x: 214, y: 138 } as const;
export const PEEKER_AT = { x: 297, y: 156 } as const;
/** Evie's billboard, beyond the pad. */
export const BILLBOARD_AT = { x: 178, y: 101 } as const;

function paintBackdrop(g: CharGrid): void {
  paintSky(g, TOUCHDOWN_INK, 0, HORIZON);
  paintCloud(g, TOUCHDOWN_INK, 64, 30, 46, 1);
  paintCloud(g, TOUCHDOWN_INK, 246, 22, 60, 2);
  paintCloud(g, TOUCHDOWN_INK, 168, 46, 24, 3);
  // The Spires to the north, hazed by distance, rigs on their crests.
  const tops = paintSpires(
    g,
    TOUCHDOWN_INK,
    HORIZON + 2,
    [
      { x: 30, w: 120, h: 30 },
      { x: 128, w: 80, h: 16 },
      { x: 222, w: 110, h: 34 },
      { x: 300, w: 90, h: 22 },
    ],
    11,
    0.3,
  );
  for (const x of [30, 222, 300]) {
    const [rx, top] = crestNear(tops, x, 14);
    paintRig(g, TOUCHDOWN_INK, rx, top + 1, 9);
  }
  // The grass toward us, darkening into the foreground's shadow (the line panel sits on it).
  fill(g, 0, HORIZON, SCENE_W - 1, SCENE_H - 1, (x, y) => {
    const t = Math.max(0, (y - GRASS_Y) / (SCENE_H - GRASS_Y));
    let ch = dithered([c('act1.grass.0'), c('act1.grass.1'), c('act1.grass.2')], 1 - t ** 1.3, x, y);
    // Tufts: lit blades, a few pink blooms.
    const h = hash01(x >> 1, y, 23);
    if (h < 0.05 * (1 - t)) ch = c('act1.grass.3');
    else if (h > 0.997 && t < 0.6) ch = c('pink.3');
    return ch;
  });
  paintTerraces(g, TOUCHDOWN_INK, HORIZON - 2, GRASS_Y + 2, 5, 0.6);
}

/** The pad: a steel disc on the grass, its rim hazard-striped, teal lights round it. */
function paintPad(g: CharGrid): void {
  const { cx, cy, rx, ry } = PAD;
  // Its side (the plate's thickness) and its shadow on the grass.
  fill(g, cx - rx - 2, cy - ry, cx + rx + 2, cy + ry + 5, (x, y) => {
    const u = (x - cx) / rx;
    const below = (y - 4 - cy) / ry;
    const top = (y - cy) / ry;
    if (u * u + top * top <= 1) return null;
    if (u * u + below * below <= 1) return (x + y) % 4 < 2 ? c('ink.0') : c('ink.1');
    const side = (y - 2 - cy) / ry;
    if (u * u + side * side <= 1) {
      // The rim's front: hazard stripes, orange and ink.
      return Math.floor((x - y) / 3) % 2 === 0 ? c('orange.3') : c('ink.1');
    }
    return null;
  });
  fill(g, cx - rx, cy - ry, cx + rx, cy + ry, (x, y) => {
    const u = (x - cx) / rx;
    const v = (y - cy) / ry;
    const r = u * u + v * v;
    if (r > 1) return null;
    if (r > 0.9) return v < 0 ? c('white.0') : c('steel.4');
    // The landing ring and its cross-hair, in Everglow white; the plate steel, lit from the west.
    if (Math.abs(r - 0.42) < 0.035) return c('white.0');
    if (Math.abs(r - 0.4) < 0.07) return c('teal.3');
    if (r < 0.4 && (Math.abs(x - cx) < 1 || Math.abs(y - cy) < 0.5)) return c('teal.2');
    return dithered([c('steel.1'), c('steel.2'), c('steel.3')], 0.75 - u * 0.25 - v * 0.15, x, y);
  });
  // Landing lights round the rim.
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(a) * (rx - 3));
    const y = Math.round(cy + Math.sin(a) * (ry - 1.5));
    plot(g, x, y, c('teal.4'));
    plot(g, x + 1, y, c('teal.2'));
  }
}

/** The shuttle on the pad's west side: its white hull, a teal band, the hatch open and lit. */
const HULL = { cx: 18, cy: 96, rx: 50, ry: 24 } as const;
const HATCH = { x0: 44, x1: 57, y0: 94, y1: 113 } as const;

function paintShuttle(g: CharGrid): void {
  // Two landing legs onto the pad.
  for (const lx of [10, 46]) {
    for (let y = 112; y < 128; y++) {
      plot(g, lx, y, c('steel.1'));
      plot(g, lx + 1, y, c('steel.3'));
    }
    for (let dx = -3; dx <= 4; dx++) plot(g, lx + dx, 128, c('ink.1'));
  }
  // The hull: a long white body, its belly in shade, rounded nose off the left edge.
  fill(g, 0, HULL.cy - HULL.ry, HULL.cx + HULL.rx, HULL.cy + HULL.ry, (x, y) => {
    const u = (x - HULL.cx) / HULL.rx;
    const v = (y - HULL.cy) / HULL.ry;
    const r = u * u + v * v * (v > 0 ? 1.8 : 1);
    if (r > 1) return null;
    if (r > 0.93) return v > 0.1 ? c('ink.1') : c('steel.2');
    // The Everglow band and its pinstripe.
    if (y >= HULL.cy - 2 && y <= HULL.cy + 1) return y === HULL.cy - 2 ? c('teal.4') : c('teal.3');
    if (y === HULL.cy + 3) return c('teal.1');
    // Panel lines.
    if ((x + 7) % 13 === 0 && v < 0.5) return c('steel.3');
    const lit = -v * 0.9 - u * 0.25;
    return dithered([c('steel.2'), c('steel.3'), c('steel.4'), c('white.0'), c('white.1')], 0.45 + lit, x, y);
  });
  // The cockpit's glass, dark, with the sky's glint.
  fill(g, 0, 76, 26, 84, (x, y) => {
    const u = (x - 6) / 20;
    const v = (y - 82) / 7;
    if (u * u + v * v > 1 || y > 83) return null;
    return y === 76 + Math.floor(x / 9) ? c('act1.sky.2') : x < 14 && y < 80 ? c('teal.2') : c('teal.0');
  });
  // The hatch: open, warm inside, its door folded down as the ramp.
  for (let y = HATCH.y0; y <= HATCH.y1; y++) {
    for (let x = HATCH.x0; x <= HATCH.x1; x++) {
      const edge = x === HATCH.x0 || x === HATCH.x1 || y === HATCH.y0;
      const back = y < HATCH.y0 + 6 ? c('orange.3') : y < HATCH.y0 + 12 ? c('gold.3') : c('gold.4');
      plot(g, x, y, edge ? c('ink.0') : x === HATCH.x0 + 1 ? c('orange.2') : back);
    }
  }
  // A strip light over the hatch.
  for (let x = HATCH.x0 + 2; x < HATCH.x1 - 1; x++) plot(g, x, HATCH.y0 - 2, c('teal.4'));
  paintRamp(g);
}

/** The ramp: from the hatch's sill down onto the pad, ribbed steel with teal-edged rails. */
function paintRamp(g: CharGrid): void {
  const top = { x0: HATCH.x0, x1: HATCH.x1, y: HATCH.y1 };
  const foot = { x0: 66, x1: 86, y: 136 };
  for (let y = top.y; y <= foot.y; y++) {
    const t = (y - top.y) / (foot.y - top.y);
    const x0 = Math.round(top.x0 + (foot.x0 - top.x0) * t);
    const x1 = Math.round(top.x1 + (foot.x1 - top.x1) * t);
    for (let x = x0; x <= x1; x++) {
      let ch = (y - top.y) % 3 === 0 ? c('steel.2') : c('steel.4');
      if (x === x0) ch = c('teal.3');
      if (x === x1) ch = c('steel.1');
      if (x === x1 - 1) ch = c('teal.2');
      plot(g, x, y, ch);
    }
    // The ramp's shadow on the pad, to its east.
    for (let x = x1 + 1; x <= x1 + 2 + Math.round(t * 3); x++) {
      if (at(g, x, y) !== c('ink.1')) plot(g, x, y, c('steel.1'));
    }
  }
  // Its lip on the pad.
  for (let x = foot.x0; x <= foot.x1 + 1; x++) plot(g, x, foot.y + 1, c('ink.0'));
}

/** The sign: its posts, a white board in a teal frame, the words, and the counter's card. */
function paintSign(g: CharGrid): void {
  const { x, y, w, h } = SIGN;
  for (let py = y + h; py <= y + h + 22; py++) {
    for (const px of [x + 10, x + w - 12]) {
      plot(g, px, py, c('steel.1'));
      plot(g, px + 1, py, c('steel.3'));
    }
  }
  for (const px of [x + 7, x + w - 15]) {
    for (let dx = 0; dx < 8; dx++) plot(g, px + dx, y + h + 23, c('ink.0'));
  }
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      const frame = py <= y + 1 || py >= y + h - 2 || px <= x + 1 || px >= x + w - 2;
      const ch = frame
        ? py >= y + h - 2 || px >= x + w - 2
          ? c('teal.1')
          : c('teal.3')
        : py === y + h - 3
          ? c('steel.4')
          : c('white.0');
      plot(g, px, py, ch);
    }
  }
  // The outline round it, so it reads off the sky and the ridge.
  for (let px = x - 1; px <= x + w; px++) {
    plot(g, px, y - 1, c('ink.0'));
    plot(g, px, y + h, c('ink.0'));
  }
  for (let py = y; py < y + h; py++) {
    plot(g, x - 1, py, c('ink.0'));
    plot(g, x + w, py, c('ink.0'));
  }
  const lines = ['DAYS WITHOUT A', 'PEST INCIDENT'];
  lines.forEach((line, i) => {
    const tx = x + Math.round((w - textWidth(line)) / 2);
    for (const p of textPixels(line, tx, y + 5 + i * 7)) plot(g, p.x, p.y, c('ink.1'));
  });
}

/** The flip counter's card with its digit; `flipped` adds the old card's blur over the top. */
function paintCard(g: CharGrid, digit: string, flipped: boolean): void {
  const { x, y, w, h } = CARD;
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      const edge = px === x || px === x + w - 1 || py === y || py === y + h - 1;
      const hinge = py === y + Math.floor(h / 2);
      plot(g, px, py, edge ? c('ink.0') : hinge ? c('ink.0') : py < y + h / 2 ? c('ink.1') : c('steel.1'));
    }
  }
  const dx = x + Math.floor((w - 9) / 2);
  for (const p of textPixels(digit, dx, y + 3, 3)) {
    plot(g, p.x, p.y, digit === '0' ? c('orange.3') : c('white.1'));
  }
  // The hinge's shine over the digit.
  for (let px = x + 1; px < x + w - 1; px++) plot(g, px, y + Math.floor(h / 2), c('ink.0'));
  if (!flipped) return;
  // The old card still falling: a blur of white edges above and the hinge pins lit.
  for (let px = x + 1; px < x + w - 1; px++) {
    plot(g, px, y - 3, c('steel.4'));
    if (px % 2 === 0) plot(g, px, y - 5, c('steel.3'));
  }
  plot(g, x - 1, y + Math.floor(h / 2), c('orange.4'));
  plot(g, x + w, y + Math.floor(h / 2), c('orange.4'));
}

/** A puff of dust kicked up behind a running Nibbler, and its speed lines. */
function paintDust(g: CharGrid, x: number, y: number): void {
  const puffs: readonly (readonly [number, number, number])[] = [
    [-12, -1, 2.4],
    [-18, -3, 1.8],
    [-23, -2, 1.3],
    [-27, -4, 0.9],
  ];
  for (const [dx, dy, r] of puffs) {
    fill(g, x + dx - 3, y + dy - 3, x + dx + 3, y + dy + 3, (px, py) => {
      const d = Math.hypot(px - (x + dx), py - (y + dy));
      if (d > r) return null;
      return py < y + dy ? c('act1.clay.4') : c('act1.clay.3');
    });
  }
  for (const [dx0, dx1, dy] of [
    [-34, -14, -7],
    [-30, -13, -4],
    [-38, -20, -10],
  ] as const) {
    for (let px = x + dx0; px <= x + dx1; px++) if ((px + dy) % 5 !== 0) plot(g, px, y + dy, c('white.0'));
  }
}

function paintTouchdown(): Record<string, CharGrid> {
  const g = sceneGrid();
  paintBackdrop(g);
  paintPad(g);
  stampSprite(g, TOUCHDOWN_INK, propBillboard, 'beaming', BILLBOARD_AT.x, BILLBOARD_AT.y);
  paintShuttle(g);
  paintSign(g);
  stampSprite(g, TOUCHDOWN_INK, propPeeker, 'peek_0', PEEKER_AT.x, PEEKER_AT.y);
  const one = copyGrid(g);
  paintCard(one, '1', false);
  const zero = copyGrid(g);
  paintCard(zero, '0', true);
  paintDust(zero, NIBBLER_AT.x, NIBBLER_AT.y);
  stampSprite(zero, TOUCHDOWN_INK, enemyNibbler, 'walk_se_1', NIBBLER_AT.x, NIBBLER_AT.y);
  return { one, zero };
}

export const sceneTouchdown = defineScene({
  id: 'scene.touchdown',
  palette: 'everglow',
  legend: LEGEND,
  paint: paintTouchdown,
});
