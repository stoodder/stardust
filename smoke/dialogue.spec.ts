// Dialogue (T302b, T302c; tech/story-runtime.md, art-direction.md § Dialogue presentation): A1M1's
// briefing as a scene (portraits, the typewriter, keyboard-only advance, Bricks's question and the
// player's first choice, Clock in), a scene with a choice
// that pauses play and puts the speed back, a full-screen scene, a bark on the comms panel with
// its portrait, and a bark's reply button. `?test=1` keeps dialogue off unless `&dialogue=1`.
// The typewriter and the radio's holds run on the page's clock: where a step must land while a
// line is still typing, or while a button is still up, the test pauses the clock (Playwright's
// `page.clock`), so a loaded machine can't let the line finish (or the bark go) between two
// steps (T513: the keyboard-pick flow failed under the gate's load, its answer typed out before
// the Enter meant to finish it).
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

const URL = '/?test=1&seed=1&dialogue=1';

/**
 * Reads one line on: Enter finishes its typing (Skip → Next), Enter again moves on. Called with the
 * page's clock paused (`pauseClock`), so the line can't finish typing between the look and the
 * key; a line already whole as the clock stopped (the first, on a slow machine) takes one Enter.
 */
async function readLine(page: Page, next: Locator): Promise<void> {
  await expect(next).toBeFocused();
  if ((await next.textContent())?.trim() === 'Skip') {
    await page.keyboard.press('Enter');
    await expect(next).toHaveText('Next');
  }
  await page.keyboard.press('Enter');
}

/**
 * Stops the page's clock just ahead of where it is (time, timers, and frames hold until
 * `resume`); the margin covers the round trip (the clock can't be moved back), widened on a miss.
 */
async function pauseClock(page: Page, margin = 100): Promise<void> {
  const now = await page.evaluate(() => Date.now());
  try {
    await page.clock.pauseAt(now + margin);
  } catch (e) {
    // The round trip outran the margin ("Cannot fast-forward to the past"): try a wider one.
    if (margin >= 3200) throw e;
    await pauseClock(page, margin * 2);
  }
}

