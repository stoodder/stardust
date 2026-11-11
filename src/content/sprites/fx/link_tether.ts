// Link tethers (design/towers.md §6.1 Readability: "a soft animated tether between the towers, in
// a color per link"): a 1 px arc from one tower to an adjacent partner, bowed up so it clears
// both heads, with beads marching along it and a 1 px `ink.0` under-stroke so it reads on any
// ground. Shape and color both name the link (art-direction §8: color is never the only signal):
//   - Crossfire (Rivet + Thumper): a solid `orange` line, the safety color, with white-hot beads.
//   - Sitting Ducks (Thumper + Sprinkler): a dashed `blue` line, the chill, with white beads.
//   - Conductive (Zapcoil + Sprinkler): a zigzag `teal.3` line, water carrying a spark, kinked
//     1 px every 2 pixels so it reads electric, with white beads (T312a).
//   - Acid Rain (Thumper + Gloop): a solid `green.3` line that drips, a `green.4` drop hanging
//     under it every 4 pixels, with `orange.4` beads (the Thumper's shells) (T740b).
//   - Sticky Flak (Skyhook + Gloop): a thick, gooey `green.3` line, 2 px, its lower strand
//     `green.2`, with `violet.4` beads (the Skyhook's flak) (T740b).
// One frame set per link and direction. All frames share one canvas; the anchor is tower A's
// ground point (its tile center), so the view places every frame at A and never measures it.
import { defineSprite } from '../defineSprite.ts';
import { grid, plot, rows, type CharGrid } from '../helpers.ts';

/** The tether's ends ride this far above each tower's ground point (about the heads' middle). */
export const TETHER_LIFT = 12;
/** How far the arc bows out at its middle. */
const BOW = 6;
/** Bead spacing, in tether pixels; each anim frame advances the beads one pixel from A to B. */
const PERIOD = 4;

/** A tether direction: the screen offset from tower A's ground point to tower B's. */
export type TetherDir = 'e' | 'se' | 'ne' | 's';

const SCREEN: Readonly<Record<TetherDir, readonly [number, number]>> = {
  e: [32, 0],
  se: [16, 8],
  ne: [16, -8],
  s: [0, 16],
};

/** Links with tether art, and how each draws: body, bead, and whether the line is dashed. */
const STYLE = {
  crossfire: { body: 'd', bead: 'e', dashed: false, zigzag: false },
  sitting_ducks: { body: 'B', bead: 'w', dashed: true, zigzag: false },
  conductive: { body: 'T', bead: 'w', dashed: false, zigzag: true },
  acid_rain: { body: 'G', bead: 'e', dashed: false, zigzag: false, drip: true },
  sticky_flak: { body: 'G', bead: 'V', dashed: false, zigzag: false, thick: true },
} as const satisfies Record<
  string,
  {
    body: string;
    bead: string;
    dashed: boolean;
    zigzag: boolean;
    drip?: boolean;
    thick?: boolean;
  }
>;
export type TetherLink = keyof typeof STYLE;

/**
 * Which frame set joins towers on tiles A and B, from the grid offset (dc, dr) = B − A of two
 * 8-adjacent tiles: the direction, and whether to draw from B instead (`fromB`), so every tether
 * runs left to right (or top to bottom) on screen. Null when the tiles aren't 8-adjacent.
 */
export function tetherDir(dc: number, dr: number): { dir: TetherDir; fromB: boolean } | null {
  const key = `${dc},${dr}`;
  const table: Readonly<Record<string, { dir: TetherDir; fromB: boolean }>> = {
    '1,0': { dir: 'se', fromB: false },
    '-1,0': { dir: 'se', fromB: true },
    '0,-1': { dir: 'ne', fromB: false },
    '0,1': { dir: 'ne', fromB: true },
    '1,-1': { dir: 'e', fromB: false },
    '-1,1': { dir: 'e', fromB: true },
    '1,1': { dir: 's', fromB: false },
    '-1,-1': { dir: 's', fromB: true },
  };
  return table[key] ?? null;
}

/** Canvas: every direction's arc plus the anchor fit (`ne` climbs 8 px, then bows). */
const OX = 2;
const OY = TETHER_LIFT + 8 + BOW + 2;
const W = 32 + 2 * OX + 1;
const H = OY + 16 - TETHER_LIFT + 3;

