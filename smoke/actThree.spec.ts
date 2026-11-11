// T613: Act III's presentation dials on screen (core-loop.md § 6.7, act3.md's preamble). (1) The
// Results card in Act III: "PERIMETER SECURED." with no exclamation (Sterling and Pebble keep the
// only ones), a loss's card the same, the counter the meter's line, no star. (2) The Title's tip
// with an Act III campaign in play: "Remember.". (3) The codex is the *Field Journal* from A3M1.
// (4) A3M2's three billboards dark, the hum-glyph over Evie's smile. (5) A3M1's first wave clear:
// no jingle plays, and QUILL notices ("...No song. Logging it."). (6) A3M2's Clean Exit cue on a
// pausing panel (Sterling's portrait; the battle holds), its 2 s held beat moving on by itself.
// Screenshots via shot() (smoke/out.ts); look at the card, the journal, the boards, the panel.
import type { Page } from '@playwright/test';
import { SAVE_VERSION } from '../src/meta/saveData.ts';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';
import { outPath } from './out.ts';

test('act three: Results drops the cheer: "PERIMETER SECURED." and no star', async ({ page }) => {
  await page.goto('/?test=1&seed=1&save=after_a3m1_spared');
  await waitForReady(page);
  await page.evaluate(() => globalThis.__sd!.results({ map: 'a3_m02', outcome: 'won', pests: 0 }));
  const card = page.getByRole('dialog', { name: 'PERIMETER SECURED.' });
  await expect(card).toBeVisible();
  await expect(card.getByText('Shift report · Auto-filed')).toBeVisible();
  await expect(card).not.toContainText('PERIMETER SECURED!');
  await expect(card.locator('.sd-results-star')).toHaveCount(0);
  await expect(card).not.toContainText('Pests processed');
  expect(await page.locator('main.sd-results').getAttribute('data-act')).toBe('3');
  await shot(page, 'act-three', 1, 'results-won');

  await page.evaluate(() => globalThis.__sd!.results({ map: 'a3_m02', outcome: 'lost', pests: 0 }));
  const lost = page.getByRole('dialog', { name: 'MINOR OPERATIONAL HICCUP' });
  await expect(lost).toBeVisible();
  await expect(lost.getByText('Shift report · Auto-filed')).toBeVisible();
  await shot(page, 'act-three', 2, 'results-lost');
});

test("act three: the Title's tip is Act III's, and the codex is the Field Journal", async ({
  page,
}) => {
  // File the save after A3M1 in slot 1, as if it were played there, and come back to the Title.
  await page.goto('/?test=1&seed=1&save=after_a3m1_spared');
  await waitForReady(page);
  await page.evaluate((v) => {
    const data = globalThis.__sd!.save();
    localStorage.setItem('stardust:slot:1', JSON.stringify({ v, savedAt: 1793100000000, data }));
    localStorage.setItem('stardust:lastSlot', '1');
  }, SAVE_VERSION);
  await page.goto('/?test=1&seed=1');
  await waitForReady(page);
  await expect(page.getByTestId('title-tip')).toHaveText('Tip Remember.');
  await shot(page, 'act-three', 3, 'title-tip');

  await page.goto('/?test=1&seed=1&save=after_a3m1_spared');
  await waitForReady(page);
  await page.evaluate(() => globalThis.__sd!.goto('base'));
  await expect(page.getByRole('heading', { name: 'Base' })).toBeVisible();
  // The Bounty Board is gone without comment (Act II's close).
  await expect(page.getByRole('tab', { name: /^Bounty/ })).toHaveCount(0);
  await page.getByRole('tab', { name: /^Journal/ }).click();
  const journal = page.getByRole('navigation', { name: 'Field Journal entries' });
  await expect(journal).toBeVisible();
  await expect(journal).toContainText('Field Journal');
  await shot(page, 'act-three', 4, 'field-journal');
});

/** Saves a close-up of the playfield around tile (x, y). */
async function closeUp(page: Page, x: number, y: number, name: string): Promise<void> {
  const at = await page.evaluate((t) => globalThis.__sd!.tileToClient(t.x, t.y), { x, y });
  expect(at).not.toBeNull();
  if (at === null) return;
  await page.screenshot({
    path: outPath(`screens/act-three/${name}.png`),
    clip: { x: Math.max(0, at.x - 160), y: Math.max(0, at.y - 90), width: 320, height: 130 },
  });
}

test("act three: A3M2's billboards are dark, the hum-glyph over Evie's smile", async ({ page }) => {
  await page.goto('/?test=1&map=a3_m02&skipIntro=1&seed=1');
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  // Past the briefing (Clock in), paused before the first wave.
  await page.keyboard.press('Escape');
  await page.evaluate(() => globalThis.__sd!.setSpeed(0));
  await nextFrames(page);
  await shot(page, 'act-three', 5, 'a3m2-plaza');
  // The three boards on A1M4's north row (9,2), (12,2), (15,2).
  await closeUp(page, 12, 2, 'billboards-dark');
});

/** Plays par one tick at a time until wave 1 has resolved (up to 15 min of sim time). */
async function untilFirstClear(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    for (let k = 0; k < 60 * 900; k++) {
      const st = sd.state()!;
      if (st.wave >= 1 && st.schedule.phase === 'countdown') return true;
      if (st.outcome !== 'playing') return false;
      sd.fastForward(1);
    }
    return false;
  });
}

test("act three: no song plays as A3M1's first wave clears, and QUILL notices", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto('/?test=1&dialogue=1&fasttext=1&map=a3_m01&skipIntro=1&seed=1');
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
  });
  expect(await untilFirstClear(page)).toBe(true);
  await page.evaluate(() => globalThis.__sd!.setSpeed(1));
  await expect(page.getByTestId('comms')).toContainText('...No song. Logging it.', {
    timeout: 10_000,
  });
  await page.evaluate(() => globalThis.__sd!.setSpeed(0));
  await nextFrames(page);
  await shot(page, 'act-three', 7, 'no-song');
});

test("act three: Sterling's Clean Exit cue holds the battle on a panel, her pause moving on", async ({
  page,
}) => {
  await page.goto('/?test=1&dialogue=1&fasttext=1&map=a3_m02&skipIntro=1&seed=1');
  await waitForReady(page);
  await page.keyboard.press('Escape'); // Clock in
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(1);
    sd.dialogue.play('a3_m02_cue_revoke');
  });
  // The pausing panel (SceneLayer's non-full-screen dialog, named Comms).
  const panel = page.getByRole('dialog', { name: 'Comms' });
  await expect(panel).toContainText("I'm revoking your Corporate Tower License now!");
  // A pausing panel: the battle holds at speed 0 while it's open (the sim would keep ticking).
  const tick = () => page.evaluate(() => globalThis.__sd!.state()?.tick ?? -1);
  const before = await tick();
  await page.waitForTimeout(400);
  expect(await tick()).toBe(before);
  await nextFrames(page);
  await shot(page, 'act-three', 8, 'clean-exit-sterling');
  // Through QUILL's two lines to her held beat (fast text: each line is whole, so a Next moves on),
  // which then moves on by itself, with no press, to her next line.
  const next = panel.getByRole('button', { name: 'Next' });
  await next.click();
  await expect(panel).toContainText('License revoked.');
  await next.click();
  await expect(panel).toContainText("I'm so sorry.");
  await next.click();
  await expect(panel).toContainText('Oh! The Preserve was always the buffer', { timeout: 5000 });
  await shot(page, 'act-three', 9, 'clean-exit-buffer');
});
