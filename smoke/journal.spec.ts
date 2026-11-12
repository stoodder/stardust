// Act III's Field Journal and Inbox (T611), on the real Act III dev saves: the base's tab reads
// "Journal" from A3M1 (an Act II save's still reads "Codex"); the Elder's correction beside its
// original, citing the old survey; Sterling's last sincere memo and its small print; A3M2's
// automated memo and Sterling's profile beside its correction; then, after A3M3, the same Elder
// entry read again: its citation reworded to the Amended Survey, NEW once more, and the Personnel
// Update in the Inbox; and A3M1's gifts (the Den and the Choir). The unlock rules are unit-tested
// (app/inboxAct3.test.ts, story/codexRevision.test.ts); this checks the page. Screenshots in <out>/screens/journal/.
import type { Page } from '@playwright/test';
import { SAVE_VERSION } from '../src/meta/saveData.ts';
import { expect, test } from './fixtures.ts';
import { shot, waitForReady } from './hooks.ts';

/** Opens the base on a dev save. */
async function baseOn(page: Page, save: string): Promise<void> {
  await page.goto(`/?test=1&seed=1&save=${save}`);
  await waitForReady(page);
  await page.evaluate(() => globalThis.__sd!.goto('base'));
  await expect(page.getByRole('heading', { name: 'Base' })).toBeVisible();
}

/**
 * The Elder's entry in the Journal: picked from the list, the original over the correction, each
 * across the reader in at most 5 lines (T900).
 */
async function openElder(page: Page) {
  await page.getByRole('tab', { name: /^Journal/ }).click();
  const pane = page.getByRole('tabpanel');
  await pane.getByRole('button', { name: /^Elder/ }).click();
  const entry = pane.getByRole('article');
  await expect(entry.locator('.sd-codex-pair')).toBeVisible();
  const versions = entry.locator('.sd-codex-version');
  await expect(versions).toHaveCount(2);
  await expect(versions.nth(0)).toContainText('Pest Field Guide');
  await expect(versions.nth(0)).toContainText('Slow, old, and in the way.');
  await expect(versions.nth(1)).toContainText('Field Journal');
  await expect(versions.nth(1)).toContainText('The vocalizations are linguistic.');
  const lines = await versions.evaluateAll((els) =>
    els.map((v) =>
      [...v.querySelectorAll<HTMLElement>('.sd-codex-text')].reduce(
        (n, p) => n + Math.round(p.offsetHeight / parseFloat(getComputedStyle(p).lineHeight)),
        0,
      ),
    ),
  );
  for (const n of lines) expect(n).toBeLessThanOrEqual(5);
  return { pane, versions };
}

test('journal: the tab reads Codex before Act III', async ({ page }) => {
  await baseOn(page, 'after_a2m6');
  await expect(page.getByRole('tab', { name: /^Codex/ })).toBeVisible();
  await expect(page.getByRole('tab', { name: /^Journal/ })).toHaveCount(0);
});

