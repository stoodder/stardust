// The finale's sound (T850; architecture.md § Audio): on the song's dev range (`?map=dev_song`,
// Phase 2 from W1) the hymn plays with the choir behind Pebble, a unit broken outside the song
// hisses as it scatters and one broken inside rings gold, Dawn's light breaks, and the win is the
// song's last line (`fin_win`), never the PERIMETER SECURED! fanfare. A listen URL
// (`?test=1&audio=1&listen=<kind>:<id>`, the owner's listen list) plays its item on the first
// gesture.
import type { Page } from '@playwright/test';
import type { AudioSample } from '../src/app/testHookTypes.ts';
import { expect, test } from './fixtures.ts';
import { waitForReady } from './hooks.ts';

const status = (page: Page): Promise<AudioSample | null> =>
  page.evaluate(() => globalThis.__sd?.audio.status() ?? null);

test('audio: the finale sings the hymn, rests in gold, scatters cold, and ends on the song', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto('/?test=1&audio=1&map=dev_song&seed=1');
  await waitForReady(page);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await status(page))?.state).toBe('running');
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.enqueue({ type: 'build', tower: 'zapcoil', tile: [4, 3] });
    sd.enqueue({ type: 'build', tower: 'rivet', tile: [8, 3] });
    sd.enqueue({ type: 'build', tower: 'rivet', tile: [4, 1] });
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
  });
  // Phase 2 from W1: the hymn, its choir up while every singer sings.
  await expect.poll(async () => (await status(page))?.theme).toBe('choir_hymn');
  expect((await status(page))?.layers).toMatchObject({ base: 1, lead: 1 });
  // Through to Dawn and the win.
  const outcome = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    for (let k = 0; k < 20_000 && sd.state()!.outcome === 'playing'; k++) sd.fastForward(1);
    return sd.state()!.outcome;
  });
  expect(outcome).toBe('won');
  await expect
    .poll(async () => (await status(page))?.played ?? {})
    .toMatchObject({
      scatter_hiss: expect.any(Number),
      rest_chime: expect.any(Number),
      dawn_break: expect.any(Number),
      'cue:fin_win': expect.any(Number),
    });
  expect((await status(page))?.played).not.toHaveProperty('cue:win');
});

test("audio: a listen URL plays its theme on the first gesture (the owner's listen list)", async ({
  page,
}) => {
  await page.goto('/?test=1&audio=1&listen=theme:dawn_major');
  await waitForReady(page);
  await page.keyboard.press('Shift');
  await expect.poll(async () => (await status(page))?.theme).toBe('dawn_major');
  expect((await status(page))?.layers).toEqual({ base: 1, drums: 1, lead: 1, choir: 1 });
});
