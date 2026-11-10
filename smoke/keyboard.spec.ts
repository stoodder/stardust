// Keyboard-only play (T126) and Esc in the menus (T212), through the real UI with no mouse at all.
// Start shift → Clock in → arm a Rivet (1) → the tile cursor (arrows) → build it (Enter) → select
// it (Enter) → upgrade it (U) → aim the strike (Q) → walk the cursor onto the road → fire (Enter).
// Then Esc backs out of Settings, the Title's panels, and the Base. Screenshots in
// test-results/screens/keyboard/.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { shot, waitForReady } from './hooks.ts';

const towers = (page: Page) =>
  page.evaluate(() =>
    (globalThis.__sd?.state()?.towers.items ?? [])
      .filter((t) => t.alive)
      .map((t) => ({ uid: t.uid, tier: t.tier, col: t.col, row: t.row })),
  );

/** Presses `key` until the cursor's announcement matches `re` (at most `max` presses). */
async function pressUntil(page: Page, key: string, re: RegExp, max = 12): Promise<void> {
  const say = page.getByTestId('cursor-announce');
  for (let i = 0; i < max; i++) {
    // oxlint-disable-next-line no-await-in-loop -- each press depends on what the last one showed
    if (re.test((await say.textContent()) ?? '')) return;
    // oxlint-disable-next-line no-await-in-loop -- one key press at a time, in order
    await page.keyboard.press(key);
  }
  await expect(say).toHaveText(re);
}

test('keyboard: build, select, upgrade, and strike with no mouse', async ({ page }) => {
  await page.goto('/?test=1&seed=1');
  await waitForReady(page);
  // Start shift (focused) → A1M1's briefing → Clock in (focused).
  await expect(page.getByRole('button', { name: 'Start shift' })).toBeFocused();
  await page.keyboard.press('Enter');
  const briefing = page.getByRole('dialog', { name: 'Shift briefing' });
  await expect(briefing).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(briefing).toBeHidden();
  // Pause (Space), so the setup's countdown holds still for the screenshots.
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: 'Pause' })).toHaveAttribute('aria-pressed', 'true');

  // 1 arms the Rivet; the first arrow shows the cursor on a pad and says so.
  await page.keyboard.press('Digit1');
  const slot1 = page.getByRole('button', { name: /^Build Rivet/ });
  await expect(slot1).toHaveAttribute('aria-pressed', 'true');
  const say = page.getByTestId('cursor-announce');
  await expect(say).toBeEmpty();
  await page.keyboard.press('ArrowRight');
  await expect(say).toHaveText(
    /^(Pad|High ground), column \d+, row \d+, empty\. Enter builds Rivet\.$/,
  );
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowDown');
  await expect(say).toHaveText(/Enter builds Rivet\.$/);
  await shot(page, 'keyboard', 1, 'cursor-armed');

  // Enter builds there; the slot stays armed.
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await towers(page)).length).toBe(1);
  await expect(say).toHaveText(/^Rivet tier 1, column \d+, row \d+\. Enter selects it\.$/);
  await shot(page, 'keyboard', 2, 'built');

  // Enter again selects it (the panel opens); U upgrades it.
  await page.keyboard.press('Enter');
  const panel = page.getByRole('region', { name: 'Rivet tower' });
  await expect(panel).toBeVisible();
  await expect(slot1).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('KeyU');
  await expect(panel.getByLabel('Tier 2 of 3')).toBeVisible();
  await shot(page, 'keyboard', 3, 'selected-upgraded');

  // A second Rivet on the next pad over, so the panel has a neighbour to keep clear of.
  await page.keyboard.press('Digit1');
  await pressUntil(page, 'ArrowRight', /empty\. Enter builds Rivet\.$/);
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await towers(page)).length).toBe(2);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('region', { name: 'Rivet tower' })).toBeVisible();
  await shot(page, 'keyboard', 4, 'panel-clear-of-neighbour');
  // Esc drops the selection first; the cursor stays.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('region', { name: 'Rivet tower' })).toBeHidden();
  await expect(say).not.toBeEmpty();

  // Q aims the strike: the cursor walks every tile now; Enter fires it on the road.
  await page.keyboard.press('KeyQ');
  await expect(page.getByRole('button', { name: /Orbital Strike/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await pressUntil(
    page,
    'ArrowDown',
    /^Path, column \d+, row \d+\. Enter fires Orbital Strike here\.$/,
    20,
  );
  await shot(page, 'keyboard', 5, 'aiming');
  await page.keyboard.press('Enter');
  await expect
    .poll(() => page.evaluate(() => globalThis.__sd?.state()?.abilityCooldownTicks[0] ?? 0))
    .toBeGreaterThan(0);
  await shot(page, 'keyboard', 6, 'strike');

  // The strike ended the aim: with nothing left to drop, Esc hides the cursor.
  await page.keyboard.press('Escape');
  await expect(say).toBeEmpty();

  // On the Title (slot 1 now holds this campaign): Load → Delete asks → Esc says Keep → Esc
  // closes Load.
  await page.evaluate(() => globalThis.__sd?.goto('title'));
  await page.getByRole('button', { name: 'Load' }).click();
  await page.getByRole('button', { name: 'Delete slot 1' }).click();
  await expect(page.getByRole('button', { name: 'Yes, delete' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Yes, delete' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Load a campaign' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Continue' })).toBeFocused();
});

test('keyboard: Esc backs out of Settings, the Title panels, and the Base', async ({ page }) => {
  await page.goto('/?test=1&seed=1');
  await waitForReady(page);
  const title = page.getByRole('heading', { name: 'Stardust' });
  await expect(title).toBeVisible();

  // Title → Import code → Esc: back to the main buttons (from the text field, too).
  await page.getByRole('button', { name: 'Import code' }).click();
  await expect(page.getByLabel('Paste a shift code')).toBeFocused();
  await shot(page, 'keyboard', 7, 'title-import');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Start shift' })).toBeFocused();

  // Title → Settings → Esc: back to the Title.
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(title).toBeVisible();

  // A save with the base open (every map won, so the campaign screen is the Sector map): the map
  // → Base → Esc → the map; Settings → Esc → the map.
  await page.goto('/?test=1&seed=1&save=all_unlocked');
  await waitForReady(page);
  const board = page.getByRole('heading', { name: 'Sector map' });
  await expect(board).toBeVisible();
  await page.getByRole('button', { name: 'Base', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Base' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(board).toBeVisible();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  // Settings → Import code → Esc closes the import panel first, then Settings.
  await page.getByRole('button', { name: 'Import code' }).click();
  await expect(page.getByLabel('Paste a shift code')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Paste a shift code')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(board).toBeVisible();
});
