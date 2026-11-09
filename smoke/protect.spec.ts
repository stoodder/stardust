// T305a: Protect the asset on the dev Protect range (`?map=dev_protect`, render/__fixtures__/
// devBattle.ts): the north road runs to the core, the south road to the rigs. Nothing is built.
// The HUD's asset meter ("Rigs 10") under the core's, its flash and drop as branch leaks reach the
// rigs (the core untouched), its low state from half, the map lost when the rigs reach 0, and the
// Results card listing them. Screenshots in test-results/screens/protect/.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

/** Fast-forwards until the asset meter drops to `atMost` (or the map ends); returns the state. */
const until = (page: Page, atMost: number) =>
  page.evaluate((limit) => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    for (let k = 0; k < 6000; k++) {
      const s = sd.state()!;
      if (s.asset <= limit || s.outcome !== 'playing') break;
      sd.fastForward(1);
    }
    const s = sd.state()!;
    return { asset: s.asset, integrity: s.integrity, outcome: s.outcome };
  }, atMost);

test('protect: the rigs meter drops on branch leaks, goes low, and losing it loses the map', async ({
  page,
}) => {
  await page.goto('/?test=1&map=dev_protect&seed=1');
  await waitForReady(page);
  const meter = page.getByTestId('asset-meter');
  await expect(meter).toBeVisible();
  await expect(meter).toHaveAccessibleName('Rigs 10 of 10');
  await expect(meter).toHaveAttribute('data-damage', 'intact');
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
  });
  await shot(page, 'protect', 1, 'meter');

  // The first branch leak: the rigs lose 1; the core keeps everything.
  const hit = await until(page, 9);
  expect(hit).toMatchObject({ asset: 9, integrity: 20, outcome: 'playing' });
  await nextFrames(page);
  await expect(meter).toHaveAccessibleName('Rigs 9 of 10');
  await expect(meter).toHaveAttribute('data-damage', 'damaged');
  await shot(page, 'protect', 2, 'hit');

  // Half the meter: the low-asset alarm.
  expect(await until(page, 5)).toMatchObject({ outcome: 'playing' });
  await nextFrames(page);
  await expect(meter).toHaveAttribute('data-damage', 'critical');
  await expect(meter).toHaveAccessibleName(/, low$/);
  await shot(page, 'protect', 3, 'low');

  // W2 takes the rigs to 0: the map is lost with the core untouched, and Results lists the rigs.
  const end = await until(page, 0);
  expect(end).toMatchObject({ asset: 0, outcome: 'lost' });
  expect(end.integrity).toBeGreaterThan(0);
  const row = page.getByTestId('results-asset');
  await expect(row).toBeVisible();
  await expect(row).toContainText('Rigs');
  await expect(row).toContainText('0 / 10');
  await shot(page, 'protect', 4, 'results');
});
