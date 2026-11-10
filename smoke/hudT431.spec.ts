// T431, the HUD (and T326's leftovers). Screenshots in test-results/screens/hud-t431/ (look at
// them: the failed objective, the flag on the spawn, the plate over Denise, the briefing's
// objectives and "Hollow clusters", slot 2's face, the Spare hint, the Checkpoint cue with the rig
// glyph and four-digit credits, the loss card's one-line buttons, the loadout's scrolled links, the
// Scanner Sweep's aim circle).
// - A1M4: the objective tracker follows the sim: a late sell fails Clean Audit at once (D090).
// - A1M2: an "incoming" flag stands on the spawn in the setup and a click on it starts wave 1;
//   Bricks's name-tag plate goes over Denise at the first clear.
// - A2M1 (after A1M5): the briefing lists Crew Logs and "Hollow clusters"; slot 2 shows Bricks's
//   face; the Spare runners teach pulses Spare (all) from W1 until the filter is used.
// - A2M2 (after A2M1): the Checkpoint cue as W5's countdown takes it; four-digit credits fit.
// - Results: a loss with a checkpoint keeps each of its four buttons on one line.
// - Loadout (all_unlocked): the link list counts its formed links and scrolls to the last; Scanner
//   Sweep, aimed, shows its own circle (render().sweepAim) until Esc.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

const FLOW = 'hud-t431';

/** Closes the briefing if one is up. */
async function clockIn(page: Page): Promise<void> {
  const go = page.getByRole('button', { name: 'Clock in' });
  if ((await go.count()) > 0) await go.click();
}

test('hud: the objective tracker fails Clean Audit on a late sell (A1M4)', async ({ page }) => {
  await page.goto('/?test=1&seed=1&map=a1_m04');
  await waitForReady(page);
  await clockIn(page);
  const row = page.getByTestId('objective-tracker').locator('[data-objective="clean_audit"]');
  await expect(row).toHaveAttribute('data-status', 'open');
  const built = await page.evaluate(() => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    sd.setSpeed(0);
    const s = sd.state()!;
    // A pad by the west road: build, start W1, and sell it once past the misclick grace.
    sd.enqueue({ type: 'build', tile: [3, 2], tower: 'rivet' });
    sd.fastForward(1);
    const t = s.towers.items.find((x) => x.alive);
    if (t === undefined) return false;
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(60 * 12);
    sd.enqueue({ type: 'sell', towerUid: t.uid });
    sd.fastForward(1);
    return true;
  });
  expect(built).toBe(true);
  await expect(row).toHaveAttribute('data-status', 'failed');
  await expect(row).toHaveAttribute('title', /Next time!/);
  await shot(page, FLOW, 1, 'a1m4-objective-failed');
});

test('hud: an incoming flag starts wave 1, and the name tag goes over Denise (A1M2)', async ({
  page,
}) => {
  await page.goto('/?test=1&seed=7&map=a1_m02');
  await waitForReady(page);
  await clockIn(page);
  await page.evaluate(() => globalThis.__sd!.setSpeed(0));
  await nextFrames(page);
  expect(await page.evaluate(() => globalThis.__sd!.render()!.spawnFlags)).toBe(1);
  await shot(page, FLOW, 2, 'a1m2-incoming-flag');
  // A plain click on the flagged spawn (11, 0) starts wave 1, and the flag comes down.
  const spawn = await page.evaluate(() => globalThis.__sd!.tileToClient(11, 0));
  if (spawn === null) throw new Error('no battle');
  await page.mouse.click(spawn.x, spawn.y);
  await page.evaluate(() => globalThis.__sd!.fastForward(1));
  expect(await page.evaluate(() => globalThis.__sd!.state()!.wave)).toBe(1);
  await nextFrames(page);
  expect(await page.evaluate(() => globalThis.__sd!.render()!.spawnFlags)).toBe(0);

  // Par to W2: the plate is on the earliest-built attacking turret.
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.autoplay('par');
    const s = sd.state()!;
    for (let k = 0; k < 600 && s.wave < 2; k++) sd.fastForward(30);
  });
  await nextFrames(page);
  const tag = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    const t = sd.render()!.nameTag;
    const first = sd
      .state()!
      .towers.items.filter((x) => x.alive)
      .map((x) => x.uid);
    return { tag: t, first: Math.min(...first) };
  });
  expect(tag.tag?.text).toBe('DENISE');
  expect(tag.tag?.uid).toBe(tag.first);
  await shot(page, FLOW, 3, 'a1m2-name-tag');
});

test('hud: A2M1 briefs its objective, shows Bricks on slot 2, and teaches Spare runners', async ({
  page,
}) => {
  await page.goto('/?test=1&seed=7&save=after_a1m5&map=a2_m01');
  await waitForReady(page);
  const intel = page.getByTestId('threat-intel');
  await expect(intel).toContainText('Hollow clusters');
  await expect(intel).not.toContainText('Clustered');
  const objectives = page.getByTestId('briefing-objectives');
  await expect(objectives).toContainText('Crew Logs');
  await expect(objectives).toContainText('+1 Intel');
  await shot(page, FLOW, 4, 'a2m1-briefing');
  await clockIn(page);
  await expect(page.getByTestId('companion-face')).toBeVisible();
  await expect(page.getByTestId('companion-face')).toHaveAttribute('title', 'Bricks');

  // W1 sends runners: the hint and the pulse, until Alt+H spares them.
  const spare = page.getByTestId('spare-runners-all');
  await expect(spare).not.toHaveClass(/pulse/);
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(2);
  });
  await expect(page.getByTestId('spare-runners-hint')).toBeVisible();
  await expect(spare).toHaveClass(/pulse/);
  await shot(page, FLOW, 5, 'a2m1-spare-teach');
  await spare.click();
  await page.evaluate(() => globalThis.__sd!.fastForward(1));
  await expect(page.getByTestId('spare-runners-hint')).toHaveCount(0);
  await expect(spare).not.toHaveClass(/pulse/);
});

