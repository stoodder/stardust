// T713: Act III part two's dialogue presentation, live.
// - **QUILL offline** (A3M5 under C4 Rewrite, `save=after_a3m4_rewrite`): in A3M5's battle
//   (`?map=a3_m05`) the briefing, if its lines are registered yet (T721's), never shows QUILL; an
//   A3M5-shaped scene (the dev twin `a1_m01_cue_dev_intel`: QUILL's intel, then `system`'s) shows
//   only `system`'s line, and a QUILL bark cued there shows nothing. Under Keep both speak. At the
//   base, Research shows no QUILL copy under Rewrite (and does under Keep).
// - **A3M4's silences** (`save=after_a3m3_convoy`, `?map=a3_m04`): Bricks's frame lights dark as
//   the map starts; then W2's countdown radio is his dark silence too. Fast-forward runs ahead of
//   the radio's real-time holds (T720's note), so each moment is played at 1× before it's checked.
// - **Gerald's status line** (`a3_m04_w08`) in its teal readout, and **Purge's QUILL** in a panel:
//   the status bar blinking through a silence (`a1_m01_base_dev_status`).
// Screenshots in <out>/screens/t713/.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { shot, waitForReady } from './hooks.ts';

const comms = (page: Page) => page.getByTestId('comms');

/** Opens `map` on `save` with the radio on, clocks in past any briefing; returns its text. */
async function battle(page: Page, map: string, save: string): Promise<string> {
  await page.goto(`/?test=1&dialogue=1&fasttext=1&seed=1&map=${map}&save=${save}`);
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  const brief = page.getByRole('dialog');
  let said = '';
  if (await brief.isVisible()) {
    said = (await page.getByTestId('briefing-lines').textContent()) ?? '';
    await page.keyboard.press('Escape');
    await expect(brief).toBeHidden();
  }
  return said;
}

test('QUILL offline on A3M5 under Rewrite: `system` speaks, QUILL is silent', async ({ page }) => {
  test.setTimeout(90_000);
  const said = await battle(page, 'a3_m05', 'after_a3m4_rewrite');
  expect(said).not.toContain('QUILL');
  await page.evaluate(() => globalThis.__sd!.setSpeed(0));
  // Whatever the map start said has had its time.
  await expect(comms(page)).toHaveCount(0, { timeout: 15_000 });
  await page.evaluate(() => globalThis.__sd!.dialogue.play('a1_m01_cue_dev_intel'));
  await expect(comms(page)).toContainText('Threat Advisory: Auditor units inbound.');
  await expect(comms(page)).not.toContainText('QUILL');
  await expect(comms(page)).not.toContainText('Jammers inbound');
  await shot(page, 't713', 1, 'rewrite-system-intel');
  await expect(comms(page)).toHaveCount(0, { timeout: 15_000 });
  await page.evaluate(() => globalThis.__sd!.dialogue.bark('quill_boss_phase_a1_98'));
  await page.waitForTimeout(300);
  await expect(comms(page)).toHaveCount(0);

  // The base before A3M5 (frontier A3M5): Research runs without a word from QUILL.
  await page.evaluate(() => globalThis.__sd!.goto('base'));
  await page.getByRole('tab', { name: 'Research' }).click();
  await expect(page.locator('.sd-offer').first()).toBeVisible();
  await expect(page.locator('.sd-offer-copy')).toHaveCount(0);
  await expect(page.getByTestId('store-line')).toHaveText('');
  await shot(page, 't713', 2, 'rewrite-research');
});

test('QUILL online on A3M5 under Keep: he speaks, and Research has his copy', async ({ page }) => {
  test.setTimeout(90_000);
  await battle(page, 'a3_m05', 'after_a3m4_keep');
  await page.evaluate(() => globalThis.__sd!.setSpeed(0));
  await expect(comms(page)).toHaveCount(0, { timeout: 15_000 });
  await page.evaluate(() => globalThis.__sd!.dialogue.play('a1_m01_cue_dev_intel'));
  await expect(comms(page)).toContainText('Jammers inbound');
  await page.evaluate(() => globalThis.__sd!.goto('base'));
  await page.getByRole('tab', { name: 'Research' }).click();
  await expect(page.locator('.sd-offer-copy').first()).toBeVisible();
});

test("A3M4: Bricks's dark silences, Gerald's status line, Purge's blinking bar", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await battle(page, 'a3_m04', 'after_a3m3_convoy');
  // The map start: his frame, dark, no words.
  const dark = comms(page).locator('.dlg-portrait.dark');
  await expect(dark).toBeVisible();
  await expect(comms(page).locator('.dlg-silence')).toHaveCount(1);
  await shot(page, 't713', 3, 'a3m4-start-silence');
  await page.evaluate(() => globalThis.__sd!.setSpeed(0));
  await expect(comms(page)).toHaveCount(0, { timeout: 15_000 });

  // W2's countdown radio: fast-forward to its start, then let it show at 1×.
  const reached = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    // The setup phase waits for the player: call W1.
    sd.enqueue({ type: 'callWave' });
    for (let k = 0; k < 60 * 120; k++) {
      if (sd.dialogue.shown().comms === '') return true;
      sd.fastForward(1);
    }
    return false;
  });
  expect(reached).toBe(true);
  await page.evaluate(() => globalThis.__sd!.setSpeed(1));
  await expect(dark).toBeVisible();
  await expect(comms(page)).toContainText('Bricks');
  await page.evaluate(() => globalThis.__sd!.setSpeed(0));
  await expect(comms(page)).toHaveCount(0, { timeout: 15_000 });

  // Gerald's status line.
  await page.evaluate(() => globalThis.__sd!.dialogue.play('a3_m04_w08'));
  const status = comms(page).locator('.dlg-status');
  await expect(status).toContainText('DELIVERY: COMPLETE.');
  await expect(comms(page).locator('.dlg-portrait.icon')).toBeVisible();
  await shot(page, 't713', 4, 'gerald-status');
});

test("Purge's QUILL: the status bar blinks through a silence", async ({ page }) => {
  test.setTimeout(60_000);
  // Plain text speed: the silence holds its whole 4 s.
  await page.goto('/?test=1&dialogue=1&seed=1&save=after_a3m4_purge');
  await waitForReady(page);
  await page.evaluate(() => globalThis.__sd!.goto('base'));
  await page.evaluate(() => globalThis.__sd!.dialogue.play('a1_m01_base_dev_status'));
  const portrait = page.getByTestId('scene').locator('.dlg-portrait');
  await expect(portrait).toHaveAttribute('data-frame', 'purge.neutral');
  await expect(portrait).toHaveAttribute('data-frame', 'purge.neutral_talk', { timeout: 3000 });
  await shot(page, 't713', 5, 'purge-status-blink');
});
