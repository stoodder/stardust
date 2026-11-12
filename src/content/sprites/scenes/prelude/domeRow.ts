// Dome Row (`scene.dome_row`; act1.md § *Prelude · Arrival*, shots 6–7; art-direction § 6, *The
// prelude's stills*): the colony as the battle maps draw it, seen from above at the same 2:1
// isometric angle, with the playfield's own sprites stamped 1:1 (stamp.ts): the road
// (`tile.path`) comes down from the Spires on the upper left, past the domes (`prop.dome`) on its
// far side and the turrets (`tower.rivet` on `tile.pad`) on its near side, through the perimeter
// fence's gate (`prop.fence`), and on out into open grass on the lower right. By the gate stands
// a huge figure with a cannon on one shoulder: Bricks, a silhouette only (the briefing introduces
// him), backlit against the grass. Frames:
// - `still`: Dome Row in the afternoon.
// - `wave`: as `still`, the figure by the gate raising one hand.
// - `gerald`: as `wave`, and in the foreground on the left the mail drone (`enemy.gerald`), his
//   satchel open, over a clipboard (Form FF-1) dropped at the Technician's boots, seen from above.
// The bottom of the frame is the near grass in shade, so the line panel sits on dark; the boots,
// the clipboard and Gerald stand left of the panel.
import { at, hash01, plot, type CharGrid } from '../../helpers.ts';
import { enemyGerald } from '../../enemies/gerald.ts';
import { propDome } from '../../props/dome.ts';
import { propFence } from '../../props/fence.ts';
import { tileGrass } from '../../tiles/grass.ts';
import { tilePad } from '../../tiles/pad.ts';
import { tilePath } from '../../tiles/path.ts';
import { towerRivet, towerRivetHead } from '../../towers/rivet.ts';
import type { ColorName } from '../../../palettes/master.ts';
import { copyGrid, defineScene, dithered, fill, SCENE_H, SCENE_W, sceneGrid } from '../sceneKit.ts';
import { crestNear, paintCloud, paintRig, paintSky, paintSpires } from './planetside.ts';
import { sceneInk, stampSprite } from './stamp.ts';

/*
 * Palette `everglow`: the slots carry the colony's kit (steel up to white.0, teal, orange,
 * ink.0 / ink.1, white.1). Custom: A–C `act1.sky`, D–H `act1.grass`, I–M `act1.clay`, N
 * `act1.shade`, O–R `act1.path.1`–`.4`, S `steel.0` (the pads' plates), T `blue.3` (Gerald's
 * stamp), U `gold.4`, V `pink.3`, W `act1.light` (the sun's rim on the silhouette), X `ink.2`,
 * Y `gold.3`, Z `pink.4`.
 */
const LEGEND = {
  A: 'act1.sky.0',
  B: 'act1.sky.1',
  C: 'act1.sky.2',
  D: 'act1.grass.0',
  E: 'act1.grass.1',
  F: 'act1.grass.2',
  G: 'act1.grass.3',
  H: 'act1.grass.4',
  I: 'act1.clay.0',
  J: 'act1.clay.1',
  K: 'act1.clay.2',
  L: 'act1.clay.3',
  M: 'act1.clay.4',
  N: 'act1.shade',
  O: 'act1.path.1',
  P: 'act1.path.2',
  Q: 'act1.path.3',
  R: 'act1.path.4',
  S: 'steel.0',
  T: 'blue.3',
  U: 'gold.4',
  V: 'pink.3',
  W: 'act1.light',
  X: 'ink.2',
  Y: 'gold.3',
  Z: 'pink.4',
} as const;

/** The still's ink (exported for the tests, which hold it at no missing colour). */
export const DOME_ROW_INK = sceneInk('everglow', LEGEND);
const c = (n: ColorName): string => DOME_ROW_INK.char(n);

/** The isometric grid's origin on the still: cell (0, 0)'s top vertex. */
const ORIGIN = { x: 136, y: 52 } as const;

/** A cell's top vertex on the still (tile anchor). */
function cellTop(gx: number, gy: number): { x: number; y: number } {
  return { x: ORIGIN.x + (gx - gy) * 16, y: ORIGIN.y + (gx + gy) * 8 };
}

/** A cell's centre on the still (prop, tower and ally anchor). */
export function cellCentre(gx: number, gy: number): { x: number; y: number } {
  const t = cellTop(gx, gy);
  return { x: Math.round(t.x), y: Math.round(t.y + 8) };
}

