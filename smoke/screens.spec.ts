// The Title and Results screens (T115): title → Start → battle, a forced win and a forced loss
// (`__sd.forceOutcome`, until T105b's win/lose lets autoplay reach them), Retry and Title, and the
// PESTS PROCESSED counter on the results screen. Asserts on the DOM, by role and text.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { shot, waitForReady } from './hooks.ts';

const COUNTER = /PESTS PROCESSED: [\d,]+ ★ Top 5% of Technicians!/;

const tick = (page: Page) => page.evaluate(() => globalThis.__sd?.state()?.tick ?? null);

/** The results counter paragraph (its accessible text is the final line). */
const counter = (page: Page) => page.locator('.sd-results-counter');

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
  await shot(page, 'screens', 2, 'battle');
});

test('screens: a forced win shows the results and the counter; Title returns', async ({ page }) => {
  await page.goto('/?test=1&skipIntro=1&seed=1');
  await waitForReady(page);
  // Build a tower first, so the frozen battle behind the results has something on it.
  await page.evaluate(() => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    sd.setSpeed(0);
    sd.enqueue({ type: 'build', tile: [3, 1], tower: 'dev_rivet' });
    sd.fastForward(0);
    sd.setSpeed(1);
  });
  await page.evaluate(() => globalThis.__sd?.forceOutcome('won'));

  const dialog = page.getByRole('dialog', { name: 'PERIMETER SECURED!' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Shift report · Victory')).toBeVisible();
  await expect(dialog.getByText('Waves survived')).toBeVisible();
  await expect(dialog.getByText('Core integrity')).toBeVisible();
  await expect(counter(page)).toHaveText(COUNTER);
  await expect(page.getByRole('button', { name: 'Title' })).toBeFocused();

  // The battle is frozen behind the results.
  const t0 = await tick(page);
  await page.waitForTimeout(200);
  expect(await tick(page)).toBe(t0);
  await shot(page, 'screens', 3, 'won');

  // A second forced outcome is a no-op: the win stands.
  await page.evaluate(() => globalThis.__sd?.forceOutcome('lost'));
  await expect(dialog).toBeVisible();

  await page.getByRole('button', { name: 'Title' }).click();
  await expect(page.getByRole('heading', { name: 'Stardust' })).toBeVisible();
  expect(await tick(page)).toBeNull();
  // goto('results') shows the last finished run again.
  await page.evaluate(() => globalThis.__sd?.goto('results'));
  await expect(dialog).toBeVisible();
});

test('screens: a forced loss is a hiccup, not a scolding; Retry restarts the map', async ({
  page,
}) => {
  await page.goto('/?test=1&skipIntro=1&seed=1');
  await waitForReady(page);
  await page.evaluate(() => globalThis.__sd?.fastForward(120));
  await page.evaluate(() => globalThis.__sd?.forceOutcome('lost'));

  const dialog = page.getByRole('dialog', { name: 'MINOR OPERATIONAL HICCUP' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Shift report · Defeat')).toBeVisible();
  await expect(counter(page)).toHaveText(COUNTER);
  const retry = page.getByRole('button', { name: 'Retry' });
  await expect(retry).toBeFocused();
  // Game hotkeys are off on the results screen: F doesn't touch the frozen battle.
  await page.keyboard.press('KeyF');
  const t0 = await tick(page);
  await page.waitForTimeout(200);
  expect(await tick(page)).toBe(t0);
  await shot(page, 'screens', 4, 'lost');

  // Enter on the focused Retry starts the map over: a fresh run from tick 0, running at 1×.
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  await page.waitForFunction(() => {
    const s = globalThis.__sd?.state();
    return s !== null && s !== undefined && s.tick > 0 && s.tick < 120;
  });
  await shot(page, 'screens', 5, 'retried');
});

test('screens: results need a finished run; forceOutcome needs a battle', async ({ page }) => {
  await page.goto('/?test=1');
  await waitForReady(page);
  const errors = await page.evaluate(async () => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    const out: string[] = [];
    await sd.goto('results').catch((e: unknown) => out.push(String(e)));
    await sd.forceOutcome('won').catch((e: unknown) => out.push(String(e)));
    return out;
  });
  expect(errors).toHaveLength(2);
  await expect(page.getByRole('heading', { name: 'Stardust' })).toBeVisible();
});
