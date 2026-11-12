// Tumble IV (`scene.viewport`; act1.md § Prelude · Arrival, shot 3; art-direction § 6, *The
// prelude's stills*): the quiet wonder. The Technician from behind, three-quarter, visor down, at a
// round viewport: the Dawn's exact pose (`technicianBack.ts`), so the first look at the world and
// the last mirror each other. Tumble IV fills the glass in the Long Afternoon (the orbit's limb,
// `limb.ts`, re-paletted to Act I's day side): green terraced valleys, pink clay, pink-gold glints
// along the northern ridges, thin cloud, the cyan atmosphere glowing on its rim; above it space, the
// two moons and the small orange star. The hold round the viewport is deep dark, steel and teal.
// Frames:
// - `ad_on`: the ad still playing behind us (off frame): its warm light on the hold's near wall,
//   along the Technician's back edge and the ring's bolts, and its screen's ghost in the glass.
// - `ad_off`: someone has unplugged it. Only the planet's cool light is left.
import type { CharGrid } from '../../helpers.ts';
import { hash01, plot } from '../../helpers.ts';
import { limbBand, limbDistance, limbRelief, smooth, type Limb } from '../limb.ts';
import {
  bayer,
  copyGrid,
  defineScene,
  dithered,
  fill,
  SCENE_H,
  SCENE_W,
  sceneGrid,
} from '../sceneKit.ts';
import { technicianBack, TECHNICIAN_HELM, type TechnicianInks } from '../technicianBack.ts';

/*
 * Palette `act1`: 0–4 `act1.grass`, a–e `act1.clay`, + pink.3, * pink.4, k ink.0, w `act1.light`.
 * Custom: A–D ink.1–ink.4, E–H steel.0–steel.3, I/J white.0/white.1, K–M `act1.sky`, N–P
 * teal.2–teal.4, Q coral.3, R violet.0, S/T orange.3/orange.4 (the star), U gold.4, V gold.3,
 * W gold.0 (the ad's wash on the dark), X orange.2 (its light on edges), Y gold.2, Z violet.1.
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
  I: 'white.0',
  J: 'white.1',
  K: 'act1.sky.0',
  L: 'act1.sky.1',
  M: 'act1.sky.2',
  N: 'teal.2',
  O: 'teal.3',
  P: 'teal.4',
  Q: 'coral.3',
  R: 'violet.0',
  S: 'orange.3',
  T: 'orange.4',
  U: 'gold.4',
  V: 'gold.3',
  W: 'gold.0',
  X: 'orange.2',
  Y: 'gold.2',
  Z: 'violet.1',
} as const;

/** The viewport: the glass's centre and radius (the ring outside it). */
export const VIEWPORT = { x: 216, y: 74, r: 62 } as const;
/** The ring's width outside the glass. */
const RING = 8;
/** Tumble IV: a vast disc, its limb arcing across the glass's upper half. */
const PLANET: Limb = { cx: 250, cy: 372, r: 312 };
/** The orange star, high in the glass. */
export const VIEWPORT_STAR = { x: 254, y: 30 } as const;
/** The ad's screen as the glass shows it, behind us: a dim ghost (`ad_on` only). */
const GHOST = { x: 166, y: 98, w: 30, h: 17 } as const;

const TECH = technicianBack(TECHNICIAN_HELM);

/** The planet's light on the Technician: teal on the shoulders, pale cyan on the helmet. */
const TECH_INKS: TechnicianInks = {
  body: 'A',
  deep: 'k',
  crown: 'C',
  rimInner: 'N',
  rimSoft: 'O',
  rimHelm: 'P',
  rimShoulder: 'L',
  antennaTip: '+',
};

function inGlass(x: number, y: number): boolean {
  return Math.hypot(x + 0.5 - VIEWPORT.x, y + 0.5 - VIEWPORT.y) <= VIEWPORT.r;
}

/** Space through the glass: violet-black, stars, a few bright, warming round the star. */
function spaceAt(x: number, y: number): string {
  const s = Math.hypot(x - VIEWPORT_STAR.x, (y - VIEWPORT_STAR.y) * 1.1);
  if (s < 2.2) return 'J';
  if (s < 3.4) return 'U';
  if (s < 4.6) return 'T';
  if (s < 6) return 'S';
  if (s < 14) return dithered(['A', 'X', 'S'], (1 - s / 14) * 0.9, x, y);
  const h = hash01(x, y, 101);
  if (h < 0.006) return 'J';
  if (h < 0.016) return hash01(x, y, 102) < 0.5 ? 'H' : 'D';
  return dithered(['k', 'A', 'R'], 0.25 + (y / 120) * 0.5, x, y);
}

