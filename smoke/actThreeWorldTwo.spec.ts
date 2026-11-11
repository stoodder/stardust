// T730b: Act III's world, part two, on the real maps, played by par (`?map=<id>`, the reference
// profile from each map's dev save; `__sd.autoplay('par')`), read through `__sd.render()`
// (`world.site`, `world.domes`, `everglowJams.plates`, `glow`):
// - A3M4: the shelter generator in the hall where the core was; HE HELD THE DOOR by the hall under
//   the convoy, the humming ring under the warren (C3's `door_choice`, from the save).
// - A3M5: the vats at full blaze and the burst feed lines at night, the hangar shut; it rolls open
//   once "Shareholder Value" is out; at the jettison the four plates fly off the hull and land on
//   the crash site.
// - A3M6: Dome 1 open beside the gate, Pebble on the Peeker's rock, Zibzab's crate, the barricade;
//   the first refugee turning in at Dome 1's door; Dome 1 frosting over as the night goes on; on
//   the win, the apron's dark domes opening one after another before Results.
// - Reduced motion: the plates lie on the crash site at once (dev_takeover).
// Screenshots in <out>/screens/act-three-world-two/ (look at them: the generator, both memorials,
// the vats' glow, the hangar, the plates in the air and down, Dome 1, the rock, the turn-in).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

type Cond = 'boss' | 'jettison' | 'sheltered' | 'w7' | 'w14' | 'won';

/** Plays one tick at a time (up to `max`) until `cond` holds, then lets two frames render. */
async function until(page: Page, cond: Cond, max = 60 * 1500): Promise<boolean> {
  const held = await page.evaluate(
    ([c, limit]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      // Read afresh each tick: closing a briefing rebuilds the battle (a new state).
      const check = (): boolean => {
        const st = sd.state()!;
        switch (c) {
          case 'boss':
            return st.enemies.items.some(
              (e) => e.alive && e.def?.id === 'shareholder_value' && st.tick % 30 === 0,
            );
          case 'jettison':
            return st.tilesOpened.length >= 4;
          case 'sheltered':
            return st.stats.evacuated >= 1;
          case 'w7':
            return st.wave >= 7;
          case 'w14':
            return st.wave >= 14;
          case 'won':
            return st.outcome === 'won';
          default:
            return false;
        }
      };
      for (let k = 0; k < limit; k++) {
        if (check()) return true;
        if (sd.state()!.outcome !== 'playing') return false;
        sd.fastForward(1);
      }
      return check();
    },
    [cond, max] as const,
  );
  await nextFrames(page);
  return held;
}

/** Opens `url`'s battle paused, par building as it goes. */
async function open(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await waitForReady(page);
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
    sd.fastForward(0);
  });
  await nextFrames(page);
  // Closing the briefing rebuilds the battle: par plays the new one.
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
    sd.fastForward(0);
  });
  await nextFrames(page);
}

const world = (page: Page) => page.evaluate(() => globalThis.__sd!.render()!.world);

/** Steps the sim `ticks` ticks (paused), then lets two frames render. */
async function step(page: Page, ticks: number): Promise<void> {
  await page.evaluate((n) => globalThis.__sd!.fastForward(n), ticks);
  await nextFrames(page);
}

test('A3M4: the generator in the hall; the convoy’s memorial, then the warren’s', async ({
  page,
}) => {
  await open(page, '/?test=1&seed=1&save=after_a3m3_convoy&map=a3_m04');
  const glow = await page.evaluate(() => globalThis.__sd!.render()!.glow);
  expect(glow.moons).toBe(true);
  expect(glow.props).toBeGreaterThan(0);
  await shot(page, 'act-three-world-two', 1, 'a3m4-convoy');
  await open(page, '/?test=1&seed=1&save=after_a3m3_warren&map=a3_m04');
  await shot(page, 'act-three-world-two', 2, 'a3m4-warren');
});

test('A3M5: the vats and the hangar at night; the hangar opens; the plates land', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await open(page, '/?test=1&seed=1&save=after_a3m4_keep&map=a3_m05');
  expect((await world(page)).site).toEqual({ plates: 0, landed: 0, hangar: 'shut_0' });
  await shot(page, 'act-three-world-two', 3, 'a3m5-night');
  // "Shareholder Value" rolls out: the hangar stands open behind it.
  expect(await until(page, 'boss')).toBe(true);
  expect((await world(page)).site.hangar).toBe('open');
  await step(page, 30);
  await shot(page, 'act-three-world-two', 4, 'a3m5-hangar-open');
  // The jettison: four plates off the hull, in the air, then down on the crash site.
  expect(await until(page, 'jettison')).toBe(true);
  await step(page, 30);
  const flying = await world(page);
  expect(flying.site.plates).toBe(4);
  expect(flying.site.landed).toBeLessThan(4);
  await shot(page, 'act-three-world-two', 5, 'a3m5-plates-flying');
  await step(page, 100);
  expect((await world(page)).site).toEqual({ plates: 4, landed: 4, hangar: 'open' });
  expect(await page.evaluate(() => globalThis.__sd!.render()!.everglowJams.plates)).toBe(4);
  await shot(page, 'act-three-world-two', 6, 'a3m5-plates-down');
});

test('A3M6: Dome 1 by the gate, Pebble on her rock; the turn-in; the frost', async ({ page }) => {
  test.setTimeout(90_000);
  await open(page, '/?test=1&seed=1&save=after_a3m5_keep&map=a3_m06');
  expect((await world(page)).domes).toEqual({
    dome: 'open',
    turningIn: 0,
    turnedIn: 0,
    opened: 0,
  });
  await shot(page, 'act-three-world-two', 7, 'a3m6-setup');
  // The first refugee reaches the gate and turns in at Dome 1's door.
  expect(await until(page, 'sheltered')).toBe(true);
  await step(page, 14);
  const turning = (await world(page)).domes;
  expect(turning.turnedIn).toBeGreaterThan(0);
  expect(turning.turningIn).toBeGreaterThan(0);
  await shot(page, 'act-three-world-two', 8, 'a3m6-turn-in');
  // The night goes on: the panes frost over.
  expect(await until(page, 'w7')).toBe(true);
  expect((await world(page)).domes.dome).toBe('frost_1');
  expect(await until(page, 'w14')).toBe(true);
  expect((await world(page)).domes.dome).toBe('frost_2');
  await shot(page, 'act-three-world-two', 9, 'a3m6-frost');
  // The win: in the hold before Results, the apron's dark domes open one after another.
  expect(await until(page, 'won')).toBe(true);
  await expect.poll(async () => (await world(page)).domes.opened, { timeout: 1400 }).toBe(2);
  await shot(page, 'act-three-world-two', 10, 'a3m6-domes-open');
});

test('reduced motion: the plates lie on the crash site at once', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/?test=1&map=dev_takeover&seed=1');
  await waitForReady(page);
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
    sd.fastForward(0);
  });
  expect(await until(page, 'jettison', 60 * 600)).toBe(true);
  await step(page, 1);
  expect((await world(page)).site).toMatchObject({ plates: 4, landed: 4 });
  await shot(page, 'act-three-world-two', 11, 'reduced-plates');
  await context.close();
});
