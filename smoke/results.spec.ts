// Run end and rewards on the results card (T204c; meta-runtime.md § Run end): new game → A1M1 by
// autoplay('par') → Results shows the medals (new ones tagged), the payroll, and the career total →
// Continue → the Shift board's banks hold what the save banked → Replay A1M1 and lose: a defeat on
// a cleared shift pays no stipend, and the career total still grows → Retry and win: overtime, and
// medals already on file pay no Intel again. Screenshots in
// test-results/screens/results/.
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

const save = (page: Page) => page.evaluate(() => globalThis.__sd!.save());

test('results: A1M1 par pays medals and payroll; the Shift board banks it; a lost replay pays 0', async ({
  page,
}) => {
  await page.goto('/?test=1&seed=1');
  await waitForReady(page);
  await page.getByRole('button', { name: 'Start shift' }).click();
  await expect(page.getByRole('dialog', { name: 'Shift briefing' })).toBeVisible();

  // The win: the payroll lists every medal the map offers, this run's lit and tagged new.
  await page.evaluate(() => globalThis.__sd!.autoplay('par'));
  expect(await playOut(page)).toBe('won');
  const card = page.getByRole('dialog', { name: 'PERIMETER SECURED!' });
  await expect(card).toBeVisible();
  const won = await save(page);
  const record = won?.campaign.maps.a1_m01;
  expect(record?.completed).toBe(true);
  expect(record?.medals).toContain('victory');
  expect(won?.stats.runs).toBe(1);
  const pests = won?.stats.pestsProcessed ?? 0;
  expect(pests).toBeGreaterThan(0);
  // Intel is one per medal earned for the first time (progression.md § 3).
  expect(won?.currencies.intel).toBe(record?.medals.length);

  const medals = card.getByRole('list', { name: 'Medals' }).getByRole('listitem');
  await expect(medals.first()).toHaveAccessibleName('Victory: new!');
  await expect(medals.nth(1)).toHaveAccessibleName(/^Perfect Core: /);
  await expect(card.getByRole('list', { name: 'Medals' })).toContainText('NEW!');
  const payroll = card.getByRole('region', { name: 'Payroll' });
  // A1M1 pays no Stardust (act1.md: "Stardust 0"), and says so in Everglow's voice.
  await expect(payroll).toContainText('Shift bonus · Training shifts are unpaid!');
  await expect(payroll).toContainText('+0 Stardust');
  await expect(payroll).toContainText('+1 Intel');
  await expect(card).toContainText(`Career total: ${pests.toLocaleString('en-US')}`);
  // The debrief and the 1.5 s hold are unchanged; the card still fits the screen.
  await expect(card).toContainText('Not bad, Sprout.');
  const box = await card.boundingBox();
  expect(box !== null && box.y >= 0 && box.y + box.height <= 720).toBe(true);
  await shot(page, 'results', 1, 'win-first-clear');

  // Continue → the base; its Shift board button → the banks show the save's currencies.
  await card.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Shift board' }).click();
  await expect(page.getByRole('heading', { name: 'Shift board' })).toBeVisible();
  const bank = (name: string) =>
    page.locator('.sd-banks div').filter({ hasText: name }).locator('dd');
  await expect(bank('Stardust')).toHaveText(String(won?.currencies.stardust));
  await expect(bank('Intel')).toHaveText(String(won?.currencies.intel));
  await shot(page, 'results', 2, 'shift-board-banks');

  // Replay and lose: a defeat on a cleared shift pays no stipend (D006); the count still grows.
  await page.getByRole('button', { name: 'Replay Orientation Day' }).click();
  await page.evaluate(() => globalThis.__sd!.autoplay('none'));
  expect(await playOut(page)).toBe('lost');
  const lost = page.getByRole('dialog', { name: 'MINOR OPERATIONAL HICCUP' });
  await expect(lost).toBeVisible();
  await expect(lost.getByRole('list', { name: 'Medals' })).toHaveCount(0);
  await expect(lost.getByRole('region', { name: 'Payroll' })).toContainText(
    'Effort stipend · Shift already cleared!',
  );
  const after = await save(page);
  expect(after?.currencies).toEqual(won?.currencies);
  expect(after?.campaign.maps.a1_m01).toEqual(record);
  expect(after?.stats.runs).toBe(2);
  const total = after?.stats.pestsProcessed ?? 0;
  expect(total).toBeGreaterThanOrEqual(pests);
  await expect(lost).toContainText(`Career total: ${total.toLocaleString('en-US')}`);
  await shot(page, 'results', 3, 'loss-replay');

  // Retry and win again: the overtime bonus, and medals already held pay no Intel twice.
  await lost.getByRole('button', { name: 'Retry' }).click();
  await page.evaluate(() => globalThis.__sd!.autoplay('par'));
  expect(await playOut(page)).toBe('won');
  const again = page.getByRole('dialog', { name: 'PERIMETER SECURED!' });
  await expect(again.getByRole('region', { name: 'Payroll' })).toContainText('Overtime bonus');
  await expect(
    again.getByRole('list', { name: 'Medals' }).getByRole('listitem').first(),
  ).toHaveAccessibleName('Victory: on file');
  const replayed = await save(page);
  expect(replayed?.currencies.intel).toBe(replayed?.campaign.maps.a1_m01?.medals.length);
  expect(replayed?.stats.runs).toBe(3);
  await shot(page, 'results', 4, 'win-replay');
});
