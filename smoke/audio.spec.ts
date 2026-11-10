// Audio (T205, T314, T450): off under ?test=1 unless &audio=1; unlocked by the first gesture; the
// battle's music and sounds play from real events (Act I's, and Act II's on A2M1); a spoken line
// blips and its typewriter ticks; M and the speaker button mute it, and the choice persists.
// Nobody can listen in CI, so every sound, cue, and theme is also rendered offline through the real
// master chain and its levels asserted, plus the worst-case storms (Act I's W7 and boss wave, Act
// II's Witch fight), unducked and ducked as the game ducks them, which must keep 3 dB of headroom;
// in the ducked storms every speaker's blip must stand 6 dB over the rest of the mix, while a lone
// blip peaks at −10 dBFS or under, and the Peeker's rock lighting up sounds about 6 dB over the
// squeaks around it (D134, D135; architecture.md § Audio).
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

function isSpeechMargin(m: unknown): m is SpeechMargin {
  return typeof m === 'object' && m !== null && 'blip' in m && 'marginDb' in m;
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

test("audio: A2M6 plays Sundown's dusk and night, and the Prism's lock and hum", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto('/?test=1&audio=1&map=a2_m06&seed=1');
  await waitForReady(page);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('hud')).toBeVisible();
  await expect.poll(async () => (await status(page))?.state).toBe('running');
  // Par into W6: the dark has stepped deeper at W4, W5 and W6's starts, and the Prism holds a beam
  // on the merge (T550).
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
    const st = sd.state()!;
    for (let k = 0; k < 60 * 600 && !(st.wave >= 6 || st.outcome !== 'playing'); k++) {
      sd.fastForward(1);
    }
    // Into W6's dark (its ease runs over 4 s).
    sd.fastForward(300);
  });
  expect((await status(page))?.played ?? {}).toMatchObject({
    dusk_fall: expect.any(Number),
    night_air: expect.any(Number),
    prism_lock: expect.any(Number),
    beam_hum: expect.any(Number),
  });
  // The Prism's lock is its own, never the Zapcoil's arc it stood in with (par has no Zapcoil).
  expect((await status(page))?.played ?? {}).not.toHaveProperty('zap_arc');
});

/** Renders `names` offline in the page (`__sd.audio.render`), by name. */
async function renderAll(
  page: Page,
  names: readonly string[],
): Promise<Record<string, RenderSample>> {
  return page.evaluate(async (list) => {
    const a = globalThis.__sd!.audio;
    const renders = await Promise.all(list.map((n) => a.render(n)));
    return Object.fromEntries(list.map((n, i) => [n, renders[i]!]));
  }, names);
}

/** The level table's row for render `name` (logged, so a run reports the levels). */
function levelRow(name: string, r: RenderSample): string {
  return `${name.padEnd(24)} peak ${r.out.peakDb.toFixed(1).padStart(6)} dB  rms ${r.out.rmsDb
    .toFixed(1)
    .padStart(
      6,
    )} dB  raw peak ${r.raw.peakDb.toFixed(1).padStart(6)} dB  ${r.out.durationSec.toFixed(2)} s`;
}

