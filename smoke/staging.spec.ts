// The full-screen scenes' staging (D097 R3; ui/dialogue/staging.ts). The stinger: the Rig 9 feed
// leads its lines in (live, static, the smudge, static, NO SIGNAL), Skip cuts the lead-in short,
// then the caption and QUILL's line, each read to screen readers by the scene's live region
// (U-M1); its held beat (a silence) moves on by itself with no Next (D098). The party: the bright
// stage, two cannons firing with their bursts (D098), and the record counter
// landing on the career total. Reduced motion: the feed's three stills, no static. Screenshots in
// test-results/screens/staging/ (look at them).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { shot, waitForReady } from './hooks.ts';

const feedFrame = (page: Page) =>
  page.getByTestId('stage-feed').locator('img').getAttribute('data-frame');

test('staging: the stinger feed leads in, then the caption and QUILL', async ({ page }) => {
  // Real-time text: this flow tests the lead-in and Skip during it, which fast text cuts.
  await page.goto('/?test=1&dialogue=1&seed=1&save=after_a1m5');
  await waitForReady(page);
  await page.evaluate(() => globalThis.__sd!.dialogue.play('a1_m05_scene_stinger'));
  const scene = page.getByRole('dialog', { name: 'Scene' });
  await expect(scene).toBeVisible();
  await expect(page.getByTestId('stage-feed')).toBeVisible();
  // The feed plays before any line: the caption waits.
  expect(await feedFrame(page)).toMatch(/^live_/);
  await expect(scene).not.toContainText('Rig Nine');
  await shot(page, 'staging', 1, 'stinger-live');
  await expect.poll(() => feedFrame(page), { timeout: 4000 }).toMatch(/^no_signal_/);
  // The six frames of the wrong shape played on the way (the feed records what it showed: their
  // half second is too short to catch by polling).
  const seen = (await page.getByTestId('stage-feed').getAttribute('data-seen')) ?? '';
  expect(seen).toMatch(/live_.*smudge_.*no_signal_/);
  await expect(scene).toContainText('Rig Nine. Status: not answering.');
  await expect(page.getByTestId('line-announce')).toHaveText('Rig Nine. Status: not answering.');
  await page.waitForTimeout(1000); // the caption types out
  await shot(page, 'staging', 2, 'stinger-caption');
  // On to the held beat, a silence: no Next to press (D098), and it moves on to QUILL by itself,
  // whose words the live region reads with its name.
  await page.keyboard.press('Enter');
  await expect(scene).not.toContainText('Probably a smudge');
  await expect(scene.locator('.dlg-next')).toHaveCount(0);
  await shot(page, 'staging', 7, 'stinger-held-beat');
  await expect(scene).toContainText('Probably a smudge! Logging it.', { timeout: 4000 });
  await expect(page.getByTestId('line-announce')).toHaveText(
    /^QUILL: Probably a smudge! Logging it\.$/i,
  );
  await page.waitForTimeout(1000);
  await shot(page, 'staging', 3, 'stinger-quill');
  await page.keyboard.press('Escape');
  await expect(scene).toBeHidden();

  // Skip during the lead-in cuts straight to NO SIGNAL and the caption.
  await page.evaluate(() => globalThis.__sd!.dialogue.play('a1_m05_scene_stinger'));
  await expect(scene).toBeVisible();
  await scene.getByRole('button', { name: 'Skip' }).click();
  await expect(scene).toContainText('Rig Nine');
  await expect.poll(() => feedFrame(page)).toMatch(/^no_signal_/);
});

test('staging: under reduced motion the feed holds three stills', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/?test=1&dialogue=1&fasttext=1&seed=1&save=after_a1m5');
  await waitForReady(page);
  await page.evaluate(() => globalThis.__sd!.dialogue.play('a1_m05_scene_stinger'));
  expect(await feedFrame(page)).toBe('live_0');
  await expect.poll(() => feedFrame(page), { timeout: 3000 }).toBe('no_signal_0');
  // One held still of the shape on the way, and no static.
  await expect(page.getByTestId('stage-feed')).toHaveAttribute(
    'data-seen',
    'live_0 smudge_3 no_signal_0',
  );
  await expect(page.getByRole('dialog', { name: 'Scene' })).toContainText('Rig Nine');
  await shot(page, 'staging', 4, 'stinger-still-caption');
  await context.close();
});

test('staging: the party fires the cannon and the record counter lands', async ({ page }) => {
  await page.goto('/?test=1&dialogue=1&fasttext=1&seed=1&save=after_a1m4');
  await waitForReady(page);
  void page.evaluate(() =>
    globalThis.__sd!.results({
      map: 'a1_m05',
      outcome: 'won',
      quietWave: { spawned: 7, leaked: 7 },
      flow: { before: ['a1_m05_scene_party'], after: [] },
    }),
  );
  const scene = page.getByRole('dialog', { name: 'Scene' });
  await expect(scene).toBeVisible();
  await expect(page.locator('.dlg-stage[data-staging="party"]')).toBeVisible();
  // Two cannons flank the lines (D098). The left one fired (its `fire` anim is over in 0.4 s, so
  // it may already rest on idle), and its burst is up over the muzzle.
  await expect(page.getByTestId('stage-cannon')).toHaveCount(2);
  const cannon = page.getByTestId('stage-cannon').first();
  await expect(cannon.locator('img.dlg-cannon-body')).toHaveAttribute(
    'data-frame',
    /^(fire_|idle)/,
  );
  await expect(cannon.locator('img.dlg-burst-frame')).toHaveAttribute('data-frame', /^burst_/);
  await page.waitForTimeout(300);
  await shot(page, 'staging', 5, 'party-burst');
  // The counter lands on the career total (its label says the total), and the record tag shows.
  const record = page.getByTestId('stage-record');
  await expect(record.locator('.dlg-record-tag.on')).toBeVisible({ timeout: 4000 });
  const label = await record.locator('.dlg-record-line').getAttribute('aria-label');
  const total = /([\d,]+)$/.exec(label ?? '')?.[1] ?? 'none';
  await expect(record.locator('.dlg-record-n')).toHaveText(total);
  await expect(scene).toContainText('RECORD QUARTER!');
  await shot(page, 'staging', 6, 'party-counter');
  // Esc skips it, and the card shows.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'PERIMETER SECURED!' })).toBeVisible();
});
