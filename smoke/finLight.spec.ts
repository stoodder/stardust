// T831: FIN's light (art-direction.md §3 *Finale*; design/maps.md § 5.5), played by par
// (`autoplay('par')`) on the map's own flags; the memorial's name on the reference save
// (`save=after_a3m6`); its frame cost on the strongest choir (`save=after_a3m6_strongest`: the warren's 28 singers, Thrum, the Returned's two
// auras). The finale's night over the world from the first
// tick, punched by the song's circles (a warm gold pool in each); the eastern sky warming a step
// as Phase 1's waves clear (sky-only keys: the world's grade and night hold); the Deep Bore's rig
// drilling, its gauge filling; the relit waymark lanterns; the memorial wreck's name on hover; and
// Dawn: the sun raking in from the east over 8 s (start, middle, end), the rift cracks healing
// behind its front (T871), and at once under reduced motion; in Phase 2 the Unsung held by the
// song, rimmed and lifted (M8 R1). Each shot plays a moment at 1× first. Screenshots in <out>/screens/fin-light/ (look at
// them: the song's warm light in the dark, the horizon warming behind the Halls, the sunrise).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

/** The finale on its own flags (par plays it to Dawn), with the reference save (the memorial's
 * name), and the strongest choir (the frame cost). */
const URL = '/?test=1&map=fin_m01&seed=1';
const REFERENCE = '/?test=1&map=fin_m01&seed=1&save=after_a3m6';
const STRONGEST = '/?test=1&map=fin_m01&seed=1&save=after_a3m6_strongest';
/** The sun's last step (vfx/songNightPixels.ts SUN_STEPS). */
const SUN_STEPS = 48;
/** The memorial wreck's marker (fin_m01's `memorial_wreck`). */
const MEMORIAL: readonly [number, number] = [14, 6];

/** Plays par a tick at a time until wave `wave` has started, or Dawn's light has been set. */
async function until(page: Page, to: number | 'dawn', max = 2_000_000) {
  return page.evaluate(
    ([target, limit]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      const st = sd.state()!;
      const check = (): boolean =>
        target === 'dawn' ? st.lightingKey === 'dawn' : st.wave >= target;
      for (let k = 0; k < limit && !check() && st.outcome === 'playing'; k++) sd.fastForward(1);
      return { held: check(), wave: st.wave, phase: st.phase, outcome: st.outcome };
    },
    [to, max] as const,
  );
}

async function look(page: Page) {
  return page.evaluate(() => {
    const r = globalThis.__sd!.render()!;
    return { night: r.songNight, bore: r.bore, sky: r.lighting.sky, grade: r.lighting.grade };
  });
}

/** Plays to wave `wave`, checks the sky has warmed past `before` alone, and shoots it. */
async function skyAt(page: Page, wave: number, before: number): Promise<number> {
  expect(await until(page, wave)).toMatchObject({ held: true, outcome: 'playing' });
  await page.evaluate(() => globalThis.__sd!.fastForward(600));
  await nextFrames(page);
  const l = await look(page);
  expect(l.sky).toBeGreaterThan(before);
  expect(l.grade).toBe(0xffffff);
  expect(l.night).toMatchObject({ night: true, sun: 0 });
  await shot(page, 'fin-light', 3 + wave / 6, `w${wave}-sky`);
  return l.sky;
}

/** Plays to wave `wave` (Phase 2), then on in short steps until the song holds the Unsung (M8 R1). */
async function heldAt(page: Page, wave: number): Promise<void> {
  expect(await until(page, wave)).toMatchObject({ held: true, phase: 2, outcome: 'playing' });
  let held = 0;
  let rims = 0;
  for (let k = 0; k < 30 && held === 0; k++) {
    // oxlint-disable-next-line no-await-in-loop -- a step, a frame, a look
    await page.evaluate(() => globalThis.__sd!.fastForward(30));
    // oxlint-disable-next-line no-await-in-loop -- a step, a frame, a look
    await nextFrames(page);
    // oxlint-disable-next-line no-await-in-loop -- a step, a frame, a look
    ({ held, rims } = await page.evaluate(() => globalThis.__sd!.render()!.unsung));
  }
  expect(held, `W${wave}: the Unsung held`).toBeGreaterThan(0);
  // M8 R2: each held body rimmed (the boss's one copy, a split part's whole silhouette of four).
  expect(rims).toBeGreaterThanOrEqual(held);
  expect(rims).toBeLessThanOrEqual(held * 4);
  await shot(page, 'fin-light', 9 + wave / 100, `w${wave}-unsung-held`);
}

async function open(page: Page, url = URL): Promise<void> {
  await page.goto(url);
  await waitForReady(page);
  const brief = page.getByRole('dialog');
  if (await brief.isVisible()) await page.keyboard.press('Escape');
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
    sd.fastForward(0);
  });
}

