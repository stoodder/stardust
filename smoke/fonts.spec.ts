/// <reference lib="dom" />
// Body text readability (T219): the menus' body text is Silkscreen, which draws "5" and "fi" plainly
// (Pixelify Sans drew "1.5" as "1.S" and "files" as "Ales"). Screenshots of every screen with body
// text, for a look: Research, Shop, Engineering, Settings, the loadout screen, and Results. In
// test-results/screens/fonts/.
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { playShift, shot, waitForReady } from './hooks.ts';

/**
 * After the finale (`all_unlocked` has won it) the Sector map opens on the post-game plate with
 * Endless selected: as a player does, pick Shift 1, step back to its node (Esc), and arrow along
 * the campaign to `name`'s node, ready for `playShift`.
 */
async function toCampaignShift(page: Page, name: string): Promise<void> {
  await page.getByRole('heading', { name: 'Sector map' }).waitFor();
  const shifts = page.getByRole('list', { name: 'Shifts' });
  // A click opens Shift 1's panel and focuses its button; Esc returns to the node.
  await shifts.getByRole('button', { name: /^Shift 1, / }).click();
  await page.keyboard.press('Escape');
  const target = shifts.getByRole('button', { name: new RegExp(`^Shift \\d+, ${name}, `) });
  const there = (): Promise<boolean> => target.evaluate((el) => el === document.activeElement);
  for (let i = 0; i < 30; i++) {
    // oxlint-disable-next-line no-await-in-loop -- one key press after another
    if (await there()) break;
    // oxlint-disable-next-line no-await-in-loop -- one key press after another
    await page.keyboard.press('ArrowRight');
  }
  await expect(target).toBeFocused();
}

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
  await toCampaignShift(page, 'Hatching Season');
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
