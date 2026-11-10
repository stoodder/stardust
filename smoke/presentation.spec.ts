// T410b: the per-act presentation dials (core-loop.md § 6.7) on screen. Results in Act I (the
// starred badge, "Exemplary!") beside Act II's (A2M3: "Pests processed: {n}.", "Filed", no star,
// the orange theme); the Title's tip with an Act II campaign in play; the Tidybots sweeping the
// stardust specks after a wave in Act I (A1M1) and Act II (A2M1). Screenshots in
// test-results/screens/presentation/ (look at them: the two cards, the tip, the drones).
import type { Page } from '@playwright/test';
import { SAVE_VERSION } from '../src/meta/saveData.ts';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

/** The UI root's act theme (`data-act` on #ui). */
const uiAct = (page: Page) => page.locator('#ui').getAttribute('data-act');

test('presentation: Act I results cheer, Act II results are filed', async ({ page }) => {
  await page.goto('/?test=1&seed=1&save=after_a1m4');
  await waitForReady(page);
  await page.evaluate(() =>
    globalThis.__sd!.results({ map: 'a1_m04', outcome: 'won', pests: 212 }),
  );
  const card = page.getByRole('dialog', { name: 'PERIMETER SECURED!' });
  await expect(card).toBeVisible();
  await expect(card.getByText('Shift report · Exemplary!')).toBeVisible();
  await expect(page.getByTestId('results-counter')).toHaveText(
    'PESTS PROCESSED: 212 ★ Top 5% of Technicians!',
  );
  expect(await page.locator('main.sd-results').getAttribute('data-act')).toBe('1');
  await shot(page, 'presentation', 1, 'results-act1');

  await page.goto('/?test=1&seed=1&save=after_a2m2');
  await waitForReady(page);
  // Between maps the campaign's menus wear the next map's theme: Act II's.
  expect(await uiAct(page)).toBe('2');
  await page.evaluate(() => globalThis.__sd!.goto('base'));
  await expect(page.getByRole('heading', { name: 'Base' })).toBeVisible();
  expect(await uiAct(page)).toBe('2');
  await shot(page, 'presentation', 6, 'base-act2');
  await page.evaluate(() => globalThis.__sd!.results({ map: 'a2_m03', outcome: 'won', pests: 43 }));
  await expect(card).toBeVisible();
  await expect(card.getByText('Shift report · Filed')).toBeVisible();
  await expect(card).not.toContainText('Exemplary');
  await expect(card).not.toContainText('Top 5%');
  await expect(card.locator('.sd-results-star')).toHaveCount(0);
  await expect(page.getByTestId('results-counter')).toHaveText('Pests processed: 43.');
  await expect(card).toContainText('Career total:');
  expect(await page.locator('main.sd-results').getAttribute('data-act')).toBe('2');
  expect(await uiAct(page)).toBe('2');
  await shot(page, 'presentation', 2, 'results-act2');
});

test("presentation: the Title's tip follows the campaign's act", async ({ page }) => {
  await page.goto('/?test=1&seed=1');
  await waitForReady(page);
  await expect(page.getByTestId('title-tip')).toHaveText(
    'Tip Remember: a clean perimeter is a happy perimeter!',
  );
  expect(await uiAct(page)).toBe('1');

  // File the save after A1M5 in slot 1, as if it were played there, and come back to the Title.
  await page.goto('/?test=1&seed=1&save=after_a1m5_ref');
  await waitForReady(page);
  await page.evaluate((v) => {
    const data = globalThis.__sd!.save();
    localStorage.setItem('stardust:slot:1', JSON.stringify({ v, savedAt: 1793100000000, data }));
    localStorage.setItem('stardust:lastSlot', '1');
  }, SAVE_VERSION);
  await page.goto('/?test=1&seed=1');
  await waitForReady(page);
  await expect(page.getByRole('button', { name: 'Continue' })).toBeEnabled();
  await expect(page.getByTestId('title-tip')).toHaveText('Tip Remember: a clean perimeter.');
  expect(await uiAct(page)).toBe('1');
  await shot(page, 'presentation', 3, 'title-tip-act2');
});

/**
 * Plays par until a wave resolves and the Tidybots set off, then `ticks` more (paused after), and
 * waits for the fast-forward's leftover bursts (real time) to fade before the shot.
 */
async function untilSweep(page: Page, ticks: number): Promise<void> {
  await page.evaluate((more) => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    for (let k = 0; k < 60 * 600; k++) {
      const r = sd.render();
      if (r !== null && r.tidybots.sweeps > 0) break;
      if (sd.state()?.outcome !== 'playing') break;
      sd.fastForward(1);
    }
    sd.fastForward(more);
  }, ticks);
  await page.waitForTimeout(900);
  await nextFrames(page);
}

/** Saves a close-up of the first drone in the air. */
async function droneShot(page: Page, name: string): Promise<void> {
  const at = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    const d = sd.render()!.tidybots.drones[0];
    return d === undefined ? null : sd.tileToClient(d.x - 0.5, d.y - 0.5);
  });
  expect(at).not.toBeNull();
  await page.screenshot({
    path: `test-results/screens/presentation/${name}.png`,
    clip: { x: at!.x - 90, y: at!.y - 90, width: 180, height: 120 },
  });
}

for (const [map, n] of [
  ['a1_m01', 4],
  ['a2_m01', 5],
] as const) {
  test(`presentation: Tidybots sweep the stardust after a wave on ${map}`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`/?test=1&map=${map}&skipIntro=1&seed=1`);
    await waitForReady(page);
    await expect(page.getByTestId('hud')).toBeVisible();
    await page.evaluate(() => {
      const sd = globalThis.__sd!;
      sd.setSpeed(0);
      sd.autoplay('par');
    });
    const before = await page.evaluate(() => globalThis.__sd!.render()!.tidybots);
    expect(before.sweeps).toBe(0);
    // In from the edge (72 ticks) and a beat into the first vacuum.
    await untilSweep(page, 84);
    const sweep = await page.evaluate(() => globalThis.__sd!.render()!.tidybots);
    expect(sweep.sweeps).toBe(1);
    expect(sweep.specks).toBeGreaterThan(0);
    expect(sweep.drones[0]?.phase).toBe('vacuum');
    await shot(page, 'presentation', n, `tidybots-${map}`);
    await droneShot(page, `0${n}b-tidybot-vacuum-${map}`);
    // Every speck is swept and every drone gone once the sweep is over (well within ~12 s).
    await page.evaluate(() => globalThis.__sd!.fastForward(720));
    await nextFrames(page);
    const after = await page.evaluate(() => globalThis.__sd!.render()!.tidybots);
    expect(after.drones).toEqual([]);
  });
}
