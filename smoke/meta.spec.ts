// The M2 flow shell (T209; D031): slots, the Shift board, the base, Settings, and codes, through
// the real UI. New game → A1M1 (autoplay par) → Results → Continue → Base (R&D open, the rest
// locked with their hints) → Shift board → Title → reload → Continue. An export → import round
// trip through Settings and the Title. `?test=1&save=all_unlocked` reaches every gated pane.
// Screenshots in test-results/screens/meta/.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { shot, waitForReady } from './hooks.ts';

/** Fast-forwards the running battle until the map ends; returns the outcome. */
const playOut = (page: Page) =>
  page.evaluate(() => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    for (let i = 0; i < 60 && sd.state()?.outcome === 'playing'; i++) sd.fastForward(600);
    return sd.state()?.outcome ?? null;
  });

const shiftRow = (page: Page, name: string) =>
  page.getByRole('list', { name: 'Shifts' }).getByRole('listitem').filter({ hasText: name });

test('meta: new game → A1M1 won → Base (R&D open) → Shift board → Continue after a reload', async ({
  page,
}) => {
  await page.goto('/?test=1&seed=1');
  await waitForReady(page);
  // No saves: one big Start shift, plus Import and Settings.
  await expect(page.getByRole('button', { name: 'Start shift' })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Load' })).toHaveCount(0);
  await page.waitForTimeout(300);
  await shot(page, 'meta', 1, 'title-empty');

  // Start shift: a new campaign in slot 1, straight into A1M1's briefing.
  await page.getByRole('button', { name: 'Start shift' }).click();
  await expect(page.getByRole('dialog', { name: 'Shift briefing' })).toBeVisible();
  const fresh = await page.evaluate(() => globalThis.__sd!.save());
  expect(fresh?.campaign.maps).toEqual({});
  expect(fresh?.unlocks.towers).toEqual(['rivet', 'thumper']);
  expect(await page.evaluate(() => globalThis.__sd!.state()!.wave)).toBe(0);

  await page.evaluate(() => globalThis.__sd!.autoplay('par'));
  expect(await playOut(page)).toBe('won');
  const results = page.getByRole('dialog', { name: 'PERIMETER SECURED!' });
  await expect(results).toBeVisible();
  // The win is in the save, and stored.
  const won = await page.evaluate(() => globalThis.__sd!.save()?.campaign.maps.a1_m01);
  expect(won?.completed).toBe(true);
  const onward = results.getByRole('button', { name: 'Continue' });
  await expect(onward).toBeFocused();
  await shot(page, 'meta', 2, 'results');

  // Continue: A1M1 opened the base. R&D is open; the Shop and Engineering show their hints.
  await onward.click();
  await expect(page.getByRole('heading', { name: 'Base' })).toBeVisible();
  const pane = page.getByRole('tabpanel');
  await expect(page.getByRole('tab', { name: 'R&D' })).toHaveAttribute('aria-selected', 'true');
  await expect(pane).toContainText('R&D Command');
  await shot(page, 'meta', 3, 'base-rnd');
  await page.getByRole('tab', { name: /Shop/ }).click();
  await expect(pane).toContainText('Opens after Special Delivery');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: /Engineering/ })).toBeFocused();
  await expect(pane).toContainText('Opens after The Audit');
  await shot(page, 'meta', 4, 'base-engineering-locked');

  // The Shift board: A1M1 cleared; A1M2 next up once its content exists, else coming soon.
  await page.getByRole('button', { name: 'Shift board' }).click();
  await expect(page.getByRole('heading', { name: 'Shift board' })).toBeVisible();
  await expect(shiftRow(page, 'Orientation Day')).toContainText('Cleared');
  await expect(shiftRow(page, 'Orientation Day').getByRole('button')).toHaveAccessibleName(
    'Replay Orientation Day',
  );
  await expect(shiftRow(page, 'Hatching Season')).toContainText(/Next up|Coming soon/);
  await expect(page.getByRole('button', { name: 'Base' })).toBeVisible();
  await shot(page, 'meta', 5, 'shift-board');

  // Title → reload: the campaign is still there, and Continue lands on its Shift board.
  await page.getByRole('button', { name: 'Title' }).click();
  await page.reload();
  await waitForReady(page);
  const cont = page.getByRole('button', { name: 'Continue' });
  await expect(cont).toBeFocused();
  await page.getByRole('button', { name: 'Load' }).click();
  const slots = page.getByRole('list', { name: 'Load a campaign' }).getByRole('listitem');
  await expect(slots.first()).toContainText(/1 shift cleared|Hatching Season/);
  await expect(slots.nth(1)).toContainText('Empty');
  await shot(page, 'meta', 6, 'load');
  await page.getByRole('button', { name: 'Back' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(shiftRow(page, 'Orientation Day')).toContainText('Cleared');
});

