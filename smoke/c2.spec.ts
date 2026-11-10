// T510: the story transactions on Results. A2M4 played by par from the reference save into it
// (`?save=after_a2m3_ref&map=a2_m04`): the card pays the Q3 Bonus (+400) with its memo, then C2
// waits in the way on's place, price first (the whole bank, and what each option pays under it,
// D138). A stray key can't make it (D138): the focus is on the offer's heading, the options wait
// 700 ms, and Tab stays on the card. Sell trades the bank for the Intel windfall and the Zibzab
// Tune-up, written at once, and the card then offers Continue; at the base the Q3 memo opens and
// is read once it has stayed on screen (D138: a real run's result no longer covers the pane).
// Return is taken on the results fixture's A2M4 card (`__sd.results`, one battle fewer for the
// gate): it carries the bank home on a copy and writes nothing. A card never answered (the tab
// closed) is offered at the base. Screenshots in <out>/screens/c2/.
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

  // C2 in the way on's place, price first: the stake as the offer's heading, which has the focus
  // (never an option), and each option's payout under it. No Continue yet.
  const offer = card.getByRole('group', { name: "Zibzab's offer" });
  const windfall = Math.min(8, Math.max(3, Math.floor(bank / 150)));
  await expect(offer).toContainText(`The whole bank: ${bank.toLocaleString('en-US')} Stardust`);
  await expect(offer.getByTestId('choice-heading')).toBeFocused();
  const pays = offer.getByTestId('choice-pays');
  await expect(pays.nth(0)).toHaveText(`+${windfall} Intel · Zibzab Tune-up`);
  await expect(pays.nth(1)).toHaveText('Carried home · Fee: an IOU');
  await expect(card.getByRole('button', { name: 'Continue' })).toHaveCount(0);
  const box = await card.boundingBox();
  expect(box !== null && box.y >= 0 && box.y + box.height <= 720).toBe(true);
  await shot(page, 'c2', 1, 'offer');
  // A stray Enter, Space, or Tab takes nothing; Tab stays on the card.
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Space');
  for (let i = 0; i < 4; i++) {
    // oxlint-disable-next-line no-await-in-loop -- one key at a time
    await page.keyboard.press('Tab');
    // oxlint-disable-next-line no-await-in-loop -- checked after each key
    expect(await card.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }
  await expect(offer).toBeVisible();
  expect((await save(page))?.story.flags.stardust_choice).toBeUndefined();

  const sell = offer.getByRole('button', { name: 'Sell it. Market price.' });
  await expect(sell).not.toHaveAttribute('aria-disabled', 'true');
  await sell.click();
  await expect(offer).toHaveCount(0);
  await expect(card.getByRole('button', { name: 'Continue' })).toBeFocused();
  const after = await save(page);
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

  // The base: the Q3 memo opens in the Inbox and is read once it has stayed on screen (D138).
  await card.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Base' })).toBeVisible();
  await expect(page.getByRole('tab', { name: /^Inbox/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel').getByRole('article')).toContainText(
    'Your Q3 Performance Bonus!',
  );
  await expect
    .poll(async () => (await save(page))?.story.memosRead.includes('memo_a2_04'))
    .toBe(true);
});

test('c2: a card never answered is offered at the base, before its visit scenes', async ({
  page,
}) => {
  // The tab closed on A2M4's card: A2M4 won, the Q3 Bonus banked, `stardust_choice` unset.
  await page.goto('/?test=1&dialogue=1&fasttext=1&seed=1&save=after_a2m4_unanswered');
  await waitForReady(page);
  const bank = (await save(page))?.currencies.stardust ?? 0;
  expect(bank).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Base' }).click();
  const panel = page.getByRole('dialog', { name: "Zibzab's offer" });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText(`The whole bank: ${bank.toLocaleString('en-US')} Stardust`);
  await expect(panel.getByTestId('choice-heading')).toBeFocused();
  const windfall = Math.min(8, Math.max(3, Math.floor(bank / 150)));
  await expect(panel.getByTestId('choice-pays').nth(0)).toHaveText(
    `+${windfall} Intel · Zibzab Tune-up`,
  );
  // Esc doesn't answer for the player, or leave the base; the visit scenes wait.
  await page.keyboard.press('Escape');
  await expect(panel).toBeVisible();
  expect((await page.evaluate(() => globalThis.__sd!.dialogue.shown())).scene).toBeNull();
  await shot(page, 'c2', 4, 'base-offer');
  const back = panel.getByRole('button', { name: 'Take it to them.' });
  await expect(back).not.toHaveAttribute('aria-disabled', 'true');
  await back.click();
  await expect(panel.getByTestId('base-choice-made')).toContainText('Carried home');
  const after = await save(page);
  expect(after?.story.flags.stardust_choice).toBe('returned');
  expect(after?.currencies.stardust).toBe(0);
  await shot(page, 'c2', 5, 'base-answered');
  // Continue: the visit scene it held back (Bricks hands Pebble over) plays now.
  await panel.getByRole('button', { name: 'Continue' }).click();
  await expect(panel).toBeHidden();
  await expect
    .poll(async () => (await page.evaluate(() => globalThis.__sd!.dialogue.shown())).scene)
    .toBe('a2_m04_base_handover');
});

test('c2: Return on the results fixture carries the bank home, on a copy', async ({ page }) => {
  await page.goto('/?test=1&save=after_a2m3_ref');
  await waitForReady(page);
  await page.evaluate(() => globalThis.__sd!.results({ map: 'a2_m04', outcome: 'won' }));
  const offer = page.getByRole('group', { name: "Zibzab's offer" });
  await expect(offer).toBeVisible();
  const take = offer.getByRole('button', { name: 'Take it to them.' });
  await expect(take).not.toHaveAttribute('aria-disabled', 'true');
  await take.click();
  await expect(offer).toHaveCount(0);
  const c2 = page.getByTestId('results-c2');
  await expect(c2).toContainText('Carried home');
  await expect(c2).toContainText('Fee: an IOU');
  await expect(page.getByTestId('results-tune-up')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Continue' })).toBeFocused();
  expect((await save(page))?.story.flags.stardust_choice).toBeUndefined();
  await shot(page, 'c2', 3, 'returned');
});
