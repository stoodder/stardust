// T312a: air and M3's effects on the dev sky range (`?map=dev_sky`, render/__fixtures__/
// devBattle.ts): the dotted air lane (up in setup because wave 1 brings Puffwings), flyers 12 px up
// over their shadows, Skyhook flak climbing and bursting at a flock, a Zapcoil's chain arcs beside a
// Sprinkler (the Conductive tether), Gerald plinking off a Rivet, and Time Dilation's tint.
// Screenshots in test-results/screens/air/ (look at them: the effects are the point).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

const SKY_MAP = 'dev_sky';

async function open(page: Page): Promise<void> {
  await page.goto(`/?test=1&map=${SKY_MAP}&seed=1`);
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate(() => globalThis.__sd!.setSpeed(0)); // installed: waitForReady passed
}

/**
 * Steps the sim one tick at a time (up to `max`) until the tower `tower` fires (its cooldown
 * restarts), then lets two frames render: the shot's effects (and anything else this burst of ticks
 * set off) are on screen. Returns whether it fired.
 */
async function untilFires(page: Page, tower: string, max = 600): Promise<boolean> {
  const fired = await page.evaluate(
    ([id, limit]) => {
      const sd = globalThis.__sd!;
      const pool = sd.state()!.towers;
      let t = null;
      for (let i = 0; i < pool.used; i++) if (pool.items[i]!.def?.id === id) t = pool.items[i]!;
      if (t === null) return false;
      for (let k = 0; k < limit; k++) {
        const before = t.cooldownTicks;
        sd.fastForward(1);
        if (t.cooldownTicks > before) return true;
      }
      return false;
    },
    [tower, max] as const,
  );
  await nextFrames(page);
  return fired;
}

/** Steps the sim until `count()` of the state rises (up to `max` ticks), then renders. */
async function untilNeutralHit(page: Page, max = 900): Promise<boolean> {
  const hit = await page.evaluate((limit) => {
    const sd = globalThis.__sd!;
    const stats = sd.state()!.stats;
    const before = stats.neutralHits;
    for (let k = 0; k < limit; k++) {
      sd.fastForward(1);
      if (stats.neutralHits > before) return true;
    }
    return false;
  }, max);
  await nextFrames(page);
  return hit;
}

/** Steps the sim until no shot is in flight (a flak burst has just landed), then renders. */
async function untilLanded(page: Page, max = 120): Promise<void> {
  await page.evaluate((limit) => {
    const sd = globalThis.__sd!;
    const shots = sd.state()!.projectiles;
    for (let k = 0; k < limit && shots.live > 0; k++) sd.fastForward(1);
  }, max);
  await nextFrames(page);
}

test('air: the lane, flyers, flak, chain arcs, Gerald, and Time Dilation', async ({ page }) => {
  await open(page);
  await shot(page, 'air', 1, 'setup-lane');

  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    // A Skyhook under the lane, a Zapcoil beside a Sprinkler (Conductive) and a Rivet by the path.
    sd.enqueue({ type: 'build', tower: 'skyhook', tile: [9, 4] });
    sd.enqueue({ type: 'build', tower: 'zapcoil', tile: [4, 1] });
    sd.enqueue({ type: 'build', tower: 'sprinkler', tile: [4, 2] });
    sd.enqueue({ type: 'build', tower: 'rivet', tile: [5, 4] });
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
  });
  const towers = await page.evaluate(() => globalThis.__sd!.state()!.towers.live);
  expect(towers).toBe(4);
  const links = await page.evaluate(() => globalThis.__sd!.state()!.linkPairs.length);
  expect(links).toBeGreaterThanOrEqual(1); // Conductive
  await nextFrames(page);
  await shot(page, 'air', 2, 'conductive-tether');

  // Gerald overtakes the Nibblers: the Rivet's shots plink off him.
  expect(await untilNeutralHit(page)).toBe(true);
  await shot(page, 'air', 3, 'gerald-plink');

  // The Nibblers reach the Zapcoil: the arc jumps from one to the next.
  expect(await untilFires(page, 'zapcoil')).toBe(true);
  await shot(page, 'air', 4, 'chain-arc');

  // The flock comes down the lane into the Skyhook's range: flak climbs, then bursts in the air.
  expect(await untilFires(page, 'skyhook')).toBe(true);
  await page.evaluate(() => globalThis.__sd!.fastForward(6));
  await nextFrames(page);
  await shot(page, 'air', 5, 'flak-flight');
  await untilLanded(page);
  await shot(page, 'air', 6, 'flak-burst');
  expect(await untilFires(page, 'skyhook')).toBe(true);
  await untilLanded(page);
  await shot(page, 'air', 7, 'flak-burst-2');

  // QUILL's Time Dilation (slot 2): the playfield tints while the field lives.
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.enqueue({ type: 'ability', slot: 2 });
    sd.fastForward(1);
  });
  const field = await page.evaluate(() => {
    const z = globalThis.__sd!.state()!.zones;
    for (let i = 0; i < z.used; i++)
      if (z.items[i]!.alive && z.items[i]!.kind === 'field') return true;
    return false;
  });
  expect(field).toBe(true);
  await page.evaluate(() => globalThis.__sd!.fastForward(30));
  await nextFrames(page);
  await shot(page, 'air', 8, 'time-dilation');
  // Once the field has run out, the tint is gone.
  await page.evaluate(() => globalThis.__sd!.fastForward(400));
  await nextFrames(page);
  await shot(page, 'air', 9, 'after-field');
});
