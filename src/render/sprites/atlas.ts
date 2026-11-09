// Shelf packer for atlas pages (tech-spec § Files). Pure: it only computes placements; the
// browser adapter draws the pixels.

/** Largest atlas page edge, px (a safe WebGL texture size everywhere). */
export const MAX_PAGE = 2048;
/** Empty px between frames so nearest sampling never bleeds a neighbor in. */
export const PAGE_GUTTER = 1;

export interface PackItem {
  readonly key: string;
  readonly w: number;
  readonly h: number;
}

export interface Placement {
  readonly key: string;
  readonly page: number;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface PackResult {
  readonly placements: readonly Placement[];
  /** Each page's used size (pages are trimmed, not padded to a power of two). */
  readonly pages: readonly { readonly w: number; readonly h: number }[];
}

/**
 * Packs items onto shelves, tallest first (ties keep input order, so packing is deterministic),
 * opening a new page when one fills. Throws if a single item can't fit on a page.
 */
export function packShelves(items: readonly PackItem[], maxPage = MAX_PAGE): PackResult {
  const order = items.map((it, i) => ({ it, i })).toSorted((a, b) => b.it.h - a.it.h || a.i - b.i);
  const placements: Placement[] = [];
  const pages: { w: number; h: number }[] = [];
  let page = -1;
  let x = 0;
  let shelfY = 0;
  let shelfH = 0;
  const newPage = (): void => {
    page++;
    pages.push({ w: 0, h: 0 });
    x = 0;
    shelfY = 0;
    shelfH = 0;
  };
  newPage();
  for (const { it } of order) {
    if (it.w > maxPage || it.h > maxPage) {
      throw new Error(`atlas: '${it.key}' (${it.w}×${it.h}) exceeds ${maxPage}px`);
    }
    if (x + it.w > maxPage) {
      shelfY += shelfH + PAGE_GUTTER;
      x = 0;
      shelfH = 0;
    }
    if (shelfY + it.h > maxPage) newPage();
    placements.push({ key: it.key, page, x, y: shelfY, w: it.w, h: it.h });
    const p = pages[page];
    if (p !== undefined) {
      p.w = Math.max(p.w, x + it.w);
      p.h = Math.max(p.h, shelfY + it.h);
    }
    x += it.w + PAGE_GUTTER;
    shelfH = Math.max(shelfH, it.h);
  }
  return { placements, pages };
}
