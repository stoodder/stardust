// The orbit (`scene.orbit`; bible.md § 10, Ending B: The Long Walk Home; art-direction § 6, *The
// finale's stills*): the Go ending's final image, with nothing drawn over it. Tumble IV from orbit
// at dusk: deep space and its stars above, QUILL's relay in the upper half (an Everglow relay, its
// solar wings spread, QUILL's hexagon screen on its body with the one round eye LED lit teal), and
// the planet's limb across the lower half, its thin atmosphere glowing violet, the terminator
// crossing the valley; Tumble IV's own ground, not an Earth (M8 R5): dust-rose regolith, rust
// basins, violet crystal ridges, the colony's domes glinting night steel on the dark side. On the
// dusk side, one warm gold point: the Deep Halls. From the relay's dish to it, six
// small notes, not quite in a line: the recording it plays every dusk, hummed off-key by someone
// very small. Frames: `still` (the eye lit) and `blink_1` (the eye dimmed); anim `blink` (QUILL
// blinking, slowly, now and then).
import type { CharGrid } from '../helpers.ts';
import { hash01, plot } from '../helpers.ts';
import {
  bayer as bayerOf,
  copyGrid,
  defineScene,
  dithered,
  eachOnLine,
  fill,
  SCENE_W,
  sceneGrid,
} from './sceneKit.ts';
import { limbBand, limbDistance, limbRelief, type Limb } from './limb.ts';

/*
 * Palette `finale`: 0–3 `finale.ground` (the night side's violet-black, the day side's regolith),
 * 6–8 `act3.path` (rust basins), a–d `act3.crystal` (violet ridges, glints).
 * Custom: A–D ink, E/F violet.0/violet.1, G–K steel, L/M white, N–P teal.2–teal.4, Q–S
 * blue.1–blue.3, T/U gold.3/gold.4, V coral.3, W orange.3, X pink.3.
 */
const LEGEND = {
  A: 'ink.0',
  B: 'ink.1',
  C: 'ink.2',
  D: 'ink.3',
  E: 'violet.0',
  F: 'violet.1',
  G: 'steel.0',
  H: 'steel.1',
  I: 'steel.2',
  J: 'steel.3',
  K: 'steel.4',
  L: 'white.0',
  M: 'white.1',
  N: 'teal.2',
  O: 'teal.3',
  P: 'teal.4',
  Q: 'blue.1',
  R: 'blue.2',
  S: 'blue.3',
  T: 'gold.3',
  U: 'gold.4',
  V: 'coral.3',
  W: 'orange.3',
  X: 'pink.3',
} as const;

/** The planet: a vast disc whose limb arcs across the lower half. */
const PLANET: Limb = { cx: 214, cy: 520, r: 400 };
/** The terminator: dusk runs along this column of the disc's face (day east of it). */
const DUSK_X = 156;
/** The Deep Halls on the dusk side: one warm point. */
export const ORBIT_HALLS = { x: 128, y: 158 } as const;
/** QUILL's relay: its body's centre. */
const RELAY = { x: 112, y: 52 } as const;

/**
 * The colony's domes on the night side: night steel catching the starlight (`Go`: no window lit):
 * a cluster round the Halls, and the outlying settlements scattered over the dark (M8 R2).
 */
const DOME_GLINTS: readonly (readonly [number, number, 'I' | 'J' | 'K'])[] = [
  [121, 161, 'K'],
  [124, 163, 'J'],
  [118, 164, 'I'],
  [133, 164, 'J'],
  [137, 167, 'K'],
  [113, 170, 'I'],
  [88, 150, 'K'],
  [91, 152, 'I'],
  [64, 160, 'J'],
  [67, 162, 'I'],
  [40, 171, 'K'],
  [101, 176, 'J'],
  [146, 176, 'I'],
  [150, 172, 'K'],
];

function inPlanet(x: number, y: number): boolean {
  return limbDistance(PLANET, x, y) <= 0;
}

/** Space: ink to violet-black, with stars, a few brighter, a faint band of the Fringe's sky. */
function spaceAt(x: number, y: number): string {
  const band = Math.max(0, 1 - Math.abs(y - 30 - x * 0.18) / 40);
  const h = hash01(x, y, 91);
  if (h < 0.004) return 'M';
  if (h < 0.012) return hash01(x, y, 92) < 0.5 ? 'J' : 'H';
  if (h < 0.012 + band * 0.02) return 'F';
  return dithered(['A', 'B', 'E'], band * 0.6 + (y / 180) * 0.25, x, y);
}

/** The terminator's column at row y: it leans and bows with the globe's curve (M8 R2), an arc. */
function duskX(y: number): number {
  const t = y - 120;
  return DUSK_X + t * 0.7 - t * t * 0.006;
}

