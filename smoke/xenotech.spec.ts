// Xenotech (T509; design/progression.md § 7.2): Ves'thara's shelf in the base, after A2M5. The
// `after_a2m5` dev save (the Prism Spire given, 5 Intel) opens the Base, finds the Xenotech tab,
// attunes the Mindspike Obelisk for 3 Intel, and finds it in the loadout's pool on a replay of
// The Long Walk; the Lantern then waits on the bank. Before A2M5 the tab isn't there at all, and
// `all_unlocked` shows the gift as given and both attunements owned.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { playShift, shot, waitForReady } from './hooks.ts';

const offerRow = (page: Page, name: string) =>
  page.locator('.sd-offer').filter({ has: page.locator('.sd-offer-name', { hasText: name }) });

async function openBase(page: Page, save: string): Promise<void> {
  await page.goto(`/?test=1&fasttext=1&save=${save}`);
  await waitForReady(page);
  await page.getByRole('button', { name: 'Base' }).click();
  await expect(page.getByRole('heading', { name: 'Base', exact: true })).toBeVisible();
}

test('xenotech: after A2M5, attune the Mindspike, and it joins the loadout', async ({ page }) => {
  await openBase(page, 'after_a2m5');
  // Its first visit: a NEW tag until then (T566), gone once the tab is open.
  const tab = page.getByRole('tab', { name: /^Xenotech/ });
  await expect(tab).toHaveAccessibleName('Xenotech (new)');
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  await expect(tab).toHaveAccessibleName('Xenotech');
  const pane = page.getByRole('tabpanel');
  await expect(pane).toContainText("Xenotech · Ves'thara");
  await expect(pane).toContainText('I take no stardust.');

  const prism = offerRow(page, 'Prism Spire');
  await expect(prism).toContainText('Given: Prism Spire');
  await expect(prism.locator('.sd-offer-owned')).toHaveText('Given');
  const mindspike = offerRow(page, 'Mindspike Obelisk');
  const lantern = offerRow(page, "Seer's Lantern");
  await expect(mindspike).toContainText('3 Intel');
  await expect(lantern).toContainText('3 Intel');
  await shot(page, 'xenotech', 1, 'shelf-after-a2m5');

  const intel = await page.evaluate(() => globalThis.__sd!.save()!.currencies.intel);
  await mindspike.getByRole('button', { name: /^Attune Mindspike Obelisk, 3 Intel/ }).click();
  await expect(mindspike.locator('.sd-offer-owned')).toHaveText('Owned');
  await expect(page.getByTestId('store-line')).toContainText("Ves'thara:");
  const saved = await page.evaluate(() => globalThis.__sd!.save()!);
  expect(saved.currencies.intel).toBe(intel - 3);
  expect(saved.unlocks.towers).toContain('mindspike');
  // 2 Intel left: the Lantern's button explains itself rather than buying.
  await lantern.getByRole('button', { name: /not enough/ }).click({ force: true });
  await expect(page.getByTestId('store-line')).toContainText('It asks 3 Intel. You hold 2.');
  await shot(page, 'xenotech', 2, 'attuned-mindspike');

  // Zibzab now stocks the Mindspike's tune-up (the Aelari tune-ups are his: she takes no stardust).
  await page.getByRole('tab', { name: 'Shop', exact: true }).click();
  await expect(offerRow(page, 'Mindspike Tune-up')).toContainText('Price first: 40 stardust');

  // The loadout's pool has it.
  await page.getByRole('button', { name: 'Sector map' }).click();
  await playShift(page, 'The Long Walk');
  await expect(page.getByRole('heading', { name: 'Loadout' })).toBeVisible();
  const card = page.getByRole('button', { name: /^Mindspike Obelisk,/ });
  await expect(card).toBeVisible();
  await card.scrollIntoViewIfNeeded();
  await shot(page, 'xenotech', 3, 'loadout-mindspike');
});

test('xenotech: no tab before A2M5; all_unlocked shows it owned in full', async ({ page }) => {
  await openBase(page, 'after_a2m4_returned');
  await expect(page.getByRole('tab', { name: 'Engineering', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: /^Xenotech/ })).toHaveCount(0);
  // Nor does any other shelf name an Aelari tower early.
  await page.getByRole('tab', { name: 'Shop', exact: true }).click();
  await expect(page.getByRole('tabpanel')).not.toContainText('Prism');

  await openBase(page, 'all_unlocked');
  await page.getByRole('tab', { name: /^Xenotech/ }).click();
  await expect(offerRow(page, 'Prism Spire').locator('.sd-offer-owned')).toHaveText('Given');
  await Promise.all(
    ['Mindspike Obelisk', "Seer's Lantern"].map((name) =>
      expect(offerRow(page, name).locator('.sd-offer-owned')).toHaveText('Owned'),
    ),
  );
  await shot(page, 'xenotech', 4, 'all-unlocked');
});
