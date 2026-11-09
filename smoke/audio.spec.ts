// Audio (T205): off under ?test=1 unless &audio=1; unlocked by the first gesture; the battle's
// music and sounds play from real events; M and the speaker button mute it, and the choice
// persists. Nobody can listen in CI, so every sound, cue, and theme is also rendered offline
// through the real master chain and its levels asserted, plus a W7-intensity storm that must not
// clip (architecture.md § Audio).
import type { Page } from '@playwright/test';
import type { AudioSample } from '../src/app/testHookTypes.ts';
import { expect, test } from './fixtures.ts';
import { shot, waitForReady } from './hooks.ts';

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

test('audio: every sound renders at a sane level, and a W7 storm never clips', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/?test=1&audio=1');
  await waitForReady(page);
  const report = await page.evaluate(async () => {
    const a = globalThis.__sd!.audio;
    const ids = a.ids();
    const names = [
      ...ids.sfx.map((id) => `sfx:${id}`),
      ...ids.cues.map((id) => `cue:${id}`),
      ...ids.themes.map((id) => `theme:${id}`),
      'storm',
    ];
    const renders = await Promise.all(names.map((n) => a.render(n)));
    return Object.fromEntries(names.map((n, i) => [n, renders[i]!]));
  });
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
  console.log(`audio levels (default volumes):\n${rows.join('\n')}`);
  // The storm: the limiter holds it, and the raw mix isn't wildly over (voice limits work).
  expect(report['storm']!.out.peak).toBeLessThan(0.99);
  expect(report['storm']!.raw.peak).toBeLessThan(2);
});
