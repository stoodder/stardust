// Audio (T205, T314, T450): off under ?test=1 unless &audio=1; unlocked by the first gesture; the
// battle's music and sounds play from real events (Act I's, and Act II's on A2M1); a spoken line
// blips and its typewriter ticks; M and the speaker button mute it, and the choice persists.
// Nobody can listen in CI, so every sound, cue, and theme is also rendered offline through the real
// master chain and its levels asserted, plus the worst-case storms (Act I's W7 and boss wave, Act
// II's Witch fight), unducked and ducked as the game ducks them, which must keep 3 dB of headroom;
// in the ducked storms every speaker's blip must stand 6 dB over the rest of the mix (D134;
// architecture.md § Audio).
import type { Page } from '@playwright/test';
import type { AudioSample, RenderSample } from '../src/app/testHookTypes.ts';
import { expect, test } from './fixtures.ts';
import { shot, waitForReady } from './hooks.ts';

/** A ducked storm's speech margin (`src/audio/offline.ts` SpeechMargin). */
interface SpeechMargin {
  readonly blip: string;
  readonly blipDb: number;
  readonly restDb: number;
  readonly marginDb: number;
}

const status = (page: Page): Promise<AudioSample | null> =>
  page.evaluate(() => globalThis.__sd?.audio.status() ?? null);

test('audio: stays off under ?test=1 without &audio=1', async ({ page }) => {
  await page.goto('/?test=1');
  await waitForReady(page);
  await page.getByRole('button', { name: 'Start shift' }).click();
  expect(await status(page)).toMatchObject({ enabled: false, unlocked: false });
});

test('audio: unlocks on the first gesture and scores the battle', async ({ page }) => {
  await page.goto('/?test=1&audio=1');
  await waitForReady(page);
  expect(await status(page)).toMatchObject({ unlocked: false });
  await page.getByRole('button', { name: 'Start shift' }).click();
  await expect.poll(async () => (await status(page))?.state).toBe('running');
  await page.getByRole('button', { name: 'Clock in' }).click();
  // Setup phase: the battle theme with only its base layer.
  await expect
    .poll(async () => {
      const s = await status(page);
      return s === null ? null : { theme: s.theme, layers: s.layers };
    })
    .toEqual({ theme: 'act1_battle', layers: { base: 1, drums: 0, lead: 0 } });
  // Play par for a while: towers go up, the wave starts, shots fire, pests pop.
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.autoplay('par');
    sd.setSpeed(2);
  });
  await expect
    .poll(async () => (await status(page))?.played ?? {}, { timeout: 20_000 })
    .toMatchObject({
      build: expect.any(Number),
      wave_start: expect.any(Number),
      rivet_shot: expect.any(Number),
      enemy_pop: expect.any(Number),
    });
  // A wave on the field brings in the drums.
  await expect.poll(async () => (await status(page))?.layers?.drums, { timeout: 20_000 }).toBe(1);
  const s = await status(page);
  expect(s?.voices ?? 99).toBeLessThanOrEqual(16);
  await shot(page, 'audio', 1, 'battle');
});

test("audio: a spoken line blips in its speaker's voice and the typewriter ticks", async ({
  page,
}) => {
  await page.goto('/?test=1&seed=1&audio=1&dialogue=1');
  await waitForReady(page);
  await page.getByRole('button', { name: 'Start shift' }).click();
  // The briefing opens on QUILL's line, typing: its blip, then the soft per-character tick.
  await expect(page.getByTestId('briefing-lines')).toContainText('QUILL');
  await expect
    .poll(async () => (await status(page))?.played ?? {}, { timeout: 10_000 })
    .toMatchObject({ 'blip.quill': expect.any(Number), type_tick: expect.any(Number) });
});

test('audio: M and the speaker button mute it, and the choice persists', async ({ page }) => {
  await page.goto('/?test=1&audio=1');
  await waitForReady(page);
  const button = page.getByRole('button', { name: 'Mute sound' });
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  await shot(page, 'audio', 0, 'title');
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  expect((await status(page))?.muted).toBe(true);
  await page.reload();
  await waitForReady(page);
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  expect((await status(page))?.muted).toBe(true);
  await page.keyboard.press('KeyM');
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  // In a battle the HUD carries the same toggle, and M still works.
  await page.getByRole('button', { name: 'Start shift' }).click();
  await page.getByRole('button', { name: 'Clock in' }).click();
  await page.keyboard.press('KeyM');
  await expect(page.getByRole('button', { name: 'Mute sound' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await shot(page, 'audio', 2, 'hud-muted');
});

test("audio: A2M1 plays Act II's theme, its deaths, and the Hollow's hum", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/?test=1&audio=1&map=a2_m01&seed=1');
  await waitForReady(page);
  // Closing the briefing is the gesture that unlocks the audio.
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('hud')).toBeVisible();
  await expect.poll(async () => (await status(page))?.state).toBe('running');
  await expect.poll(async () => (await status(page))?.theme).toBe('act2_battle');
  // Par through W3, the Mote's teach: runners flee and die quietly, the Hollow hums and hushes.
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
    const st = sd.state()!;
    for (let k = 0; k < 60 * 400 && !(st.wave >= 4 || st.outcome !== 'playing'); k++) {
      sd.fastForward(1);
    }
  });
  expect((await status(page))?.played ?? {}).toMatchObject({
    wave_start: expect.any(Number),
    sad_squeak: expect.any(Number),
    hollow_hum: expect.any(Number),
    'cue:bright_minor': expect.any(Number),
  });
  expect((await status(page))?.played ?? {}).not.toHaveProperty('cue:bright_sting');
});

