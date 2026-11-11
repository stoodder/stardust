// T712 exploratory (rewritten below once settled).
import { test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

test('explore', async ({ page }) => {
  for (const save of ['after_a3m4_keep', 'after_a3m5_keep', 'after_a3m6']) {
    // oxlint-disable-next-line no-await-in-loop -- exploring
    await page.goto(`/?test=1&seed=1&save=${save}`);
    // oxlint-disable-next-line no-await-in-loop -- exploring
    await waitForReady(page);
    // oxlint-disable-next-line no-await-in-loop -- exploring
    await nextFrames(page);
    // oxlint-disable-next-line no-await-in-loop -- exploring
    await shot(page, 'explore', 1, save);
  }
  await page.evaluate(() => globalThis.__sd!.results({ map: 'a3_m06', outcome: 'won', pests: 0 }));
  await page.waitForTimeout(1500);
  await shot(page, 'explore', 2, 'a3m6-results-flow');
  await page.waitForTimeout(6000);
  await shot(page, 'explore', 3, 'a3m6-results-flow-later');
});
