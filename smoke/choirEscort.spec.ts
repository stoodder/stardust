// T804: the finale's choir on its dev range (`?map=dev_voices`, render/__fixtures__/devM8.ts;
// sim/choir.ts). Undefended: once W1 starts, Pebble leads the 10 singers up the road from the
// colony's gate toward the Halls; the Motes coming down it halt the choir (the red halt window
// ahead of her), walk through her (she is never hushed), and hush the singers behind her, each one
// dimmed and drifting back to the tail as Voices falls; under ⌈40% × 10⌉ = 4 singing, the map is
// lost. Defended (par's three towers), the choir reaches the Halls with every voice and the map is
// won. Screenshots in <out>/screens/choir-escort/ (look at them: the column, the halt, the hushed).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

type Until = 'walking' | 'halted' | 'hushed' | 'end' | 'near' | 'arrived';

/** Steps the sim a tick at a time until `cond` holds or the map ends; returns the numbers. */
const until = (page: Page, cond: Until) =>
  page.evaluate((c) => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    const done = (): boolean => {
      const s = sd.state()!;
      if (s.outcome !== 'playing') return true;
      if (c === 'walking') return s.choir.dist > 0.5;
      if (c === 'halted') return s.choir.halted;
      if (c === 'hushed') return s.choir.voices < s.choir.singers;
      if (c === 'near') return s.choir.dist > 4.5;
      if (c === 'arrived') return s.choir.arrived;
      return false;
    };
    for (let k = 0; k < 20_000 && !done(); k++) sd.fastForward(1);
    const s = sd.state()!;
    return {
      outcome: s.outcome,
      singers: s.choir.singers,
      voices: s.choir.voices,
      voicesMin: s.stats.voicesMin,
      halted: s.choir.halted,
      arrived: s.choir.arrived,
      members: s.allies.items.filter((a) => a.alive && a.mode === 'choir').length,
    };
  }, cond);

const look = (page: Page) => page.evaluate(() => globalThis.__sd!.render()!.choirWalk);

test('choir escort: the column walks, halts for the Hollow, singers hushed trail, too few lose', async ({
  page,
}) => {
  await page.goto('/?test=1&map=dev_voices&seed=1');
  await waitForReady(page);
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
  });

  // Pebble and the 10 singers file out of the gate and up the road.
  const walking = await until(page, 'walking');
  expect(walking).toMatchObject({ outcome: 'playing', singers: 10, voices: 10, members: 11 });
  await nextFrames(page);
  expect(await look(page)).toMatchObject({ shown: 11, hushed: 0, rings: 0 });
  await shot(page, 'choir-escort', 1, 'walking');

  // A Mote close ahead of her: the choir halts, the window ahead of Pebble red.
  const halted = await until(page, 'halted');
  expect(halted).toMatchObject({ outcome: 'playing', halted: true });
  await nextFrames(page);
  expect((await look(page)).halted).toBe(true);
  await shot(page, 'choir-escort', 2, 'halted');

  // It walks through her and hushes a singer behind: kept on the road, dimmed, Voices down.
  const hushed = await until(page, 'hushed');
  expect(hushed).toMatchObject({ outcome: 'playing', members: 11 });
  expect(hushed.voices).toBeLessThan(10);
  await page.evaluate(() => globalThis.__sd!.fastForward(60)); // it drifts back a little
  await nextFrames(page);
  const dim = await look(page);
  expect(dim.shown).toBe(11);
  expect(dim.hushed).toBeGreaterThanOrEqual(1);
  await shot(page, 'choir-escort', 3, 'hushed');

  // Undefended, the Motes hush until fewer than 4 sing: the map is lost.
  const end = await until(page, 'end');
  expect(end).toMatchObject({ outcome: 'lost', voices: 3, voicesMin: 3 });
});

test('choir escort: defended, the choir reaches the Halls with every voice', async ({ page }) => {
  await page.goto('/?test=1&map=dev_voices&seed=1');
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
  // Most of the way up, the column filed out behind her and every voice singing.
  const near = await until(page, 'near');
  expect(near).toMatchObject({ outcome: 'playing', voices: 10 });
  await nextFrames(page);
  expect(await look(page)).toMatchObject({ shown: 11, hushed: 0 });
  await shot(page, 'choir-escort', 4, 'near-the-halls');
  // She reaches the Halls mouth with the last wave cleared: victory waits for her.
  const arrived = await until(page, 'arrived');
  expect(arrived).toMatchObject({ arrived: true, voices: 10 });
  const end = await until(page, 'end');
  expect(end).toMatchObject({ outcome: 'won', voices: 10, voicesMin: 10 });
});
