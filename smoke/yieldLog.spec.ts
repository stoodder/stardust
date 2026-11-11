// T614: the Asset Yield Log's staging (ui/dialogue/yieldLog.ts, YieldLogStage.tsx; act3.md § A3M2)
// over the dev scene that stands in for A3M2's confession (ui/dialogue/dev.ts), played after A3M2's
// Results as the real one is (resultsFlow `afterResults`). The header reads
// "ASSET YIELD LOG · ENTRIES: 41,206 + {pests_processed}" with the save's count; the log scrolls,
// the player's entries (#ED-447) lighting as they cross the reading line; Next and Esc do nothing
// through its first pass, then cut the scroll short to the lines. Reduced motion: one still page,
// yours lit. Screenshots via shot() (smoke/out.ts): look at them.
import { expect, test } from './fixtures.ts';
import { shot, waitForReady } from './hooks.ts';

const DEV_SCENE = 'a1_m01_scene_dev_yield_log';

test('yield log: scrolls with your entries lit, skippable only after its first pass', async ({
  page,
}) => {
  // Real-time text: the lead-in and its lock are what this flow tests.
  // A3M2's real path: Results, then Continue plays the after-Results scene (the dev stand-in).
  await page.goto('/?test=1&dialogue=1&seed=1&save=after_a3m1_cleared');
  await waitForReady(page);
  // {pests_processed}: the lifetime count as Results left it, this run's 87 included.
  const before = await page.evaluate(() => globalThis.__sd!.save()!.stats.pestsProcessed);
  const pests = before + 87;
  void page.evaluate(
    (id) =>
      globalThis.__sd!.results({ map: 'a3_m02', outcome: 'won', pests: 87, flow: { after: [id] } }),
    DEV_SCENE,
  );
  await page.getByRole('button', { name: 'Continue' }).click();
  const started = Date.now();
  const scene = page.getByRole('dialog', { name: 'Scene' });
  await expect(page.getByTestId('stage-yield-log')).toBeVisible();
  const header = page.getByTestId('yield-log-header');
  await expect(header).toHaveText(
    `ASSET YIELD LOG · ENTRIES: 41,206 + ${pests.toLocaleString('en-US')}`,
  );
  // Before your entries reach the reading line, the others' are on screen and none of yours lit.
  await expect(page.locator('.yl-row:not(.yours)').first()).toBeVisible();
  // They light as the scroll carries them up.
  await expect
    .poll(() => page.locator('.yl-row.lit').count(), { timeout: 6000 })
    .toBeGreaterThan(0);
  await expect(page.locator('.yl-row.lit').first()).toContainText('#ED-447');
  await shot(page, 'yield-log', 1, 'scroll');

  // Its first pass: Next and Esc do nothing yet (the lines still wait).
  await page.keyboard.press('Escape');
  await page.keyboard.press('Enter');
  await expect(scene).toBeVisible();
  await expect(scene).not.toContainText('I thought it was inventory.');

  // After it (YIELD_LOG_LOCK_MS, 9 s), Skip cuts the scroll short to QUILL's line; the log keeps
  // scrolling under the lines.
  await page.waitForTimeout(Math.max(0, 9300 - (Date.now() - started)));
  await shot(page, 'yield-log', 2, 'scroll-later');
  await scene.getByRole('button', { name: 'Skip' }).click();
  await expect(scene).toContainText('I thought it was inventory.');
  await shot(page, 'yield-log', 3, 'lines');
});

test('yield log: under reduced motion, one still page with your entries lit', async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/?test=1&dialogue=1&seed=1&save=after_a3m1_cleared');
  await waitForReady(page);
  await page.evaluate((id) => globalThis.__sd!.dialogue.play(id), DEV_SCENE);
  await expect(page.getByTestId('stage-yield-log')).toBeVisible();
  await expect(page.locator('.yl-read-line')).toHaveCount(0);
  const lit = await page.locator('.yl-row.lit').count();
  expect(lit).toBeGreaterThan(0);
  await expect(page.locator('.yl-row.yours:not(.lit)')).toHaveCount(0);
  await shot(page, 'yield-log', 4, 'still');
  await context.close();
});
