// The Title screen and the briefing (T115, T107): title → Start (Enter) → A1M1's briefing, and the
// hooks' guards. The results screens (a real win and a real loss, Retry, Title, and the PESTS
// PROCESSED counter) are reached by autoplay in m1.spec.ts. Asserts on the DOM, by role and text.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { shot, waitForReady } from './hooks.ts';

const tick = (page: Page) => page.evaluate(() => globalThis.__sd?.state()?.tick ?? null);

test('screens: title → Start (Enter) → battle', async ({ page }) => {
  await page.goto('/?test=1&seed=1');
  await waitForReady(page);
  await expect(page.getByRole('heading', { name: 'Stardust' })).toBeVisible();
  await expect(page.getByText('Remember: a clean perimeter is a happy perimeter!')).toBeVisible();
  const start = page.getByRole('button', { name: 'Start shift' });
  await expect(start).toBeFocused();
  expect(await tick(page)).toBeNull();
  // Let the backdrop animate a little before the shot.
  await page.waitForTimeout(400);
  await shot(page, 'screens', 1, 'title');

  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (globalThis.__sd?.state()?.tick ?? -1) >= 0);
  await expect(page.getByRole('heading', { name: 'Stardust' })).toBeHidden();
  // Start shift plays A1M1, which opens on its briefing scene (act1.md § A1M1).
  expect(await page.evaluate(() => globalThis.__sd?.state()?.wave)).toBe(0);
  const briefing = page.getByRole('dialog', { name: 'Shift briefing' });
  await expect(briefing).toBeVisible();
  await expect(briefing).toContainText("Today's forecast: Nibblers, with a chance of Zoomers!");
  await expect(briefing.getByRole('button', { name: 'Clock in' })).toBeFocused();
  await shot(page, 'screens', 2, 'briefing');
  // Game hotkeys wait for the briefing: W doesn't start a wave behind it.
  await page.keyboard.press('KeyW');
  await page.evaluate(() => globalThis.__sd?.fastForward(1));
  expect(await page.evaluate(() => globalThis.__sd?.state()?.wave)).toBe(0);
  // A real modal (D026): the HUD behind it is inert, and Tab cycles inside the dialog (Clock in
  // and the medals' "more" toggle, T803e), never out of it; Shift+Tab comes back to Clock in.
  await expect(page.locator('.hud-play')).toHaveAttribute('inert', '');
  const clockIn = briefing.getByRole('button', { name: 'Clock in' });
  const focusInDialog = () =>
    page.evaluate(
      () => document.querySelector('[role="dialog"]')?.contains(document.activeElement) === true,
    );
  for (let i = 0; i < 3; i++) {
    // oxlint-disable-next-line no-await-in-loop -- one Tab, one check
    await page.keyboard.press('Tab');
    // oxlint-disable-next-line no-await-in-loop -- one Tab, one check
    expect(await focusInDialog()).toBe(true);
  }
  await clockIn.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(clockIn).toBeFocused();
  // Esc closes it whatever has the focus (app/keys.ts routes it), even with nothing focused: a
  // click on the scrim drops the focus to the page.
  await page.mouse.click(4, 4);
  await expect(clockIn).not.toBeFocused();
  await page.keyboard.press('Escape');
  await expect(briefing).toBeHidden();
  await expect(page.locator('.hud-play')).not.toHaveAttribute('inert', '');
  await shot(page, 'screens', 3, 'battle');
});

test('screens: results need a finished run; autoplay needs a battle', async ({ page }) => {
  await page.goto('/?test=1');
  await waitForReady(page);
  const errors = await page.evaluate(async () => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    const out: string[] = [];
    await sd.goto('results').catch((e: unknown) => out.push(String(e)));
    try {
      sd.autoplay('par');
    } catch (e) {
      out.push(String(e));
    }
    return out;
  });
  expect(errors).toHaveLength(2);
  await expect(page.getByRole('heading', { name: 'Stardust' })).toBeVisible();
});
