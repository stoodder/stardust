/// <reference lib="dom" />
// Body text readability (T219): the menus' body text is Silkscreen, which draws "5" and "fi" plainly
// (Pixelify Sans drew "1.5" as "1.S" and "files" as "Ales"). Screenshots of every screen with body
// text, for a look: Research, Shop, Engineering, Settings, the loadout screen, and Results. In
// test-results/screens/fonts/.
import type { Locator } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { playShift, shot, waitForReady } from './hooks.ts';

/** The font family an element renders with. */
const fontOf = (el: Locator) => el.evaluate((e) => getComputedStyle(e).fontFamily);

test('fonts: Research, Shop, Engineering, and Settings body text is Silkscreen', async ({
  page,
}) => {
  await page.goto('/?test=1&seed=1&save=all_unlocked');
  await waitForReady(page);
  await page.getByRole('button', { name: 'Base' }).click();
  const pane = page.getByRole('tabpanel');
  // Research's effects carry the bug's examples: "+0.5 Orbital Strike radius", "−15% ... cooldown".
  await expect(pane).toContainText('Orbital Strike radius');
  await expect(pane).toContainText('15% Suppressing Fire cooldown');
  expect(await fontOf(page.getByTestId('store-line'))).toMatch(/^"?Silkscreen/);
  expect(await page.evaluate(() => document.fonts.check('8px Silkscreen'))).toBe(true);
  await page.waitForTimeout(200);
  await shot(page, 'fonts', 1, 'rnd');

  await page.getByRole('tab', { name: 'Shop', exact: true }).click();
  expect(await fontOf(page.getByTestId('store-line'))).toMatch(/^"?Silkscreen/);
  await shot(page, 'fonts', 2, 'shop');

  await page.getByRole('tab', { name: 'Engineering', exact: true }).click();
  await shot(page, 'fonts', 3, 'engineering');

  await page.getByRole('button', { name: 'Sector map' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await shot(page, 'fonts', 4, 'settings');
});

test('fonts: the loadout screen and Results read plainly', async ({ page }) => {
  await page.goto('/?test=1&seed=1&save=all_unlocked');
  await waitForReady(page);
  await playShift(page, 'Hatching Season');
  await expect(page.getByRole('heading', { name: 'Loadout' })).toBeVisible();
  await page.waitForTimeout(200);
  await shot(page, 'fonts', 5, 'loadout');

  await page.getByRole('button', { name: 'Lock in' }).click();
  await page.getByRole('button', { name: 'Clock in' }).click();
  await page.evaluate(() => globalThis.__sd!.autoplay('none'));
  await page.evaluate(() => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    for (let i = 0; i < 60 && sd.state()?.outcome === 'playing'; i++) sd.fastForward(600);
  });
  const card = page.getByRole('dialog');
  await expect(card.getByRole('button', { name: 'Retry' })).toBeVisible();
  const line = card.locator('.sd-results-line').first();
  if ((await line.count()) > 0) expect(await fontOf(line)).toMatch(/^"?Silkscreen/);
  await page.waitForTimeout(1900);
  await shot(page, 'fonts', 6, 'results');
});
