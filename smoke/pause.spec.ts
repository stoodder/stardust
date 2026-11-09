// The pause menu (T316; design/core-loop.md § 4): in a live battle, Esc with nothing to cancel opens
// Resume / Retry shift / Quit over the frozen sim (the HUD inert behind it, the focus kept inside),
// and Esc resumes. Retry starts the same map again and Quit leaves for the Shift board; both file
// the abandoned run in the save as a loss (meta-runtime.md § Run end: on retry or quit too). The
// HUD's Menu button opens it too. Screenshots in test-results/screens/pause/ (look at them).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

const save = (page: Page) => page.evaluate(() => globalThis.__sd!.save());
const tick = (page: Page) => page.evaluate(() => globalThis.__sd!.state()?.tick ?? -1);

test('pause: Esc opens the menu over a frozen battle; Retry and Quit file the run', async ({
  page,
}) => {
  await page.goto('/?test=1&seed=1');
  await waitForReady(page);
  await page.getByRole('button', { name: 'Start shift' }).click();
  await page.getByRole('button', { name: 'Clock in' }).click();
  // Some time on the clock, and kills to file: par plays a few seconds.
  await page.evaluate(() => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    sd.autoplay('par');
    sd.fastForward(2400);
  });

  // Esc with nothing to cancel: the menu, the sim frozen, Resume focused.
  await page.keyboard.press('Escape');
  const menu = page.getByRole('dialog', { name: 'Shift paused' });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('button', { name: 'Resume' })).toBeFocused();
  const frozen = await tick(page);
  await page.waitForTimeout(300);
  expect(await tick(page)).toBe(frozen);
  // The HUD behind it is inert; Tab stays inside, and the game hotkeys are off.
  await expect(page.locator('.hud-play')).toHaveAttribute('inert', '');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  expect(await menu.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('KeyF');
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('button', { name: 'Quit to Shift board' })).toBeVisible();
  await nextFrames(page);
  await shot(page, 'pause', 1, 'menu');

  // Esc resumes at the speed it found (1x), and the clock runs again.
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect.poll(() => tick(page)).toBeGreaterThan(frozen);

  // The HUD's Menu button opens it too; Retry shift: the same map again, the run filed as a loss.
  const before = await save(page);
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await expect(menu).toBeVisible();
  await menu.getByRole('button', { name: 'Retry shift' }).click();
  await expect(menu).toBeHidden();
  await expect(page.getByTestId('hud')).toBeVisible();
  // A retry skips the briefing, and starts the clock from the top.
  await expect(page.getByRole('dialog', { name: 'Shift briefing' })).toBeHidden();
  expect(await tick(page)).toBeLessThan(frozen);
  const retried = await save(page);
  expect(retried?.stats.runs).toBe((before?.stats.runs ?? 0) + 1);
  expect(retried?.stats.pestsProcessed).toBeGreaterThan(before?.stats.pestsProcessed ?? 0);
  expect(retried?.campaign.maps.a1_m01?.completed).toBe(false);

  // Quit: the Shift board (the base isn't open before A1M1 is won), the run filed again.
  await page.keyboard.press('Escape');
  await expect(menu).toBeVisible();
  await menu.getByRole('button', { name: 'Quit to Shift board' }).click();
  await expect(page.getByRole('heading', { name: 'Shift board' })).toBeVisible();
  expect((await save(page))?.stats.runs).toBe((retried?.stats.runs ?? 0) + 1);
  await shot(page, 'pause', 2, 'quit-to-shift-board');
});

test('pause: Esc cancels first, and never opens over the briefing', async ({ page }) => {
  await page.goto('/?test=1&seed=1');
  await waitForReady(page);
  await page.getByRole('button', { name: 'Start shift' }).click();
  // Esc on the briefing clocks in; it doesn't open the menu.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Shift briefing' })).toBeHidden();
  await expect(page.getByRole('dialog', { name: 'Shift paused' })).toBeHidden();
  // An armed build: the first Esc disarms, the second opens the menu.
  await page.keyboard.press('Digit1');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Shift paused' })).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Shift paused' })).toBeVisible();
});
