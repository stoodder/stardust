// T702: the jamming core on its dev range (`?map=dev_silence`, render/__fixtures__/devJam.ts). A
// Hum Choir beside the road with Rivets around it; W1's Silencer stops and sends its tendril
// creeping toward the Choir (JamView: an ink-and-violet rope with a swelling bead at its tip), then
// the Choir is Jammed (T730a: drawn in its steel `+jammed` variant under `fx.jam_static`, a white
// countdown ring round its base); System Reboot, cast from slot 1, clears it: a white flash, a teal
// power-on column and ring. Screenshots in <out>/screens/jam/ (look at them:
// the tendril, the static, and the arc are the point).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

type Probe = 'tell' | 'jammed';

/** Steps the sim a tick at a time (up to `max`) until a tendril shows or a tower is Jammed. */
async function until(page: Page, what: Probe, max = 1800): Promise<boolean> {
  const hit = await page.evaluate(
    ([probe, limit]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      const st = sd.state()!;
      const seen = (): boolean => {
        if (probe === 'jammed') return st.towers.items.some((t) => t.alive && t.jamTicks > 0);
        return st.enemies.items.some((e) => e.alive && e.jamTarget !== 0 && e.jamTellTicks > 0);
      };
      for (let k = 0; k < limit; k++) {
        if (seen()) return true;
        sd.fastForward(1);
      }
      return seen();
    },
    [what, max] as const,
  );
  await nextFrames(page);
  return hit;
}

test('jam: the tendril tell, the Jammed Choir, and System Reboot clearing it', async ({ page }) => {
  await page.goto('/?test=1&map=dev_silence&seed=1');
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    // A Silencer tells as soon as a tower is in reach (T760), so the Choir is the first tower on
    // its road here and a Rivet stands past it.
    sd.enqueue({ type: 'build', tower: 'choir', tile: [7, 2] });
    sd.enqueue({ type: 'build', tower: 'rivet', tile: [12, 2] });
    sd.fastForward(1);
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
  });

  // The tell: the Silencer holds still and its tendril creeps toward the Choir.
  expect(await until(page, 'tell')).toBe(true);
  await page.evaluate(() => globalThis.__sd!.fastForward(60)); // halfway: the tendril half-grown
  await nextFrames(page);
  let look = await page.evaluate(() => globalThis.__sd!.render()!.jams);
  expect(look).toMatchObject({ tells: 1, jammed: 0, tellsSeen: 1 });
  const target = await page.evaluate(() => {
    const st = globalThis.__sd!.state()!;
    const e = st.enemies.items.find((x) => x.alive && x.jamTarget !== 0)!;
    return st.towers.items.find((t) => t.alive && t.uid === e.jamTarget)?.def?.id;
  });
  expect(target).toBe('choir'); // a Choir in reach first
  await shot(page, 'jam', 1, 'tendril');

  // Jammed: the static and the countdown arc over the Choir.
  expect(await until(page, 'jammed', 120)).toBe(true);
  await page.evaluate(() => globalThis.__sd!.fastForward(30));
  await nextFrames(page);
  look = await page.evaluate(() => globalThis.__sd!.render()!.jams);
  expect(look).toMatchObject({ tells: 0, jammed: 1, jamsSeen: 1, drawnJammed: 1 });
  await shot(page, 'jam', 2, 'jammed');

  // System Reboot (slot 1, no target): the jam clears at once, with a teal pop on the Choir.
  const cleared = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.enqueue({ type: 'ability', slot: 1 });
    sd.fastForward(1);
    const st = sd.state()!;
    return st.towers.items.filter((t) => t.alive && t.jamTicks > 0).length;
  });
  expect(cleared).toBe(0);
  await page.evaluate(() => globalThis.__sd!.fastForward(4));
  await nextFrames(page);
  look = await page.evaluate(() => globalThis.__sd!.render()!.jams);
  expect(look).toMatchObject({ jammed: 0, reboots: 1 });
  expect(look.columns).toBeGreaterThan(0);
  expect(look.drawnJammed).toBe(0); // its colours back // T730a: the teal power-on column through the Choir
  await shot(page, 'jam', 3, 'rebooted');
});
