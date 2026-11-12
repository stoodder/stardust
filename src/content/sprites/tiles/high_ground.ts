// High ground (`^`, design/maps.md §3): a buildable raised block, one elevation step (8 px) up.
// Its top face is a pad (art-direction §8 Tile readability), and its cliff faces are the act's
// clay, lit on the left, shaded on the right, banded with strata, with grass lipping over the
// edge. The renderer draws it in `world` (tech-spec § Depth sorting), its top face `ZH` higher.
import { defineSprite } from '../defineSprite.ts';
import { grid, hash01, inTileMask, plot, rows, stamp, TILE_H, TILE_W } from '../helpers.ts';
import { PAD_LEGEND, padGrid } from './pad.ts';
import { ENV_VARIANTS } from './tileGen.ts';

/** One elevation step (tech-spec § Tile and screen: `ZH`). */
export const ELEVATION_PX = 8;

/** The lowest row of the tile mask in column x (−1 outside it). */
function maskBottom(x: number): number {
  for (let y = TILE_H - 1; y >= 0; y--) if (inTileMask(x, y)) return y;
  return -1;
}

/**
 * The block's look: `v0` Act I's grassy terrace block; `ledge` a canyon ledge (A2M1: rock lips
 * instead of grass, three strata, cracks down the faces, rubble at the foot); `outcrop` an Aelari
 * thread-glass outcrop (A2M2: dark rock woven through with sapphire glass threads crossing at
 * bright knots, glass shards at its foot); `catwalk` a plant catwalk (A2M4, T540c: a steel deck of
 * grating round the plate, hazard-striped along its lip, on an open trestle of legs and cross
 * braces, the ground showing through); `watchtower` the colony's old watchtower (A2M6, T540c:
 * coursed ferrocrete faces with a slit window on each and a door on the lit face, a battlement rim
 * of merlons round the plate); `halls` a Halls-mouth ledge (the finale, T842: the Spires' dark rock,
 * a lit lip, strata, and the Halls' natural seams running through its faces in sung gold).
 */
export type HighGroundLook = 'v0' | 'ledge' | 'outcrop' | 'catwalk' | 'watchtower' | 'halls';

/** A built block (catwalk, watchtower): the plate kept, its grass margin and faces replaced. */
function builtGrid(look: 'catwalk' | 'watchtower'): string[] {
  const g = grid(TILE_W, TILE_H + ELEVATION_PX);
  padGrid().forEach((row, y) => row.forEach((ch, x) => plot(g, x, y, ch)));
  const plate = new Set(['K', 'L', 'M', 'N', 'P', 'T']);
  // The margin round the plate: steel grating (the catwalk) or a battlement rim (the watchtower).
  for (let y = 0; y < TILE_H; y++) {
    for (let x = 0; x < TILE_W; x++) {
      if (!inTileMask(x, y) || plate.has(g[y]?.[x] ?? '.')) continue;
      const edge = !inTileMask(x, y - 1) || !inTileMask(x - 1, y) || !inTileMask(x + 1, y);
      if (look === 'catwalk') {
        plot(g, x, y, edge && y < 8 ? 'S' : (x + 2 * y) % 4 === 0 ? 'R' : 'Q');
      } else {
        // Merlons along the back edges (lit), the walk between them darker.
        const merlon = Math.floor((x + 2) / 3) % 2 === 0;
        plot(g, x, y, edge && y < 8 ? (merlon ? 'S' : 'V') : y < 8 ? 'Q' : 'R');
      }
    }
  }
  for (let x = 0; x < TILE_W; x++) {
    const e = maskBottom(x);
    if (e < 0) continue;
    const left = x < 16;
    for (let k = 1; k <= ELEVATION_PX; k++) {
      const y = e + k;
      if (look === 'catwalk') {
        // The deck's lip, hazard-striped; under it an open trestle: legs at the corners and the
        // middle, X-braces between them, and the ground showing through the rest.
        if (k <= 2) {
          plot(g, x, y, k === 1 ? ((x >> 1) % 2 === 0 ? 'U' : 'V') : left ? 'L' : 'K');
          continue;
        }
        const leg = x <= 1 || x >= TILE_W - 2 || x === 15 || x === 16;
        const span = left ? x : x - 16;
        const brace = Math.abs((span % 16) - 7.5) * 0.75;
        if (leg) plot(g, x, y, left ? 'Q' : 'K');
        else if (Math.abs(k - 2 - brace) < 0.6 || Math.abs(ELEVATION_PX - k + 2 - brace) < 0.6)
          plot(g, x, y, left ? 'L' : 'K');
      } else {
        // Coursed ferrocrete, lit left and shaded right; mortar lines every third row, offset.
        let ch = left ? 'W' : 'X';
        if (k % 3 === 0 || (x + (Math.floor(k / 3) % 2) * 3) % 6 === 0) ch = left ? 'X' : 'Y';
        if (k === 1) ch = left ? 'S' : 'X';
        if (x === 0 || x === TILE_W - 1) ch = 'Y';
        plot(g, x, y, ch);
      }
    }
  }
  if (look === 'watchtower') {
    // A slit window on each face, and a door on the lit face.
    for (const [x, y] of [
      [8, 15],
      [24, 15],
    ] as const) {
      plot(g, x, y, 'V');
      plot(g, x, y + 1, 'V');
    }
    // prettier-ignore
    stamp(g, 11, 16, [
      'VV',
      'VV',
      'VV',
    ]);
  }
  return rows(g);
}

