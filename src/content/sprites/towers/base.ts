// The Everglow tower base: an iso plinth with the 3×3 teal logo chevron on its left face and
// orange tier chevrons on its right face (one per tier). Shared by every Everglow tower.
// Tiers also change the silhouette, so they read at 1× without the chevrons: T2 bolts armor
// pods onto both side corners, and T3 adds a sensor mast with a teal tip on the left pod. A tier-4
// spec swaps the pods and mast for the spec's own kit (`everglowSpecBase`), so the base says which
// spec the tower took.
import { grid, isoBox, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';

export const BASE_W = 30;
export const BASE_H = 32;
/** Canvas room left of and above the plinth (for the T2 pods and the T3 mast). */
const OX = 2;
const OY = 12;
/** Footprint center: the tower's anchor (the tile center). */
export const BASE_ANCHOR = { x: 13 + OX, y: 13 + OY } as const;
const HEIGHT = 5;
/** Top-face center, where heads mount. */
export const BASE_MOUNT = { x: BASE_ANCHOR.x, y: BASE_ANCHOR.y - HEIGHT } as const;

/** One armor pod at a side corner of the plinth: a block standing proud of the top face. */
function pod(g: CharGrid, cx: number, cy: number): void {
  isoBox(g, cx, cy, 3, 8, { top: '4', rim: '4', left: '2', right: '1' });
  // An orange safety stripe across both side faces.
  for (let x = Math.floor(cx - 3); x < Math.ceil(cx + 3); x++) {
    const y = cy - 3 + (Math.abs(x + 0.5 - cx) <= 1 ? 1 : 0);
    if (g[y]?.[x] === '2' || g[y]?.[x] === '1') plot(g, x, y, x + 0.5 < cx ? 'c' : 'b');
  }
}

/** The plinth every tier shares: shadow, block, trim ring, logo plate, and `chevrons` chevrons. */
function plinth(trim: string, chevrons: number): CharGrid {
  const g: CharGrid = grid(BASE_W, BASE_H);
  const { x: cx, y: cy } = BASE_ANCHOR;
  isoBox(g, cx, cy + 1, 12, 0, { top: '_', rim: '_', left: '_', right: '_' });
  isoBox(g, cx, cy, 11, HEIGHT, { top: '3', rim: '4', left: '2', right: '1' });
  // A ring on the top face where the head turns, in the tower's trim color.
  isoBox(g, cx, cy - HEIGHT, 6, 0, { top: trim, rim: trim, left: trim, right: trim });
  isoBox(g, cx, cy - HEIGHT, 4, 0, { top: '2', rim: '2', left: '2', right: '2' });
  // Logo plate: the teal chevron on the left face.
  // prettier-ignore
  stamp(g, 5 + OX, 13 + OY, [
    '8.8',
    '.8.',
  ]);
  plot(g, 6 + OX, 12 + OY, '7');
  // Tier chevrons on the right face, stepping down its slope.
  for (let t = 0; t < chevrons; t++) {
    const x = 15 + OX + t * 3;
    const y = 14 + OY - Math.floor((t * 3) / 2);
    // prettier-ignore
    stamp(g, x, y, [
      'd.d',
      '.d.',
    ]);
  }
  return g;
}

/** One base frame per tier (1–3). `trim` recolors the top-face ring per tower. */
export function everglowBase(tier: 1 | 2 | 3, trim: string): string[] {
  const g = plinth(trim, tier);
  const { x: cx, y: cy } = BASE_ANCHOR;
  if (tier >= 2) {
    pod(g, cx - 10, cy + 1);
    pod(g, cx + 10, cy + 1);
  }
  if (tier === 3) {
    // The sensor mast on the left pod: a 2 px pole, lit left, with a crossbar and a teal tip.
    const mx = Math.round(cx - 10);
    for (let y = cy - 18; y <= cy - 7; y++) {
      plot(g, mx - 1, y, '3');
      plot(g, mx, y, '1');
    }
    line(g, mx - 3, cy - 15, mx + 2, cy - 15, '2');
    plot(g, mx - 1, cy - 19, '+');
    plot(g, mx, cy - 19, '+');
    plot(g, mx - 1, cy - 20, '*');
    plot(g, mx, cy - 20, '*');
    // A status light at the front corner.
    plot(g, cx, cy + 4, '+');
    plot(g, cx - 1, cy + 4, '+');
  }
  return rows(g);
}

/**
 * A tier-4 spec base: the plinth with three chevrons, a lit status light at the front corner, and
 * the spec's own kit (drawn by `kit` at the side corners, where T2's pods sit) instead of the pods
 * and T3's mast. `kit` gets the plinth's anchor so it can place things around it.
 */
export function everglowSpecBase(
  trim: string,
  kit: (g: CharGrid, cx: number, cy: number) => void,
): string[] {
  const g = plinth(trim, 3);
  const { x: cx, y: cy } = BASE_ANCHOR;
  kit(g, cx, cy);
  plot(g, cx, cy + 4, '*');
  plot(g, cx - 1, cy + 4, '+');
  return rows(g);
}
