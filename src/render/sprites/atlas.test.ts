import { describe, expect, it } from 'vitest';
import { packShelves, PAGE_GUTTER, type Placement } from './atlas.ts';

function overlaps(a: Placement, b: Placement): boolean {
  return (
    a.page === b.page &&
    a.x < b.x + b.w + PAGE_GUTTER &&
    b.x < a.x + a.w + PAGE_GUTTER &&
    a.y < b.y + b.h + PAGE_GUTTER &&
    b.y < a.y + a.h + PAGE_GUTTER
  );
}

describe('packShelves', () => {
  const items = Array.from({ length: 60 }, (_, i) => ({
    key: `k${i}`,
    w: 5 + (i % 7) * 3,
    h: 4 + (i % 5) * 4,
  }));

  it('places every item once, inside its page, with gutters between items', () => {
    const { placements, pages } = packShelves(items, 64);
    expect(placements.map((p) => p.key).toSorted()).toEqual(items.map((i) => i.key).toSorted());
    for (const p of placements) {
      const page = pages[p.page];
      expect(page).toBeDefined();
      expect(p.x + p.w).toBeLessThanOrEqual(page?.w ?? 0);
      expect(p.y + p.h).toBeLessThanOrEqual(page?.h ?? 0);
      expect(page?.w ?? 0).toBeLessThanOrEqual(64);
      expect(page?.h ?? 0).toBeLessThanOrEqual(64);
    }
    for (let i = 0; i < placements.length; i++) {
      for (let j = i + 1; j < placements.length; j++) {
        const [a, b] = [placements[i], placements[j]];
        if (a !== undefined && b !== undefined)
          expect(overlaps(a, b), `${a.key} / ${b.key}`).toBe(false);
      }
    }
    expect(pages.length).toBeGreaterThan(1);
  });

  it('is deterministic', () => {
    expect(packShelves(items, 64)).toEqual(packShelves(items, 64));
  });

  it('rejects an item larger than a page', () => {
    expect(() => packShelves([{ key: 'big', w: 65, h: 1 }], 64)).toThrow(
      "'big' (65×1) exceeds 64px",
    );
  });
});