function highGroundGrid(look: HighGroundLook = 'v0'): string[] {
  if (look === 'catwalk' || look === 'watchtower') return builtGrid(look);
  const g = grid(TILE_W, TILE_H + ELEVATION_PX);
  // The top face: a pad, raised one step (it occupies rows 0..15 of the taller frame).
  padGrid().forEach((row, y) => row.forEach((ch, x) => plot(g, x, y, ch)));
  for (let x = 0; x < TILE_W; x++) {
    const e = maskBottom(x);
    if (e < 0) continue;
    const left = x < 16;
    for (let k = 1; k <= ELEVATION_PX; k++) {
      const y = e + k;
      let ch = left ? 'c' : 'b';
      if (look === 'outcrop') ch = left ? 'b' : 'a';
      if (look === 'halls') {
        // The Spires' dark rock: lit lip, strata along the slope, the foot in shadow.
        ch = left ? 'B' : 'A';
        if ((k === 3 || k === 6) && (x + k) % 5 < 3) ch = 'C';
        if (k === 1) ch = left ? 'Q' : 'B';
        if (k === ELEVATION_PX || x === 0 || x === TILE_W - 1) ch = 'C';
        plot(g, x, y, ch);
        continue;
      }
      // Strata: dashed bands following the slope (three on a ledge); the left face is lit.
      const strata = look === 'ledge' ? k === 2 || k === 4 || k === 6 : k === 3 || k === 6;
      if (strata && look !== 'outcrop') ch = (x + k) % 5 < 3 ? (left ? 'b' : 'a') : ch;
      if (left && k === 1) ch = look === 'outcrop' ? 'c' : 'd';
      if (k === ELEVATION_PX) ch = left ? 'b' : 'a'; // the foot, where it meets the ground
      // The outermost columns are the far corners: shade them like the face they turn from.
      if (x === 0 || x === TILE_W - 1) ch = 'a';
      plot(g, x, y, ch);
    }
    if (look === 'v0') {
      // Grass lipping over the edge, here and there.
      if (hash01(x, 3, 11) < 0.35) plot(g, x, e + 1, hash01(x, 4, 11) < 0.5 ? '1' : '2');
    } else if (look === 'ledge') {
      // A rocky lip, and cracks running down the faces.
      if (hash01(x, 3, 13) < 0.3) plot(g, x, e + 1, 'e');
      if (x % 7 === 2) for (let k = 2; k < ELEVATION_PX; k++) plot(g, x + (k % 2), e + k, 'a');
    } else if (look === 'outcrop') {
      // Thread-glass woven through the rock: two families of 1 px threads crossing on the faces
      // (along each face's slope), bright knots where they cross.
      for (let k = 2; k < ELEVATION_PX; k++) {
        const u = (x + 2 * k) % 10;
        const v = (x - 2 * k + 100) % 10;
        if (u < 2 && v < 2) plot(g, x, e + k, 'I');
        else if (u < 2 || v < 2) plot(g, x, e + k, left ? 'H' : 'G');
      }
    }
  }
  if (look === 'outcrop') {
    // Glass shards at the foot of its side corners, lit from inside.
    stamp(g, 0, 15, ['G.', 'HG', 'IH']);
    stamp(g, 30, 15, ['.G', 'GH', 'HI']);
    stamp(g, 14, TILE_H + ELEVATION_PX - 4, ['.G.', 'GIH']);
  } else if (look === 'halls') {
    // The Halls' natural seams, sung gold, running through both faces (a pink fleck where they
    // meet), so the ledge reads as the Halls' own rock.
    for (const [x0, y0, dir] of [
      [2, 13, 1],
      [18, 21, -1],
    ] as const) {
      let y = y0;
      for (let x = x0; x < x0 + 12; x++) {
        if (x % 3 === 0) y += dir > 0 ? 1 : -1;
        const e = maskBottom(x);
        if (e < 0 || y <= e + 1 || y >= e + ELEVATION_PX) continue;
        plot(g, x, y, x % 4 === 1 ? 'E' : x === x0 + 6 ? 'F' : 'D');
      }
    }
  } else if (look === 'ledge') {
    // Rubble at the foot of the near corner.
    stamp(g, 12, TILE_H + ELEVATION_PX - 3, ['.d.cd', 'dcb.b']);
  }
  return rows(g);
}

export const tileHighGround = defineSprite({
  id: 'tile.high_ground',
  size: { w: TILE_W, h: TILE_H + ELEVATION_PX },
  // The ground point (the footprint's top vertex) sits one step below the raised top face.
  anchor: { x: 16, y: ELEVATION_PX },
  palette: 'act1',
  variants: ENV_VARIANTS,
  legend: {
    ...PAD_LEGEND,
    G: 'blue.2',
    H: 'blue.3',
    I: 'teal.4',
    // The built blocks (T540c): steel and hazard paint, and the watchtower's ferrocrete.
    Q: 'steel.1',
    R: 'ink.2',
    S: 'steel.3',
    U: 'orange.2',
    V: 'ink.1',
    W: 'grime.3',
    X: 'grime.2',
    Y: 'grime.1',
    // The Halls-mouth ledge (T842): the Spires' dark rock, and its sung-gold seams.
    A: 'ink.3',
    B: 'ink.4',
    C: 'ink.2',
    D: 'gold.2',
    E: 'gold.3',
    F: 'pink.3',
  },
  frames: {
    v0: highGroundGrid('v0'),
    ledge: highGroundGrid('ledge'),
    outcrop: highGroundGrid('outcrop'),
    catwalk: highGroundGrid('catwalk'),
    watchtower: highGroundGrid('watchtower'),
    halls: highGroundGrid('halls'),
  },
});
