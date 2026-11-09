// The Everglow tower base: an iso plinth with the 3×3 teal logo chevron on its left face and
// orange tier chevrons on its right face (one per tier). Shared by every Everglow tower.
import { grid, isoBox, plot, rows, stamp, type CharGrid } from '../helpers.ts';

export const BASE_W = 26;
export const BASE_H = 20;
/** Footprint center: the tower's anchor (the tile center). */
export const BASE_ANCHOR = { x: 13, y: 13 } as const;
const HEIGHT = 5;
/** Top-face center, where heads mount. */
export const BASE_MOUNT = { x: 13, y: BASE_ANCHOR.y - HEIGHT } as const;

/** One base frame per tier (1–3). `trim` recolors the top-face ring per tower. */
export function everglowBase(tier: 1 | 2 | 3, trim: string): string[] {
  const g: CharGrid = grid(BASE_W, BASE_H);
  const { x: cx, y: cy } = BASE_ANCHOR;
  isoBox(g, cx, cy + 1, 12, 0, { top: '_', rim: '_', left: '_', right: '_' });
  isoBox(g, cx, cy, 11, HEIGHT, { top: '3', rim: '4', left: '2', right: '1' });
  // A ring on the top face where the head turns, in the tower's trim color.
  isoBox(g, cx, cy - HEIGHT, 6, 0, { top: trim, rim: trim, left: trim, right: trim });
  isoBox(g, cx, cy - HEIGHT, 4, 0, { top: '2', rim: '2', left: '2', right: '2' });
  // Logo plate: the teal chevron on the left face.
  // prettier-ignore
  stamp(g, 5, 13, [
    '8.8',
    '.8.',
  ]);
  plot(g, 6, 12, '7');
  // Tier chevrons on the right face, stepping down its slope.
  for (let t = 0; t < tier; t++) {
    const x = 15 + t * 3;
    const y = 14 - Math.floor((t * 3) / 2);
    // prettier-ignore
    stamp(g, x, y, [
      'd.d',
      '.d.',
    ]);
  }
  if (tier === 3) {
    // T3: a status light at the front corner.
    plot(g, cx, cy + 4, '+');
    plot(g, cx - 1, cy + 4, '+');
  }
  return rows(g);
}
