// T831 exploratory (replaced below).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

async function until(page: Page, cond: string, max = 400_000) {
  return page.evaluate(
    ([c, limit]) => {
      const sd = globalThis.__sd!;
      const st = sd.state()!;
      const check = (): boolean => {
        if (c.startsWith('w')) return st.wave >= Number(c.slice(1));
        if (c === 'dawn') return st.lightingKey === 'dawn';
        return false;
      };
      for (let k = 0; k < limit && !check() && st.outcome === 'playing'; k++) sd.fastForward(1);
      return { held: check(), wave: st.wave, phase: st.phase, outcome: st.outcome, tick: st.tick };
    },
    [cond, max] as const,
  );
}

test('explore fin_m01 light', async ({ page }) => {
  test.setTimeout(600_000);
  await page.goto('/?test=1&map=fin_m01&seed=1');
  await waitForReady(page);
  const brief = page.getByRole('dialog');
  if (await brief.isVisible()) await page.keyboard.press('Escape');
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
    sd.fastForward(0);
  });
  for (const w of ['w1', 'w10', 'w18']) {
    const r = await until(page, w);
    await page.evaluate(() => globalThis.__sd!.fastForward(600));
    await nextFrames(page);
    console.log(w, JSON.stringify(r), JSON.stringify(await page.evaluate(() => globalThis.__sd!.render()!.songNight)), JSON.stringify(await page.evaluate(() => globalThis.__sd!.render()!.bore)));
    await shot(page, 'fin-light', Number(w.slice(1)), w);
  }
  const r = await until(page, 'dawn', 2_000_000);
  console.log('dawn', JSON.stringify(r));
  await nextFrames(page);
  await shot(page, 'fin-light', 30, 'dawn0');
  for (const [n, t] of [[31, 160], [32, 160], [33, 200]] as const) {
    await page.evaluate((k) => globalThis.__sd!.fastForward(k), t);
    await nextFrames(page);
    console.log(n, JSON.stringify(await page.evaluate(() => globalThis.__sd!.render()!.songNight)));
    await shot(page, 'fin-light', n, `dawn${n}`);
  }
});
