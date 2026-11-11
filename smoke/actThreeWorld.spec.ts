// T630b: Act III's world on the real maps, played by par (`?map=<id>`, the reference profile;
// `__sd.autoplay('par')`), read through `__sd.render()` (`world`, `hollow.rifts`, `glow`):
// - A3M1: the rift cracks as `tile.rift` halves, old scars in setup, the north lane splitting as W1
//   starts (a wave ahead) and torn open as W2 starts; the Long Night's moons and glows.
// - A3M2: Sterling's shuttle parked until its cue (W12 + 10 s), then the bare pad and the ship
//   lifting off and climbing away until it's gone.
// - A3M3: the blast doors on the door cores, the convoy's west door open and the east one shut (and
//   the reverse for the warren, from a save that chose it); the SEAL pressed, the open door running
//   shut and holding sealed. Under reduced motion (the dev Holdout range): sealed at once, still.
// Screenshots in <out>/screens/act-three-world/ (look at them: the cracks, the lift, the doors).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

type Cond = 'w1' | 'w2' | 'w5' | 'w6' | 'shuttle' | 'seal';

/** Plays one tick at a time (up to `max`) until `cond` holds, then lets two frames render. */
async function until(page: Page, cond: Cond, max = 60 * 1200): Promise<boolean> {
  const held = await page.evaluate(
    ([c, limit]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      const st = sd.state()!;
      const check = (): boolean => {
        switch (c) {
          case 'w1':
            return st.wave >= 1;
          case 'w2':
            return st.wave >= 2;
          case 'w5':
            return st.wave >= 5;
          case 'w6':
            return st.wave >= 6;
          case 'shuttle':
            return sd.render()!.world.shuttle.left;
          case 'seal':
            return st.pendingInput !== null;
          default:
            return false;
        }
      };
      for (let k = 0; k < limit; k++) {
        if (check()) return true;
        if (st.outcome !== 'playing') return false;
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
}

const world = (page: Page) => page.evaluate(() => globalThis.__sd!.render()!.world);
const rifts = (page: Page) => page.evaluate(() => globalThis.__sd!.render()!.hollow.rifts);

/** Steps the sim `ticks` ticks (paused), then lets two frames render. */
async function step(page: Page, ticks: number): Promise<void> {
  await page.evaluate((n) => globalThis.__sd!.fastForward(n), ticks);
  await nextFrames(page);
}

test('A3M1: the rifts crack a wave ahead and tear open; the Long Night glows', async ({ page }) => {
  await open(page, '/?test=1&map=a3_m01&seed=1');
  // Setup: both lanes old scars, drawn as `tile.rift` halves; the moons and the world's glow up.
  expect(await rifts(page)).toEqual(['closed', 'closed']);
  const w0 = await world(page);
  expect(w0.cracks).toBeGreaterThan(4);
  expect(w0.openCracks).toBe(0);
  const glow = await page.evaluate(() => globalThis.__sd!.render()!.glow);
  expect(glow.moons).toBe(true);
  expect(glow.props).toBeGreaterThan(0);
  await shot(page, 'act-three-world', 1, 'a3m1-scars');
  // W1: the north lane (open from W2) splits, a wave ahead.
  expect(await until(page, 'w1')).toBe(true);
  expect(await rifts(page)).toEqual(['opening', 'closed']);
  await shot(page, 'act-three-world', 2, 'a3m1-opening');
  // W2: torn open.
  expect(await until(page, 'w2')).toBe(true);
  expect(await rifts(page)).toEqual(['open', 'closed']);
  expect((await world(page)).openCracks).toBeGreaterThan(0);
  await step(page, 120);
  await shot(page, 'act-three-world', 3, 'a3m1-open');
  // W5: the second lane (open from W6) splits.
  expect(await until(page, 'w5')).toBe(true);
  expect(await rifts(page)).toEqual(['open', 'opening']);
  await shot(page, 'act-three-world', 4, 'a3m1-second-opening');
});

test('A3M2: Sterling’s shuttle lifts off its pad on the cue and climbs away', async ({ page }) => {
  await open(page, '/?test=1&map=a3_m02&seed=1');
  expect((await world(page)).shuttle).toEqual({ left: false, lifting: false });
  expect(await page.evaluate(() => globalThis.__sd!.render()!.glow.moons)).toBe(true);
  await shot(page, 'act-three-world', 5, 'a3m2-parked');
  expect(await until(page, 'shuttle')).toBe(true);
  expect(await page.evaluate(() => globalThis.__sd!.state()!.wave)).toBe(12);
  expect((await world(page)).shuttle).toEqual({ left: true, lifting: true });
  await step(page, 50);
  await shot(page, 'act-three-world', 6, 'a3m2-lift-off');
  await step(page, 130);
  expect((await world(page)).shuttle.lifting).toBe(true);
  await shot(page, 'act-three-world', 7, 'a3m2-climbing');
  // The climb is over: the ship is gone, the pad bare.
  await step(page, 180);
  expect((await world(page)).shuttle).toEqual({ left: true, lifting: false });
  await shot(page, 'act-three-world', 8, 'a3m2-gone');
});

test('A3M3: the convoy’s door open, the warren’s shut; the SEAL runs it shut', async ({ page }) => {
  // No save: the convoy (C3's first value) walks to the west door.
  await open(page, '/?test=1&map=a3_m03&seed=1');
  expect((await world(page)).doors).toEqual([
    { marker: 'door_west', frame: 'open' },
    { marker: 'door_east', frame: 'shut' },
  ]);
  expect((await world(page)).seal).toBe('none');
  await shot(page, 'act-three-world', 9, 'a3m3-convoy-doors');
  // The SEAL: the player's hand presses it ('none' has no steps).
  await page.evaluate(() => globalThis.__sd!.autoplay('none'));
  expect(await until(page, 'seal')).toBe(true);
  await shot(page, 'act-three-world', 10, 'a3m3-seal-asked');
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.enqueue({ type: 'scriptInput', id: 'seal' });
    sd.fastForward(1);
  });
  await nextFrames(page);
  const closing = await world(page);
  expect(closing.seal).toBe('closing');
  expect(closing.doors[0]!.frame).toMatch(/^(closing_[0-2]|sealed_0)$/);
  expect(closing.doors[1]!.frame).toBe('shut');
  await shot(page, 'act-three-world', 11, 'a3m3-closing');
  await expect.poll(async () => (await world(page)).seal, { timeout: 1200 }).toBe('sealed');
  expect((await world(page)).doors[0]!.frame).toMatch(/^sealed_[01]$/);
  await shot(page, 'act-three-world', 12, 'a3m3-sealed');
});

test('A3M3: the warren’s door open when C3 chose it', async ({ page }) => {
  await page.goto('/?test=1&seed=1&save=after_a3m3_warren&map=a3_m03');
  await waitForReady(page);
  await page.evaluate(() => globalThis.__sd!.setSpeed(0));
  await nextFrames(page);
  expect((await world(page)).doors).toEqual([
    { marker: 'door_west', frame: 'shut' },
    { marker: 'door_east', frame: 'open' },
  ]);
  await shot(page, 'act-three-world', 13, 'a3m3-warren-doors');
});

test('the SEAL under reduced motion: the door is sealed at once, still', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/?test=1&map=dev_holdout&seed=1');
  await waitForReady(page);
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(0);
  });
  expect(await until(page, 'seal')).toBe(true);
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.enqueue({ type: 'scriptInput', id: 'seal' });
    sd.fastForward(1);
  });
  await nextFrames(page);
  const w = await world(page);
  expect(w.seal).toBe('sealed');
  expect(w.doors.map((d) => d.frame)).toEqual(['sealed_0', 'shut']);
  await page.waitForTimeout(600);
  expect((await world(page)).doors.map((d) => d.frame)).toEqual(['sealed_0', 'shut']);
  await shot(page, 'act-three-world', 14, 'reduced-sealed');
  await context.close();
});