function paintPlanet(g: CharGrid): void {
  fill(g, 0, 0, SCENE_W - 1, 179, (x, y) => {
    const d = limbDistance(PLANET, x, y);
    const band = limbBand(d);
    if (band === 'space') return spaceAt(x, y);
    // The atmosphere: a thin glowing rim, Tumble IV's own violet on the day side (no Earth blue),
    // rose and orange at dusk.
    const dusk = x - duskX(y);
    if (band === 'air_high') return dusk > 24 ? 'F' : dusk > -12 ? 'F' : 'E';
    if (band === 'air') return dusk > 24 ? 'b' : dusk > -8 ? 'X' : 'F';
    if (band === 'rim') return dusk > 30 ? 'c' : dusk > -6 ? 'W' : 'F';
    const depth = -d;
    // Night, west of the terminator: violet-black, deepening inward, the colony's domes glinting.
    if (dusk < -8) {
      const dome = DOME_GLINTS.find(([gx, gy]) => gx === x && gy === y);
      if (dome !== undefined) return dome[2];
      return dithered(['1', '0', '0'], Math.min(1, depth / 30 + 0.2), x, y);
    }
    // The dusk band: violet into coral and orange.
    if (dusk < 6) return dithered(['F', 'V', 'W'], (dusk + 8) / 14, x, y);
    // Day: Tumble IV's regolith (art-direction § 2, the Fringe's dust-rose ground), rust basins in
    // its lows, violet crystal ridges along its highs, a crystal glint here and there catching the
    // sun; darkening toward dusk.
    // Seen from orbit the day side is hazed by the air between (M9: calmer than the ground's own
    // colours): the ridges' crystal reads as a dim violet line, lit only in a few places, the
    // highlands' outcrops a sparse speckle, and the peach of the brightest regolith only where the
    // sun stands highest.
    const relief = limbRelief(x, y, 51);
    const light = Math.min(1, (dusk - 6) / 46);
    const lit = light > 0.15 + 0.85 * (1 - bayerOf(x, y));
    if (relief > 0.6 && relief < 0.63) return lit && hash01(x, y, 53) < 0.3 ? 'c' : 'b';
    if (relief >= 0.63) {
      // The highlands: pale regolith, crystal outcrops speckled violet, a glint where they catch it.
      const h = hash01(x, y, 54);
      if (lit && light > 0.6 && h < 0.012) return 'd';
      if (h < 0.04) return 'b';
      return lit ? dithered(['3', '3', '4'], light * 0.35, x, y) : '2';
    }
    if (relief < 0.42) return lit ? dithered(['7', '8'], light * 0.8, x, y) : '6';
    return lit ? dithered(['2', '3'], light * 0.9, x, y) : '2';
  });
  // The Deep Halls: a warm point on the dusk side, a dim halo round it.
  const { x, y } = ORBIT_HALLS;
  for (const [dx, dy] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ] as const) {
    plot(g, x + dx, y + dy, 'T');
  }
  plot(g, x, y, 'U');
  for (const [dx, dy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const) {
    plot(g, x + dx, y + dy, 'W');
  }
}