/** The arc's pixels from A to B, in order, deduplicated (canvas coordinates). */
function arc(dir: TetherDir): (readonly [number, number])[] {
  const [dx, dy] = SCREEN[dir];
  const x0 = OX;
  const y0 = OY - TETHER_LIFT;
  const x2 = x0 + dx;
  const y2 = y0 + dy;
  // Quadratic Bézier: the control point is twice the bow away from the chord's middle (up, or
  // to the right for the vertical tether), so the curve's peak sits BOW px out.
  const [bx, by] = dir === 's' ? [2 * BOW, 0] : [0, -2 * BOW];
  const x1 = (x0 + x2) / 2 + bx;
  const y1 = (y0 + y2) / 2 + by;
  const out: (readonly [number, number])[] = [];
  const steps = 200;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const x = Math.round(u * u * x0 + 2 * u * t * x1 + t * t * x2);
    const y = Math.round(u * u * y0 + 2 * u * t * y1 + t * t * y2);
    const last = out.at(-1);
    if (last !== undefined && last[0] === x && last[1] === y) continue;
    out.push([x, y]);
  }
  return out;
}

function tether(link: TetherLink, dir: TetherDir, phase: number): string[] {
  const s: (typeof STYLE)[TetherLink] & { drip?: boolean; thick?: boolean } = STYLE[link];
  const g: CharGrid = grid(W, H);
  const pts = arc(dir);
  // The under-stroke first, so the line overwrites it wherever the arc doubles back.
  // Dashed lines draw 2 pixels on, 1 off.
  const gap = (i: number): boolean => s.dashed && i % 3 === 2;
  // A zigzag line kinks 1 px off the arc for every other pair of pixels (sideways on the
  // vertical tether, up elsewhere); the ends stay plugged in.
  const kink = (i: number): number =>
    s.zigzag && i > 0 && i < pts.length - 1 && (i >> 1) % 2 === 1 ? 1 : 0;
  const kx = (i: number): number => (dir === 's' ? kink(i) : 0);
  const ky = (i: number): number => (dir === 's' ? 0 : -kink(i));
  pts.forEach(([x, y], i) => {
    if (!gap(i)) plot(g, x + kx(i), y + ky(i) + 1, 'x');
    if (s.thick === true) plot(g, x, y + 2, 'x');
  });
  // A thick line's lower strand, under the line itself.
  if (s.thick === true) for (const [x, y] of pts) plot(g, x, y + 1, 'H');
  // A dripping line's drops: one hanging a pixel under it every PERIOD pixels, rimmed in ink.
  if (s.drip === true) {
    pts.forEach(([x, y], i) => {
      if (i === 0 || i === pts.length - 1 || (i + phase) % PERIOD !== 2) return;
      plot(g, x, y + 1, 'A');
      plot(g, x, y + 2, 'x');
    });
  }
  pts.forEach(([x, y], i) => {
    const bead = (i - phase + PERIOD * 64) % PERIOD === 0;
    if (gap(i) && !bead) return;
    plot(g, x + kx(i), y + ky(i), bead ? s.bead : s.body);
  });
  // Plugged in at both ends: a white-hot knot.
  for (const p of [pts[0], pts.at(-1)]) if (p !== undefined) plot(g, p[0], p[1], 'w');
  return rows(g);
}

const LINKS: readonly TetherLink[] = [
  'crossfire',
  'sitting_ducks',
  'conductive',
  'acid_rain',
  'sticky_flak',
];
const DIRS: readonly TetherDir[] = ['e', 'se', 'ne', 's'];

const frames: Record<string, string[]> = {};
const anims: Record<string, { frames: string[]; fps: number }> = {};
for (const link of LINKS) {
  for (const dir of DIRS) {
    const names: string[] = [];
    for (let k = 0; k < PERIOD; k++) {
      const name = `${link}_${dir}_${k}`;
      frames[name] = tether(link, dir, k);
      names.push(name);
    }
    anims[`${link}_${dir}`] = { frames: names, fps: 6 };
  }
}

export const fxLinkTether = defineSprite({
  id: 'fx.link_tether',
  size: { w: W, h: H },
  anchor: { x: OX, y: OY },
  palette: 'everglow',
  legend: { B: 'blue.3', T: 'teal.3', G: 'green.3', A: 'green.4', H: 'green.2', V: 'violet.4' },
  frames,
  anims,
});