/** The road runs along grid x at gy = 0; the fence crosses it at gx = GATE_GX (the gate). */
const GATE_GX = 6;
/** The domes on the road's far side and the turrets' pads on its near side. */
const DOMES: readonly (readonly [number, number])[] = [
  [1.5, -2],
  [4, -2],
  [-5, 3],
  [-3, 3.5],
  [-1, 4],
  [1.5, 4],
];
const PADS: readonly (readonly [number, number])[] = [
  [-3, 1.5],
  [0, 1.5],
  [3, 1.5],
];
/**
 * Bricks's feet, past the gate on the road's far side, on open grass a few pixels clear of the
 * fence (its rail runs above his head), so his raised hand reads against the grass.
 */
export const BRICKS_AT = cellCentre(GATE_GX + 2.25, -1);
/** The Technician on the road, walking down it toward the gate. */
export const TECHNICIAN_AT = cellCentre(4, 0.1);
/** On `gerald`: the clipboard at the Technician's boots, and Gerald hovering just past it. */
export const CLIPBOARD_AT = { x: TECHNICIAN_AT.x + 4, y: TECHNICIAN_AT.y + 1 } as const;
export const GERALD_AT = { x: TECHNICIAN_AT.x - 8, y: TECHNICIAN_AT.y + 16 } as const;

/** The far edge of the valley floor: the terraces' foot under the Spires (higher to the east). */
function footY(x: number): number {
  return Math.round(48 - x * 0.04 + Math.sin(x * 0.05) * 2);
}

function paintGround(g: CharGrid): void {
  // Grass tiles over the whole floor, a variant per cell.
  for (let gx = -12; gx <= 18; gx++) {
    for (let gy = -12; gy <= 12; gy++) {
      const t = cellTop(gx, gy);
      if (t.x < -32 || t.x > SCENE_W + 32 || t.y < -16 || t.y > SCENE_H) continue;
      const v = Math.floor(hash01(gx, gy, 7) * 3);
      stampSprite(g, DOME_ROW_INK, tileGrass, `v${v}`, t.x, t.y);
    }
  }
  // The road, from the Spires' foot to the frame's edge, its middle trodden.
  for (let gx = -8; gx <= 14; gx++) {
    const t = cellTop(gx, 0);
    stampSprite(g, DOME_ROW_INK, tilePath, gx % 3 === 0 ? 'v1' : 'v0', t.x, t.y);
  }
  for (const [gx, gy] of PADS) {
    const t = cellTop(gx, gy);
    stampSprite(g, DOME_ROW_INK, tilePad, 'v0', t.x, t.y);
  }
  // Beyond the gate the grass grows long and wild: tufts and a few pink blooms.
  fill(g, 0, 0, SCENE_W - 1, SCENE_H - 1, (x, y) => {
    const gxf = (x - ORIGIN.x) / 32 + (y - ORIGIN.y) / 16;
    const gyf = (y - ORIGIN.y) / 16 - (x - ORIGIN.x) / 32;
    if (gxf < GATE_GX + 1 || Math.abs(gyf) < 0.6) return null;
    const h = hash01(x, y >> 1, 31);
    if (h < 0.06) return c('act1.grass.3');
    if (h < 0.075) return c('act1.grass.4');
    if (h > 0.996) return c('pink.4');
    return null;
  });
}

/** The fence along grid y at the gate's line, its gap where the road goes through. */
function paintFence(g: CharGrid, side: 'far' | 'near'): void {
  const range = side === 'far' ? [-7, -6, -5, -4, -3, -2, -1] : [1, 2, 3, 4, 5, 6, 7];
  for (const gy of range) {
    const p = cellCentre(GATE_GX + 0.5, gy);
    stampSprite(g, DOME_ROW_INK, propFence, 'y', p.x, p.y);
  }
}

/** The gate: two Everglow pillars either side of the road, a teal lamp on each, standing open. */
function paintGate(g: CharGrid): void {
  for (const gy of [-0.75, 0.75]) {
    const p = cellCentre(GATE_GX + 0.5, gy);
    for (let y = p.y - 13; y <= p.y; y++) {
      plot(g, p.x - 2, y, c('ink.0'));
      plot(g, p.x - 1, y, c('white.0'));
      plot(g, p.x, y, c('steel.3'));
      plot(g, p.x + 1, y, c('steel.1'));
      plot(g, p.x + 2, y, c('ink.0'));
    }
    for (let x = p.x - 2; x <= p.x + 2; x++) plot(g, x, p.y - 14, c('ink.0'));
    plot(g, p.x - 1, p.y - 15, c('teal.4'));
    plot(g, p.x, p.y - 15, c('teal.3'));
    plot(g, p.x, p.y - 9, c('orange.3'));
  }
}

