// T831 exploratory (replaced below).
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

test('explore fin_m01 light', async ({ page }) => {
  test.setTimeout(240_000);
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
  for (const w of [1, 4, 9]) {
    await page.evaluate((target) => {
      const sd = globalThis.__sd!;
      const st = sd.state()!;
      for (let k = 0; k < 200_000 && st.wave < target && st.outcome === 'playing'; k++) sd.fastForward(1);
      sd.fastForward(600);
    }, w);
    await nextFrames(page);
    await shot(page, 'fin-light', w, `w${w}`);
  }
});