/** Starts A1M1 from the Title (a new save), with its briefing up. */
async function startShift(page: Page): Promise<void> {
  // The clock is installed (running as usual) so a test can pause it (`pauseClock`).
  await page.clock.install();
  await page.goto(URL);
  await waitForReady(page);
  await expect(page.getByRole('button', { name: 'Start shift' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Shift briefing' })).toBeVisible();
}

test('dialogue: the briefing plays as a scene, by keyboard alone', async ({ page }) => {
  await startShift(page);
  // The clock holds through the briefing, so each line is still typing when its first Enter lands.
  await pauseClock(page);
  const briefing = page.getByRole('dialog', { name: 'Shift briefing' });
  const lines = page.getByTestId('briefing-lines');
  // QUILL first, with its portrait; the line types (Skip), then reads on (Next).
  await expect(lines).toContainText('QUILL');
  await expect(briefing.locator('.dlg-portrait img')).toBeVisible();
  const next = briefing.getByRole('button', { name: /^(Skip|Next)$/ });
  await expect(next).toBeFocused();
  await shot(page, 'dialogue', 1, 'briefing-typing');
  // Enter finishes the typing, Enter again reads on: five lines, up to Bricks's question.
  await readLine(page, next);
  await readLine(page, next);
  await readLine(page, next);
  await readLine(page, next);
  await readLine(page, next);
  await expect(lines).toContainText('Nothing goes on the path but bugs and bad decisions.');
  await expect(lines).toContainText('Any questions, Sprout?');
  // The choice: its first option has the focus, and Enter takes it.
  const ask = briefing.getByRole('button', { name: 'Where do they all come from?' });
  await expect(ask).toBeFocused();
  await expect(briefing.getByRole('button', { name: '...No, Sergeant.' })).toBeVisible();
  await shot(page, 'dialogue', 2, 'briefing-choice');
  await page.keyboard.press('Enter');
  // QUILL answers (by policy); then Clock in has the focus.
  await readLine(page, next);
  await expect(lines).toContainText('Further questions go to Extraction. (Per policy.)');
  await expect(next).toHaveCount(0);
  const clockIn = briefing.getByRole('button', { name: 'Clock in' });
  await expect(clockIn).toBeFocused();
  await expect(page.getByTestId('threat-intel')).toBeVisible();
  await shot(page, 'dialogue', 3, 'briefing-done');
  await page.keyboard.press('Enter');
  await expect(briefing).toBeHidden();
  const save = await page.evaluate(() => globalThis.__sd!.save());
  expect(save).not.toBeNull();
});

test('dialogue: a scene with a choice pauses play, takes a keyboard pick, and resumes', async ({
  page,
}) => {
  await startShift(page);
  // Esc clocks in at once (D040).
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Shift briefing' })).toBeHidden();
  await page.evaluate(() => globalThis.__sd!.setSpeed(2));
  // The page's clock holds from here to the scene's end, so each line is still typing when its
  // first Enter lands, however slow the machine (the scene's own pause is checked by the tick).
  await pauseClock(page);
  await page.evaluate(() => globalThis.__sd!.dialogue.play('a1_m01_cue_dev_survey'));
  const scene = page.getByRole('dialog', { name: 'Comms' });
  await expect(scene).toBeVisible();
  // Paused under the scene, and the HUD is out of reach.
  await expect(page.getByRole('button', { name: 'Pause' })).toHaveAttribute('aria-pressed', 'true');
  const tick = await page.evaluate(() => globalThis.__sd!.state()!.tick);
  await expect(scene).toContainText('QUILL');
  await expect(scene.locator('.dlg-portrait img')).toBeVisible();
  await shot(page, 'dialogue', 4, 'scene-panel');
  // Keyboard: each line takes Enter to finish typing and Enter to read on.
  const next = scene.getByRole('button', { name: /^(Skip|Next)$/ });
  await readLine(page, next);
  await readLine(page, next);
  const answer = scene.getByRole('group', { name: 'Your answer' });
  await expect(answer.getByRole('button')).toHaveCount(3);
  await expect(answer.getByRole('button', { name: /Great, honestly/ })).toBeFocused();
  await shot(page, 'dialogue', 5, 'scene-choice');
  await page.keyboard.press('ArrowDown');
  await expect(answer.getByRole('button', { name: /Ask me after lunch/ })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(scene).toContainText('Lunch is at noon. (Per policy.)');
  await expect(next).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(next).toHaveText('Next');
  // The sim didn't move under the scene, even with time running (at 2×, a second is 120 ticks).
  await page.clock.resume();
  await page.waitForTimeout(1000);
  expect(await page.evaluate(() => globalThis.__sd!.state()!.tick)).toBe(tick);
  await expect(next).toHaveText('Next');
  await page.keyboard.press('Enter');
  await expect(scene).toBeHidden();
  // The speed came back.
  await expect(page.getByRole('button', { name: 'Pause' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect(page.getByRole('button', { name: 'Double speed' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const seen = await page.evaluate(() => globalThis.__sd!.save()!.story.seen);
  expect(seen).toContain('a1_m01_cue_dev_survey');
});

test('dialogue: a full-screen scene, and Esc skips it', async ({ page }) => {
  await startShift(page);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Shift briefing' })).toBeHidden();
  // The clock holds while the lines are read, so each is still typing when its first Enter lands.
  await pauseClock(page);
  await page.evaluate(() => globalThis.__sd!.dialogue.play('a1_m01_scene_dev_party'));
  const scene = page.getByRole('dialog', { name: 'Scene' });
  await expect(scene).toBeVisible();
  // The narrator's caption first; Next takes the focus as it arrives.
  const next = scene.getByRole('button', { name: /^(Skip|Next)$/ });
  await expect(next).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(next).toHaveText('Next');
  await page.keyboard.press('Enter');
  await expect(scene).toContainText('QUILL');
  await expect(next).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(next).toHaveText('Next');
  await page.keyboard.press('Enter');
  await expect(scene).toContainText('Bricks');
  await page.clock.resume();
  await page.waitForTimeout(1500); // Bricks's line types out
  await nextFrames(page);
  await shot(page, 'dialogue', 6, 'fullscreen');
  await page.keyboard.press('Escape');
  await expect(scene).toBeHidden();
});

test('dialogue: barks on the comms panel with a portrait, and a reply button', async ({ page }) => {
  // Fast text (T461): lines show whole and the panel's holds run shorter.
  await page.clock.install();
  await page.goto('/?test=1&skipIntro=1&seed=1&dialogue=1&fasttext=1');
  await waitForReady(page);
  // The first leak: QUILL's bark, with its portrait. It queues behind the bank nudge if that
  // speaks first (nothing is built, so W2's build phase opens with a big bank).
  await page.evaluate(() => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    sd.setSpeed(0);
    sd.autoplay('none'); // closes the briefing; nothing built, so W1's first Nibbler leaks
    for (let i = 0; i < 400 && sd.state()!.integrity === 20; i++) sd.fastForward(10);
  });
  const comms = page.getByRole('log', { name: 'Radio' });
  await expect(comms).toContainText('Pest escaped containment!', { timeout: 10_000 });
  await expect(comms.locator('.dlg-portrait img')).toBeVisible();
  await page.waitForTimeout(250); // the panel's 160 ms line-in step
  await nextFrames(page);
  await shot(page, 'dialogue', 7, 'bark');
  // A bark with a reply button: pressing it plays the reply at once. The game keeps running.
  await page.evaluate(() => globalThis.__sd!.dialogue.bark('quill_map_start_a1_99'));
  const reply = comms.getByRole('button', { name: "Who's there?" });
  await expect(reply).toBeVisible({ timeout: 15_000 });
  // The button stays only for its bark's hold (1.5 s under fast text): the clock holds while the
  // shot is taken and the button pressed, so a slow screenshot can't outlast it (T513's flake).
  await pauseClock(page);
  await shot(page, 'dialogue', 8, 'bark-button');
  await reply.click();
  await expect(comms).toContainText('Lettuce!');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.clock.resume();
});

test("dialogue: Pebble's handover at the base, in Bricks's bottle cap (T513)", async ({ page }) => {
  // A2M4 won: the dev save has made its first base visit already, so the base opens clear.
  await page.goto('/?test=1&seed=1&dialogue=1&fasttext=1&save=after_a2m4_returned');
  await waitForReady(page);
  await page.evaluate(() => globalThis.__sd!.goto('base'));
  await expect(page.getByRole('heading', { name: 'Base' })).toBeVisible();
  const scene = page.getByRole('dialog', { name: 'Comms' });
  await expect(scene).toHaveCount(0);
  // The handover as its first visit plays it: a panel over the base.
  await page.evaluate(() => globalThis.__sd!.dialogue.play('a2_m04_base_handover'));
  await expect(scene).toContainText("She's yours tonight, Goldie. She bites.");
  const next = scene.getByRole('button', { name: /^(Skip|Next)$/ });
  await expect(next).toBeFocused();
  await page.keyboard.press('Enter');
  // Pebble, named, in the cap (`cap.<expression>`).
  await expect(scene).toContainText('(squeak) Only a little.');
  await expect(scene.locator('.dlg-name').first()).toHaveText('Pebble');
  await expect(scene.locator('.dlg-portrait')).toHaveAttribute('data-frame', /^cap\./);
  await page.waitForTimeout(250); // the panel's 160 ms line-in step
  await shot(page, 'dialogue', 9, 'handover-cap');
  await page.keyboard.press('Enter');
  await expect(scene).toContainText('Like a little egg.');
  await page.keyboard.press('Enter');
  await expect(scene).toBeHidden();
  const seen = await page.evaluate(() => globalThis.__sd!.save()!.story.seen);
  expect(seen).toContain('a2_m04_base_handover');
});
