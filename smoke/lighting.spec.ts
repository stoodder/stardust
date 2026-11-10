// T410a: the revisit and the lighting overlay's tint path on the dev revisit (`?map=dev_revisit`,
// render/__fixtures__/devBattle.ts): A1M2's layout (dev_terraces) centred in an 18×12 map with a
// strip-mine band and grey soil, and the light crossfading from `act2.gold` to `act2.dusk` across
// its four waves. Screenshots of the start, the middle, and the end of the crossfade in
// test-results/screens/lighting/, and the same end stepped under reduced motion. At dusk every
// piece of scenery takes the grade, the props (Sprites) too, and the grade lies over all the
// ground (D135).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

/** The light as drawn (LightingView `look`). */
const light = (page: Page) => page.evaluate(() => globalThis.__sd!.render()!.lighting);
const WHITE = 0xffffff;

/** Calls waves early until wave `n` has started, then (`settle`) lets the light's fade finish. */
const toWave = (page: Page, n: number, settle = true) =>
  page.evaluate(
    ([target, wait]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      for (let k = 0; k < 20_000 && sd.state()!.wave < target; k++) {
        const phase = sd.state()!.schedule.phase;
        if (phase === 'setup' || phase === 'countdown') sd.enqueue({ type: 'callWave' });
        sd.fastForward(1);
      }
      // Past LIGHT_FADE_TICKS (vfx/lighting.ts), so the light has arrived.
      if (wait) sd.fastForward(260);
      const s = sd.state()!;
      return { wave: s.wave, outcome: s.outcome };
    },
    [n, settle] as const,
  );

test('lighting: the revisit crossfades from gold to dusk across its waves', async ({ page }) => {
  await page.goto('/?test=1&map=dev_revisit&seed=1');
  await waitForReady(page);
  await page.evaluate(() => globalThis.__sd!.setSpeed(0));
  await nextFrames(page);
  await shot(page, 'lighting', 1, 'start-gold');
  // The map's own light: no grade, nothing tinted.
  expect(await light(page)).toMatchObject({ grade: WHITE, tinted: 0 });

  expect(await toWave(page, 2)).toEqual({ wave: 2, outcome: 'playing' });
  await nextFrames(page);
  await shot(page, 'lighting', 2, 'middle');

  expect(await toWave(page, 4)).toMatchObject({ wave: 4 });
  await nextFrames(page);
  await shot(page, 'lighting', 3, 'end-dusk');
  // Dusk dims all the scenery (D135): every piece of it is tinted, the decor props (Sprites, which
  // Phaser 4 doesn't make Images) among them, and nothing on the ground draws over the grade.
  const dusk = await light(page);
  expect(dusk.grade).not.toBe(WHITE);
  expect(dusk.gradeOnTop).toBe(true);
  expect(dusk.scenery).toBeGreaterThan(0);
  expect(dusk.tinted).toBe(dusk.scenery);
  expect(dusk.tintedSprites).toBeGreaterThan(0);
});

test('lighting: under reduced motion the light steps', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?test=1&map=dev_revisit&seed=1');
  await waitForReady(page);
  await page.evaluate(() => globalThis.__sd!.setSpeed(0));
  // No settling: the light is already at wave 3's position (unstepped, it would be mid-fade).
  expect(await toWave(page, 3, false)).toMatchObject({ wave: 3 });
  await nextFrames(page);
  await shot(page, 'lighting', 4, 'reduced-w3');
});
