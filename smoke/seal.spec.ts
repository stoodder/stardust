// T614: the SEAL's screen on the Holdout dev range (`?map=dev_holdout`; app/forcedInput.ts,
// ui/hud/ForcedInputButton.tsx). As W3 starts the SEAL is forced: a veil takes the playfield's
// clicks, every HUD control but the Menu and the speaker locks, and one large button, centered low
// and focused, arms after 700 ms. Game keys are held back (F, W, 1), M still mutes, Esc opens the
// pause menu and Esc resumes; a fresh Enter presses it and the map ends won, on Results' "Held."
// card: "Evacuated: {n}." and the way on, nothing else. Reduced motion: no veil fade, no breathing.
// Screenshots via shot() (smoke/out.ts): look at them.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

/** Opens the dev range and fast-forwards to the SEAL (W3's start); then plays at 1×. */
async function toSeal(page: Page): Promise<void> {
  await page.goto('/?test=1&map=dev_holdout&seed=1');
  await waitForReady(page);
  const pending = await page.evaluate(() => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    sd.setSpeed(0);
    sd.enqueue({ type: 'callWave' });
    for (let k = 0; k < 20_000; k++) {
      const s = sd.state()!;
      if (s.outcome !== 'playing' || s.pendingInput !== null) break;
      sd.fastForward(1);
    }
    sd.setSpeed(1);
    return sd.state()!.pendingInput;
  });
  expect(pending).toBe('seal');
}

const speedPressed = (page: Page, label: string) =>
  page.locator(`.hud-speed button[aria-label="${label}"]`).getAttribute('aria-pressed');

test('seal: one button armed late, the rest locked but the Menu and the speaker; Held.', async ({
  page,
}) => {
  await toSeal(page);
  const seal = page.getByTestId('forced-input');
  await expect(seal).toBeVisible();
  await expect(seal).toHaveText('SEAL');
  await expect(seal).toBeFocused();
  await expect(page.getByTestId('forced-input-veil')).toBeVisible();
  await expect(seal).toHaveAttribute('data-armed', 'true');
  await expect(seal).toHaveAccessibleName('SEAL');

  // Locked: every HUD control is out of reach but the Menu and the speaker.
  await expect(page.locator('.hud-lock:not([inert])')).toHaveCount(0);
  await expect(page.locator('.hud-play')).not.toHaveAttribute('inert', '');
  // (Playwright's role queries don't honour `inert`; focus does.)
  const focusable = (sel: string) =>
    page
      .locator(sel)
      .first()
      .evaluate((el) => {
        (el as HTMLElement).focus();
        return document.activeElement === el;
      });
  expect(await focusable('.hud-speed button')).toBe(false);
  expect(await focusable('.hud-build button')).toBe(false);
  expect(await focusable('button[aria-label="Menu"]')).toBe(true);
  expect(await focusable('button[aria-label="Mute sound"]')).toBe(true);
  await nextFrames(page);
  await shot(page, 'seal', 1, 'armed');

  // Game keys are held back: F doesn't change the speed, W calls nothing, 1 arms nothing.
  const wave = await page.evaluate(() => globalThis.__sd!.state()!.wave);
  for (const k of ['f', 'w', '1', 'ArrowLeft']) {
    // oxlint-disable-next-line no-await-in-loop -- one key press at a time, in order
    await page.keyboard.press(k);
  }
  expect(await speedPressed(page, 'Normal speed')).toBe('true');
  expect(await page.evaluate(() => globalThis.__sd!.state()!.wave)).toBe(wave);
  await expect(page.locator('.hud-build [aria-pressed="true"]')).toHaveCount(0);

  // The speaker: M and a click both still mute and unmute.
  const mute = page.getByRole('button', { name: 'Mute sound' });
  const muted = await mute.getAttribute('aria-pressed');
  await page.keyboard.press('m');
  await expect(mute).not.toHaveAttribute('aria-pressed', muted ?? 'false');
  await mute.click();
  await expect(mute).toHaveAttribute('aria-pressed', muted ?? 'false');

  // Esc opens the pause menu over it (settings reachable), and Esc resumes; the Menu button too.
  await seal.focus();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeVisible();
  await shot(page, 'seal', 2, 'pause-menu');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeHidden();
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.getByTestId('pause-menu')).toBeVisible();
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByTestId('pause-menu')).toBeHidden();
  expect(await page.evaluate(() => globalThis.__sd!.state()!.pendingInput)).toBe('seal');

  // A fresh Enter presses it, wherever the focus went: the map ends won, on the Held card.
  await seal.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => globalThis.__sd!.state()?.outcome)).toBe('won');
  const card = page.getByTestId('results-held');
  await expect(card).toBeVisible({ timeout: 10_000 });
  await expect(card.getByRole('heading', { level: 1 })).toHaveText('Held.');
  await expect(page.getByTestId('results-held-line')).toHaveText(/^Evacuated: [\d,]+\.$/);
  // Nothing else: no stats, counter, payroll, debrief, or Retry; only the way on.
  await expect(card.getByRole('button')).toHaveCount(1);
  await expect(card.getByRole('button', { name: 'Title' })).toBeFocused();
  await expect(
    card.locator('.sd-results-stats, .sd-results-payroll, .sd-results-debrief'),
  ).toHaveCount(0);
  await shot(page, 'seal', 3, 'held');
});

test('seal: under reduced motion nothing fades or breathes', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await toSeal(page);
  const seal = page.getByTestId('forced-input');
  await expect(seal).toHaveAttribute('data-armed', 'true');
  const anim = (sel: string) =>
    page.locator(sel).evaluate((el) => getComputedStyle(el).animationName);
  expect(await anim('[data-testid="forced-input-veil"]')).toBe('none');
  expect(await anim('[data-testid="forced-input"]')).toBe('none');
  await shot(page, 'seal', 4, 'reduced-motion');
  await context.close();
});
