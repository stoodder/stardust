// Shared builders for the 16×16 icons (art-direction §5): authored 14×14, front view, lit from the
// upper left; the auto outline grows them to 16×16. Icons are shown 1:1 in the DOM HUD.
import { grid, plot, type CharGrid } from '../helpers.ts';

/** Authored icon size; the outline pass makes it 16×16. */
export const ICON = 14;
/** Authored size of the small 8×8 glyphs (currency, meters, lock); outlined to 8×8. */
export const GLYPH = 6;

/** A blank icon grid. */
export function iconGrid(size = ICON): CharGrid {
  return grid(size, size);
}

/** Fills a w×h rectangle. */
export function rect(g: CharGrid, x: number, y: number, w: number, h: number, ch: string): void {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) plot(g, xx, yy, ch);
}

/**
 * The Everglow plinth every tower icon stands on (rows 10–13): a steel slab with the teal logo
 * chevron on the left and an orange chevron on the right, echoing the in-world base.
 */
export function everglowPlinth(g: CharGrid): void {
  rect(g, 1, 10, 12, 1, '4');
  rect(g, 1, 11, 12, 2, '2');
  rect(g, 1, 13, 12, 1, '1');
  plot(g, 2, 11, '8');
  plot(g, 3, 12, '8');
  plot(g, 4, 11, '8');
  plot(g, 9, 11, 'd');
  plot(g, 10, 12, 'd');
  plot(g, 11, 11, 'd');
}
