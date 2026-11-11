// Act III part two's shelves (T709; design/progression.md §§ 4.2, 7.3; towers.md § 9). The
// jailbreak's Firmware row carries Zibzab's line (price first: 300 under the warren, "already paid"
// under the convoy) and the class it brings back, drawn jailbroken. Zibzab's Rapport is on
// Research once A1M4 is won (Clearance Sale 4 → 3 waves), never before. Under C4 Purge, QUILL's
// Rapport is off the shelf ("No longer stocked": Time Dilation is gone), as the uplink's Mk II is
// after A3M2; Keep leaves it for sale. The Gloop's and Sproing's tune-ups and specs are on the
// shelves once both are given. Screenshots in <out>/screens/shelvesAct3Two/.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { shot, waitForReady } from './hooks.ts';

const offerRow = (page: Page, name: string) =>
  page.locator('.sd-offer').filter({ has: page.locator('.sd-offer-name', { hasText: name }) });

async function openBase(page: Page, save: string): Promise<void> {
  await page.goto(`/?test=1&fasttext=1&save=${save}`);
  await waitForReady(page);
  await page.getByRole('button', { name: 'Base' }).click();
  await expect(page.getByRole('heading', { name: 'Base', exact: true })).toBeVisible();
}

async function openTab(page: Page, name: RegExp): Promise<void> {
  const tab = page.getByRole('tab', { name });
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}

for (const [door, line] of [
  ['warren', 'Price first: 300 stardust. Yes, now. Yes, even now. Especially now. Demand is up.'],
  ['convoy', "Price first: already paid. Goldie's engineers did the work."],
] as const) {
  test(`shelves: the jailbreak row under the ${door}, with Zibzab's line and jailbroken art`, async ({
    page,
  }) => {
    await openBase(page, `after_a3m3_${door}`);
    await openTab(page, /^Shop/);
    const row = page.getByRole('region', { name: 'Firmware' }).locator('.sd-offer');
    await expect(row).toHaveCount(1);
    await expect(row.locator('.sd-offer-copy')).toContainText(line);
    await expect(row.locator('.sd-offer-copy')).not.toContainText(/free/i);
    // The class it brings back (the reference's Rivet), drawn jailbroken: a baked icon, not a gap.
    const art = row.getByTestId('jailbreak-art');
    await expect(art.locator('img')).toHaveCount(1);
    await expect(art.locator('.icon-missing')).toHaveCount(0);
    await shot(page, 'shelvesAct3Two', door === 'warren' ? 1 : 2, `jailbreak-${door}`);
  });
}

test("shelves: Zibzab's Rapport on Research after A1M4, none before", async ({ page }) => {
  await openBase(page, 'after_a1m3');
  await openTab(page, /^Research/);
  await expect(page.getByRole('tabpanel')).toContainText('Rapport: QUILL');
  await expect(page.getByRole('tabpanel')).not.toContainText('Rapport: Zibzab');

  await openBase(page, 'after_a1m4');
  await openTab(page, /^Research/);
  const row = offerRow(page, 'Rapport: Zibzab');
  await expect(row).toContainText('Clearance Sale cooldown 4 → 3 waves');
  await expect(row).toContainText('2 Intel');
  await expect(row).toContainText('Clearance Sale recharges in 3 waves, not 4.');
  await row.scrollIntoViewIfNeeded();
  await shot(page, 'shelvesAct3Two', 3, 'rapport-zibzab');

  const intel = await page.evaluate(() => globalThis.__sd!.save()!.currencies.intel);
  await row.getByRole('button', { name: /^Order Rapport: Zibzab, 2 Intel/ }).click();
  await expect(row.locator('.sd-offer-owned')).toHaveText('Owned');
  const saved = await page.evaluate(() => globalThis.__sd!.save()!);
  expect(saved.upgrades['rapport_zibzab']).toBe(1);
  expect(saved.currencies.intel).toBe(intel - 2);
});

test("shelves: under Purge, QUILL's Rapport is off the shelf; under Keep it's for sale", async ({
  page,
}) => {
  await openBase(page, 'after_a3m4_purge');
  await openTab(page, /^Research/);
  const quill = offerRow(page, 'Rapport: QUILL');
  await expect(quill.getByTestId('retired')).toHaveText('No longer stocked');
  await expect(quill.getByRole('button')).toHaveCount(0);
  // The uplink was revoked in A3M2: Mk II reads the same.
  const mk2 = offerRow(page, 'Orbital Strike Mk II');
  await expect(mk2.getByTestId('retired')).toHaveText('No longer stocked');
  await quill.scrollIntoViewIfNeeded();
  await shot(page, 'shelvesAct3Two', 4, 'purge-rapport');

  await openBase(page, 'after_a3m4_keep');
  await openTab(page, /^Research/);
  const kept = offerRow(page, 'Rapport: QUILL');
  await expect(kept.getByTestId('retired')).toHaveCount(0);
  await expect(kept.getByRole('button', { name: /^Order Rapport: QUILL, 2 Intel/ })).toBeVisible();
});

test("shelves: the Gloop's and Sproing's tune-ups and specs once both are given", async ({
  page,
}) => {
  await openBase(page, 'after_a3m6');
  await openTab(page, /^Shop/);
  const gloop = offerRow(page, 'Gloop Spitter Tune-up');
  await expect(gloop).toContainText('+5% Gloop Spitter damage');
  await expect(gloop).toContainText('It drools. Not on me.');
  const sproing = offerRow(page, 'Sproing Pad Tune-up');
  await expect(sproing).toContainText('+5% Sproing Pad damage');
  await expect(sproing).toContainText('It bonked me. Twice.');
  await sproing.scrollIntoViewIfNeeded();
  await shot(page, 'shelvesAct3Two', 5, 'tuneups-gloop-sproing');

  await openTab(page, /^Engineering$/);
  await expect(offerRow(page, 'Gloop Spitter specializations')).toContainText('3 Intel');
  await expect(offerRow(page, 'Sproing Pad specializations')).toContainText('3 Intel');
});
