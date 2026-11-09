import { SPRITES } from '../src/content/sprites/index.ts';
import { expect, test } from './fixtures.ts';

/**
 * The gallery's full-page screenshot is the milestone art-trail artifact (copied to
 * docs/art/gallery/m<N>.png at each ship, D010). Keep this path stable.
 */
const GALLERY_SHOT = 'test-results/gallery/gallery.png';

test('gallery: every registered sprite and frame renders, with no console errors', async ({
  page,
}) => {
  // Wide enough that variants wrap side by side, keeping the full page short enough to capture.
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
  const ids = await Promise.all(SPRITES.map((_, i) => cards.nth(i).getAttribute('data-sprite-id')));
  expect(ids).toEqual(SPRITES.map((s) => s.id));

  await page.screenshot({ path: GALLERY_SHOT, fullPage: true });
});
