// T820: FIN *Clearing the Way*, Phase 1 (the Descent), reached with `?map=fin_m01` and played by
// par (`autoplay('par')`): the briefing closed, the convoy's 16 singers filing out of the A1M1 gate
// behind Pebble as W1 starts, the choir passing the memorial wreck on the ridge above the Gap (its
// cue in W9), waiting at a leg's end (singing, no halt window), and the Halls mouth reached with
// W18. Before each shot the sim plays a moment at 1×. Screenshots in <out>/screens/fin-m01/ (look
// at them: the long column on the night road, the memorial ridge, the Halls ledges). Phase 2 and
// Dawn are T821's.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

type Cond = 'walking' | 'memorial' | 'waiting' | 'halls';

/** Plays par a tick at a time until `cond` holds (or the map ends), then lets frames render. */
async function until(page: Page, cond: Cond, max = 60 * 1000) {
  const out = await page.evaluate(
    ([c, limit]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      const st = sd.state()!;
      const check = (): boolean => {
        switch (c) {
          case 'walking':
            return st.wave === 1 && st.choir.dist > 1;
          case 'memorial':
            return st.wave === 9 && st.choir.dist >= 19;
          case 'waiting':
            return st.wave >= 10 && st.choir.waiting;
          case 'halls':
            return st.choir.arrived;
          default:
            return false;
        }
      };
      for (let k = 0; k < limit && !check() && st.outcome === 'playing'; k++) sd.fastForward(1);
      return {
        held: check(),
        outcome: st.outcome,
        wave: st.wave,
        voices: st.choir.voices,
        singers: st.choir.singers,
        halted: st.choir.halted,
        waiting: st.choir.waiting,
      };
    },
    [cond, max] as const,
  );
  await page.evaluate(() => globalThis.__sd!.fastForward(30)); // a half-second at 1×
  await nextFrames(page);
  return out;
}

test('FIN Phase 1: the choir walks the Long Walk to the Halls mouth', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('/?test=1&map=fin_m01&seed=1');
  await waitForReady(page);
  const brief = page.getByRole('dialog');
  if (await brief.isVisible()) {
    await shot(page, 'fin-m01', 0, 'briefing');
    await page.keyboard.press('Escape');
  }
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
    sd.fastForward(0);
  });

  const walking = await until(page, 'walking');
  expect(walking).toMatchObject({ held: true, outcome: 'playing', singers: 16, voices: 16 });
  await shot(page, 'fin-m01', 1, 'walking');

  const memorial = await until(page, 'memorial');
  expect(memorial).toMatchObject({ held: true, outcome: 'playing', wave: 9 });
  await shot(page, 'fin-m01', 2, 'memorial');

  const waiting = await until(page, 'waiting');
  expect(waiting).toMatchObject({ held: true, waiting: true, halted: false });
  await shot(page, 'fin-m01', 3, 'waiting');

  const halls = await until(page, 'halls', 60 * 900);
  expect(halls).toMatchObject({ held: true, wave: 18 });
  await shot(page, 'fin-m01', 4, 'halls');
});
