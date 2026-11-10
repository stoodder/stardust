// T305c: Escort on the dev escort range (`?map=dev_escort`, render/__fixtures__/devBattle.ts): two
// refugee groups (Pebble with the first) walk the west road to the gate, the core tile, while Motes
// come in behind. Nothing is built. The HUD's Evacuated readout stands in for the core's meter
// ("Evacuated 0 of 12, lost 0/6"); the refugees show on the road (Skitterkin in the allies'
// palette, placeholders), a hushed one freezes and the lost count rises, the evacuated count
// rises at the gate, and the map ends. Screenshots in test-results/screens/escort/.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

/** Fast-forwards a tick at a time until `cond` (by name) holds or the map ends; returns the numbers. */
const until = (page: Page, cond: 'shown' | 'held' | 'evacuated' | 'end') =>
  page.evaluate((c) => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    const done = (): boolean => {
      const s = sd.state()!;
      if (s.outcome !== 'playing') return true;
      const items = s.allies.items.slice(0, s.allies.used).filter((a) => a.alive && a.group >= 0);
      if (c === 'shown') return items.filter((a) => a.dist >= 0).length >= 3;
      if (c === 'held') return items.some((a) => a.hushUid !== 0);
      if (c === 'evacuated') return s.stats.evacuated > 0;
      return false;
    };
    for (let k = 0; k < 20_000 && !done(); k++) sd.fastForward(1);
    const s = sd.state()!;
    return {
      outcome: s.outcome,
      objective: s.objective,
      evacuated: s.stats.evacuated,
      lost: s.stats.refugeesLost,
      integrity: s.integrity,
    };
  }, cond);

test('escort: refugees walk to the gate under the Evacuated meter; the hushed are lost', async ({
  page,
}) => {
  await page.goto('/?test=1&map=dev_escort&seed=1');
  await waitForReady(page);
  const meter = page.getByTestId('escort-meter');
  await expect(meter).toBeVisible();
  await expect(meter).toHaveAccessibleName('Evacuated 0 of 12, lost 0/6');
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
  });

  // The first group (and Pebble) files onto the road as W1 starts.
  const walking = await until(page, 'shown');
  expect(walking).toMatchObject({ outcome: 'playing', objective: 'escort' });
  await nextFrames(page);
  expect((await page.evaluate(() => globalThis.__sd!.render()!.refugees)).shown).toBeGreaterThan(2);
  await shot(page, 'escort', 1, 'walking');

  // A Mote catches one: both freeze for the tell, then the lost count rises.
  const hush = await until(page, 'held');
  expect(hush.outcome).toBe('playing');
  await nextFrames(page);
  expect((await page.evaluate(() => globalThis.__sd!.render()!.refugees)).held).toBeGreaterThan(0);
  await shot(page, 'escort', 2, 'hush');
  await page.evaluate(() => globalThis.__sd!.fastForward(40)); // the tell lands
  await nextFrames(page);
  await expect(meter).toHaveAccessibleName(/, lost [1-6]\/6$/);

  // Someone reaches the gate: the Evacuated count rises; the core's integrity never moves.
  const safe = await until(page, 'evacuated');
  expect(safe.evacuated).toBeGreaterThan(0);
  await nextFrames(page);
  await expect(meter).toHaveAccessibleName(
    `Evacuated ${safe.evacuated} of 12, lost ${safe.lost}/6`,
  );
  await shot(page, 'escort', 3, 'evacuated');

  const end = await until(page, 'end');
  expect(end.outcome).not.toBe('playing');
  expect(end.integrity).toBe(20);
  expect(end.lost).toBeGreaterThan(0);
});
