// T706: bearers and script groups on their dev range (`?map=dev_bearers`, render/__fixtures__/
// devM7.ts). Nothing is built. With no save the run takes `door_choice = convoy` (the flag that
// gates the militia post), so the militia stands at its post and fires down the road. As W2
// starts the bearers walk home along the back route, each a Brood Hauler with its violet burden;
// the Motes out of the vats behind them hush them one by one, and each hush takes 1 off the HUD's
// Bearers meter; the ones that reach the door are home (no meter change). The feed lines stand,
// so W3 starts with the surge, a script group counted in W3. Screenshots via shot().
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

type Until = 'walking' | 'hushed' | 'home' | 'surge';

/** Fast-forwards a tick at a time until `cond` holds or the map ends; returns the numbers. */
const until = (page: Page, cond: Until) =>
  page.evaluate((c) => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    const done = (): boolean => {
      const s = sd.state()!;
      if (s.outcome !== 'playing') return true;
      const bearers = s.allies.items.filter((a) => a.alive && a.kind === 'bearer');
      if (c === 'walking') return bearers.some((a) => a.dist > 1);
      if (c === 'hushed') return s.asset < 6;
      if (c === 'home') return s.stats.bearersHome > 0;
      return s.scriptGroupsSpawned.length > 0;
    };
    for (let k = 0; k < 20_000 && !done(); k++) sd.fastForward(1);
    const s = sd.state()!;
    return {
      outcome: s.outcome,
      wave: s.wave,
      asset: s.asset,
      home: s.stats.bearersHome,
      lost: s.stats.refugeesLost,
      surge: [...s.scriptGroupsSpawned],
      militia: s.allies.items.filter((a) => a.alive && a.kind === 'militia').length,
    };
  }, cond);

test('bearers: they carry their burden home, a hush costs the meter 1, and the surge walks in', async ({
  page,
}) => {
  await page.goto('/?test=1&map=dev_bearers&seed=1');
  await waitForReady(page);
  const meter = page.getByTestId('asset-meter');
  await expect(meter).toHaveAccessibleName(/^Bearers 6 of 6\. Carried home \d+ of 6$/);
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
  });

  // The militia is at its post under convoy (the gate's first variant with no save).
  const start = await until(page, 'walking');
  expect(start).toMatchObject({ outcome: 'playing', wave: 2, militia: 1, asset: 6 });
  await nextFrames(page);
  const walking = await page.evaluate(() => globalThis.__sd!.render()!.bearers);
  expect(walking.shown).toBeGreaterThan(0);
  expect(walking.burdens).toBe(walking.shown);
  expect(walking.militia).toBe(1);
  // Bearers are theirs to draw, not the refugees' (and not an enemy's).
  const look = await page.evaluate(() => globalThis.__sd!.render()!);
  expect(look.refugees.shown).toBe(0);
  await shot(page, 'bearers', 1, 'walking');

  // A Mote from the vats catches one: the meter drops by 1.
  const hushed = await until(page, 'hushed');
  expect(hushed).toMatchObject({ outcome: 'playing', asset: 5, lost: 1 });
  await nextFrames(page);
  await expect(meter).toHaveAccessibleName(/^Bearers 5 of 6\. Carried home \d+ of 6$/);
  await shot(page, 'bearers', 2, 'hushed');

  // One reaches the door: home, and the meter doesn't move.
  const home = await until(page, 'home');
  expect(home.home).toBe(1);
  expect(home.asset).toBe(6 - home.lost);
  const shots = await page.evaluate(() => globalThis.__sd!.render()!.bearers.shots);
  expect(shots).toBeGreaterThan(0);
  await shot(page, 'bearers', 3, 'home');

  // The feed lines still stand as W3 starts: the surge walks in.
  const surge = await until(page, 'surge');
  expect(surge).toMatchObject({ outcome: 'playing', wave: 3, surge: ['surge'] });
  await nextFrames(page);
  await shot(page, 'bearers', 4, 'surge');
});
