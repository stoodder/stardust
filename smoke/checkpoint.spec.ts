// T305b: "Retry from wave N" (design/core-loop.md § 2.12) on A2M2, in the save after A2M1
// (`?save=after_a2m1&map=a2_m02`). Par plays to W5's countdown, where the run records its
// checkpoint, and a while past it; then every tower is sold and the run is lost. Results offers
// "Retry from wave 5" first (focused) beside Retry; taking it resumes the battle exactly where the
// checkpoint stood (the tick, the towers, the credits, the core and the rigs), paused in W5's
// countdown with a notice, and the clock runs again on unpause. A won checkpoint run's card (the
// results fixture) lights Victory only and says why. Screenshots in test-results/screens/checkpoint/
// (look at them: the card's button row, the resumed field with its towers, the win's note).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

/** The battle as a checkpoint restores it. */
interface Snapshot {
  readonly tick: number;
  readonly wave: number;
  readonly towers: number;
  readonly credits: number;
  readonly integrity: number;
  readonly asset: number;
}

const snapshot = (page: Page): Promise<Snapshot> =>
  page.evaluate(() => {
    const s = globalThis.__sd!.state()!; // installed: waitForReady passed
    return {
      tick: s.tick,
      wave: s.wave,
      towers: s.towers.live,
      credits: s.credits,
      integrity: s.integrity,
      asset: s.asset,
    };
  });

test('checkpoint: a lost Act II run retries from wave 5 with the state it had there', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto('/?test=1&seed=7&save=after_a2m1&map=a2_m02');
  await waitForReady(page);

  // Par to the start of W5's countdown: the checkpoint (the state after that tick).
  const reached = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
    const st = sd.state()!;
    for (let k = 0; k < 60 * 60 * 10; k++) {
      if (st.schedule.phase === 'countdown' && st.schedule.countdownWave === 5) return true;
      sd.fastForward(1);
    }
    return false;
  });
  expect(reached).toBe(true);
  const atCheckpoint = await snapshot(page);
  expect(atCheckpoint.towers).toBeGreaterThan(0);

  // A while past it, then give up: sell everything and let the waves through.
  const outcome = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.fastForward(60 * 20);
    sd.autoplay('none');
    const st = sd.state()!;
    for (let i = 0; i < st.towers.used; i++) {
      const t = st.towers.items[i]!;
      if (t.alive) sd.enqueue({ type: 'sell', towerUid: t.uid });
    }
    sd.fastForward(1);
    for (let k = 0; k < 60 && st.outcome === 'playing'; k++) sd.fastForward(600);
    return st.outcome;
  });
  expect(outcome).toBe('lost');

  const card = page.getByRole('dialog', { name: 'MINOR OPERATIONAL HICCUP' });
  await expect(card).toBeVisible();
  const fromCheckpoint = card.getByRole('button', { name: 'Retry from wave 5' });
  await expect(fromCheckpoint).toBeVisible();
  await expect(fromCheckpoint).toBeFocused();
  await expect(card.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
  await expect(card.getByRole('button', { name: 'Sector map' })).toBeVisible();
  await nextFrames(page);
  await shot(page, 'checkpoint', 1, 'results');

  // Retry from wave 5: the battle as it stood at the checkpoint, paused, with the notice.
  await fromCheckpoint.click();
  await expect(card).toBeHidden();
  await expect(page.getByTestId('hud')).toBeVisible();
  await expect(
    page.getByText(
      'Resumed before wave 5. Unpause when ready. Perfect Core and the Challenge need a shift from wave 1.',
    ),
  ).toBeVisible();
  expect(await snapshot(page)).toEqual(atCheckpoint);
  const phase = await page.evaluate(() => globalThis.__sd!.state()!.schedule.phase);
  expect(phase).toBe('countdown');
  await page.waitForTimeout(300);
  expect((await snapshot(page)).tick).toBe(atCheckpoint.tick);
  await nextFrames(page);
  await shot(page, 'checkpoint', 2, 'resumed');

  // Unpause: the countdown runs on.
  await page.keyboard.press('Space');
  await expect
    .poll(async () => (await snapshot(page)).tick, { timeout: 5_000 })
    .toBeGreaterThan(atCheckpoint.tick);
});

test('checkpoint: a won checkpoint run keeps Victory only, and the card says why', async ({
  page,
}) => {
  await page.goto('/?test=1&seed=1&save=after_a2m1');
  await waitForReady(page);
  await page.evaluate(() =>
    globalThis.__sd!.results({ map: 'a2_m02', outcome: 'won', checkpoint: { resumedFrom: 5 } }),
  );
  const card = page.getByRole('dialog', { name: 'PERIMETER SECURED!' });
  await expect(card).toBeVisible();
  const medals = card.getByRole('list', { name: 'Medals' }).getByRole('listitem');
  await expect(medals).toHaveCount(3);
  await expect(medals.nth(0)).toHaveAccessibleName('Victory: new!');
  await expect(medals.nth(1)).toHaveAccessibleName('Perfect Core: next time');
  await expect(medals.nth(2)).toHaveAccessibleName(/: next time$/);
  await expect(card.getByTestId('results-resumed')).toHaveText(
    'Resumed from wave 5: Perfect Core and the Challenge need a shift from wave 1.',
  );
  // A win offers no checkpoint.
  await expect(card.getByRole('button', { name: /Retry from wave/ })).toHaveCount(0);
  await nextFrames(page);
  await shot(page, 'checkpoint', 3, 'won-resumed');
});