test('audio: every sound renders at a sane level, and the storms keep 3 dB of headroom', async ({
  page,
}) => {
  test.setTimeout(150_000);
  await page.goto('/?test=1&audio=1');
  await waitForReady(page);
  const report = await page.evaluate(async () => {
    const a = globalThis.__sd!.audio;
    const ids = a.ids();
    const names = [
      ...ids.sfx.map((id) => `sfx:${id}`),
      ...ids.cues.map((id) => `cue:${id}`),
      ...ids.themes.map((id) => `theme:${id}`),
      ...ids.storms.map((id) => `storm:${id}`),
      ...ids.storms.map((id) => `storm:${id}:ducked`),
    ];
    const renders = await Promise.all(names.map((n) => a.render(n)));
    return Object.fromEntries(names.map((n, i) => [n, renders[i]!]));
  });
  // A ducked storm's render also carries its speech margins (src/audio/offline.ts).
  const speech = (name: string): readonly SpeechMargin[] =>
    (report[name] as RenderSample & { readonly speech?: readonly SpeechMargin[] }).speech ?? [];
  const rows: string[] = [];
  for (const [name, r] of Object.entries(report)) {
    rows.push(
      `${name.padEnd(24)} peak ${r.out.peakDb.toFixed(1).padStart(6)} dB  rms ${r.out.rmsDb
        .toFixed(1)
        .padStart(
          6,
        )} dB  raw peak ${r.raw.peakDb.toFixed(1).padStart(6)} dB  ${r.out.durationSec.toFixed(2)} s`,
    );
    // Audible, never clipped, never louder than -1 dBFS through the chain.
    expect(r.out.clipped, name).toBe(0);
    expect(r.out.peak, name).toBeLessThan(0.9);
    expect(r.out.peak, name).toBeGreaterThan(0.01);
    if (name.startsWith('sfx:')) {
      // A sound alone never needs the limiter: its raw mix stays under full scale.
      expect(r.raw.peak, name).toBeLessThan(0.8);
      expect(r.out.durationSec, name).toBeLessThan(3.4);
    }
  }
  for (const name of Object.keys(report)) {
    for (const m of speech(name)) {
      rows.push(
        `${name.padEnd(24)} ${m.blip.padEnd(18)} ${m.blipDb.toFixed(1).padStart(6)} dB over the rest's ${m.restDb.toFixed(1).padStart(6)} dB: ${m.marginDb.toFixed(1).padStart(5)} dB`,
      );
    }
  }
  console.log(`audio levels (default volumes):\n${rows.join('\n')}`);
  // The storms, unducked (the loudest case) and ducked as the game ducks them: the limiter and the
  // clipper's ceiling hold them 3 dB under full scale (T323), and the raw mix isn't wildly over
  // (the voice limits work).
  const storms = Object.keys(report).filter((n) => n.startsWith('storm:'));
  expect(storms.filter((n) => n.endsWith(':ducked')).length).toBeGreaterThanOrEqual(2);
  expect(storms.length).toBeGreaterThanOrEqual(4);
  for (const name of storms) {
    expect(report[name]!.out.peakDb, name).toBeLessThan(-3);
    expect(report[name]!.raw.peak, name).toBeLessThan(2);
    // Speech stays on top (D134): in a ducked storm the line's blip, and every other speaker's
    // spoken at the same moment, stands at least 6 dB over everything else sounding (the music
    // under the radio's duck and the Hollow's, the rattle and the moments under speech's −6 dB,
    // the alarms at full level), measured at the blip's loudest moment.
    if (name.endsWith(':ducked')) {
      const margins = speech(name);
      expect(margins.length, name).toBeGreaterThanOrEqual(14);
      for (const m of margins) expect(m.marginDb, `${name} ${m.blip}`).toBeGreaterThanOrEqual(6);
    }
  }
});
