// T805: the Leaving Song on its dev range (`?map=dev_song`, render/__fixtures__/devM8.ts). Par's
// three towers go up; Phase 2 is set as W1 starts, so the song acts from the first Mote. The
// choir starts far down the road, so W1's Motes broken up the road scatter: cold-violet motes
// drift back two tiles and hover where the unit lies (no body drawn), then draw in as it re-forms
// at half HP. Once the choir is close, a Mote broken inside the song flips gold and its motes
// rise. At p = 1 Dawn's event lays every Hollow unit to rest and the map is won. Screenshots in
// <out>/screens/song/ (look at them: gold rising against violet drifting is the point).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

type Until = 'scattered' | 'reformed' | 'rested' | 'dawn';

/** Steps the sim a tick at a time until `cond` holds or the map ends; returns the numbers. */
const until = (page: Page, cond: Until) =>
  page.evaluate((c) => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    let reformed = false;
    let seenScattered = false;
    const done = (): boolean => {
      const s = sd.state()!;
      if (s.outcome !== 'playing') return true;
      const scattered = s.enemies.items.some((e) => e.alive && e.scatterTicks > 0);
      if (scattered) seenScattered = true;
      // A unit that was scattered is live again with HP: it re-formed.
      if (seenScattered && s.enemies.items.some((e) => e.alive && e.scatteredOnce && e.hp > 0)) {
        reformed = true;
      }
      if (c === 'scattered') return scattered;
      if (c === 'reformed') return reformed;
      if (c === 'rested') return s.stats.restedKills > 0;
      return false;
    };
    for (let k = 0; k < 20_000 && !done(); k++) sd.fastForward(1);
    const s = sd.state()!;
    return {
      outcome: s.outcome,
      phase: s.phase,
      restPoints: s.restPoints,
      restTarget: s.restTarget,
      rested: s.stats.restedKills,
      scatteredKills: s.stats.scatteredKills,
      scatteredNow: s.enemies.items.filter((e) => e.alive && e.scatterTicks > 0).length,
      live: s.enemies.live,
    };
  }, cond);

test('song: violet scatter and re-form outside the song, gold rest inside it, then Dawn', async ({
  page,
}) => {
  await page.goto('/?test=1&map=dev_song&seed=1');
  await waitForReady(page);
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.enqueue({ type: 'build', tower: 'zapcoil', tile: [4, 3] });
    sd.enqueue({ type: 'build', tower: 'rivet', tile: [8, 3] });
    sd.enqueue({ type: 'build', tower: 'rivet', tile: [4, 1] });
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
  });

  // W1's first Mote broken up the road, out of the song: it scatters, and no body is drawn.
  const scattered = await until(page, 'scattered');
  expect(scattered).toMatchObject({ outcome: 'playing', phase: 2, rested: 0 });
  expect(scattered.scatteredNow).toBeGreaterThan(0);
  await page.evaluate(() => globalThis.__sd!.fastForward(20)); // the motes drift a little
  await nextFrames(page);
  const drift = await page.evaluate(() => globalThis.__sd!.render()!.song);
  expect(drift.scattersSeen).toBeGreaterThan(0);
  expect(drift.scatters).toBeGreaterThan(0);
  await shot(page, 'song', 1, 'scattered');

  // 4 s later it re-forms at half HP.
  const reformed = await until(page, 'reformed');
  expect(reformed.outcome).toBe('playing');
  await nextFrames(page);
  const back = await page.evaluate(() => globalThis.__sd!.render()!.song);
  expect(back.reformsSeen).toBeGreaterThan(0);
  await shot(page, 'song', 2, 'reformed');

  // A Mote broken inside the song is laid to rest: the gold flip and rising motes.
  const rested = await until(page, 'rested');
  expect(rested.outcome).toBe('playing');
  expect(rested.rested).toBeGreaterThan(0);
  expect(rested.restPoints).toBeGreaterThan(0);
  await page.evaluate(() => globalThis.__sd!.fastForward(20)); // past the flip: the motes rise
  await nextFrames(page);
  const gold = await page.evaluate(() => globalThis.__sd!.render()!.song);
  expect(gold.restsSeen).toBeGreaterThan(0);
  expect(gold.rests).toBeGreaterThan(0);
  await shot(page, 'song', 3, 'laid-to-rest');

  // p = 1: Dawn lays every Hollow unit to rest, and the map is won.
  const dawn = await until(page, 'dawn');
  expect(dawn).toMatchObject({ outcome: 'won', live: 0 });
  expect(dawn.restPoints).toBe(dawn.restTarget);
  await nextFrames(page);
  await shot(page, 'song', 4, 'dawn');
});
