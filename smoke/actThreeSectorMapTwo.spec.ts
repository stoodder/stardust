// T712 exploratory (rewritten below once settled).
import { expect, test } from './fixtures.ts';
import { shot, waitForReady } from './hooks.ts';

test('explore', async ({ page }) => {
  await page.goto('/?test=1&dialogue=1&fasttext=1&seed=1&save=after_a3m5_keep');
  await waitForReady(page);
  void page
    .evaluate(() => globalThis.__sd!.results({ map: 'a3_m06', outcome: 'won' }))
    .catch(() => undefined);
  await expect(page.getByTestId('stage-waykeeper')).toBeVisible();
  await page.waitForTimeout(800);
  await shot(page, 'explore', 7, 'waykeeper-over-star-map');
});
