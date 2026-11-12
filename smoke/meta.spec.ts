// The M2 flow shell (T209; D031): slots, the Shift board, the base, Settings, and codes, through
// the real UI. New game → A1M1 (autoplay par) → Results → Continue → Base (on the Inbox with the new
// memo; Research open, the rest locked with their hints) → Shift board → A1M2 with the Sprinkler issued (D059) → Title → reload
// → Continue. An export → import round
// trip through Settings and the Title. `?test=1&save=all_unlocked` reaches every gated pane. The
// Shift board runs through Act I (T331): winning A1M2 offers A1M3 next, A1M4 leads to A1M5, and
// A1M5 is next up once A1M4 is won (with A1M5 won the Sector map takes over: starMap.spec.ts).
// Screenshots in test-results/screens/meta/.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { playShift, shot, waitForReady } from './hooks.ts';

/** Fast-forwards the running battle until the map ends; returns the outcome. */
const playOut = (page: Page) =>
  page.evaluate(() => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    for (let i = 0; i < 60 && sd.state()?.outcome === 'playing'; i++) sd.fastForward(600);
    return sd.state()?.outcome ?? null;
  });

const shiftRow = (page: Page, name: string) =>
  page.getByRole('list', { name: 'Shifts' }).getByRole('listitem').filter({ hasText: name });