test('meta: export a code from Settings, import it on the Title into slot 2', async ({ page }) => {
  await page.goto('/?test=1&save=after_a1m1');
  await waitForReady(page);
  await expect(page.getByRole('heading', { name: 'Shift board' })).toBeVisible();
  await expect(page.getByText('Dev save')).toBeVisible();

  // Settings: difficulty persists in the save; Export makes a code.
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await page.getByRole('radio', { name: 'Story' }).click();
  await expect(page.getByRole('radio', { name: 'Story' })).toHaveAttribute('aria-checked', 'true');
  expect(await page.evaluate(() => globalThis.__sd!.save()?.settings.difficulty)).toBe('story');
  await page.getByRole('button', { name: 'Export code' }).click();
  const field = page.getByRole('textbox', { name: 'Shift code' });
  await expect(field).toHaveValue(/^SD1-[A-Za-z0-9_-]+-[0-9a-f]{4}$/);
  const code = await field.inputValue();
  await shot(page, 'meta', 7, 'settings-export');
  // Back returns to the Shift board it was opened from.
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('heading', { name: 'Shift board' })).toBeVisible();

  // Title → Import: a bad code first (a cheerful message, no blame), then the real one.
  await page.getByRole('button', { name: 'Title' }).click();
  await page.getByRole('button', { name: 'Import code' }).click();
  const paste = page.getByRole('textbox', { name: 'Paste a shift code' });
  await expect(paste).toBeFocused();
  await paste.fill('hello Zibzab');
  await page.getByRole('button', { name: 'Check code' }).click();
  await expect(page.getByRole('alert')).toHaveText(/doesn't look like a shift code/);
  await shot(page, 'meta', 8, 'import-error');
  await paste.fill(`  ${code.slice(0, 40)}\n${code.slice(40)}  `);
  await page.getByRole('button', { name: 'Check code' }).click();
  await expect(page.getByRole('status')).toContainText('Code checks out!');
  await shot(page, 'meta', 9, 'import-pick');
  const targets = page.getByRole('list', { name: 'Import into' }).getByRole('listitem');
  await targets.nth(1).getByRole('button', { name: 'Import here' }).click();

  // The imported campaign is in slot 2, on its Shift board, with its difficulty.
  await expect(page.getByRole('heading', { name: 'Shift board' })).toBeVisible();
  await expect(page.getByText('Slot 2')).toBeVisible();
  await expect(shiftRow(page, 'Orientation Day')).toContainText('Cleared');
  const imported = await page.evaluate(() => globalThis.__sd!.save());
  expect(imported?.settings.difficulty).toBe('story');
  expect(imported?.currencies.intel).toBe(3);
});

test('meta: ?test=1&save=all_unlocked opens every base pane', async ({ page }) => {
  await page.goto('/?test=1&save=all_unlocked');
  await waitForReady(page);
  await page.getByRole('button', { name: 'Base' }).click();
  const pane = page.getByRole('tabpanel');
  const open = async (tab: string, text: string): Promise<void> => {
    const t = page.getByRole('tab', { name: tab, exact: true });
    await t.click();
    await expect(t).toHaveAttribute('aria-selected', 'true');
    await expect(pane).toContainText(text);
    await expect(pane).not.toContainText('Locked');
  };
  await open('R&D', 'R&D Command');
  await open('Shop', "Zibzab's Genuine Pre-Owned");
  await open('Engineering', 'R&D Engineering');
  await shot(page, 'meta', 10, 'base-all-unlocked');
  // A battle from this save brings at most four towers and still plays.
  await page.getByRole('button', { name: 'Shift board' }).click();
  await shiftRow(page, 'Orientation Day').getByRole('button').click();
  await page.waitForFunction(() => (globalThis.__sd?.state()?.tick ?? -1) >= 0);
  const loadout = await page.evaluate(() => globalThis.__sd!.state()!.towers.live);
  expect(loadout).toBe(0);
});

test('meta: the dev save hook needs ?test=1, and the gated screens refuse without a save', async ({
  page,
}) => {
  await page.goto('/?test=1');
  await waitForReady(page);
  const errors = await page.evaluate(async () => {
    const out: string[] = [];
    await globalThis.__sd!.goto('campaign').catch((e: unknown) => out.push(String(e)));
    await globalThis.__sd!.goto('base').catch((e: unknown) => out.push(String(e)));
    return out;
  });
  expect(errors).toHaveLength(2);
  await expect(page.getByRole('heading', { name: 'Stardust' })).toBeVisible();
  // Without ?test=1 the save param does nothing: the Title, no hooks.
  await page.goto('/?save=all_unlocked');
  await expect(page.getByRole('heading', { name: 'Stardust' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start shift' })).toBeVisible();
});
