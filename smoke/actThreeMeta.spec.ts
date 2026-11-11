// T610: Act III part one's meta (D141). (1) A3M1's briefing gift: from `after_a2m6` (no Scuttle
// Den), The Preserve's Start opens its loadout with the Den on offer, given as the screen opened.
// (2) Results in Act III, on the results fixture (nothing written): the Stardust as the warrens'
// gift stones under "Given", and a Clean Exit's revocations with the uplink's refund row (Orbital
// Strike Mk II, owned by `mid_m2`). (3) C3's choice (its shape, a dev scene, until A3M3's briefing
// lands with T622) waits 700 ms before it takes a press and commits the warren once. Which door a
// battle opens on each answer is app/storyMeta.test.ts's (the Holdout dev range can't take a
// campaign save) and holdout.spec.ts's; T622's A3M3 flow plays both doors through the real
// briefing. C3's lock runs on the page's clock: the flow pauses it (Playwright's `page.clock`)
// while the locked button is checked and shot, so a loaded machine can't let the 700 ms pass
// first. Screenshots via shot() (smoke/out.ts).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, playShift, shot, waitForReady } from './hooks.ts';

const save = (page: Page) => page.evaluate(() => globalThis.__sd!.save());

/**
 * Stops the page's clock just ahead of where it is (time, timers, and frames hold until
 * `resume`); the margin covers the round trip (the clock can't be moved back), widened on a miss.
 */
async function pauseClock(page: Page, margin = 100): Promise<void> {
  const now = await page.evaluate(() => Date.now());
  try {
    await page.clock.pauseAt(now + margin);
  } catch (e) {
    // The round trip outran the margin ("Cannot fast-forward to the past"): try a wider one.
    if (margin >= 3200) throw e;
    await pauseClock(page, margin * 2);
  }
}

test("act III meta: A3M1's Scuttle Den arrives as its loadout first opens", async ({ page }) => {
  await page.goto('/?test=1&seed=1&save=after_a2m6');
  await waitForReady(page);
  expect((await save(page))?.unlocks.towers).not.toContain('burrow');
  await playShift(page, 'The Preserve');
  await expect(page.getByRole('heading', { name: 'Loadout' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Scuttle Den,/ })).toBeVisible();
  const after = await save(page);
  expect(after?.unlocks.towers).toContain('burrow');
  expect(after?.story.granted).toContain('gift_burrow');
  await shot(page, 'act-three-meta', 1, 'den-in-loadout');
});

test('act III meta: Results shows gift stones and the Clean Exit with its refund row', async ({
  page,
}) => {
  await page.goto('/?test=1&seed=1&save=mid_m2');
  await waitForReady(page);
  await page.evaluate(() =>
    globalThis.__sd!.results({
      map: 'a3_m01',
      outcome: 'won',
      revoked: { towers: ['rivet'], abilities: ['orbital_strike'] },
    }),
  );
  const card = page.getByRole('dialog');
  await expect(card).toBeVisible();
  // Act III: Everglow pays nothing any more; the warrens give.
  const given = card.getByRole('region', { name: 'Given' });
  await expect(given.getByTestId('results-stardust')).toContainText('Gift stones');
  await expect(given.getByTestId('results-gift-stone')).toBeVisible();
  await expect(given.getByTestId('results-refund')).toContainText('Orbital Strike Mk II');
  await expect(given.getByTestId('results-refund')).toContainText('+2 Intel');
  await expect(given.getByTestId('results-revoked')).toHaveText('Revoked: Rivet, Orbital Strike');
  const box = await card.boundingBox();
  expect(box !== null && box.y >= 0 && box.y + box.height <= 720).toBe(true);
  await shot(page, 'act-three-meta', 2, 'results-stones');
});

test('act III meta: C3 waits 700 ms, then commits its door once', async ({ page }) => {
  // The clock is installed (running as usual) so C3's lock can be held while it is checked.
  await page.clock.install();
  await page.goto('/?test=1&dialogue=1&fasttext=1&seed=1&save=after_a3m2_rivet');
  await waitForReady(page);
  expect((await save(page))?.story.flags.door_choice).toBeUndefined();

  // C3: its options wait 700 ms before they take a press (D141).
  const ask = async (): Promise<void> => {
    await page.evaluate(() => globalThis.__sd!.dialogue.play('a1_m01_cue_dev_door'));
    // Bricks asks (shown whole under fasttext); Next reads on to the choice.
    await page.getByRole('button', { name: /^(Skip|Next)$/ }).click();
  };
  // The clock holds from before C3 shows, so its 700 ms can't run out before the look.
  await pauseClock(page);
  await ask();
  const answer = page.getByRole('group', { name: 'Your answer' });
  const warren = answer.getByRole('button', { name: /The warren tunnel/ });
  await expect(warren).toBeVisible();
  await expect(warren).toHaveAttribute('aria-disabled', 'true');
  await shot(page, 'act-three-meta', 3, 'c3-locked');
  // Time runs again: the lock passes.
  await page.clock.resume();
  await expect(warren).not.toHaveAttribute('aria-disabled', 'true');
  await warren.click();
  await expect(answer).toHaveCount(0);
  await expect.poll(async () => (await save(page))?.story.flags.door_choice).toBe('warren');

  // Asked once: a second answer never changes it.
  await ask();
  const convoy = answer.getByRole('button', { name: /The convoy road/ });
  await expect(convoy).not.toHaveAttribute('aria-disabled', 'true');
  await convoy.click();
  await expect(answer).toHaveCount(0);
  await nextFrames(page);
  expect((await save(page))?.story.flags.door_choice).toBe('warren');
});