test('meta: new game → A1M1 won → Base (the new memo first) → Shift board → Continue after a reload', async ({
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

  // The win issued the Sprinkler for A1M2 (D059: TOWER_ACCESS `how: 'issued'`).
  const towers = await page.evaluate(() => globalThis.__sd!.save()?.unlocks.towers);
  expect(towers).toEqual(['rivet', 'thumper', 'sprinkler']);

  // Continue: A1M1 opened the base, on the Inbox (T320): the run end delivered Sterling's Q2 memo,
  // unread. Research is a tab away; the Shop and Engineering show their hints, which name only
  // maps the Shift board shows (G8).
  await onward.click();
  await expect(page.getByRole('heading', { name: 'Base' })).toBeVisible();
  const pane = page.getByRole('tabpanel');
  await expect(page.getByRole('tab', { name: /^Inbox/ })).toHaveAttribute('aria-selected', 'true');
  await expect(pane.getByRole('article')).toContainText('Q2 Results: Pest Losses Down 38%!');
  await page.getByRole('tab', { name: 'Research' }).click();
  await expect(page.getByRole('tab', { name: 'Research' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(pane).toContainText('Research Command');
  await shot(page, 'meta', 3, 'base-rnd');
  // A purchase that maxes an item (Mk II, one rank) turns its button into "Owned"; the focus stays
  // on its row instead of dropping to the page (U6).
  expect(await page.evaluate(() => globalThis.__sd!.save()?.currencies.intel)).toBeGreaterThan(1);
  await pane.getByRole('button', { name: /^Order Orbital Strike Mk II/ }).click();
  const mk2 = pane.locator('[data-offer="upgrade:orbital_strike_mk2"]');
  await expect(mk2).toContainText('Owned');
  await expect(mk2).toBeFocused();
  await page.getByRole('tab', { name: /Shop/ }).click();
  await expect(pane).toContainText('Opens after Special Delivery');
  await expect(pane).not.toContainText('coming soon');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: /Engineering/ })).toBeFocused();
  await expect(pane).toContainText('Opens after The Audit');
  await shot(page, 'meta', 4, 'base-engineering-locked');

  // The Shift board: A1M1 cleared; A1M2 next up.
  await page.getByRole('button', { name: 'Shift board' }).click();
  await expect(page.getByRole('heading', { name: 'Shift board' })).toBeVisible();
  await expect(shiftRow(page, 'Orientation Day')).toContainText('Cleared');
  await expect(shiftRow(page, 'Orientation Day').getByRole('button')).toHaveAccessibleName(
    'Replay Orientation Day',
  );
  await expect(shiftRow(page, 'Hatching Season')).toContainText('Next up');
  await expect(page.getByRole('button', { name: 'Base' })).toBeVisible();
  await shot(page, 'meta', 5, 'shift-board');

  // A1M2: no loadout choice yet (three towers), so straight to the briefing; the HUD's build bar
  // holds the issued Sprinkler.
  await shiftRow(page, 'Hatching Season').getByRole('button').click();
  await expect(page.getByRole('dialog', { name: 'Shift briefing' })).toBeVisible();
  const build = page.getByRole('navigation', { name: 'Build' }).getByRole('button');
  await expect(build).toHaveCount(3);
  await expect(build.nth(2)).toHaveAccessibleName(/^Build Sprinkler/);
  await shot(page, 'meta', 11, 'a1m2-sprinkler-slot');

  // Title → reload: the campaign is still there, and Continue lands on its Shift board.
  await page.evaluate(() => globalThis.__sd!.goto('title'));
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

test('meta: the Shift board runs through Act I: A1M2 won → A1M3 next, … → A1M5 next', async ({
  page,
}) => {
  // A1M2 won in normal flow, from the board (not `?map=`).
  await page.goto('/?test=1&seed=1&save=after_a1m1');
  await waitForReady(page);
  const rows = page.getByRole('list', { name: 'Shifts' }).getByRole('listitem');
  // Act I's five shifts, then the dimmed, padlocked sixth row (D097 R6), never named (D102): A2M1
  // is built, so it reads "Shift 6 · Locked"; the star map names Rig Nine after A1M5.
  await expect(rows).toHaveCount(6);
  await expect(shiftRow(page, 'Special Delivery')).toContainText('Locked');
  await expect(rows.last()).toHaveAttribute('data-testid', 'shift-teaser');
  await expect(rows.last()).toContainText('Shift 6');
  await expect(rows.last()).toContainText('Locked');
  await expect(rows.last().getByRole('button')).toHaveCount(0);
  await expect(page.getByTestId('star-map')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('Rig Nine');
  await shiftRow(page, 'Hatching Season')
    .getByRole('button', { name: 'Start Hatching Season' })
    .click();
  await page.evaluate(() => globalThis.__sd!.autoplay('par'));
  const outcome = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    for (let i = 0; i < 80 && sd.state()?.outcome === 'playing'; i++) sd.fastForward(600);
    return sd.state()?.outcome ?? null;
  });
  expect(outcome).toBe('won');
  const results = page.getByRole('dialog', { name: 'PERIMETER SECURED!' });
  await results.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Shift board' }).click();
  await expect(page.getByRole('heading', { name: 'Shift board' })).toBeVisible();
  await expect(shiftRow(page, 'Hatching Season')).toContainText('Cleared');
  await expect(shiftRow(page, 'Special Delivery')).toContainText('Next up');
  await expect(
    shiftRow(page, 'Special Delivery').getByRole('button', { name: 'Start Special Delivery' }),
  ).toBeFocused();
  await expect(shiftRow(page, 'The Audit')).toContainText('Locked');
  await shot(page, 'meta', 12, 'shift-board-after-a1m2');

  // A1M4 won → A1M5 next up.
  await page.goto('/?test=1&seed=1&save=after_a1m4');
  await waitForReady(page);
  await expect(shiftRow(page, 'The Audit')).toContainText('Cleared');
  await expect(shiftRow(page, 'Record Quarter')).toContainText('Next up');
  await expect(rows.last()).not.toContainText('Rig Nine');
  // With A1M5 won the campaign screen is the Sector map (smoke/starMap.spec.ts, D102).
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
  await expect(field).toHaveValue(/^SD3-[A-Za-z0-9_-]+-[0-9a-f]{4}$/);
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
  // The focus moves from the gone Check code button to the first slot's (U6).
  await expect(targets.nth(0).getByRole('button')).toBeFocused();
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
  const open = async (tab: string | RegExp, text: string): Promise<void> => {
    const t = page.getByRole('tab', { name: tab, exact: typeof tab === 'string' });
    await t.click();
    await expect(t).toHaveAttribute('aria-selected', 'true');
    await expect(pane).toContainText(text);
    await expect(pane).not.toContainText('Locked');
  };
  await open('Research', 'Research Command');
  await open('Shop', "Zibzab's Genuine Pre-Owned");
  await open('Engineering', 'Engineering · QUILL');
  await shot(page, 'meta', 10, 'base-all-unlocked');
  // Ves'thara's shelf (T509): open in this save (every system), so its tab shows (T566).
  await open(/^Xenotech/, "Xenotech · Ves'thara"); // its NEW tag names it "Xenotech (new)"
  // A battle from this save brings at most four towers and still plays (through the loadout
  // screen, T201: this save has a choice of ability).
  await page.getByRole('button', { name: 'Sector map' }).click();
  await playShift(page, 'Orientation Day');
  await page.getByRole('button', { name: 'Lock in' }).click();
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
