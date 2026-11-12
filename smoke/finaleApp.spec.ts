// T809, the finale's app layer. (1) The Halls retry on dev_bore (`?map=dev_bore`,
// render/__fixtures__/devPhases.ts): par to W2's clear, where Phase 2's 'halls' checkpoint is
// taken (the HUD's cue reads "The Halls", not a wave), then every tower sold and the run lost:
// Results offers "Retry from the Halls" first and focused, and taking it resumes in Phase 2,
// paused, with "Resumed at the Halls." (2) The companion pick on the finale's loadout
// (`?save=after_a3m6_keep&map=fin_m01`): who walks with you in slot 2's place, Ves'thara first;
// QUILL's Time Dilation is the Technician's beside Ves'thara and greys ("QUILL brings it") once
// QUILL walks; under Purge she isn't on the list. Screenshots via shot() (look at them: the card's
// button, the resumed field, the loadout's slot-2 column).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

const FLOW = 'finale-app';

test('finaleApp: a loss after the Halls retries from the Halls, in Phase 2', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/?test=1&map=dev_bore&seed=1');
  await waitForReady(page);

  // Par to the Halls: Phase 2 and its labelled checkpoint, cued by place.
  const at = await page.evaluate(() => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    sd.setSpeed(0);
    sd.autoplay('par');
    sd.fastForward(0);
    const st = sd.state()!;
    for (let k = 0; k < 20_000 && st.phase < 2 && st.outcome === 'playing'; k++) sd.fastForward(1);
    return { phase: st.phase, tick: st.tick, wave: st.wave };
  });
  expect(at.phase).toBe(2);
  const cue = page.getByTestId('checkpoint-cue');
  await expect(cue).toContainText('Checkpoint');
  await expect(cue).toContainText('The Halls');
  await expect(cue).not.toContainText(/Wave \d/);
  await nextFrames(page);
  await shot(page, FLOW, 1, 'halls-cue');

  // Give up: sell everything and let the Phase 2 waves through.
  const outcome = await page.evaluate(() => {
    const sd = globalThis.__sd!;
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

  const retry = page.getByRole('button', { name: 'Retry from the Halls' });
  await expect(retry).toBeVisible();
  await expect(retry).toBeFocused();
  await expect(page.getByRole('button', { name: /Retry from wave/ })).toHaveCount(0);
  await nextFrames(page);
  await shot(page, FLOW, 2, 'results-halls');

  await retry.click();
  await expect(page.getByTestId('hud')).toBeVisible();
  await expect(
    page.getByText(
      'Resumed at the Halls. Unpause when ready. Perfect Core and the Challenge need a shift from wave 1.',
    ),
  ).toBeVisible();
  const resumed = await page.evaluate(() => {
    const st = globalThis.__sd!.state()!;
    return { phase: st.phase, tick: st.tick, outcome: st.outcome };
  });
  expect(resumed).toEqual({ phase: 2, tick: at.tick, outcome: 'playing' });
  await nextFrames(page);
  await shot(page, FLOW, 3, 'resumed-halls');
});

/** The finale's loadout screen for `save` (the battle opens first; the hook opens the screen). */
async function finaleLoadout(page: Page, save: string): Promise<void> {
  await page.goto(`/?test=1&seed=1&map=fin_m01&save=${save}`);
  await waitForReady(page);
  await page.evaluate(() => globalThis.__sd!.goto('loadout'));
  await expect(page.getByRole('heading', { name: 'Loadout' })).toBeVisible();
}

test('finaleApp: the companion pick; Time Dilation greys beside QUILL; no QUILL under Purge', async ({
  page,
}) => {
  await finaleLoadout(page, 'after_a3m6_keep');
  const pick = page.getByTestId('loadout-companions');
  await expect(pick).toBeVisible();
  const walkers = pick.getByRole('radio');
  await expect(walkers).toHaveCount(4);
  await expect(walkers.nth(0)).toContainText(/Ves'thara/i);
  await expect(walkers.nth(0)).toHaveAttribute('aria-checked', 'true');
  const td = page.locator('[data-testid="loadout-ability"][data-ability="time_dilation"]');
  await expect(td).toBeVisible();
  await expect(td).not.toHaveAttribute('aria-disabled', 'true');
  // Stillness is Ves'thara's own: dim beside her, with why.
  const still = page.locator('[data-testid="loadout-ability"][data-ability="stillness"]');
  if ((await still.count()) > 0) {
    await expect(still).toHaveAttribute('aria-disabled', 'true');
    await expect(still).toContainText(/Ves'thara brings it/i);
  }
  await nextFrames(page);
  await shot(page, FLOW, 4, 'loadout-vesthara');

  // QUILL walks: her Time Dilation greys in slot 1, and says why.
  await page.locator('[data-companion="quill"]').click();
  await expect(page.locator('[data-companion="quill"]')).toHaveAttribute('aria-checked', 'true');
  await expect(td).toHaveAttribute('aria-disabled', 'true');
  await expect(td).toHaveAttribute('aria-checked', 'false');
  await expect(td.getByTestId('loadout-brings')).toContainText(/QUILL brings it/i);
  await td.click();
  await expect(td).toHaveAttribute('aria-checked', 'false');
  await nextFrames(page);
  await shot(page, FLOW, 5, 'loadout-quill');

  // Under Purge QUILL has nothing left to walk with.
  await finaleLoadout(page, 'after_a3m6_purge');
  await expect(page.getByTestId('loadout-companions').getByRole('radio')).toHaveCount(3);
  await expect(page.locator('[data-companion="quill"]')).toHaveCount(0);
});
