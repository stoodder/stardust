import { test } from './fixtures.ts';
import { nextFrames, waitForReady } from './hooks.ts';
const S = '/tmp/claude-0/-home-user-stardust/7156e6b1-e125-514b-89a1-eaea2df28fd8/scratchpad/T832';
const TAG = process.env['T832_TAG'] ?? 'before';
test('probe', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('/?test=1&map=fin_m01&seed=1&save=after_a3m6_keep');
  await waitForReady(page);
  await page.evaluate(() => globalThis.__sd!.goto('settings'));
  await page.locator('[data-difficulty="story"]').click();
  await page.evaluate(() => globalThis.__sd!.goto('loadout'));
  await page.locator('[data-companion="quill"]').click();
  await page.getByRole('button', { name: /lock in/i }).click();
  await page.waitForTimeout(1000);
  const run = (cond: string) => page.evaluate((c) => {
    const sd = globalThis.__sd!;
    const st = sd.state()!;
    const ok = () => c === 'p1' ? st.wave >= 6 && st.schedule.phase !== 'countdown' && st.choir.dist > 8 : c === 'p2' ? st.phase >= 2 && st.tick - st.phaseTick > 60 * 26 : st.phase >= 3 && st.tick - st.phaseTick > 60 * 3;
    for (let k = 0; k < 300000 && !ok() && st.outcome === 'playing'; k++) sd.fastForward(1);
    return { wave: st.wave, phase: st.phase, outcome: st.outcome, voices: st.choir.voices, locked: [...st.abilitiesLocked], pending: st.pendingInput };
  }, cond);
  await page.evaluate(() => { const sd = globalThis.__sd!; sd.setSpeed(0); sd.autoplay('par'); sd.fastForward(0); });
  for (const c of ['p1', 'p2', 'p3']) {
    console.log(c, JSON.stringify(await run(c)));
    await page.evaluate(() => globalThis.__sd!.fastForward(20));
    await nextFrames(page);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${S}/${TAG}-${c}.png` });
  }
});
