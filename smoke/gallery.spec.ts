/// <reference lib="dom" />
import { mkdirSync, rmSync } from 'node:fs';
import { SPRITES } from '../src/content/sprites/index.ts';
import { expect, test } from './fixtures.ts';
import { outPath } from './out.ts';

/**
 * The gallery's sheets are the milestone art trail (docs/art/tech-spec.md § The sprite gallery):
 * `sheet-01.png`, `sheet-02.png`, … here, copied to docs/art/gallery/m<N>/ at each ship. Keep these
 * names stable.
 */
const GALLERY_DIR = outPath('gallery');

/** Portraits are gathered in their own section at the end of the gallery. */
function isPortrait(id: string): boolean {
  return id.startsWith('portrait.');
}

test('gallery: every registered sprite and frame renders, with no console errors', async ({
  page,
}) => {
  // Baking every sprite and capturing every sheet can outlast the default 30 s when the gate runs
  // the smoke specs in parallel.
  test.setTimeout(90_000);
  // Wide enough that variants wrap side by side; the page packs its sheets at this width.
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto('/gallery.html');
  const body = page.locator('body[data-gallery-ready="1"]');
  await expect(body).toBeAttached({ timeout: 15_000 });

  const attr = async (name: string): Promise<number> => Number(await body.getAttribute(name));
  expect(await attr('data-sprite-count')).toBe(SPRITES.length);
  const expected = await attr('data-frames-expected');
  expect(expected).toBeGreaterThan(0);
  expect(await attr('data-frames-rendered')).toBe(expected);

  const cards = page.locator('section[data-sprite-id]');
  await expect(cards).toHaveCount(SPRITES.length);
  // One round trip for every card's id (T460: a locator per card cost seconds of the gate).
  const ids = await cards.evaluateAll((els) => els.map((e) => e.getAttribute('data-sprite-id')));
  // Registry order, with the portraits gathered in their own section at the end.
  const order = SPRITES.map((s) => s.id as string);
  expect(ids).toEqual([...order.filter((id) => !isPortrait(id)), ...order.filter(isPortrait)]);

  // Each sheet is one capture, no taller than the page's limit (app/gallery.ts SHEET_MAX_PX).
  const maxPx = await attr('data-sheet-max-px');
  const sheets = await page.locator('section.sheet').evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return { y: r.top + window.scrollY, h: r.height, w: document.documentElement.scrollWidth };
    }),
  );
  expect(sheets.length).toBe(await attr('data-sheet-count'));
  expect(sheets.length).toBeGreaterThan(0);
  rmSync(GALLERY_DIR, { recursive: true, force: true });
  mkdirSync(GALLERY_DIR, { recursive: true });
  const heights: number[] = [];
  for (const [i, s] of sheets.entries()) {
    expect(s.w).toBe(1600);
    expect(
      s.h,
      `gallery sheet ${i + 1} is ${s.h} px tall; a single block is over the limit`,
    ).toBeLessThanOrEqual(maxPx);
    const nn = String(i + 1).padStart(2, '0');
    // oxlint-disable-next-line no-await-in-loop -- one capture at a time, top to bottom
    await page.screenshot({
      path: `${GALLERY_DIR}/sheet-${nn}.png`,
      clip: { x: 0, y: s.y, width: s.w, height: Math.ceil(s.h) },
      fullPage: true,
    });
    heights.push(Math.ceil(s.h));
  }
  console.log(`gallery sheets (px): ${heights.join(', ')}`);
});
