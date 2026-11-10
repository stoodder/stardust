// T413: a won run applies its debrief's effects. A2M2 played by par in the save after A2M1
// (`?save=after_a2m1&map=a2_m02`): Bricks's debrief names the player Thorn on the card, and the
// callsign reaches the save, with the debrief on file as seen (once a campaign).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { waitForReady } from './hooks.ts';

/** Fast-forwards the running battle until the map ends; returns the outcome. */
const playOut = (page: Page) =>
  page.evaluate(() => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    for (let i = 0; i < 80 && sd.state()?.outcome === 'playing'; i++) sd.fastForward(600);
    return sd.state()?.outcome ?? null;
  });

test('thorn: winning A2M2 names the player Thorn, on the card and in the save', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto('/?test=1&seed=1&save=after_a2m1&map=a2_m02');
  await waitForReady(page);
  const before = await page.evaluate(() => globalThis.__sd!.save());
  expect(before?.profile?.callsign).toBe('sprout');

  await page.evaluate(() => globalThis.__sd!.autoplay('par'));
  expect(await playOut(page)).toBe('won');
  const card = page.getByRole('dialog', { name: 'PERIMETER SECURED!' });
  await expect(card).toBeVisible();
  await expect(card.getByRole('list', { name: 'Debrief' })).toContainText("Thorn. That's you now.");
  const after = await page.evaluate(() => globalThis.__sd!.save());
  expect(after?.profile?.callsign).toBe('thorn');
  expect(after?.story.seen).toContain('a2_m02_debrief');
});