test('audio: every sound, cue, and theme renders at a sane level', async ({ page }) => {
  // Seconds on a quiet machine; minutes under a loaded one (offline renders share the CPU).
  test.setTimeout(240_000);
  await page.goto('/?test=1&audio=1');
  await waitForReady(page);
  const ids = await page.evaluate(() => globalThis.__sd!.audio.ids());
  const report = await renderAll(page, [
    ...ids.sfx.map((id) => `sfx:${id}`),
    ...ids.cues.map((id) => `cue:${id}`),
    ...ids.themes.map((id) => `theme:${id}`),
  ]);
  const rows: string[] = [];
  for (const [name, r] of Object.entries(report)) {
    rows.push(levelRow(name, r));
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
  const peak = (name: string): number => report[name]!.out.peakDb;
  // The rock lighting up turns heads (D135): about 6 dB over the panic and sad squeaks of the
  // Skitterkin around it (5–8 dB over the louder of the two).
  const lightsUp =
    peak('sfx:peeker_lights_up') - Math.max(peak('sfx:panic_squeak'), peak('sfx:sad_squeak'));
  rows.push(`peeker_lights_up over the squeaks: ${lightsUp.toFixed(1)} dB`);
  // Act II's quiet moments stay quiet (T550): the Penitent's kneel and the stand-down sit well
  // under the Witch's arrival and the Penitent's own, and the night's air under a rivet shot.
  const kneel = peak('cue:witch_sting') - peak('sfx:penitent_kneel');
  rows.push(`penitent_kneel under the Witch's sting: ${kneel.toFixed(1)} dB`);
  console.log(`audio levels (default volumes):\n${rows.join('\n')}`);
  expect(lightsUp).toBeGreaterThanOrEqual(5);
  expect(lightsUp).toBeLessThanOrEqual(8);
  for (const hushed of ['sfx:penitent_kneel', 'sfx:stand_down']) {
    expect(peak(hushed), hushed).toBeLessThanOrEqual(peak('sfx:penitent_arrive') - 3);
    expect(peak(hushed), hushed).toBeLessThanOrEqual(peak('sfx:witch_arrive') - 3);
  }
  expect(peak('sfx:night_air')).toBeLessThan(peak('sfx:rivet_shot'));
  // Blips sit back (D135): a lone blip peaks at −10 dBFS or under, well under the strike's boom.
  const blips = Object.keys(report).filter((n) => n.startsWith('sfx:blip.'));
  expect(blips.length).toBeGreaterThanOrEqual(14);
  for (const name of blips) expect(peak(name), name).toBeLessThanOrEqual(-10);
});

/**
 * The storms (src/audio/offline.ts `STORMS`), one test each so they render in parallel: Act I's,
 * the Witch fight, and A2M5–A2M6's dusk (T550).
 */
const STORM_IDS = ['act1', 'act2', 'act2_dusk'] as const;

for (const storm of STORM_IDS) {
  test(`audio: the ${storm} storm keeps 3 dB of headroom, and speech stays on top of it`, async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await page.goto('/?test=1&audio=1');
    await waitForReady(page);
    const ids = await page.evaluate(() => globalThis.__sd!.audio.ids());
    expect(ids.storms.toSorted()).toEqual([...STORM_IDS].toSorted());
    const report = await renderAll(page, [`storm:${storm}`, `storm:${storm}:ducked`]);
    // A ducked storm's render also carries its speech margins (src/audio/offline.ts).
    const speech = (name: string): readonly SpeechMargin[] => {
      const r: RenderSample | undefined = report[name];
      const margins: unknown = r !== undefined && 'speech' in r ? r.speech : undefined;
      return Array.isArray(margins) ? margins.filter(isSpeechMargin) : [];
    };
    const rows: string[] = [];
    for (const [name, r] of Object.entries(report)) rows.push(levelRow(name, r));
    for (const name of Object.keys(report)) {
      for (const m of speech(name)) {
        rows.push(
          `${name.padEnd(24)} ${m.blip.padEnd(18)} ${m.blipDb.toFixed(1).padStart(6)} dB over the rest's ${m.restDb.toFixed(1).padStart(6)} dB: ${m.marginDb.toFixed(1).padStart(5)} dB`,
        );
      }
    }
    console.log(`audio storm ${storm} (default volumes):\n${rows.join('\n')}`);
    // Unducked (the loudest case) and ducked as the game ducks it: the limiter and the clipper's
    // ceiling hold it 3 dB under full scale (T323), and the raw mix isn't wildly over (the voice
    // limits work).
    for (const name of Object.keys(report)) {
      expect(report[name]!.out.clipped, name).toBe(0);
      expect(report[name]!.out.peakDb, name).toBeLessThan(-3);
      expect(report[name]!.raw.peak, name).toBeLessThan(2);
    }
    // Speech stays on top (D134, D135): in the ducked storm the line's blip, and every other
    // speaker's spoken at the same moment, stands at least 6 dB over everything else sounding (the
    // music under the radio's duck and the Hollow's and the dark's, the rattle and the moments
    // under speech's −6 dB and the line-start dip's further −8 dB, the alarms at full level),
    // measured at the blip's loudest moment.
    const margins = speech(`storm:${storm}:ducked`);
    expect(margins.length).toBeGreaterThanOrEqual(14);
    for (const m of margins) expect(m.marginDb, m.blip).toBeGreaterThanOrEqual(6);
  });
}