/** The things standing on the floor, back to front, so nearer ones overlap farther ones. */
function paintStanding(g: CharGrid): void {
  type Item = { depth: number; draw: () => void };
  const items: Item[] = [];
  for (const [gx, gy] of DOMES) {
    const p = cellCentre(gx, gy);
    items.push({
      depth: gx + gy,
      draw: () => stampSprite(g, DOME_ROW_INK, propDome, 'v0', p.x, p.y),
    });
  }
  for (const [gx, gy] of PADS) {
    const p = cellCentre(gx, gy);
    items.push({
      depth: gx + gy,
      draw: () => {
        stampSprite(g, DOME_ROW_INK, towerRivet, 't1', p.x, p.y);
        const m = towerRivet.mount ?? towerRivet.anchor;
        const hx = p.x - towerRivet.anchor.x + m.x;
        const hy = p.y - towerRivet.anchor.y + m.y;
        // The turrets face the road and the gate (south-east).
        stampSprite(g, DOME_ROW_INK, towerRivetHead, 'se', hx, hy);
      },
    });
  }
  items.sort((a, b) => a.depth - b.depth);
  for (const it of items) it.draw();
}

/** The backdrop over the valley's far edge: sky, clouds, the Spires and their rigs, terraces. */
function paintBackdrop(g: CharGrid): void {
  const horizon = 30;
  paintSky(g, DOME_ROW_INK, 0, horizon);
  paintCloud(g, DOME_ROW_INK, 210, 12, 40, 4);
  const tops = paintSpires(
    g,
    DOME_ROW_INK,
    horizon + 6,
    [
      { x: 40, w: 150, h: 36 },
      { x: 150, w: 90, h: 22 },
      { x: 268, w: 120, h: 28 },
    ],
    21,
    0.1,
  );
  for (const x of [40, 150, 268]) {
    const [rx, top] = crestNear(tops, x, 16);
    paintRig(g, DOME_ROW_INK, rx, top + 1, 10);
  }
  // The terraces' slope down to the valley floor, the road climbing out of it to the Spires.
  for (let x = 0; x < SCENE_W; x++) {
    const foot = footY(x);
    for (let y = horizon + 2; y <= foot; y++) {
      if (at(g, x, y) !== '.' && y < horizon + 6 && (tops[x] ?? 0) <= y) continue;
      const k = (y - horizon) / Math.max(1, foot - horizon);
      const band = Math.floor((y + Math.sin(x * 0.04) * 3) / 4) % 2 === 0;
      let ch = band ? c('act1.grass.2') : c('act1.grass.1');
      if ((y + Math.round(Math.sin(x * 0.04) * 3)) % 4 === 0) ch = c('act1.grass.3');
      if (k < 0.25) ch = dithered([c('act1.clay.2'), ch], k * 4, x, y);
      if (y >= (tops[x] ?? 0) || y > horizon + 5) plot(g, x, y, ch);
    }
    // The seam into the floor: a lit lip and its shadow.
    plot(g, x, foot, c('act1.grass.3'));
    plot(g, x, foot + 1, c('act1.grass.0'));
  }
  // The road's last switchback up the slope, toward the rigs.
  const top = cellTop(-8, 0);
  let x = top.x;
  for (let y = footY(top.x); y > 30; y--) {
    x += y % 3 === 0 ? 1 : 0;
    for (let dx = -1; dx <= 1; dx++)
      plot(g, x + dx, y, dx === 0 ? c('act1.path.4') : c('act1.path.2'));
  }
}

/**
 * Bricks, a silhouette (the briefing introduces him): very large, broad-shouldered, a long cannon
 * on his right shoulder, feet planted; `B` body, `C` the cannon, `S` the barrel's steel glint.
 * `wave` raises his free hand high above his head, out to the side: `A` the arm (rimmed by the
 * sun on its west edge), `H` the open hand, lit cream all over.
 */
