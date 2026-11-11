// The Preserve's warren homes (`prop.warren_home`; A3M1 decor, act3.md § A3M1, markers
// `home_<n>` in the inner basin): the cottages Everglow "relocated" the Skitterkin into, built in
// the warrens' own way. A home, not a tower (review R18): where a Scuttle Den is a round moss-capped
// dome with an open doorway and a resident peeking out, a home is long and low under a **thatched
// roof** of combed dry reed (`brass` steps, moss clumps on it) that overhangs its walls of warm
// turned earth, with a pebble chimney at its right shoulder, a closed round **coral door** with a
// gold knob, and a little round window. `v0`: the window dark and an Everglow inventory tag (a
// white card with a teal band) staked by the door, its number in ink. `v1`: the window lit warm
// and a glowworm lantern on a reed by the door, still lit: someone is home. Earth and moss are
// the warrens' own colours (`WARREN_LEGEND`), so a Den still belongs among them, and they hold in
// every act.
import { defineSprite } from '../defineSprite.ts';
import { grid, hash01, plot, rows, type CharGrid } from '../helpers.ts';
import { dome, reedLantern, WARREN_LEGEND } from '../towers/warrenBase.ts';

const W = 30;
const H = 26;
const AX = 14;
const AY = 21;
const SEED = 23;

/**
 * The home's own colours over the warrens': the thatch (`A` lit, `D`, `M` shade, `N` the combed
 * streaks and the eave's underside), and the coral door's planks (`O` lit, `U` shade).
 */
const HOME_LEGEND = {
  ...WARREN_LEGEND,
  A: 'brass.3',
  D: 'brass.2',
  M: 'brass.1',
  N: 'brass.0',
  O: 'coral.3',
  U: 'coral.2',
} as const;

/** The thatched roof: a low cap over the walls, its eave overhanging them by a pixel or two. */
function thatch(g: CharGrid, cx: number, eave: number): void {
  const rx = 13.5;
  const ry = 7.5;
  for (let y = eave - Math.ceil(ry); y <= eave; y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - eave) / ry;
      if (Math.hypot(dx, dy) > 1) continue;
      const lit = -0.6 * dx - 0.8 * dy;
      let ch = lit > 0.55 ? 'A' : lit > 0.05 ? 'D' : 'M';
      // Combed reed: a darker streak down every third column, broken at random.
      if ((x + (y >> 2)) % 3 === 0 && hash01(x, y, SEED) < 0.7) ch = ch === 'A' ? 'D' : 'N';
      // Moss gathering on the thatch in clumps.
      if (hash01(x >> 1, y >> 1, SEED + 1) < 0.1 && y < eave - 2) ch = lit > 0.3 ? 'G' : 'H';
      plot(g, x, y, ch);
    }
  }
  // The eave's ragged fringe and its shadow on the wall under it.
  for (let x = Math.floor(cx - rx) + 1; x <= Math.ceil(cx + rx) - 1; x++) {
    if (g[eave]?.[x] === '.') continue;
    if (hash01(x, 9, SEED) < 0.45) plot(g, x, eave + 1, 'M');
    plot(g, x, eave, x + 0.5 < cx - 4 ? 'D' : 'M');
  }
}

/** A pebble chimney standing out of the roof's right shoulder: stacked stones, a capstone. */
function chimney(g: CharGrid, x: number, foot: number, top: number): void {
  for (let y = top; y <= foot; y++) {
    // Stones two rows tall, a dark joint between courses, staggered course by course.
    const joint = (y - top) % 2 === 1;
    const seam = 1 + (Math.floor((y - top) / 2) % 2);
    for (let k = 0; k < 3; k++) {
      plot(g, x + k, y, joint && k === seam ? 'L' : k === 0 ? 'V' : k === 1 ? 'S' : 'T');
    }
  }
  // The capstone, a flat slab a pixel proud on its right.
  for (let k = 0; k <= 3; k++) plot(g, x + k, top - 1, k < 1 ? 'V' : k < 3 ? 'S' : 'T');
}

/** The closed round door: coral planks under an arched top, a gold knob, a step of packed earth. */
function door(g: CharGrid, x0: number, sill: number): void {
  const w = 5;
  const h = 7;
  for (let y = sill - h + 1; y <= sill; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const top = y === sill - h + 1;
      if (top && (x === x0 || x === x0 + w - 1)) continue;
      plot(g, x, y, x === x0 + 2 ? 'U' : x < x0 + 2 ? 'O' : 'U');
    }
  }
  // The arch of dark earth round it, and the knob.
  for (let x = x0 + 1; x < x0 + w - 1; x++) plot(g, x, sill - h, 'L');
  plot(g, x0, sill - h + 1, 'L');
  plot(g, x0 + w - 1, sill - h + 1, 'L');
  plot(g, x0 + 3, sill - 3, '9');
  for (let x = x0 - 1; x <= x0 + w; x++) plot(g, x, sill + 1, 'J');
}

/** A little round window in a frame of packed earth, lit warm (someone is home) or dark. */
function window(g: CharGrid, x: number, y: number, lit: boolean): void {
  // prettier-ignore
  const src = lit
    ? ['.KK.', 'K*+K', 'K++K', '.KK.']
    : ['.KK.', 'KkkK', 'KkkK', '.KK.'];
  src.forEach((r, dy) => {
    for (let dx = 0; dx < r.length; dx++) if (r[dx] !== '.') plot(g, x + dx, y + dy, r[dx] ?? 'k');
  });
}

function home(look: 'v0' | 'v1'): string[] {
  const g: CharGrid = grid(W, H);
  // The contact shadow, long and low.
  for (let x = AX - 12; x <= AX + 12; x++) {
    const dy = Math.round(Math.sqrt(Math.max(0, 1 - ((x + 0.5 - AX) / 12.5) ** 2)) * 3);
    for (let y = AY - dy; y <= AY + dy; y++) plot(g, x, y, '_');
  }
  // The walls: a long bank of earth, no moss cap (the roof is the cap).
  dome(g, AX, AY + 1, 11.5, 9, 0);
  thatch(g, AX, AY - 7);
  chimney(g, AX + 6, AY - 12, AY - 17);
  door(g, AX - 6, AY - 1);
  window(g, AX, AY - 5, look === 'v1');
  // Crumbs and a pebble at its foot.
  plot(g, AX - 9, AY, 'K');
  plot(g, AX + 6, AY, 'J');
  plot(g, AX + 9, AY - 1, 'V');
  plot(g, AX + 10, AY - 1, 'T');
  if (look === 'v0') {
    // The inventory tag on a steel stake: a white card, a teal band, an ink number.
    for (let y = AY - 6; y <= AY + 1; y++) plot(g, AX + 6, y, 'T');
    for (let y = AY - 9; y <= AY - 6; y++) {
      for (let x = AX + 4; x <= AX + 8; x++) {
        plot(g, x, y, y === AY - 9 ? 'd' : (x + y) % 3 === 0 && y > AY - 8 ? 'k' : 'W');
      }
    }
  } else {
    reedLantern(g, AX + 7, AY + 1, AY - 8);
  }
  return rows(g);
}

export const propWarrenHome = defineSprite({
  id: 'prop.warren_home',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'skitterkin.ally',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: HOME_LEGEND,
  frames: { v0: home('v0'), v1: home('v1') },
});