test("journal: A3M1's Field Journal and Sterling's last sincere memo", async ({ page }) => {
  await baseOn(page, 'after_a3m1_spared');
  await expect(page.getByRole('tab', { name: /^Codex/ })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: /^Journal/ })).toBeVisible();

  // The Inbox: Sterling, still exclaiming; the small print one click away.
  await page.getByRole('tab', { name: /^Inbox/ }).click();
  const memo = page.getByRole('tabpanel').getByRole('article');
  await expect(memo).toContainText("We'll Get Through This Together!");
  await expect(memo).toContainText('I fought for that Preserve, Four-Forty-Seven.');
  await memo.getByRole('button', { name: 'Small print' }).click();
  await expect(memo.getByText('Preserve buffer: depleted.')).toBeVisible();
  await shot(page, 'journal', 1, 'memo-a3-01');

  // The Elder, corrected beside the original, the old survey still cited.
  const { pane, versions } = await openElder(page);
  await expect(versions.nth(1)).toContainText('(Survey 2346, Okonkwo.)');
  await expect(versions.nth(1)).not.toContainText('Amended');
  await shot(page, 'journal', 2, 'elder-a3m1');

  // The Leaving Song (no picture: "Six notes"), and Old Thrum (spared) over her portrait.
  await pane.getByRole('button', { name: /^The Leaving Song/ }).click();
  const entry = pane.getByRole('article');
  await expect(entry.locator('.sd-codex-pending')).toHaveText('Six notes');
  await expect(entry).toContainText("The Aelari render it 'the Singers.'");
  await shot(page, 'journal', 3, 'leaving-song');
  await pane.getByRole('button', { name: /^Old Thrum/ }).click();
  await expect(entry.locator('img.sd-codex-sprite')).toBeVisible();
  await expect(pane.getByRole('button', { name: /^The Small Ones' Walk/ })).toHaveCount(0);
  await shot(page, 'journal', 4, 'old-thrum');

  // A3M1's gifts (T769, T872): the Scuttle Den corrected beside its Nest Mound, the Hum Choir
  // under QUILL's note and Ves'thara's margin (the Stasis Bloom, attuned before A3M5, is
  // journalA3Two's).
  await pane.getByRole('button', { name: /^Scuttle Den/ }).click();
  await expect(entry).toContainText('A warren home.');
  await expect(entry).toContainText('Nest Mound.');
  await shot(page, 'journal', 12, 'scuttle-den');
  await pane.getByRole('button', { name: /^Hum Choir/ }).click();
  await expect(entry).toContainText('They sing so that no one walks alone');
  await shot(page, 'journal', 13, 'hum-choir');
});

test("journal: A3M2's automated memo and Sterling corrected", async ({ page }) => {
  await baseOn(page, 'after_a3m2_rivet');
  await page.getByRole('tab', { name: /^Inbox/ }).click();
  const memo = page.getByRole('tabpanel').getByRole('article');
  await expect(memo).toContainText('Your Access Has Been Updated');
  await expect(memo).toContainText('Everglow Automated Systems');
  await expect(memo).toContainText('Replies to this address are not monitored.');
  await expect(memo).not.toContainText('Stay Everglow');
  await shot(page, 'journal', 5, 'memo-a3-02');

  await page.getByRole('tab', { name: /^Journal/ }).click();
  const pane = page.getByRole('tabpanel');
  await pane.getByRole('button', { name: /^Director Joy Sterling/ }).click();
  const versions = pane.getByRole('article').locator('.sd-codex-version');
  await expect(versions).toHaveCount(2);
  await expect(versions.nth(0)).toContainText('and she loves it here!');
  await expect(versions.nth(1)).toContainText('It was not personal. That was the point.');
  await shot(page, 'journal', 6, 'sterling');
  await pane.getByRole('button', { name: /^The Buffer Protocol/ }).click();
  await expect(pane.getByRole('article')).toContainText('The Preserve was the buffer.');
  await shot(page, 'journal', 7, 'buffer-protocol');
});

test("journal: after A3M3 the Elder's citation is the Amended Survey's, NEW again", async ({
  page,
}) => {
  // The A3M3 save with the Elder's correction read at A3M1, filed in slot 1 and continued, so the
  // base's catch-up runs on it. The dev save skips A3M3 until its map is registered (T622).
  await page.goto('/?test=1&seed=1&save=after_a3m3_convoy');
  await waitForReady(page);
  const wonA3M3 = await page.evaluate(() => {
    const maps: Partial<Record<string, { completed: boolean }>> =
      globalThis.__sd!.save()!.campaign.maps;
    return maps['a3_m03']?.completed === true;
  });
  test.skip(!wonA3M3, "A3M3's map isn't registered yet, so the dev save hasn't won it");
  await page.evaluate((v) => {
    const data = globalThis.__sd!.save()!;
    const read = ['codex_elder__original', 'codex_elder__corrected'];
    data.story.seen = [...data.story.seen.filter((s) => !read.includes(s)), ...read];
    localStorage.setItem('stardust:slot:1', JSON.stringify({ v, savedAt: 1793100000000, data }));
    localStorage.setItem('stardust:lastSlot', '1');
  }, SAVE_VERSION);
  await page.goto('/?test=1&seed=1');
  await waitForReady(page);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Base' }).click();
  await expect(page.getByRole('heading', { name: 'Base' })).toBeVisible();

  // The Inbox opens on the Personnel Update: one line, no sign-off.
  const memo = page.getByRole('tabpanel').getByRole('article');
  await expect(memo).toContainText('Personnel Update');
  await expect(memo).toContainText(
    'Employee #ED-112 (Okonkwo, I.): Unscheduled Departure. Pension: Restructured.',
  );
  await shot(page, 'journal', 8, 'memo-a3-03');

  // The Elder: NEW again, its correction now citing the Amended Survey; reading it clears NEW.
  const journal = page.getByRole('tab', { name: /^Journal/ });
  await expect(journal).toContainText('NEW');
  await journal.click();
  const elder = page.getByRole('tabpanel').getByRole('button', { name: /^Elder/ });
  await expect(elder).toHaveAttribute('aria-label', 'Elder, new');
  const { pane, versions } = await openElder(page);
  await expect(versions.nth(1)).toContainText(
    "(Amended Survey 2346, Okonkwo: 'Correction: they were singing.')",
  );
  await expect(elder).toHaveAttribute('aria-label', 'Elder');
  const seen = await page.evaluate(() => globalThis.__sd!.save()!.story.seen);
  expect(seen).toContain('codex_elder__corrected__revised');
  await shot(page, 'journal', 9, 'elder-a3m3');

  // The Gap and the Amended Survey.
  await pane.getByRole('button', { name: /^Okonkwo's Gap/ }).click();
  await expect(pane.getByRole('article').locator('.sd-codex-pending')).toHaveText('Sealed');
  await shot(page, 'journal', 10, 'okonkwos-gap');
  await pane.getByRole('button', { name: /^The Amended Survey/ }).click();
  await expect(pane.getByRole('article')).toContainText('He filed it anyway.');
  await shot(page, 'journal', 11, 'amended-survey');
});