/** Bricks's two shapes (exported for the tests: 14–16 px tall, the wave's hand above his head). */
// prettier-ignore
export const BRICKS_STILL = [
  '...........CSC',
  '..........CSC.',
  '.....BBB.CSC..',
  '....BBBBBCS...',
  '....BBBBBCC...',
  '...BBBBBBBBB..',
  '..BBBBBBBBBBB.',
  '..BBBBBBBBBBB.',
  '..BBBBBBBBB.BB',
  '.BB.BBBBBBB.BB',
  '.BB.BBBBBBB.BB',
  '.B..BBBBBBB..B',
  '....BBBBBBB...',
  '....BBB.BBB...',
  '....BBB.BBB...',
  '...BBBB.BBBB..',
];
// prettier-ignore
export const BRICKS_WAVE = [
  'HH.........CSC',
  'HH........CSC.',
  '.A...BBB.CSC..',
  '.AA.BBBBBCS...',
  '..A.BBBBBCC...',
  '..AABBBBBBBB..',
  '...ABBBBBBBBB.',
  '...BBBBBBBBBB.',
  '....BBBBBBB.BB',
  '....BBBBBBB.BB',
  '....BBBBBBB.BB',
  '....BBBBBBB..B',
  '....BBBBBBB...',
  '....BBB.BBB...',
  '....BBB.BBB...',
  '...BBBB.BBBB..',
];
/** The column of a shape the feet's centre stands on. */
const BRICKS_FEET_COL = 7;

/**
 * Where Bricks's raised hand and arm land on the still (`A` and `H` of the wave), for the tests:
 * they must stand clear of the fence and lit against the grass.
 */
export function bricksArmPixels(): { x: number; y: number; hand: boolean }[] {
  const out: { x: number; y: number; hand: boolean }[] = [];
  const oy = BRICKS_AT.y - BRICKS_WAVE.length + 1;
  BRICKS_WAVE.forEach((row, sy) => {
    for (let sx = 0; sx < row.length; sx++) {
      const ch = row.charAt(sx);
      if (ch === 'A' || ch === 'H')
        out.push({ x: BRICKS_AT.x - BRICKS_FEET_COL + sx, y: oy + sy, hand: ch === 'H' });
    }
  });
  return out;
}

/** Stamps the silhouette with its feet's centre at (x, y): ink, rimmed by the sun on the west. */
function paintBricks(g: CharGrid, x: number, y: number, wave: boolean): void {
  const src = wave ? BRICKS_WAVE : BRICKS_STILL;
  const h = src.length;
  const w = Math.max(...src.map((r) => r.length));
  const ox = x - BRICKS_FEET_COL;
  const oy = y - h + 1;
  const solid = (sx: number, sy: number): boolean => {
    const ch = src[sy]?.charAt(sx) ?? '.';
    return ch !== '.' && ch !== '';
  };
  // The ground shadow, east of his feet.
  for (let dx = -2; dx <= 8; dx++) plot(g, x + dx, y + 1, c('act1.grass.0'));
  for (let sy = -1; sy <= h; sy++) {
    for (let sx = -1; sx <= w; sx++) {
      const ch = src[sy]?.charAt(sx) ?? '.';
      if (ch === '.' || ch === '') {
        const ring =
          solid(sx - 1, sy) || solid(sx + 1, sy) || solid(sx, sy - 1) || solid(sx, sy + 1);
        if (ring) plot(g, ox + sx, oy + sy, c('ink.0'));
        continue;
      }
      // The rim: the afternoon sun from the west catches his outline's west edge (each row's
      // first pixel) and the tops of his head and cannon; the raised hand is lit all over.
      const row = src[sy] ?? '';
      const west = sx === row.search(/[^.]/);
      const top = !solid(sx, sy - 1) && sy < 5;
      let color: ColorName;
      if (ch === 'H') color = 'act1.light';
      else if (ch === 'C' || ch === 'S') color = top ? 'steel.4' : ch === 'S' ? 'steel.3' : 'ink.2';
      else color = (west && sy < 13) || top ? 'act1.light' : 'ink.1';
      plot(g, ox + sx, oy + sy, c(color));
    }
  }
}

/**
 * The Technician at the battle's scale, from behind and a little to the side (walking south-east,
 * toward the gate): the oversized white Everglow helmet with its teal stripe and its antenna
 * tipped pink, the visor's dark edge at the side, the teal jumpsuit, dark boots. No face.
 */
// prettier-ignore
const TECHNICIAN = [
  '......v..',
  '.....a...',
  '..xxxxx..',
  '.xwwwwwx.',
  'xwwwwwwsx',
  'xtttttttx',
  'xwwwwwbkx',
  '.xsssskx.',
  '.x78887x.',
  '.x78887x.',
  '..x7x8x..',
  '..xkxkx..',
];
const TECHNICIAN_INK: Readonly<Record<string, ColorName>> = {
  x: 'ink.0',
  k: 'ink.1',
  w: 'white.0',
  s: 'steel.3',
  t: 'teal.3',
  b: 'blue.3',
  a: 'steel.2',
  v: 'pink.3',
  '7': 'teal.2',
  '8': 'teal.3',
};

