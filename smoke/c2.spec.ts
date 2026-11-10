// T510: the story transactions on Results. A2M4 played by par from the reference save into it
// (`?save=after_a2m3_ref&map=a2_m04`): the card pays the Q3 Bonus (+400) with its memo, then C2
// waits in the way on's place, price first (the whole bank). Sell trades the bank for the Intel
// windfall and the Zibzab Tune-up, written at once, and the card then offers Continue. Return is
// taken on the results fixture's A2M4 card (`__sd.results`, one battle fewer for the gate): it
// carries the bank home on a copy and writes nothing. Screenshots in test-results/screens/c2/.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { shot, waitForReady } from './hooks.ts';

/** Fast-forwards the running battle until the map ends; returns the outcome. */
const playOut = (page: Page) =>
  page.evaluate(() => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    for (let i = 0; i < 120 && sd.state()?.outcome === 'playing'; i++) sd.fastForward(600);
    return sd.state()?.outcome ?? null;
  });

const save = (page: Page) => page.evaluate(() => globalThis.__sd!.save());

test("c2: A2M4's first win pays the Q3 Bonus and offers C2; Sell is written at once", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto('/?test=1&seed=1&save=after_a2m3_ref&map=a2_m04');
  await waitForReady(page);
  const before = await save(page);
  await page.evaluate(() => globalThis.__sd!.autoplay('par'));
  expect(await playOut(page)).toBe('won');

  const card = page.getByRole('dialog');
  await expect(card).toBeVisible();
  const payroll = card.getByRole('region', { name: 'Payroll' });
  await expect(payroll.getByTestId('results-q3-bonus')).toContainText('+400 Stardust');
  await expect(payroll.getByTestId('results-memo')).toContainText('Your Q3 Performance Bonus!');
  // The bank holds the run's pay and the bonus; C2 hasn't been made.
  const banked = await save(page);
  expect(banked?.story.granted).toContain('q3_bonus');
  expect(banked?.story.flags.stardust_choice).toBeUndefined();
  const bank = banked?.currencies.stardust ?? 0;
  expect(bank).toBeGreaterThanOrEqual((before?.currencies.stardust ?? 0) + 400);

  // C2 in the way on's place, price first, the first option focused; no Continue yet.
  const offer = card.getByRole('group', { name: "Zibzab's offer" });
  await expect(offer).toContainText(`The whole bank: ${bank.toLocaleString('en-US')} Stardust`);
  await expect(offer.getByRole('button', { name: 'Sell it. Market price.' })).toBeFocused();
  await expect(card.getByRole('button', { name: 'Continue' })).toHaveCount(0);
  const box = await card.boundingBox();
  expect(box !== null && box.y >= 0 && box.y + box.height <= 720).toBe(true);
  await shot(page, 'c2', 1, 'offer');

  await offer.getByRole('button', { name: 'Sell it. Market price.' }).click();
  await expect(offer).toHaveCount(0);
  await expect(card.getByRole('button', { name: 'Continue' })).toBeFocused();
  const after = await save(page);
  const windfall = Math.min(8, Math.max(3, Math.floor(bank / 150)));
  expect(after?.story.flags.stardust_choice).toBe('sold');
  expect(after?.currencies).toEqual({
    stardust: 0,
    intel: (banked?.currencies.intel ?? 0) + windfall,
  });
  expect(after?.upgrades.tune_zibzab).toBe(1);
  const c2 = payroll.getByTestId('results-c2');
  await expect(c2).toContainText(`Sold at market · ${bank.toLocaleString('en-US')} Stardust`);
  await expect(c2).toContainText(`+${windfall} Intel`);
  await expect(payroll.getByTestId('results-tune-up')).toContainText(
    'Zibzab Tune-up: Ten percent. Honestly, eight.',
  );
  const box2 = await card.boundingBox();
  expect(box2 !== null && box2.y >= 0 && box2.y + box2.height <= 720).toBe(true);
  await shot(page, 'c2', 2, 'sold');
});

test('c2: Return on the results fixture carries the bank home, on a copy', async ({ page }) => {
  await page.goto('/?test=1&save=after_a2m3_ref');
  await waitForReady(page);
  await page.evaluate(() => globalThis.__sd!.results({ map: 'a2_m04', outcome: 'won' }));
  const offer = page.getByRole('group', { name: "Zibzab's offer" });
  await expect(offer).toBeVisible();
  await offer.getByRole('button', { name: 'Take it to them.' }).click();
  await expect(offer).toHaveCount(0);
  const c2 = page.getByTestId('results-c2');
  await expect(c2).toContainText('Carried home');
  await expect(c2).toContainText('Fee: an IOU');
  await expect(page.getByTestId('results-tune-up')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Continue' })).toBeFocused();
  expect((await save(page))?.story.flags.stardust_choice).toBeUndefined();
  await shot(page, 'c2', 3, 'returned');
});