test('FIN light: the night, the song, the warming sky, the Bore, and Dawn', async ({ page }) => {
  test.setTimeout(240_000);
  await open(page);

  // W1: the night is down, and the song's circles (Pebble's and the Returned's) are lit in it.
  expect(await until(page, 1)).toMatchObject({ held: true, outcome: 'playing' });
  await page.evaluate(() => globalThis.__sd!.fastForward(120));
  await nextFrames(page);
  const w1 = await look(page);
  expect(w1.night).toMatchObject({ night: true, sun: 0, rims: 0 }); // no Dawn rims in the night
  expect(w1.night.circles).toBeGreaterThanOrEqual(1);
  expect(w1.night.darkScenery).toBeGreaterThan(w1.night.litScenery);
  expect(w1.bore).toMatchObject({ head: 'drill', full: false });
  await shot(page, 'fin-light', 1, 'w1-song-light');

  // The eastern sky warms a step as each wave clears; the world's grade and night hold.
  const w6 = await skyAt(page, 6, w1.sky);
  const w12 = await skyAt(page, 12, w6);
  await skyAt(page, 18, w12);
  const bore = (await look(page)).bore!;
  expect(bore.gauge === 'full' || Number(bore.gauge.slice(1)) > 0).toBe(true);

  // Phase 2 (M8 R1): the song holds the Unsung at the Halls mouth, and it reads as the final boss:
  // rimmed gold on the song's side, lifted over the towers round it, in its violet pool.
  await heldAt(page, 20);
  await heldAt(page, 24);

  // Dawn: the sun rakes in from the east over 8 s, the night lifting behind its front.
  expect(await until(page, 'dawn')).toMatchObject({ held: true, phase: 3, outcome: 'playing' });
  await nextFrames(page);
  const cracks = () => page.evaluate(() => globalThis.__sd!.render()!.world);
  const torn = await cracks(); // the rifts opened at W15
  expect(torn.openCracks).toBeGreaterThan(0);
  await shot(page, 'fin-light', 10, 'dawn-start');
  await page.evaluate(() => globalThis.__sd!.fastForward(240)); // 4 s: halfway
  await nextFrames(page);
  const mid = (await look(page)).night;
  expect(mid.night).toBe(true);
  expect(mid.sun).toBeGreaterThan(0);
  expect(mid.sun).toBeLessThan(SUN_STEPS);
  // The torn rifts went out as Dawn began (M8 R2): their scars only, long before the sun lands.
  expect(await cracks()).toMatchObject({ cracks: torn.cracks, openCracks: 0 });
  await shot(page, 'fin-light', 11, 'dawn-middle');
  // The sun lands as the win's 8 s hold ends (finale.md: "the map is won as it lands"): a tick
  // before, it has crossed the map.
  await page.evaluate(() => globalThis.__sd!.fastForward(238));
  await nextFrames(page);
  const end = (await look(page)).night;
  expect(end).toMatchObject({ night: false, sun: SUN_STEPS });
  // The morning edges the actors gold toward the sun and cyan from the sky (T901).
  expect(end.rims).toBeGreaterThan(0);
  // Dawn lights the world additively (M8 R2): the world's grade stays white, only the sky turns.
  expect((await look(page)).grade).toBe(0xffffff);
  // The rifts have healed to their old scars behind the sun (T871).
  expect(await cracks()).toMatchObject({ cracks: torn.cracks, openCracks: 0 });
  await shot(page, 'fin-light', 12, 'dawn-end');
});

test("FIN light: the memorial wreck's name on hover", async ({ page }) => {
  test.setTimeout(60_000);
  await open(page, REFERENCE);
  expect(await until(page, 1)).toMatchObject({ held: true });
  const at = await page.evaluate(([c, r]) => globalThis.__sd!.tileToClient(c, r), MEMORIAL);
  expect(at).not.toBeNull();
  expect((await page.evaluate(() => globalThis.__sd!.render()!.memorial)).shown).toBe('');
  await page.mouse.move(at!.x, at!.y);
  await nextFrames(page);
  const memorial = await page.evaluate(() => globalThis.__sd!.render()!.memorial);
  expect(memorial.shown.length).toBeGreaterThan(0);
  expect(memorial.shown).not.toContain('{');
  await shot(page, 'fin-light', 2, 'memorial-name');
  await page.mouse.move(5, 5);
  await nextFrames(page);
  expect((await page.evaluate(() => globalThis.__sd!.render()!.memorial)).shown).toBe('');
});

test('FIN light at 1×: the night and the song cost little per frame', async ({ page }) => {
  test.setTimeout(120_000);
  await open(page, STRONGEST);
  expect(await until(page, 3)).toMatchObject({ held: true });
  await page.evaluate(() => globalThis.__sd!.setSpeed(1));
  const before = (await look(page)).night;
  await page.waitForTimeout(3000);
  const after = (await look(page)).night;
  const perf = await page.evaluate(() => globalThis.__sd!.perf());
  await page.evaluate(() => globalThis.__sd!.setSpeed(0));
  // The leader walks a pixel every second or so: the mask redraws a few times a second at most.
  const perSec = (after.redraws - before.redraws) / 3;
  console.log(`fin-light 1x: frameMs ${perf.frameMs.toFixed(2)}, night redraws/s ${perSec}`);
  expect(perSec).toBeLessThan(15);
  await shot(page, 'fin-light', 13, 'phase1-1x');
});

test('FIN light under reduced motion: Dawn lands at once', async ({ browser }) => {
  test.setTimeout(240_000);
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await open(page);
  expect(await until(page, 'dawn')).toMatchObject({ held: true, phase: 3 });
  await nextFrames(page);
  expect((await look(page)).night).toMatchObject({ night: false, sun: SUN_STEPS });
  await shot(page, 'fin-light', 14, 'reduced-dawn');
  await context.close();
});
