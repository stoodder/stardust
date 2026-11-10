import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, playShift, waitForReady } from './hooks.ts';
const S = '/tmp/claude-0/-home-user-stardust/7156e6b1-e125-514b-89a1-eaea2df28fd8/scratchpad/t408/shots';
const snap = (page: Page, name: string) => page.screenshot({ path: `${S}/${name}.png` });

async function specialized(page: Page, tower: string, tile: readonly [number, number], spec: 'a' | 'b' | null): Promise<void> {
  const ok = await page.evaluate(([id, c, r, s]) => {
    const sd = globalThis.__sd!;
    sd.enqueue({ type: 'build', tower: id, tile: [c, r] });
    sd.fastForward(1);
    const pool = sd.state()!.towers;
    let uid = 0;
    for (let i = 0; i < pool.used; i++) { const t = pool.items[i]!; if (t.alive && t.col === c && t.row === r) uid = t.uid; }
    if (uid === 0) return 'not built';
    if (s === null) return 'ok';
    sd.enqueue({ type: 'upgrade', towerUid: uid });
    sd.enqueue({ type: 'upgrade', towerUid: uid });
    sd.enqueue({ type: 'specialize', towerUid: uid, spec: s });
    sd.fastForward(1);
    for (let i = 0; i < pool.used; i++) { const t = pool.items[i]!; if (t.alive && t.uid === uid) return t.spec === s ? 'ok' : 'no spec'; }
    return 'gone';
  }, [tower, tile[0], tile[1], spec] as const);
  expect(ok, `${tower} ${spec}`).toBe('ok');
}

test('t408 look', async ({ page }) => {
  await page.goto('/?test=1&seed=1&save=all_unlocked');
  await waitForReady(page);
  await playShift(page, 'Rig Nine');
  await expect(page.getByRole('heading', { name: 'Loadout' })).toBeVisible();
  const pressed = page.locator('.sd-lo-tower[aria-pressed="true"]');
  while ((await pressed.count()) > 0) await pressed.first().click();
  for (const n of ['Grapple Harpoon', 'Salvage Crane', 'Thumper', 'Zapcoil']) {
    await page.getByRole('button', { name: new RegExp(`^${n},`) }).click();
  }
  await snap(page, '00-loadout');
  await page.getByRole('button', { name: 'Lock in' }).click();
  const briefing = page.getByRole('dialog', { name: 'Shift briefing' });
  await expect(briefing).toBeVisible();
  await snap(page, '00b-briefing');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  await page.evaluate(() => { const sd = globalThis.__sd!; sd.setSpeed(0); Object.assign(sd.state()!, { credits: 9000 }); });
  await specialized(page, 'harpoon', [6, 4], 'a');
  await specialized(page, 'crane', [7, 5], 'a');
  await specialized(page, 'harpoon', [7, 7], 'b');
  await specialized(page, 'crane', [10, 5], 'b');
  await specialized(page, 'thumper', [9, 7], null);
  await page.evaluate(() => { const sd = globalThis.__sd!; sd.enqueue({ type: 'callWave' }); sd.fastForward(1); });
  await nextFrames(page);
  await snap(page, '01-built');
  let pins = 0; let sk = 0; let shotsTaken = 0; let pinShots = 0; let incomeShots = 0;
  for (let k = 0; k < 2500 && (pinShots < 3 || incomeShots < 2); k++) {
    const r0 = await page.evaluate(() => {
      const sd = globalThis.__sd!;
      const st = sd.state()!;
      const before = st.credits;
      sd.fastForward(6);
      if (st.schedule.phase === 'countdown') sd.enqueue({ type: 'callWave' });
      let flyerPinned = false;
      for (let i = 0; i < st.enemies.used; i++) { const e = st.enemies.items[i]!; if (e.alive && e.pinnedTicks > 0 && e.def?.layer === 'air') flyerPinned = true; }
      return { gain: st.credits - before, flyerPinned, wave: st.wave, resolved: st.schedule.resolved.filter(Boolean).length };
    });
    await nextFrames(page);
    const r = await page.evaluate(() => globalThis.__sd!.render()!.harpoon);
    if (r.pins > 0 && pinShots < 3 && (r0.flyerPinned || pinShots === 0)) { await snap(page, `1${pinShots}-pin-w${r0.wave}-p${r.pins}${r0.flyerPinned ? '-flyer' : ''}`); pinShots++; }
    if (r0.gain >= 20 && incomeShots < 2) { await page.waitForTimeout(150); await snap(page, `2${incomeShots}-income-w${r0.wave}-${r0.gain}`); incomeShots++; }
    pins = Math.max(pins, r.pins); sk = r.skewered;
  }
  console.log('pins', pins, 'skewered', sk);
  const st = await page.evaluate(() => ({ credits: globalThis.__sd!.state()!.credits, wave: globalThis.__sd!.state()!.wave }));
  console.log(JSON.stringify(st));
});