/**
 * Tumble IV's day side at noon (the orbit's generator, Act I's colours): terraced green valleys in
 * its lows, pink clay on its slopes, ridges along its highs glinting pink-gold toward the north (the
 * limb), thin cloud, all hazed toward the limb by the cyan air.
 */
function groundAt(x: number, y: number, depth: number): string {
  const relief = limbRelief(x, y, 61);
  const haze = Math.max(0, 1 - depth / 26);
  const cloud = smooth(x * 0.6, y * 3, 14, 67);
  if (cloud > 0.76 && bayer(x, y) < (cloud - 0.76) * 4) return cloud > 0.84 ? 'J' : 'I';
  if (haze > 0.55 && bayer(x, y) < (haze - 0.55) * 1.6) return haze > 0.8 ? 'M' : 'L';
  // Lit where the ground faces the star (up and to the right), shaded where it turns away.
  const slope = relief - limbRelief(x + 2, y - 1, 61);
  if (relief >= 0.62 && slope < -0.012) return relief >= 0.69 ? 'b' : 'a';
  if (relief >= 0.69) {
    // The northern ridges: pale clay crests, pink-gold where the sun catches them.
    const h = hash01(x, y, 63);
    const north = haze > 0.1 ? 0.16 : 0.04;
    if (h < north * 0.4) return 'V';
    if (h < north) return '+';
    return relief > 0.73 ? 'e' : 'd';
  }
  if (relief >= 0.62) return dithered(['b', 'c', 'd'], (relief - 0.62) / 0.07, x, y);
  // The valleys: terraces, contour bands of green stepping down to the river beds.
  const band = Math.floor(relief * 40);
  if (relief < 0.24) return relief < 0.2 && bayer(x, y) < 0.6 ? 'K' : '1';
  if (relief < 0.3) return band % 2 === 0 ? '2' : '1';
  if (slope < -0.015) return '1';
  const lip = (relief * 40) % 1 < 0.22;
  return lip ? '4' : band % 2 === 0 ? '3' : '2';
}

function paintGlass(g: CharGrid): void {
  fill(
    g,
    VIEWPORT.x - VIEWPORT.r,
    VIEWPORT.y - VIEWPORT.r,
    VIEWPORT.x + VIEWPORT.r,
    VIEWPORT.y + VIEWPORT.r,
    (x, y) => {
      if (!inGlass(x, y)) return null;
      const d = limbDistance(PLANET, x, y);
      switch (limbBand(d)) {
        case 'space':
          // The cyan air glows a little way off the limb.
          return d < 6 && bayer(x, y) < (6 - d) / 8 ? 'N' : spaceAt(x, y);
        case 'air_high':
          return 'N';
        case 'air':
          return d > 1 ? 'L' : 'M';
        case 'rim':
          return 'P';
        default:
          return groundAt(x, y, -d);
      }
    },
  );
  // The two moons (art-direction § 3): the big one white, shaded steel; the small one pink.
  for (let y = -3; y <= 3; y++) {
    for (let x = -3; x <= 3; x++) {
      if (Math.hypot(x, y) > 3.2) continue;
      plot(g, 180 + x, 40 + y, x + y > 1 ? 'H' : 'I');
    }
  }
  for (const [x, y, ch] of [
    [198, 28, '*'],
    [199, 28, '*'],
    [198, 29, '*'],
    [199, 29, 'Q'],
  ] as const) {
    plot(g, x, y, ch);
  }
}

/** The viewport's ring: thick steel, a teal inner lip, bolts; lit cool from the glass. */
function paintRing(g: CharGrid, adOn: boolean): void {
  const { x: cx, y: cy, r } = VIEWPORT;
  fill(g, cx - r - RING, cy - r - RING, cx + r + RING, cy + r + RING, (x, y) => {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
    if (d <= r || d > r + RING) return null;
    const t = d - r;
    // The light from the glass catches the ring's inner bevel, brightest across from the star.
    const a = Math.atan2(y + 0.5 - cy, x + 0.5 - cx);
    const facing = Math.max(0, Math.cos(a - 2.4));
    if (t < 1) return 'k';
    if (t < 2) return facing > 0.3 ? 'P' : 'O';
    if (t < 3) return 'N';
    if (t > RING - 1) return 'k';
    const v = 0.3 + facing * 0.35 - (t / RING) * 0.15;
    const bolt =
      Math.round(((a + Math.PI) / (2 * Math.PI)) * 24) % 1 === 0 && Math.abs(t - 5.5) < 0.8;
    void bolt;
    return dithered(['A', 'E', 'F', 'G'], v, x, y);
  });
  // Bolts round the ring, catching the ad's light from behind us when it plays.
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const bx = Math.round(cx + Math.cos(a) * (r + 5.5));
    const by = Math.round(cy + Math.sin(a) * (r + 5.5));
    plot(g, bx, by, 'k');
    const warm = adOn && Math.cos(a - 2.6) > 0.2;
    plot(g, bx - 1, by - 1, warm ? 'Y' : 'G');
  }
}