/** Stamps the Technician with the feet's centre at (x, y), and its shadow on the road. */
function paintTechnician(g: CharGrid, x: number, y: number): void {
  for (let dx = -3; dx <= 4; dx++) plot(g, x + dx, y + 1, c('act1.path.1'));
  const ox = x - 4;
  const oy = y - TECHNICIAN.length + 1;
  TECHNICIAN.forEach((row, sy) => {
    for (let sx = 0; sx < row.length; sx++) {
      const color = TECHNICIAN_INK[row.charAt(sx)];
      if (color !== undefined) plot(g, ox + sx, oy + sy, c(color));
    }
  });
}

/** Form FF-1 on its clipboard, dropped on the grass: steel board, clip, the form's lines. */
function paintClipboard(g: CharGrid): void {
  const { x, y } = CLIPBOARD_AT;
  const w = 7;
  const h = 5;
  // Its shadow, then the board (lying a little askew: one pixel's lean per four rows).
  for (let sy = 0; sy <= h; sy++) {
    const lean = Math.floor(sy / 3);
    for (let sx = -1; sx <= w; sx++) {
      const px = x + sx + lean;
      const py = y + sy;
      if (sy === h || sx === w) {
        plot(g, px + 1, py + 1, c('act1.grass.0'));
        continue;
      }
      const edge = sx === -1 || sx === w - 1 || sy === 0 || sy === h - 1;
      let ch = edge ? c('steel.1') : c('white.0');
      if (!edge && sy === 2 && sx > 0 && sx < w - 2) ch = c('steel.2');
      // The form's header: Everglow orange, and the empty signature line in ink.
      if (!edge && sy === 1) ch = c('orange.3');
      if (!edge && sy === h - 2 && sx > 2) ch = c('ink.1');
      plot(g, px, py, ch);
    }
  }
  // The clip.
  for (let sx = 2; sx <= 4; sx++) plot(g, x + sx, y, c('steel.4'));
  plot(g, x + 3, y - 1, c('steel.2'));
}

function paintGeraldShot(g: CharGrid): void {
  // The clipboard at the Technician's boots, his shadow on the road under him, then the drone,
  // hovering off already, satchel open.
  paintClipboard(g);
  for (let dx = -3; dx <= 3; dx++) plot(g, GERALD_AT.x + dx, GERALD_AT.y + 5, c('act1.grass.0'));
  stampSprite(g, DOME_ROW_INK, enemyGerald, 'walk_se_0', GERALD_AT.x, GERALD_AT.y);
}

/** The near grass in shade along the bottom (the line panel sits on it). */
function paintNearShade(g: CharGrid): void {
  fill(g, 0, 140, SCENE_W - 1, SCENE_H - 1, (x, y) => {
    const t = (y - 140) / (SCENE_H - 140);
    const here = at(g, x, y);
    if (bayerShade(x, y, t)) return c('act1.grass.0');
    return here === '.' ? c('act1.grass.1') : null;
  });
}

/** True where the foreground's shade covers (x, y): an ordered dither thickening downward. */
function bayerShade(x: number, y: number, t: number): boolean {
  return dithered(['0', '1'], t ** 0.8, x, y) === '1';
}

function paintDomeRow(): Record<string, CharGrid> {
  const g = sceneGrid();
  paintGround(g);
  paintBackdrop(g);
  paintFence(g, 'far');
  paintStanding(g);
  paintGate(g);
  paintFence(g, 'near');
  paintNearShade(g);
  paintTechnician(g, TECHNICIAN_AT.x, TECHNICIAN_AT.y);
  const still = copyGrid(g);
  paintBricks(still, BRICKS_AT.x, BRICKS_AT.y, false);
  const wave = copyGrid(g);
  paintBricks(wave, BRICKS_AT.x, BRICKS_AT.y, true);
  // Gerald is nearer than the Technician: he's drawn over her.
  const gerald = copyGrid(wave);
  paintGeraldShot(gerald);
  return { still, wave, gerald };
}

export const sceneDomeRow = defineScene({
  id: 'scene.dome_row',
  palette: 'everglow',
  legend: LEGEND,
  paint: paintDomeRow,
});