/** The relay: an Everglow body with QUILL's hexagon screen, solar wings, and a dish. */
function paintRelay(g: CharGrid, eye: 'lit' | 'dim'): void {
  const { x, y } = RELAY;
  // The wings' struts, then the wings: blue cells in steel frames, the sun's side lit.
  for (let k = 12; k <= 18; k++) {
    plot(g, x - k, y, 'I');
    plot(g, x + k, y, 'I');
  }
  for (const side of [-1, 1] as const) {
    const x0 = side < 0 ? x - 58 : x + 19;
    for (let wy = -7; wy <= 7; wy++) {
      for (let wx = 0; wx < 40; wx++) {
        const frame = wy === -7 || wy === 7 || wx === 0 || wx === 39 || wx % 8 === 0;
        const cell = wy === 0 ? 'I' : (wx + wy) % 9 === 0 ? 'S' : side > 0 ? 'R' : 'Q';
        plot(g, x0 + wx, y + wy, frame ? (side > 0 ? 'J' : 'H') : cell);
      }
    }
  }
  // The body: a white Everglow box, its shaded side steel, a teal band round it.
  for (let by = -11; by <= 11; by++) {
    for (let bx = -11; bx <= 11; bx++) {
      const corner = Math.abs(bx) + Math.abs(by) > 18;
      if (corner) continue;
      const edge = Math.abs(bx) + Math.abs(by) > 16 || Math.abs(bx) === 11 || Math.abs(by) === 11;
      let ch = bx > 3 ? 'M' : bx > -5 ? 'L' : 'K';
      if (by >= 6 && by <= 7) ch = bx > 3 ? 'P' : 'O';
      if (edge) ch = bx > 0 ? 'J' : 'I';
      plot(g, x + bx, y + by, ch);
    }
  }
  // QUILL's screen: a dark hexagon in a steel bezel, the one round eye LED.
  for (let sy = -6; sy <= 3; sy++) {
    const half = 6 - Math.max(0, Math.abs(sy + 1.5) - 2.5);
    for (let sx = -Math.round(half); sx <= Math.round(half); sx++) {
      const rim = Math.abs(sx) === Math.round(half) || sy === -6 || sy === 3;
      plot(g, x + sx, y + sy, rim ? 'H' : 'C');
    }
  }
  const lit = eye === 'lit';
  for (const [dx, dy, ch] of [
    [0, -3, lit ? 'P' : 'N'],
    [1, -3, lit ? 'P' : 'N'],
    [0, -2, lit ? 'P' : 'N'],
    [1, -2, lit ? 'O' : 'N'],
    [-1, -3, lit ? 'O' : 'C'],
    [2, -2, lit ? 'O' : 'C'],
    [0, -4, lit ? 'O' : 'C'],
    [1, -1, lit ? 'O' : 'C'],
  ] as const) {
    plot(g, x + dx, y + dy, ch);
  }
  if (lit) plot(g, x, y - 3, 'M');
  // The antenna on top, a red-free beacon (teal), and the dish under, aimed at the valley.
  eachOnLine(x + 4, y - 11, x + 7, y - 20, (px, py) => plot(g, px, py, 'J'));
  plot(g, x + 7, y - 21, 'O');
  for (let k = 0; k < 4; k++) plot(g, x + 3 + k, y + 12 + k, 'I');
  for (let k = -5; k <= 5; k++) {
    const dx = 6 + k;
    const dy = 17 - k;
    plot(g, x + dx, y + dy, k > 0 ? 'J' : 'K');
    plot(g, x + dx + 1, y + dy + 1, 'H');
  }
  plot(g, x + 9, y + 18, 'P');
}

/** A small note (5×5): its head, stem and flag. */
const NOTE = ['..UU.', '..T.U', '..T..', 'TTT..', 'TTT..'] as const;

/**
 * Six notes from the dish down toward the Halls, along a falling curve, each a little off the line
 * (off-key), fading as they go.
 */
function paintNotes(g: CharGrid): void {
  const from = { x: RELAY.x + 14, y: RELAY.y + 24 };
  const to = { x: ORBIT_HALLS.x - 4, y: ORBIT_HALLS.y - 14 };
  const ctl = { x: to.x + 26, y: from.y + 6 };
  const off = [0, -3, 1, -2, 2, -1];
  for (let i = 0; i < 6; i++) {
    const t = (i + 0.5) / 6;
    const nx = Math.round((1 - t) ** 2 * from.x + 2 * (1 - t) * t * ctl.x + t * t * to.x);
    const ny = Math.round((1 - t) ** 2 * from.y + 2 * (1 - t) * t * ctl.y + t * t * to.y) + off[i]!;
    const faded = i >= 4;
    NOTE.forEach((row, dy) => {
      for (let dx = 0; dx < row.length; dx++) {
        const ch = row.charAt(dx);
        if (ch === '.') continue;
        plot(g, nx + dx, ny + dy, faded ? (ch === 'U' ? 'T' : 'W') : ch);
      }
    });
  }
}

/** Far off, the last freighter leaving: a point of light and its fading trail. */
function paintFreighter(g: CharGrid): void {
  eachOnLine(296, 112, 276, 92, (x, y) => {
    if (inPlanet(x, y)) return;
    const k = (x - 276) / 20;
    plot(g, x, y, k > 0.6 ? 'F' : k > 0.3 ? 'H' : 'J');
  });
  plot(g, 275, 91, 'M');
}

function paintOrbit(): Record<string, CharGrid> {
  const g = sceneGrid();
  paintPlanet(g);
  paintFreighter(g);
  paintNotes(g);
  const still = copyGrid(g);
  paintRelay(still, 'lit');
  const dim = copyGrid(g);
  paintRelay(dim, 'dim');
  return { still, blink_1: dim };
}

export const sceneOrbit = defineScene({
  id: 'scene.orbit',
  palette: 'finale',
  legend: LEGEND,
  paint: paintOrbit,
  anims: {
    // QUILL blinks: the eye lit for about three seconds, dim for a quarter of one.
    blink: {
      frames: [
        'still',
        'still',
        'still',
        'still',
        'still',
        'still',
        'still',
        'still',
        'still',
        'still',
        'still',
        'still',
        'blink_1',
      ],
      fps: 4,
    },
  },
});
