/// <reference lib="dom" />
import type { Page } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { SPRITES } from '../src/content/sprites/index.ts';
import { expect, test } from './fixtures.ts';

/**
 * The gallery's full-page screenshot is the milestone art-trail artifact (copied to
 * docs/art/gallery/m<N>.png at each ship, D010). Keep this path stable.
 */
const GALLERY_SHOT = 'test-results/gallery/gallery.png';
/** Each capture is a strip this tall, well under Chrome's 16,384 px limit for one screenshot. */
const TILE_PX = 4096;
/** The tallest page the stitch can hold: Chrome's canvas side limit. */
const MAX_PAGE_PX = 32_767;

/**
 * Captures the whole page as one PNG however tall it is: strips of TILE_PX are captured one by one,
 * then stitched on a canvas in a scratch page. Deterministic, like the page itself.
 */
async function captureFullPage(page: Page, path: string): Promise<{ w: number; h: number }> {
  const { w, h } = await page.evaluate(() => ({
    w: document.documentElement.scrollWidth,
    h: document.documentElement.scrollHeight,
  }));
  expect(
    h,
    `the gallery is ${h} px tall; show fewer frames per card (app/gallery.ts cardPlan)`,
  ).toBeLessThanOrEqual(MAX_PAGE_PX);
  const strips: string[] = [];
  for (let y = 0; y < h; y += TILE_PX) {
    const clip = { x: 0, y, width: w, height: Math.min(TILE_PX, h - y) };
    // oxlint-disable-next-line no-await-in-loop -- one capture at a time, top to bottom
    strips.push((await page.screenshot({ clip, fullPage: true })).toString('base64'));
  }
  const scratch = await page.context().newPage();
  const png = await scratch.evaluate(
    async ({ parts, width, height }) => {
      const c = document.createElement('canvas');
      c.width = width;
      c.height = height;
      const ctx = c.getContext('2d');
      if (ctx === null) throw new Error('no 2d context');
      const imgs = await Promise.all(
        parts.map(async (b64) => {
          const img = new Image();
          img.src = `data:image/png;base64,${b64}`;
          await img.decode();
          return img;
        }),
      );
      let y = 0;
      for (const img of imgs) {
        ctx.drawImage(img, 0, y);
        y += img.height;
      }
      return c.toDataURL('image/png').slice('data:image/png;base64,'.length);
    },
    { parts: strips, width: w, height: h },
  );
  await scratch.close();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, Buffer.from(png, 'base64'));
  return { w, h };
}

/** Portraits are gathered in their own section at the end of the gallery. */
function isPortrait(id: string): boolean {
  return id.startsWith('portrait.');
}

test('gallery: every registered sprite and frame renders, with no console errors', async ({
  page,
}) => {
  // Baking every sprite and stitching a ~16,000 px capture can outlast the default 30 s
  // when the gate runs the smoke specs in parallel.
  test.setTimeout(90_000);
  // Wide enough that variants wrap side by side, keeping the full page short.
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

  const { w, h } = await captureFullPage(page, GALLERY_SHOT);
  expect(w).toBe(1600);
  expect(h).toBeGreaterThan(0);
});
