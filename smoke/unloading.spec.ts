// T530b (T501f): A2M4's Tidybots unload at Intake B (`?map=a2_m04`, par). After W1 resolves the
// drones sweep the stardust specks as everywhere else, chime, then each rises to Intake B's hopper
// mouth (the `intake_b` marker), hangs over it pouring its load in (`unload`), and leaves; the
// drones take turns, and the field is swept and empty once they've gone. Screenshots in
// <out>/screens/unloading/ (look at them: the drone over the hopper, the stream falling in).
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';
import { outPath } from './out.ts';

/** Intake B's tile on A2M4 (its marker), and the drones' dock: the tile's centre. */
const INTAKE = [2, 6] as const;

test('unloading: A2M4’s Tidybots empty their loads into Intake B after a wave', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto('/?test=1&map=a2_m04&skipIntro=1&seed=1');
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
    // Par until W1 resolves and the sweep sets off.
    for (let k = 0; k < 60 * 600; k++) {
      if (sd.render()!.tidybots.sweeps > 0 || sd.state()!.outcome !== 'playing') break;
      sd.fastForward(1);
    }
  });
  expect(await page.evaluate(() => globalThis.__sd!.render()!.tidybots.sweeps)).toBe(1);

  // Drones are drawn per frame: step the sim a little at a time, letting the canvas follow, until
  // one hangs over the hopper (the sweep, the chime and the climb take a few seconds).
  let unloading = false;
  for (let k = 0; k < 200 && !unloading; k++) {
    // oxlint-disable-next-line no-await-in-loop -- each step must render before the next check
    unloading = await page.evaluate(async () => {
      const sd = globalThis.__sd!;
      sd.fastForward(6);
      await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
      return sd.render()!.tidybots.drones.some((d) => d.phase === 'unload');
    });
  }
  expect(unloading).toBe(true);
  const t = await page.evaluate(() => globalThis.__sd!.render()!.tidybots);
  const drone = t.drones.find((d) => d.phase === 'unload');
  expect(drone).toMatchObject({ x: INTAKE[0] + 0.5, y: INTAKE[1] + 0.5 });
  expect(t.unloads).toBeGreaterThanOrEqual(1);
  // One at a time at the hopper's mouth.
  expect(t.drones.filter((d) => d.phase === 'unload')).toHaveLength(1);
  await nextFrames(page);
  await shot(page, 'unloading', 1, 'intake-b');
  const at = await page.evaluate(([c, r]) => globalThis.__sd!.tileToClient(c, r), [
    INTAKE[0],
    INTAKE[1],
  ] as const);
  expect(at).not.toBeNull();
  await page.screenshot({
    path: outPath('screens/unloading/01b-intake-b-zoom.png'),
    clip: { x: at!.x - 80, y: at!.y - 110, width: 160, height: 150 },
  });

  // Every drone unloads and leaves; the field is swept.
  for (let k = 0; k < 120; k++) {
    // oxlint-disable-next-line no-await-in-loop -- each step must render before the next check
    const done = await page.evaluate(async () => {
      const sd = globalThis.__sd!;
      sd.fastForward(12);
      await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
      return sd.render()!.tidybots.drones.length === 0;
    });
    if (done) break;
  }
  const after = await page.evaluate(() => globalThis.__sd!.render()!.tidybots);
  expect(after.drones).toEqual([]);
  // Each drone of the sweep (one to three) unloaded once.
  expect(after.unloads).toBeGreaterThanOrEqual(t.unloads);
  expect(after.unloads).toBeLessThanOrEqual(3);
});
