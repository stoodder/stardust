// Results and the flow around it (T316, T235): A1M4 won from a dev save lists its optional
// objective (Clean Audit) under the medals with the Intel it paid, and the career total ticks up
// with the counter; A1M5's card carries the red CONTAINMENT LAPSE stamp when this run spared the
// Quiet Wave (`__sd.results`, a made-up run: app/resultsFixture.ts), and none when it didn't; and a
// win's flow plays a full-screen scene before the card and another as it's dismissed (dev scenes
// stand in, so the flow is tested whether or not A1M5's own have landed). Screenshots in
// test-results/screens/results-flow/ (look at them).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { shot, waitForReady } from './hooks.ts';

const shiftRow = (page: Page, name: string) =>
  page.getByRole('list', { name: 'Shifts' }).getByRole('listitem').filter({ hasText: name });

/** Fast-forwards the running battle until the map ends; returns the outcome. */
const playOut = (page: Page) =>
  page.evaluate(() => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    for (let i = 0; i < 80 && sd.state()?.outcome === 'playing'; i++) sd.fastForward(600);
    return sd.state()?.outcome ?? null;
  });

test('results: A1M4 par lists Clean Audit with its Intel, and the career total counts up', async ({
  page,
}) => {
  // `?map=` opens A1M4 in the save, past the loadout screen the Shift board's Start would show.
  await page.goto('/?test=1&seed=1&save=after_a1m3&map=a1_m04');
  await waitForReady(page);
  await expect(page.getByRole('dialog', { name: 'Shift briefing' })).toBeVisible();
  const before = await page.evaluate(() => globalThis.__sd!.save());
  await page.evaluate(() => globalThis.__sd!.autoplay('par'));
  expect(await playOut(page)).toBe('won');

  const card = page.getByRole('dialog', { name: 'PERIMETER SECURED!' });
  await expect(card).toBeVisible();
  const objectives = card.getByRole('list', { name: 'Objectives' }).getByRole('listitem');
  await expect(objectives).toHaveCount(1);
  await expect(objectives.first()).toHaveAccessibleName('Clean Audit: new!');
  await expect(objectives.first()).toContainText('+1 Intel');
  const after = await page.evaluate(() => globalThis.__sd!.save());
  expect(after?.campaign.maps.a1_m04?.objectives).toEqual(['clean_audit']);
  const medals = after?.campaign.maps.a1_m04?.medals.length ?? 0;
  expect(after?.currencies.intel).toBe((before?.currencies.intel ?? 0) + medals + 1);
  // The career total lands on the lifetime count (it ticked up from the total before this run).
  const total = after?.stats.pestsProcessed ?? 0;
  await expect(card.locator('.sd-results-career-count')).toHaveText(total.toLocaleString('en-US'));
  // No first payday: the bank already held Stardust, and the shop is open.
  await expect(card).not.toContainText('FIRST PAYDAY!');
  // Compact (T235): the card fits the screen.
  const box = await card.boundingBox();
  expect(box !== null && box.y >= 0 && box.y + box.height <= 720).toBe(true);
  await shot(page, 'results-flow', 1, 'a1m4-objective');
});

test('results: the first payday is marked, with the shop note, once (T235)', async ({ page }) => {
  await page.goto('/?test=1&seed=1&save=after_a1m1');
  await waitForReady(page);
  expect((await page.evaluate(() => globalThis.__sd!.save()))?.currencies.stardust).toBe(0);
  await shiftRow(page, 'Hatching Season').getByRole('button').click();
  await page.evaluate(() => globalThis.__sd!.autoplay('par'));
  expect(await playOut(page)).toBe('won');
  const card = page.getByRole('dialog', { name: 'PERIMETER SECURED!' });
  const payroll = card.getByRole('region', { name: 'Payroll' });
  await expect(payroll).toContainText('FIRST PAYDAY!');
  await expect(payroll).toContainText("Banked for Zibzab's shop.");
  const box = await card.boundingBox();
  expect(box !== null && box.y >= 0 && box.y + box.height <= 720).toBe(true);
  await shot(page, 'results-flow', 2, 'a1m2-first-payday');

  // The next payday (an overtime win) is just a payday: no tag, and the note has been read.
  await card.getByRole('button', { name: 'Retry' }).click();
  await page.evaluate(() => globalThis.__sd!.autoplay('par'));
  expect(await playOut(page)).toBe('won');
  await expect(payroll).toContainText('Overtime bonus');
  await expect(payroll).not.toContainText('FIRST PAYDAY!');
  await expect(payroll).not.toContainText("Banked for Zibzab's shop.");
});

