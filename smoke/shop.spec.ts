// The base's shelves (T204d): Research Command after A1M1, a purchase that persists and reaches the
// battle, a refusal that explains itself, and the shop and Engineering on `all_unlocked`. Driven
// through the real UI by keyboard where a player would use it. Screenshots in
// test-results/screens/shop/.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { shot, waitForReady } from './hooks.ts';

const offerRow = (page: Page, name: string) =>
  page.getByRole('tabpanel').getByRole('listitem').filter({ hasText: name });

test('shop: after A1M1, order Mk II with 2 of 3 Intel; the strike radius is 2.0 in A1M1', async ({
  page,
}) => {
  await page.goto('/?test=1&seed=1&save=after_a1m1');
  await waitForReady(page);
  await page.getByRole('button', { name: 'Base' }).click();
  await expect(page.getByRole('tab', { name: 'Research' })).toHaveAttribute('aria-selected', 'true');
  const pane = page.getByRole('tabpanel');
  await expect(pane).toContainText('Research Command · QUILL');

  // Research offers Mk II and Rapport (2 Intel each); the protocol slot waits for A1M3.
  const mk2 = offerRow(page, 'Orbital Strike Mk II');
  const rapport = offerRow(page, 'Rapport: Sgt. Bricks');
  await expect(mk2).toContainText('+0.5 Orbital Strike radius');
  await expect(mk2).toContainText('2 Intel');
  await expect(rapport).toContainText('−15% Suppressing Fire cooldown');
  await expect(offerRow(page, 'Field Protocol Slot')).toContainText(
    'Arrives after Special Delivery',
  );
  await expect(offerRow(page, 'Field Protocol Slot').getByRole('button')).toHaveCount(0);
  await expect(mk2.getByRole('img', { name: 'Rank 0 of 1' })).toBeVisible();
  await shot(page, 'shop', 1, 'rnd-after-a1m1');

  // Keyboard: Tab from the Research tab reaches Mk II's button; Enter orders it.
  await expect(page.getByRole('tab', { name: 'Research' })).toBeFocused();
  const order = mk2.getByRole('button', { name: /^Order Orbital Strike Mk II, 2 Intel/ });
  await page.keyboard.press('Tab');
  await expect(order).toBeFocused();
  await page.keyboard.press('Enter');

  // The purchase shows at once: rank 1 of 1, Owned, 1 Intel left, and QUILL's thanks.
  await expect(mk2).toContainText('Owned');
  await expect(mk2.getByRole('img', { name: 'Rank 1 of 1' })).toBeVisible();
  await expect(page.getByTestId('store-line')).toContainText('QUILL:');
  await expect(page.locator('.sd-banks div').filter({ hasText: 'Intel' })).toHaveText('Intel1');
  // ...and persists in the save.
  const saved = await page.evaluate(() => globalThis.__sd!.save());
  expect(saved?.upgrades.orbital_strike_mk2).toBe(1);
  expect(saved?.currencies.intel).toBe(1);
  await shot(page, 'shop', 2, 'rnd-bought-mk2');

  // Rapport is now 1 Intel short: its button says so and explains itself, and buys nothing.
  const short = rapport.getByRole('button', { name: /not enough/ });
  await expect(short).toHaveAttribute('aria-disabled', 'true');
  // (Playwright won't click an aria-disabled button, so press it from the keyboard.)
  await short.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('store-line')).toContainText('You have 1');
  expect(await page.evaluate(() => globalThis.__sd!.save()?.upgrades)).toEqual({
    orbital_strike_mk2: 1,
  });
  await shot(page, 'shop', 3, 'rnd-short');

  // Esc goes back to the Shift board; replay A1M1, where the strike's radius is 2.0.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Shift board' })).toBeVisible();
  await page.getByRole('button', { name: 'Replay Orientation Day' }).click();
  await page.waitForFunction(() => (globalThis.__sd?.state()?.tick ?? -1) >= 0);
  await page.getByRole('button', { name: 'Clock in' }).click();
  const strike = page.getByRole('button', { name: /^Orbital Strike/ });
  await expect(strike).toHaveAttribute('title', /in a 2-tile radius/);
  await shot(page, 'shop', 4, 'a1m1-mk2-radius');
});

test('shop: all_unlocked shows the shop and Engineering, owned in full', async ({ page }) => {
  await page.goto('/?test=1&save=all_unlocked');
  await waitForReady(page);
  await page.getByRole('button', { name: 'Base' }).click();
  const pane = page.getByRole('tabpanel');

  await page.getByRole('tab', { name: 'Shop', exact: true }).click();
  await expect(pane).toContainText("Zibzab's Genuine Pre-Owned Defensive Solutions");
  await Promise.all(
    ['Global upgrades', 'Tune-ups', 'Field Protocols'].map((group) =>
      expect(pane.getByRole('heading', { name: group })).toBeVisible(),
    ),
  );
  const core = offerRow(page, 'Reinforced Core');
  await expect(core).toContainText('Rank 3: +1 core integrity');
  await expect(core).toContainText('Owned');
  await expect(core.getByRole('img', { name: 'Rank 3 of 3' })).toBeVisible();
  await expect(core).toContainText('Price first: 120 stardust');
  await expect(offerRow(page, 'Head Start')).toContainText('+10% starting credits');
  await shot(page, 'shop', 5, 'shop-all-unlocked');
  // The list scrolls; the last protocol is reachable.
  await offerRow(page, 'Ready Room').scrollIntoViewIfNeeded();
  await expect(offerRow(page, 'Ready Room')).toBeInViewport();
  await shot(page, 'shop', 6, 'shop-scrolled');

  await page.getByRole('tab', { name: 'Engineering', exact: true }).click();
  await expect(pane).toContainText('Engineering · QUILL');
  await expect(offerRow(page, 'Rivet specializations')).toContainText(
    'Unlocks tier 4: Rivet Storm or Railspike',
  );
  await expect(offerRow(page, 'Thumper specializations')).toContainText('Owned');
  await shot(page, 'shop', 7, 'engineering-all-unlocked');
});
