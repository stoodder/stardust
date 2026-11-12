// T832, the finale's HUD (app/hudFinale.ts; art-direction §9 *Finale HUD*), on FIN itself.
// (1) Par on the reference run (`?map=fin_m01`): Phase 1 shows Voices in the core's place (the
// Hushed pips, the gate's integrity under it), the Deep Bore in the top-centre clock and "The
// Descent" over W1's banner; W19 shows "Held" while the choir walks the last leg; Phase 2 turns the
// clock into the countdown ("Pests processed" over the song's gold bar) under "The Halls / The
// Unsung", the Bore gone; at Dawn the HUD steps back to the name plate and the counter at 0, and
// no "!" anywhere. (2) C4 Keep (`?save=after_a3m6_keep`, on Story so the save's unspecced par
// reaches the Halls, QUILL picked so her Time Dilation is slot 2): 20 s into Phase 2 Directive 0
// darks the slot under its own tag, not a revocation's stamp. Screenshots via shot() in
// <out>/screens/finale-hud/ (look at them: the clock under the boss bar, the meter's rows, the dark
// slot, Dawn's empty HUD).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

const FLOW = 'finale-hud';

type Cond = 'started' | 'walking' | 'held' | 'phase2' | 'directive' | 'dawn';

/** Plays par a tick at a time until `cond` holds (or the map ends). */
async function until(page: Page, cond: Cond, max = 300_000) {
  return page.evaluate(
    ([c, limit]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      const st = sd.state()!;
      const check = (): boolean => {
        switch (c) {
          case 'started':
            return st.wave === 1 && st.timers[0]!.filled > 60 * 4; // a timer: fin_m01's Bore
          case 'walking':
            return st.wave >= 6 && st.choir.dist > 8;
          case 'held':
            return st.schedule.phase === 'held';
          case 'phase2':
            return st.phase >= 2;
          case 'directive':
            return st.phase >= 2 && st.abilitiesLocked.includes('time_dilation');
          case 'dawn':
            return st.phase >= 3 && st.tick - st.phaseTick > 60 * 2;
          default:
            return false;
        }
      };
      for (let k = 0; k < limit && !check() && st.outcome === 'playing'; k++) sd.fastForward(1);
      return { held: check(), outcome: st.outcome, wave: st.wave, phase: st.phase };
    },
    [cond, max] as const,
  );
}

test('finale HUD: Voices and the Bore, the countdown, Dawn steps back', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/?test=1&map=fin_m01&seed=1');
  await waitForReady(page);
  if (await page.getByRole('dialog').isVisible()) await page.keyboard.press('Escape');
  const hud = page.getByTestId('hud');
  await expect(hud).toBeVisible();
  // Voices stands in the core's place; the gate keeps its row under it.
  const voices = page.getByTestId('escort-meter');
  await expect(voices).toHaveAttribute('data-choir', 'true');
  await expect(voices).toContainText('Voices');
  await expect(voices.getByTestId('escort-lost')).toContainText('Hushed');
  await expect(page.getByTestId('gate-meter')).toContainText('Gate');
  const clock = page.getByTestId('finale-clock');
  await expect(clock).toHaveCount(0); // the Bore starts with W1
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
    sd.fastForward(0);
  });

  // W1: the Bore in the clock, "The Descent" over the wave's banner.
  expect(await until(page, 'started')).toMatchObject({ held: true, phase: 1 });
  await nextFrames(page);
  await expect(clock).toHaveAttribute('data-kind', 'bore');
  await expect(clock).toContainText('Deep Bore');
  await expect(page.getByTestId('phase-banner')).toContainText('The Descent');
  // The optional objective by name beside its box while it's in play, with its progress (D156).
  await expect(page.getByTestId('objective-name')).toHaveText(/^Waymarks [0-3]\/4$/);
  await shot(page, FLOW, 1, 'descent');

  expect(await until(page, 'walking')).toMatchObject({ held: true, phase: 1 });
  await nextFrames(page);
  expect(Number(await clock.getAttribute('data-fill'))).toBeGreaterThan(0);
  await shot(page, FLOW, 2, 'phase1');

  // W18 spawned before the choir is at the Halls: W19 is held, not counting down.
  const held = await until(page, 'held');
  if (held.held && held.phase === 1) {
    await nextFrames(page);
    await expect(page.getByTestId('preview-held')).toBeVisible();
    await shot(page, FLOW, 3, 'held');
  }

  // Phase 2: the countdown in the Bore's place, under the Halls' banner.
  expect(await until(page, 'phase2')).toMatchObject({ held: true, outcome: 'playing' });
  await page.evaluate(() => globalThis.__sd!.fastForward(60));
  await nextFrames(page);
  await expect(clock).toHaveAttribute('data-kind', 'counter');
  await expect(clock).toContainText('Pests processed');
  await expect(page.getByTestId('phase-banner')).toContainText('The Leaving Song');
  await shot(page, FLOW, 4, 'phase2');

  // Dawn: the name plate and the counter at 0, and nothing else.
  expect(await until(page, 'dawn')).toMatchObject({ held: true, outcome: 'playing', phase: 3 });
  await nextFrames(page);
  await expect(hud).toHaveAttribute('data-dawn', 'true');
  await expect(page.getByTestId('finale-clock-value')).toHaveText('0');
  await expect(page.getByTestId('callsign-plate')).toBeVisible();
  // Faded out (1.2 s; at once under reduced motion), then hidden: no stray control takes a click.
  await expect(page.getByRole('button', { name: 'Pause' })).toBeHidden();
  await expect(voices).toBeHidden();
  await expect(page.getByRole('navigation', { name: 'Abilities' })).toBeHidden();
  expect(await hud.innerText()).not.toContain('!');
  await shot(page, FLOW, 5, 'dawn');
});

test("finale HUD: Directive 0 darks QUILL's Time Dilation under its own tag (Keep)", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto('/?test=1&map=fin_m01&seed=1&save=after_a3m6_keep');
  await waitForReady(page);
  await page.evaluate(() => globalThis.__sd!.goto('settings'));
  await page.locator('[data-difficulty="story"]').click();
  await page.evaluate(() => globalThis.__sd!.goto('loadout'));
  await page.locator('[data-companion="quill"]').click();
  await page.getByRole('button', { name: /lock in/i }).click();
  await expect(page.getByTestId('hud')).toBeVisible();
  if (await page.getByRole('dialog').isVisible()) await page.keyboard.press('Escape');
  const slot = page.getByTestId('ability-2');
  await expect(slot).not.toHaveAttribute('data-directive', '0');
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
    sd.fastForward(0);
  });
  const at = await until(page, 'directive');
  expect(at).toMatchObject({ held: true, outcome: 'playing', phase: 2 });
  await page.evaluate(() => globalThis.__sd!.fastForward(30));
  await nextFrames(page);
  await expect(slot).toHaveAttribute('data-directive', '0');
  await expect(slot).toHaveAttribute('aria-label', /suspended by Directive 0/);
  await expect(page.getByTestId('ability-2-revoked')).toHaveText('Directive 0');
  // A lock, never a revocation: no UPLINK REVOKED stamp, no "Locked out".
  await expect(slot).not.toContainText('Locked out');
  await shot(page, FLOW, 6, 'directive0');
});