test('results: A1M5 stamps CONTAINMENT LAPSE when this run spared the Quiet Wave', async ({
  page,
}) => {
  await page.goto('/?test=1&seed=1&save=after_a1m4');
  await waitForReady(page);
  await page.evaluate(() =>
    globalThis.__sd!.results({
      map: 'a1_m05',
      outcome: 'won',
      pests: 412,
      quietWave: { spawned: 7, leaked: 7 },
    }),
  );
  const card = page.getByRole('dialog', { name: 'PERIMETER SECURED!' });
  await expect(card).toBeVisible();
  const stamp = card.locator('.sd-results-stamp');
  await expect(stamp).toHaveText('Stamped: CONTAINMENT LAPSE');
  await expect(stamp).toBeVisible();
  // Story-only: on the card, inside it, never over the headline.
  await page.waitForTimeout(1000); // the stamp lands
  await shot(page, 'results-flow', 3, 'a1m5-containment-lapse');
  const [s, h] = await Promise.all([
    stamp.boundingBox(),
    card.getByRole('heading', { name: 'PERIMETER SECURED!' }).boundingBox(),
  ]);
  expect(s !== null && h !== null && s.x >= h.x + h.width).toBe(true);
  const box = await card.boundingBox();
  expect(box !== null && box.y >= 0 && box.y + box.height <= 720).toBe(true);

  // Cleared: no stamp, even on a save whose flag says spared (a replay shows this run).
  await page.goto('/?test=1&seed=1&save=after_a1m5');
  await waitForReady(page);
  const flags = (await page.evaluate(() => globalThis.__sd!.save()))?.story.flags;
  expect(flags?.spared_quiet_wave).toBe(true);
  await page.evaluate(() =>
    globalThis.__sd!.results({
      map: 'a1_m05',
      outcome: 'won',
      quietWave: { spawned: 7, leaked: 0 },
    }),
  );
  await expect(card).toBeVisible();
  await expect(card.locator('.sd-results-stamp')).toHaveCount(0);
});

test('results flow: a scene before the card, and one as it is dismissed', async ({ page }) => {
  await page.goto('/?test=1&dialogue=1&seed=1&save=after_a1m4');
  await waitForReady(page);
  const party = 'a1_m01_scene_dev_party';
  void page.evaluate(
    (id) =>
      globalThis.__sd!.results({
        map: 'a1_m05',
        outcome: 'won',
        quietWave: { spawned: 7, leaked: 7 },
        flow: { before: [id], after: [id] },
      }),
    party,
  );
  const scene = page.getByRole('dialog', { name: 'Scene' });
  const card = page.getByRole('dialog', { name: 'PERIMETER SECURED!' });
  await expect(scene).toBeVisible();
  await expect(card).toBeHidden();
  await shot(page, 'results-flow', 4, 'before-scene');
  // Esc skips it (style-guide.md § 4: full-screen scenes are skippable), and the card shows.
  await page.keyboard.press('Escape');
  await expect(scene).toBeHidden();
  await expect(card).toBeVisible();
  await expect(card.getByRole('button', { name: 'Continue' })).toBeFocused();

  // Continue: the after-scene first, over the card (inert behind it), then the base.
  await card.getByRole('button', { name: 'Continue' }).click();
  await expect(scene).toBeVisible();
  await expect(page.locator('main.sd-results')).toHaveAttribute('inert', '');
  await shot(page, 'results-flow', 5, 'after-scene');
  await page.keyboard.press('Escape');
  await expect(scene).toBeHidden();
  // The base (the dev save has seen Zibzab's arrival).
  await expect(page.getByRole('tab', { name: 'Shop', exact: true })).toBeAttached();

  // A loss plays no flow.
  await page.evaluate(() =>
    globalThis.__sd!.results({ map: 'a1_m05', outcome: 'lost', flow: { before: [], after: [] } }),
  );
  await expect(page.getByRole('dialog', { name: 'MINOR OPERATIONAL HICCUP' })).toBeVisible();
  await expect(scene).toBeHidden();
});