/** The hold round the viewport: deep dark, panel seams, a teal trim line, a strut. */
function paintHold(g: CharGrid, adOn: boolean): void {
  fill(g, 0, 0, SCENE_W - 1, SCENE_H - 1, (x, y) => {
    // The planet's light spilling round the viewport, cool.
    const spill = Math.max(0, 1 - Math.hypot(x - VIEWPORT.x, y - VIEWPORT.y) / (VIEWPORT.r + 50));
    // The ad's light from behind us (the near, lower left), warm, when it plays.
    const warm = adOn ? Math.max(0, 1 - Math.hypot(x * 0.8, (SCENE_H - y) * 1.2) / 230) : 0;
    if (warm > 0 && bayer(x, y) < warm * warm * 0.6) return 'W';
    if (y === 150 || y === 151) return y === 150 ? (spill > 0.1 ? 'N' : 'B') : 'k';
    if ((x + 20) % 58 === 0 && y < 150) return 'k';
    if ((x + 21) % 58 === 0 && y < 150) return spill > 0.2 ? 'C' : 'B';
    return dithered(['k', 'A', 'B', 'C'], 0.2 + spill * 0.5, x, y);
  });
}

/** The ad's ghost in the glass: its screen's frame, dim, with Evie's gold point in it. */
function paintGhost(g: CharGrid): void {
  const { x, y, w, h } = GHOST;
  for (let px = x; px < x + w; px++) {
    for (let py = y; py < y + h; py++) {
      const edge = px === x || px === x + w - 1 || py === y || py === y + h - 1;
      if (!edge && bayer(px, py) >= 0.18) continue;
      plot(g, px, py, edge ? (bayer(px, py) < 0.5 ? 'M' : 'L') : 'L');
    }
  }
  plot(g, x + 7, y + 6, 'U');
  plot(g, x + 8, y + 6, 'V');
  plot(g, x + 7, y + 7, 'V');
  for (let px = x + 14; px < x + 26; px++) if (px % 2 === 0) plot(g, px, y + 4, '*');
}

/** The ad's warm light along the Technician's back edge (its west side, toward us). */
function warmEdge(g: CharGrid): void {
  for (let y = TECHNICIAN_HELM.cy - TECHNICIAN_HELM.ry; y < SCENE_H; y++) {
    for (let x = TECHNICIAN_HELM.cx - 40; x <= TECHNICIAN_HELM.cx; x++) {
      if (!TECH.inTechnician(x, y) || TECH.inTechnician(x - 1, y)) continue;
      const fade = (y - (TECHNICIAN_HELM.cy - TECHNICIAN_HELM.ry)) / 110;
      plot(g, x, y, dithered(['Y', 'X', 'W', 'A'], fade, x, y));
      if (y < TECH.collarY && TECH.inTechnician(x + 1, y)) plot(g, x + 1, y, 'W');
    }
  }
}

function paintFrame(adOn: boolean): CharGrid {
  const g = sceneGrid();
  paintHold(g, adOn);
  paintGlass(g);
  if (adOn) paintGhost(g);
  paintRing(g, adOn);
  TECH.paintBack(g, TECH_INKS);
  // Visor down: the glass reflects what it faces, space and the planet's green line across it.
  TECH.paintVisorDown(g, 'k', { glass: ['R', 'Z', 'L'], line: ['3', '2'], glint: ['J', 'I'] });
  if (adOn) warmEdge(g);
  return g;
}

function paintViewport(): Record<string, CharGrid> {
  const on = paintFrame(true);
  const off = paintFrame(false);
  void copyGrid;
  return { ad_on: on, ad_off: off };
}

export const sceneViewport = defineScene({
  id: 'scene.viewport',
  palette: 'act1',
  legend: LEGEND,
  paint: paintViewport,
});
