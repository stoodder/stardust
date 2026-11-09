// The Peeker (T309; design/core-loop.md § 6.9): on A1M1 a click on its rock (3,1) pokes it, a UI
// event that sets `peeker_poked` on the save at once, with nothing sent to the sim. The run plays
// out (par) to Results, the flag is still there, and it survives a reload. Keyboard-only, the tile
// cursor reaches the rock and Enter pokes it too. Screenshots in test-results/screens/peeker/.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

/** A1M1's `peeker` marker (src/content/maps/a1_m01/map.ts). */
const ROCK = [3, 1] as const;

const poked = (page: Page) =>
  page.evaluate(() => globalThis.__sd?.save()?.story.flags.peeker_poked ?? null);

/** Start shift → A1M1's briefing → Clock in, paused (so nothing moves under the screenshots). */
async function clockIn(page: Page): Promise<void> {
  await page.goto('/?test=1&seed=1');
  await waitForReady(page);
  await page.getByRole('button', { name: 'Start shift' }).click();
  const briefing = page.getByRole('dialog', { name: 'Shift briefing' });
  await expect(briefing).toBeVisible();
  await briefing.getByRole('button', { name: 'Clock in' }).click();
  await expect(briefing).toBeHidden();
  await page.evaluate(() => globalThis.__sd!.setSpeed(0)); // installed: waitForReady passed
}

test('peeker: a click pokes it, peeker_poked is saved and survives the run and a reload', async ({
  page,
}) => {
  await clockIn(page);
  expect(await poked(page)).toBeNull();
  const rock = await page.evaluate(([c, r]) => globalThis.__sd?.tileToClient(c, r) ?? null, ROCK);
  expect(rock).not.toBeNull();
  const clip = { x: rock!.x - 80, y: rock!.y - 70, width: 160, height: 110 }; // checked just above
  await page.mouse.move(rock!.x + 160, rock!.y + 120);
  await nextFrames(page);
  await page.screenshot({ path: 'test-results/screens/peeker/01-rock.png', clip });

  // The poke: no command reaches the sim, and the flag is in the save at once.
  const before = await page.evaluate(() => globalThis.__sd!.state()!.tick);
  await page.mouse.click(rock!.x, rock!.y);
  await expect.poll(() => poked(page)).toBe(true);
  await page.screenshot({ path: 'test-results/screens/peeker/02-poked.png', clip });
  await shot(page, 'peeker', 3, 'poked-field');
  const after = await page.evaluate(() => globalThis.__sd!.state());
  expect(after?.tick).toBe(before);
  expect(after?.towers.live).toBe(0);

  // A second poke only squeaks; play the map out to Results: the flag holds.
  await page.mouse.click(rock!.x, rock!.y);
  await page.evaluate(() => globalThis.__sd!.autoplay('par'));
  const outcome = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    for (let i = 0; i < 60 && sd.state()?.outcome === 'playing'; i++) sd.fastForward(600);
    return sd.state()?.outcome ?? null;
  });
  expect(outcome).toBe('won');
  await expect(page.getByRole('dialog', { name: 'PERIMETER SECURED!' })).toBeVisible();
  expect(await poked(page)).toBe(true);

  // It was written to the slot: after a reload, Continue opens a save that still has it.
  await page.evaluate(() => globalThis.__sd!.goto('title'));
  await page.reload();
  await waitForReady(page);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('list', { name: 'Shifts' })).toBeVisible();
  expect(await poked(page)).toBe(true);
});

test('peeker: keyboard only, the tile cursor reaches the rock and Enter pokes it', async ({
  page,
}) => {
  await clockIn(page);
  const say = page.getByTestId('cursor-announce');
  // Nothing armed: the arrows reach the rock among the pads (A1M1: (6,2), (6,1), then the rock).
  for (let i = 0; i < 6; i++) {
    // oxlint-disable-next-line no-await-in-loop -- each press depends on what the last one showed
    if (/column 4, row 2\./.test((await say.textContent()) ?? '')) break;
    // oxlint-disable-next-line no-await-in-loop -- one key press at a time, in order
    await page.keyboard.press('ArrowUp');
  }
  await expect(say).toHaveText(/^Ground, column 4, row 2\.$/);
  await page.keyboard.press('Enter');
  await expect.poll(() => poked(page)).toBe(true);
  await shot(page, 'peeker', 4, 'keyboard-poke');
  // Armed, the rock is no cursor target: the next arrow leaves it for a pad.
  await page.keyboard.press('Digit1');
  await page.keyboard.press('ArrowDown');
  await expect(say).toHaveText(/^(Pad|High ground), column \d+, row \d+, empty\. Enter builds/);
});
