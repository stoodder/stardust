/// <reference lib="dom" />
import { mkdirSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { ALL_SPRITES as REGISTRY } from '../src/content/sprites/all.ts';
import { FINALE_SCENE_SPRITES } from '../src/content/sprites/scenes/finale.ts';
import { expect, test } from './fixtures.ts';
import { outPath } from './out.ts';

/** What the gallery shows: the registry, then the finale's lazy stills (app/gallery.ts). */
const SPRITES = [...REGISTRY, ...FINALE_SCENE_SPRITES];

/**
 * The gallery's sheets are the milestone art trail (docs/art/tech-spec.md § The sprite gallery):
 * `sheet-01.png`, `sheet-02.png`, … here, copied to docs/art/gallery/m<N>/ at each ship. Keep these
 * names stable. Playwright empties the output folder at the start of each run, so no stale sheet
 * outlives a run.
 */
const GALLERY_DIR = outPath('gallery');

/**
 * The sheets are captured by PARTS tests, each opening the gallery and capturing its share of the
 * sheets, so the workers share them out (T764: one capture of an 8,000 px sheet is ~6 s of
 * software raster and PNG encoding, and one test capturing all of them was the run's long pole).
 * Part 1 also checks the registry: every sprite, every frame, in order.
 */
const PARTS = 3;

/** Portraits are gathered in their own section at the end of the gallery. */
function isPortrait(id: string): boolean {
  return id.startsWith('portrait.');
}

/** Opens the gallery at the width its sheets are packed for and waits for it to finish. */
async function openGallery(page: Page) {
  // Wide enough that variants wrap side by side; the page packs its sheets at this width.
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto('/gallery.html');
  const body = page.locator('body[data-gallery-ready="1"]');
  await expect(body).toBeAttached({ timeout: 15_000 });
  return {
    body,
    attr: async (name: string): Promise<number> => Number(await body.getAttribute(name)),
  };
}

for (let part = 1; part <= PARTS; part++) {
  test(`gallery, part ${part} of ${PARTS}: every registered sprite and frame renders, with no console errors`, async ({
    page,
  }) => {
    // Baking every sprite and capturing sheets can outlast the default 30 s when the gate runs
    // the smoke specs in parallel.
    test.setTimeout(120_000);
    const { attr } = await openGallery(page);

    if (part === 1) {
      expect(await attr('data-sprite-count')).toBe(SPRITES.length);
      const expected = await attr('data-frames-expected');
      expect(expected).toBeGreaterThan(0);
      expect(await attr('data-frames-rendered')).toBe(expected);

      const cards = page.locator('section[data-sprite-id]');
      await expect(cards).toHaveCount(SPRITES.length);
      // One round trip for every card's id (T460: a locator per card cost seconds of the gate).
      const ids = await cards.evaluateAll((els) =>
        els.map((e) => e.getAttribute('data-sprite-id')),
      );
      // Registry order, with the portraits gathered in their own section at the end.
      const order = SPRITES.map((s) => s.id as string);
      expect(ids).toEqual([...order.filter((id) => !isPortrait(id)), ...order.filter(isPortrait)]);
    }

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
    mkdirSync(GALLERY_DIR, { recursive: true });
    // This part's share: a contiguous run of sheets, the first parts taking any extra one.
    const per = Math.ceil(sheets.length / PARTS);
    const heights: string[] = [];
    for (const [i, s] of sheets.entries()) {
      if (Math.floor(i / per) !== part - 1) continue;
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
      heights.push(`${i + 1}: ${Math.ceil(s.h)}`);
    }
    console.log(`gallery sheets, part ${part} of ${PARTS} (px): ${heights.join(', ')}`);
  });
}
