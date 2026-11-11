// Bramble's Rapport (T609b; design/progression.md § 7.3): Research sells it after A3M1 (Underfoot
// first plays there), 2 Intel for −15% Underfoot cooldown, in QUILL's voice. Before A3M1 no row
// names her (`hideUntilStocked`): she is still the Act I boss.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { shot, waitForReady } from './hooks.ts';

const offerRow = (page: Page, name: string) =>
  page.locator('.sd-offer').filter({ has: page.locator('.sd-offer-name', { hasText: name }) });

async function openResearch(page: Page, save: string): Promise<void> {
  await page.goto(`/?test=1&fasttext=1&save=${save}`);
  await waitForReady(page);
  await page.getByRole('button', { name: 'Base' }).click();
  await expect(page.getByRole('heading', { name: 'Base', exact: true })).toBeVisible();
  const tab = page.getByRole('tab', { name: 'Research' });
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}

test("rapport: Bramble's Rapport is on Research after A3M1, and none before", async ({ page }) => {
  await openResearch(page, 'after_a2m6');
  await expect(page.getByRole('tabpanel')).toContainText("Rapport: Ves'thara");
  await expect(page.getByRole('tabpanel')).not.toContainText('Bramble');

  await openResearch(page, 'after_a3m1_cleared');
  const row = offerRow(page, 'Rapport: Bramble');
  await expect(row).toContainText('−15% Underfoot cooldown');
  await expect(row).toContainText('2 Intel');
  await expect(row).toContainText('Underfoot recharges 15% faster.');
  await expect(row).toContainText('She says rapport is earned.');
  await row.scrollIntoViewIfNeeded();
  await shot(page, 'rapportBramble', 1, 'research-bramble');

  const intel = await page.evaluate(() => globalThis.__sd!.save()!.currencies.intel);
  await row.getByRole('button', { name: /^Order Rapport: Bramble, 2 Intel/ }).click();
  await expect(row).toContainText('Owned');
  const saved = await page.evaluate(() => globalThis.__sd!.save()!);
  expect(saved.upgrades['rapport_bramble']).toBe(1);
  expect(saved.currencies.intel).toBe(intel - 2);
  await shot(page, 'rapportBramble', 2, 'research-bramble-owned');
});
