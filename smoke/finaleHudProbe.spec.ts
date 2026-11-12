import { test } from './fixtures.ts';
import { waitForReady } from './hooks.ts';
test('probe', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('/?test=1&map=fin_m01&seed=1&save=after_a3m6_keep');
  await waitForReady(page);
  await page.keyboard.press('Escape');
  const info = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    const st = sd.state()!;
    const b = null;
    return { b: JSON.stringify(Object.keys(b ?? {})), choir: st.choir.singers, phase: st.phase };
  });
  console.log(JSON.stringify(info));
  const t0 = Date.now();
  const out = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
    sd.fastForward(0);
    const st = sd.state()!;
    let k = 0;
    for (; k < 200000 && st.phase < 2 && st.outcome === 'playing'; k++) sd.fastForward(1);
    const p2 = { k, wave: st.wave, outcome: st.outcome, voices: st.choir.voices, singers: st.choir.singers };
    for (let j = 0; j < 60 * 30 && st.outcome === 'playing'; j++) sd.fastForward(1);
    return { p2, pending: JSON.stringify(st.pendingInput), locked: st.abilitiesLocked, rest: [st.restPoints, st.restTarget], phase: st.phase, revoked: JSON.stringify(st.revoked) };
  });
  console.log(JSON.stringify(out), Date.now() - t0);
  await page.screenshot({ path: '/tmp/claude-0/-home-user-stardust/7156e6b1-e125-514b-89a1-eaea2df28fd8/scratchpad/T832/probe.png' });
});
