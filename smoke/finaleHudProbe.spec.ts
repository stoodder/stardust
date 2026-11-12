import { test } from './fixtures.ts';
import { waitForReady } from './hooks.ts';
const S = '/tmp/claude-0/-home-user-stardust/7156e6b1-e125-514b-89a1-eaea2df28fd8/scratchpad/T832';
test('probe', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('/?test=1&map=fin_m01&seed=1&save=after_a3m6_keep');
  await waitForReady(page);
  await page.evaluate(() => globalThis.__sd!.goto('loadout'));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${S}/probe-loadout.png` });
  const slots = await page.locator('[data-testid="loadout-tower"]').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-tower')}:${e.getAttribute('aria-checked')}`));
  console.log(slots.join(' '));
  const html = await page.locator('main, body').first().innerText();
  console.log(html.slice(0, 1500));
});
