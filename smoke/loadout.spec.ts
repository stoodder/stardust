// The loadout screen (T201; design/core-loop.md § 1). `?test=1&save=all_unlocked` owns all three
// registered towers and two Technician abilities with every system open, so the screen shows (a
// choice of ability; the 4-tower cap itself is unit-tested in meta/loadout.test.ts, since only
// three towers exist yet). Shift board → Loadout → pick → Lock in → briefing (Change loadout and
// back: the pick is remembered) → battle with that loadout. A1M2: which towers answer its
// required Armor, and the heads-up when the pick has none. The skip rule: a save without the
// loadout system (after_a1m1) goes straight to the briefing with no Change loadout.
// Screenshots in test-results/screens/loadout/.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

const shiftRow = (page: Page, name: string) =>
  page.getByRole('list', { name: 'Shifts' }).getByRole('listitem').filter({ hasText: name });

const towerCard = (page: Page, name: string) =>
  page.getByRole('button', { name: new RegExp(`^${name},`) });

test('loadout: pick towers and an ability, lock in, change it from the briefing, and play it', async ({
  page,
}) => {
  await page.goto('/?test=1&seed=1&save=all_unlocked');
  await waitForReady(page);
  await shiftRow(page, 'Orientation Day').getByRole('button').click();

  // The screen, starting from the default pick: everything owned (three towers), Orbital Strike.
  await expect(page.getByRole('heading', { name: 'Loadout' })).toBeVisible();
  const lockIn = page.getByRole('button', { name: 'Lock in' });
  await expect(lockIn).toBeFocused();
  for (const t of ['Rivet', 'Thumper', 'Sprinkler']) {
    await expect(towerCard(page, t)).toHaveAttribute('aria-pressed', 'true');
  }
  // Costs include the save's cost modifiers: the top-rank Rivet tune-up takes 5% off 100.
  await expect(towerCard(page, 'Rivet')).toHaveAccessibleName(/95 credits/);
  await expect(page.getByRole('radio', { name: /Orbital Strike/ })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  // A1M1 has Bricks in slot 2, and the pool can form both links (all three picked: both lit).
  await expect(page.getByText('Bricks · Suppressing Fire')).toBeVisible();
  const links = page.locator('.sd-lo-link');
  await expect(links).toHaveCount(2);
  await expect(links.filter({ hasText: 'Crossfire' })).toContainText('Linked');
  await expect(links.filter({ hasText: 'Sitting Ducks' })).toContainText('Linked');
  await page.waitForTimeout(200);
  await shot(page, 'loadout', 1, 'screen');

  // Drop Thumper by click: both links break, and the others take build slots 1 and 2.
  await towerCard(page, 'Thumper').click();
  await expect(towerCard(page, 'Thumper')).toHaveAttribute('aria-pressed', 'false');
  await expect(towerCard(page, 'Sprinkler')).toHaveAccessibleName(/build slot 2/);
  await expect(links.filter({ hasText: 'Crossfire' })).toContainText('Needs Thumper');
  await expect(page.getByText('2 / 4')).toBeVisible();

  // Keyboard: Tab into the tower grid and walk it with the arrows; Space toggles.
  await towerCard(page, 'Rivet').focus();
  await page.keyboard.press('ArrowRight');
  await expect(towerCard(page, 'Thumper')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(towerCard(page, 'Thumper')).toHaveAccessibleName(/build slot 3/);
  await page.keyboard.press('Enter');
  await expect(towerCard(page, 'Thumper')).toHaveAttribute('aria-pressed', 'false');
  // The ability radio group: the arrows pick Suppressing Fire.
  await page.getByRole('radio', { name: /Orbital Strike/ }).focus();
  await page.keyboard.press('ArrowDown');
  const suppress = page.getByRole('radio', { name: /Suppressing Fire/ });
  await expect(suppress).toBeFocused();
  await expect(suppress).toHaveAttribute('aria-checked', 'true');
  await shot(page, 'loadout', 2, 'picked');

  // Lock in: the pick is the map's preset (and the last one), then the briefing.
  await lockIn.click();
  const briefing = page.getByRole('dialog', { name: 'Shift briefing' });
  await expect(briefing).toBeVisible();
  const saved = await page.evaluate(() => globalThis.__sd!.save()!.loadouts);
  const preset = { towers: ['rivet', 'sprinkler'], ability: 'suppressing_fire' };
  expect(saved).toEqual({ last: preset, byMap: { a1_m01: preset } });
  await shot(page, 'loadout', 3, 'briefing');

  // Change loadout: back to the screen, which remembers the pick.
  await briefing.getByRole('button', { name: 'Change loadout' }).click();
  await expect(page.getByRole('heading', { name: 'Loadout' })).toBeVisible();
  await expect(towerCard(page, 'Thumper')).toHaveAttribute('aria-pressed', 'false');
  await expect(towerCard(page, 'Sprinkler')).toHaveAccessibleName(/build slot 2/);
  await expect(suppress).toHaveAttribute('aria-checked', 'true');
  // Esc goes back to the Shift board; Start brings the screen back with the same pick.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Shift board' })).toBeVisible();
  await shiftRow(page, 'Orientation Day').getByRole('button').click();
  await expect(lockIn).toBeFocused();
  await expect(towerCard(page, 'Thumper')).toHaveAttribute('aria-pressed', 'false');
  // Enter locks in (Lock in has the focus), then Enter clocks in.
  await page.keyboard.press('Enter');
  await expect(briefing).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(briefing).toBeHidden();

  // The battle's loadout: Rivet and Sprinkler in build slots 1 and 2, Suppressing Fire in slot 1.
  const build = page.getByRole('navigation', { name: 'Build' });
  await expect(build.getByRole('button')).toHaveCount(2);
  await expect(build.getByRole('button').nth(0)).toHaveAccessibleName(/^Build Rivet/);
  await expect(build.getByRole('button').nth(1)).toHaveAccessibleName(/^Build Sprinkler/);
  // Both ability slots hold Suppressing Fire: the Technician's pick and Bricks's own.
  const abilities = page.getByRole('navigation', { name: 'Abilities' }).getByRole('button');
  await expect(abilities.nth(0)).toHaveAccessibleName(/^Suppressing Fire/);
  await nextFrames(page);
  await shot(page, 'loadout', 4, 'battle');
});

test("loadout: A1M2's counters, and a heads-up when the pick has no answer to Armor", async ({
  page,
}) => {
  await page.goto('/?test=1&seed=1&save=all_unlocked');
  await waitForReady(page);
  await shiftRow(page, 'Hatching Season').getByRole('button').click();
  await expect(page.getByRole('heading', { name: 'Loadout' })).toBeVisible();
  await expect(page.getByText('Needs an answer to')).toBeVisible();
  // Thumper answers Armor from tier 1 (Act I's light armor); Rivet from tier 3.
  await expect(towerCard(page, 'Thumper')).toHaveAccessibleName(/answers Armor(,|$)/);
  await expect(towerCard(page, 'Rivet')).toHaveAccessibleName(/answers Armor T3/);
  await expect(towerCard(page, 'Sprinkler')).not.toHaveAccessibleName(/answers/);
  const warning = page.locator('.sd-lo-warning');
  await expect(warning).toHaveCount(0);
  // Sprinkler alone: a heads-up naming the towers that would answer it, and Lock in still works.
  await towerCard(page, 'Rivet').click();
  await towerCard(page, 'Thumper').click();
  await expect(warning).toHaveText(
    'Heads up: this shift needs an answer to Armor, and nothing here has one. Rivet (T3) or ' +
      'Thumper would.',
  );
  await shot(page, 'loadout', 5, 'heads-up');
  await page.getByRole('button', { name: 'Lock in' }).click();
  await expect(page.getByRole('dialog', { name: 'Shift briefing' })).toBeVisible();
  const saved = await page.evaluate(() => globalThis.__sd!.save()!.loadouts.byMap);
  expect(saved).toEqual({ a1_m02: { towers: ['sprinkler'], ability: 'orbital_strike' } });
});

test('loadout: skipped when the system is locked or there is no choice', async ({ page }) => {
  // A1M1 won: three towers and one ability, the loadout system still locked (it opens after A1M3).
  await page.goto('/?test=1&seed=1&save=after_a1m1');
  await waitForReady(page);
  await shiftRow(page, 'Orientation Day').getByRole('button').click();
  const briefing = page.getByRole('dialog', { name: 'Shift briefing' });
  await expect(briefing).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Loadout' })).toHaveCount(0);
  await expect(briefing.getByRole('button', { name: 'Change loadout' })).toHaveCount(0);
  // Everything owned comes along.
  await page.keyboard.press('Enter');
  const build = page.getByRole('navigation', { name: 'Build' });
  await expect(build.getByRole('button')).toHaveCount(3);
  await shot(page, 'loadout', 6, 'skipped');
});