test('hud: the Checkpoint cue on A2M2, with the rig glyph and four-digit credits', async ({
  page,
}) => {
  test.setTimeout(45_000);
  await page.goto('/?test=1&seed=7&save=after_a2m1&map=a2_m02');
  await waitForReady(page);
  await clockIn(page);
  const cue = page.getByTestId('checkpoint-cue');
  await expect(cue).toHaveCount(0);
  const reached = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
    const st = sd.state()!;
    for (let k = 0; k < 60 * 60 * 10; k++) {
      if (st.schedule.phase === 'countdown' && st.schedule.countdownWave === 5) return true;
      sd.fastForward(1);
    }
    return false;
  });
  expect(reached).toBe(true);
  await expect(cue).toBeVisible();
  await expect(cue).toContainText('Checkpoint');
  await expect(cue).toContainText('Wave 5');
  // A four-digit bank stays inside the status panel (D110's "1208").
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.autoplay('none');
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the test sets credits
    (sd.state() as unknown as { credits: number }).credits = 1208;
    sd.fastForward(1);
  });
  const credits = page.locator('.hud-credits .big');
  await expect(credits).toHaveText('1208');
  const panel = await page.locator('.hud-status').boundingBox();
  const num = await credits.boundingBox();
  expect(panel).not.toBeNull();
  expect(num).not.toBeNull();
  expect(num!.x + num!.width).toBeLessThanOrEqual(panel!.x + panel!.width);
  // …and its digits fit their own column, not spilling into the panel's padding.
  expect(await credits.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
  await expect(page.getByTestId('asset-meter').locator('img')).toBeVisible();
  await shot(page, FLOW, 6, 'a2m2-checkpoint-cue');
});

test("hud: a loss card's four buttons each sit on one line", async ({ page }) => {
  await page.goto('/?test=1&seed=1&save=after_a2m1');
  await waitForReady(page);
  await page.evaluate(() =>
    globalThis.__sd!.results({ map: 'a2_m02', outcome: 'lost', checkpoint: { latest: 10 } }),
  );
  const row = page.locator('.sd-results-buttons');
  const buttons = row.getByRole('button');
  await expect(buttons).toHaveCount(4);
  await expect(buttons.first()).toHaveText('Retry from wave 10');
  // One line each: a label's text lays out in one line box (a wrapped one in two).
  const lines = await buttons.evaluateAll((els) =>
    els.map((e) => {
      const range = document.createRange();
      range.selectNodeContents(e);
      return new Set(Array.from(range.getClientRects(), (r) => Math.round(r.top))).size;
    }),
  );
  expect(lines).toEqual([1, 1, 1, 1]);
  await shot(page, FLOW, 7, 'loss-card-buttons');
});

test('hud: the loadout scrolls its links, and Scanner Sweep aims its own circle', async ({
  page,
}) => {
  await page.goto('/?test=1&seed=1&save=all_unlocked');
  await waitForReady(page);
  await page.evaluate(() => globalThis.__sd!.goto('loadout'));
  // Every link the pool can form is listed (formed first, with the bonus; the rest one line
  // each), the heading counts the formed ones, and the last scrolls into view inside the panel.
  const list = page.getByTestId('loadout-links');
  const links = list.locator('.sd-lo-link');
  const total = await links.count();
  expect(total).toBeGreaterThanOrEqual(5);
  const formed = await list.locator('.sd-lo-link-on').count();
  await expect(page.getByTestId('loadout-links-count')).toHaveText(`${formed} / ${total}`);
  await expect(links.first()).toHaveClass(/sd-lo-link-on/);
  const last = links.last();
  await last.scrollIntoViewIfNeeded();
  const listBox = await list.boundingBox();
  const lastBox = await last.boundingBox();
  const lockBox = await page.getByRole('button', { name: 'Lock in' }).boundingBox();
  expect(listBox).not.toBeNull();
  expect(lastBox).not.toBeNull();
  expect(lockBox).not.toBeNull();
  expect(lastBox!.y + lastBox!.height).toBeLessThanOrEqual(listBox!.y + listBox!.height + 1);
  expect(listBox!.y + listBox!.height).toBeLessThanOrEqual(lockBox!.y);
  await shot(page, FLOW, 8, 'loadout-links-scrolled');

  // Scanner Sweep in slot 1: aiming it previews the sweep's green circle, not the strike reticle.
  await page.getByRole('radio', { name: /Scanner Sweep/ }).click();
  await page.getByRole('button', { name: 'Lock in' }).click();
  await page.waitForFunction(() => globalThis.__sd!.state() !== null);
  await clockIn(page);
  await page.evaluate(() => globalThis.__sd!.setSpeed(0));
  const at = await page.evaluate(() => globalThis.__sd!.tileToClient(6, 4));
  if (at === null) throw new Error('no battle');
  await page.keyboard.press('q');
  await page.mouse.move(at.x, at.y);
  await nextFrames(page);
  expect(await page.evaluate(() => globalThis.__sd!.render()!.sweepAim)).toBe(true);
  await shot(page, FLOW, 9, 'scanner-sweep-aim');
  await page.keyboard.press('Escape');
  await nextFrames(page);
  expect(await page.evaluate(() => globalThis.__sd!.render()!.sweepAim)).toBe(false);
});
