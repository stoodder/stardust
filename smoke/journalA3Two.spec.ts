// Act III part two's Field Journal and Inbox (T711), on the real dev saves: after A3M4 the Inbox
// opens on the plant's automated memo (no sign-off, its small print one click away) and the
// Journal holds the Silencer, the pension form (Form P-19, no picture), the warren's Gloop Spitter
// and Gerald's correction beside his Pest Field Guide entry; after A3M5, Dome Row's notice with the
// plant offline in its small print, Kip's ledger, and the Stasis Bloom's entry. The delivery rules are unit-tested
// (app/journalAct3Two.test.ts); this checks the page. Screenshots in <out>/screens/journal-a3-two/.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { shot, waitForReady } from './hooks.ts';

/** Opens the base on a dev save. */
async function baseOn(page: Page, save: string): Promise<void> {
  await page.goto(`/?test=1&seed=1&save=${save}`);
  await waitForReady(page);
  await page.evaluate(() => globalThis.__sd!.goto('base'));
  await expect(page.getByRole('heading', { name: 'Base' })).toBeVisible();
}

/** Whether the loaded dev save has won `map` (a dev save skips a map not registered yet). */
async function hasWon(page: Page, map: string): Promise<boolean> {
  return page.evaluate((id) => {
    const maps: Partial<Record<string, { completed: boolean }>> =
      globalThis.__sd!.save()!.campaign.maps;
    return maps[id]?.completed === true;
  }, map);
}

test('journal part two: after A3M4, the plant memo, the Silencer, Form P-19, Gerald corrected', async ({
  page,
}) => {
  await baseOn(page, 'after_a3m4_keep_warren');
  test.skip(!(await hasWon(page, 'a3_m04')), "A3M4 isn't registered yet");

  // The Inbox: the machine, about the plant; no sign-off; the small print one click away.
  await page.getByRole('tab', { name: /^Inbox/ }).click();
  const memo = page.getByRole('tabpanel').getByRole('article');
  await expect(memo).toContainText('Facility Status: Reclamation Facility 2 at 140% Throughput');
  await expect(memo).toContainText('Everglow Automated Systems');
  await expect(memo).toContainText('Output is allocated to the Everglow Ascendant.');
  await expect(memo).not.toContainText('Stay Everglow');
  await memo.getByRole('button', { name: 'Small print' }).click();
  await expect(memo.getByText('No copies are made.')).toBeVisible();
  await shot(page, 'journal-a3-two', 1, 'memo-a3-04');

  // The Journal: the Silencer, by its icon.
  await page.getByRole('tab', { name: /^Journal/ }).click();
  const pane = page.getByRole('tabpanel');
  await pane.getByRole('button', { name: /^Silencer/ }).click();
  const entry = pane.getByRole('article');
  await expect(entry).toContainText('It goes for the song first.');
  await shot(page, 'journal-a3-two', 2, 'silencer');

  // Form P-19: no picture, its photo frame names it.
  await pane.getByRole('button', { name: /^Form P-19/ }).click();
  await expect(entry.locator('.sd-codex-pending')).toHaveText('Form P-19');
  await expect(entry).toContainText("Beneficiary: 'Pebble, c/o the Deep Halls.'");
  await shot(page, 'journal-a3-two', 3, 'pension-form');

  // The warren's Gloop Spitter, owned since the briefing.
  await pane.getByRole('button', { name: /^Gloop Spitter/ }).click();
  await expect(entry).toContainText('filed this shape as a Chonk');

  // Gerald: the Pest Field Guide's entry beside the Journal's correction.
  await pane.getByRole('button', { name: /^Gerald/ }).click();
  const versions = entry.locator('.sd-codex-version');
  await expect(versions).toHaveCount(2);
  await expect(versions.nth(0)).toContainText('Gerald is the mail.');
  await expect(versions.nth(1)).toContainText(
    'Route older than the perimeter. Delivered everything he was given.',
  );
  await shot(page, 'journal-a3-two', 4, 'gerald');
});

test("journal part two: after A3M5, Dome Row's notice and Kip's ledger", async ({ page }) => {
  await baseOn(page, 'after_a3m5_keep');
  test.skip(!(await hasWon(page, 'a3_m05')), "A3M5 isn't registered yet");

  await page.getByRole('tab', { name: /^Inbox/ }).click();
  const memo = page.getByRole('tabpanel').getByRole('article');
  await expect(memo).toContainText('Asset Recovery Scheduled: Dome Row');
  await expect(memo).toContainText('Occupants must vacate before recovery begins.');
  await memo.getByRole('button', { name: 'Small print' }).click();
  await expect(memo.getByText('Reclamation Lead: position vacant.')).toBeVisible();
  await shot(page, 'journal-a3-two', 5, 'memo-a3-05');

  await page.getByRole('tab', { name: /^Journal/ }).click();
  const pane = page.getByRole('tabpanel');
  await pane.getByRole('button', { name: /^Kip's Ledger/ }).click();
  const entry = pane.getByRole('article');
  await expect(entry.locator('.sd-codex-pending')).toHaveText('R2-0001');
  await expect(entry).toContainText('He gave it away before he could get scared again.');
  await shot(page, 'journal-a3-two', 6, 'kips-ledger');
  await pane.getByRole('button', { name: /^"Shareholder Value"/ }).click();
  await expect(entry).toContainText('Director Sterling says it is just a name.');
  await shot(page, 'journal-a3-two', 7, 'shareholder-value');
  // The Stasis Bloom, attuned before A3M5 (T769, T872): Ves'thara's margin under the record.
  await pane.getByRole('button', { name: /^Stasis Bloom/ }).click();
  await expect(entry).toContainText('The Concord allows that much.');
  await shot(page, 'journal-a3-two', 8, 'stasis-bloom');
});
