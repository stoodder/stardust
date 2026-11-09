// T407b: the Skyhook's and Zapcoil's specs in play on the dev sky range (`?map=dev_sky`, whose
// reference profile unlocks both pairs): Seeker Swarm's missiles climbing, turning, and trailing
// smoke as they steer; Capacitor Bank's orb growing on its coil, then the discharge (the doubled
// bolt, the splash ring); and Flak Curtain's puffs hanging where its bursts went off. Asserted
// through `__sd.render().specs` as well as screenshotted. Screenshots in
// test-results/screens/tower-specs/ (look at them: the effects are the point).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

/** Where each spec stands: Seekers and the Curtain under the air lane, the bank by the road. */
const SEEKER = [9, 4] as const;
const CURTAIN = [8, 3] as const;
const BANK = [4, 2] as const;

/** Builds a tower on `tile`, takes it to tier 3, and specializes it. */
async function specialized(
  page: Page,
  tower: string,
  tile: readonly [number, number],
  spec: 'a' | 'b',
): Promise<void> {
  const done = await page.evaluate(
    ([id, c, r, s]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      sd.enqueue({ type: 'build', tower: id, tile: [c, r] });
      sd.fastForward(1);
      const pool = sd.state()!.towers;
      let uid = 0;
      for (let i = 0; i < pool.used; i++) {
        const t = pool.items[i]!;
        if (t.alive && t.col === c && t.row === r) uid = t.uid;
      }
      sd.enqueue({ type: 'upgrade', towerUid: uid });
      sd.enqueue({ type: 'upgrade', towerUid: uid });
      sd.enqueue({ type: 'specialize', towerUid: uid, spec: s });
      sd.fastForward(1);
      for (let i = 0; i < pool.used; i++) {
        const t = pool.items[i]!;
        if (t.alive && t.uid === uid) return t.spec === s;
      }
      return false;
    },
    [tower, tile[0], tile[1], spec] as const,
  );
  expect(done, `${tower} ${spec}`).toBe(true);
}

/** The bank's charge now, and its full charge (240 ticks with no rate bonus). */
async function bankCharge(page: Page): Promise<number> {
  return page.evaluate(([c, r]) => {
    const pool = globalThis.__sd!.state()!.towers;
    for (let i = 0; i < pool.used; i++) {
      const t = pool.items[i]!;
      if (t.alive && t.col === c && t.row === r) return t.chargeTicks;
    }
    return -1;
  }, BANK);
}

test('tower specs: seekers, the capacitor charge and discharge, and the flak curtain', async ({
  page,
}) => {
  await page.goto('/?test=1&map=dev_sky&seed=1');
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    // The range's 700 credits buy one spec; the smoke wants three.
    Object.assign(sd.state()!, { credits: 5000 });
  });
  await specialized(page, 'skyhook', SEEKER, 'b');
  await specialized(page, 'skyhook', CURTAIN, 'a');
  await specialized(page, 'zapcoil', BANK, 'b');
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
  });

  // The Nibblers reach the bank: its orb grows a step per quarter of the charge. Step a few
  // frames through the charge so the view sees it fill.
  for (let k = 0; k < 400 && (await bankCharge(page)) < 185; k++) {
    await page.evaluate(() => globalThis.__sd!.fastForward(5));
  }
  expect(await bankCharge(page)).toBeGreaterThanOrEqual(185);
  await nextFrames(page);
  const charging = await page.evaluate(() => globalThis.__sd!.render()!.specs);
  expect(charging.glows).toBeGreaterThanOrEqual(1);
  await shot(page, 'tower-specs', 1, 'capacitor-full');

  // It discharges: the doubled bolt and the splash ring (render counts it from the event).
  const discharged = await page.evaluate(
    ([c, r]) => {
      const sd = globalThis.__sd!;
      const pool = sd.state()!.towers;
      let bank = null;
      for (let i = 0; i < pool.used; i++) {
        const t = pool.items[i]!;
        if (t.alive && t.col === c && t.row === r) bank = t;
      }
      for (let k = 0; k < 300 && bank !== null; k++) {
        const before = bank.chargeTicks;
        sd.fastForward(1);
        if (bank.chargeTicks === 0 && before > 0) return true;
      }
      return false;
    },
    [BANK[0], BANK[1]] as const,
  );
  expect(discharged).toBe(true);
  await nextFrames(page);
  expect((await page.evaluate(() => globalThis.__sd!.render()!.specs)).discharges).toBeGreaterThan(
    0,
  );
  await shot(page, 'tower-specs', 2, 'capacitor-discharge');

  // The flock comes down the lane: the Seekers' volley steers in, trailing smoke. Several frames
  // with ticks between them lay the trail (it samples on sim ticks).
  let seekers = 0;
  for (let k = 0; k < 300 && seekers === 0; k++) {
    await page.evaluate(() => globalThis.__sd!.fastForward(2));
    await nextFrames(page);
    seekers = (await page.evaluate(() => globalThis.__sd!.render()!.specs)).seekers;
  }
  expect(seekers).toBeGreaterThan(0);
  for (let k = 0; k < 3; k++) {
    await page.evaluate(() => globalThis.__sd!.fastForward(2));
    await nextFrames(page);
  }
  await shot(page, 'tower-specs', 3, 'seeker-swarm');

  // Flak Curtain's bursts leave puffs hanging over the lane (they fade on real time).
  let puffs = 0;
  for (let k = 0; k < 200 && puffs === 0; k++) {
    await page.evaluate(() => globalThis.__sd!.fastForward(3));
    await nextFrames(page);
    puffs = (await page.evaluate(() => globalThis.__sd!.render()!.specs)).puffs;
  }
  expect(puffs).toBeGreaterThan(0);
  await shot(page, 'tower-specs', 4, 'flak-curtain');
});
