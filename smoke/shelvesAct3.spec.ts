// Act III's shelves (T609; design/progression.md §§ 4.2, 7.1, 7.2): the base from the Act III dev
// saves. After A3M1 the Stasis Bloom's Xenotech row is live (3 Intel, Ves'thara's line) and
// attuning it stocks its tune-up at Zibzab's; Engineering sells the Skitterkin specs at 3 Intel
// once each gift is given. A gift's rows wait for the gift: no Scuttle Den row before A3M1's
// briefing, and no Hum Choir row on a run that cleared the Quiet Wave (the Choir comes in A3M4).
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

test('shelves: after A3M1 (cleared), attune the Stasis Bloom; no Hum Choir row yet', async ({
  page,
}) => {
  await openBase(page, 'after_a3m1_cleared');
  await openTab(page, /^Xenotech/);
  const bloom = offerRow(page, 'Stasis Bloom');
  await expect(bloom).toContainText('3 Intel');
  await expect(bloom).toContainText('Adds the Stasis Bloom to your turrets: Hard control');
  await expect(bloom).toContainText('A garden of still glass.');
  await expect(offerRow(page, "Seer's Lantern")).toContainText('Bring it when they do.');
  await bloom.scrollIntoViewIfNeeded();
  await shot(page, 'shelvesAct3', 1, 'xenotech-bloom-live');

  const intel = await page.evaluate(() => globalThis.__sd!.save()!.currencies.intel);
  await bloom.getByRole('button', { name: /^Attune Stasis Bloom, 3 Intel/ }).click();
  await expect(bloom.locator('.sd-offer-owned')).toHaveText('Owned');
  const saved = await page.evaluate(() => globalThis.__sd!.save()!);
  expect(saved.currencies.intel).toBe(intel - 3);
  expect(saved.unlocks.towers).toContain('bloom');

  // Zibzab tunes it (she takes no stardust): rank 1 is its field's strength.
  await openTab(page, /^Shop$/);
  const tune = offerRow(page, 'Stasis Bloom Tune-up');
  await expect(tune).toContainText('Price first: 40 stardust, rising.');
  await expect(tune).toContainText('+5% Stasis Bloom field strength');
  await expect(offerRow(page, 'Scuttle Den Tune-up')).toContainText('They tip in moss.');
  // The Quiet Wave was cleared: the Choir isn't given, so no shelf names it.
  await expect(page.getByRole('tabpanel')).not.toContainText('Hum Choir');
  await tune.scrollIntoViewIfNeeded();
  await shot(page, 'shelvesAct3', 2, 'shop-act3-tuneups');

  await openTab(page, /^Engineering$/);
  await expect(offerRow(page, 'Scuttle Den specializations')).toContainText(
    'Unlocks tier 4: Big Family or Brave Hearts',
  );
  await expect(offerRow(page, 'Stasis Bloom specializations')).toContainText('3 Intel');
  await expect(page.getByRole('tabpanel')).not.toContainText('Hum Choir');
});

test('shelves: after A3M1 (spared), the Hum Choir is on the shelves; none before', async ({
  page,
}) => {
  await openBase(page, 'after_a3m1_spared');
  await openTab(page, /^Engineering$/);
  const choir = offerRow(page, 'Hum Choir specializations');
  await expect(choir).toContainText('Unlocks tier 4: Lullaby or Rally Chorus');
  await expect(choir).toContainText('3 Intel');
  await expect(offerRow(page, 'Scuttle Den specializations')).toContainText('3 Intel');
  await choir.scrollIntoViewIfNeeded();
  await shot(page, 'shelvesAct3', 3, 'engineering-skitterkin');

  await openTab(page, /^Shop$/);
  const tune = offerRow(page, 'Hum Choir Tune-up');
  await expect(tune).toContainText('I tuned the song. They tuned it back.');
  await expect(tune).toContainText('+5% Hum Choir aura strength');
  await tune.scrollIntoViewIfNeeded();
  await shot(page, 'shelvesAct3', 4, 'shop-choir');

  // Before A3M1's briefing gives the Den, no shelf names it; the Bloom waits, greyed.
  await openBase(page, 'after_a2m6');
  for (const tab of [/^Shop$/, /^Engineering$/]) {
    await openTab(page, tab);
    await expect(page.getByRole('tabpanel')).not.toContainText('Scuttle Den');
  }
  await openTab(page, /^Xenotech/);
  const bloom = offerRow(page, 'Stasis Bloom');
  await expect(bloom).toContainText('Arrives after');
  await bloom.scrollIntoViewIfNeeded();
  await shot(page, 'shelvesAct3', 5, 'xenotech-bloom-greyed');
});
