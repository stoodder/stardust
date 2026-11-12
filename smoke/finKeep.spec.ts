// T821: FIN under Keep (`?save=after_a3m6_keep&map=fin_m01`), played by par (`autoplay('par')`) to
// Directive 0, 20 s into Phase 2: QUILL folds the most-invested class (its build slot under the
// LICENSE REVOKED stamp), Time Dilation goes dark, and the one button, "Who's there?", shows and
// arms after the cue's last line ("...Knock knock."). Pressed, it restores the class (no stamp left)
// and the battle stands paused for the rebuild under QUILL's word (D156) until Space (with the radio
// on, the second test: the punchline lands first, then the word); par plays on
// through Dawn (it rebuilds the class, sim/headless.ts) to the win, the stamp never back. Screenshots in <out>/screens/fin-keep/ (look at them: the button over the Halls, the bar
// after the press).
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

const FLOW = 'fin-keep';

test('FIN under Keep: Directive 0, "Who\'s there?", the class restored through Dawn', async ({
  page,
}) => {
  test.setTimeout(300_000);
  await page.goto('/?test=1&save=after_a3m6_keep&map=fin_m01&seed=1');
  await waitForReady(page);
  const brief = page.getByRole('dialog');
  if (await brief.isVisible()) await page.keyboard.press('Escape');
  await expect(page.getByTestId('hud')).toBeVisible();

  // Par to Directive 0, stopping the tick it asks (before par's own press).
  const asked = await page.evaluate(() => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    sd.setSpeed(0);
    sd.autoplay('par');
    sd.fastForward(0);
    const st = sd.state()!;
    for (let k = 0; k < 60 * 60 * 20 && st.pendingInput === null && st.outcome === 'playing'; k++) {
      sd.fastForward(1);
    }
    sd.autoplay('none');
    return {
      pending: st.pendingInput,
      phase: st.phase,
      sec: Math.round((st.tick - st.phaseTick) / 60),
      revoked: [...st.revoked.towers],
      locked: [...st.abilitiesLocked],
    };
  });
  expect(asked).toEqual({
    pending: 'whos_there',
    phase: 2,
    sec: 20,
    revoked: ['mindspike'],
    locked: ['time_dilation'],
  });
  await expect(page.getByTestId('slot-revoked')).toHaveCount(1);

  // Shown at once, armed once QUILL's knock has typed.
  await page.evaluate(() => globalThis.__sd!.setSpeed(1));
  const button = page.getByTestId('forced-input');
  await expect(button).toBeVisible();
  await expect(button).toHaveText("Who's there?");
  await expect(button).toHaveAttribute('data-armed', 'true', { timeout: 30_000 });
  await nextFrames(page);
  await shot(page, FLOW, 1, 'whos-there');
  await button.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => globalThis.__sd!.state()?.pendingInput)).toBeNull();
  expect(await page.evaluate(() => [...globalThis.__sd!.state()!.revoked.towers])).toEqual([]);
  await expect(page.getByTestId('slot-revoked')).toHaveCount(0);
  // The battle stands paused for the rebuild, QUILL's word under PAUSED (D156); the sim holds.
  const note = page.getByTestId('pause-note');
  await expect(note).toBeVisible();
  await expect(note).toContainText('QUILL');
  await expect(note).toContainText('rebuild');
  const held = await page.evaluate(() => globalThis.__sd!.state()!.tick);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => globalThis.__sd!.state()!.tick)).toBe(held);
  await nextFrames(page);
  await shot(page, FLOW, 2, 'restored');
  // Space resumes; the word goes with the pause.
  await page.keyboard.press('Space');
  await expect(note).toHaveCount(0);

  // Par plays on (rebuilding the class) through Dawn to the win; no stamp comes back.
  const dawn = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
    const st = sd.state()!;
    for (let k = 0; k < 60 * 60 * 6 && st.phase < 3 && st.outcome === 'playing'; k++) {
      sd.fastForward(1);
    }
    sd.fastForward(60);
    return { phase: st.phase, outcome: st.outcome, revoked: [...st.revoked.towers] };
  });
  expect(dawn).toEqual({ phase: 3, outcome: 'playing', revoked: [] });
  await expect(page.getByTestId('slot-revoked')).toHaveCount(0);
});

// M8 review round 2, A2-1/A2-2 (S2-1, S2-8), with the radio on: "Who's there?" arms only once
// "...Knock knock." has typed on screen; the press moves the knock on, the battle freezes for the
// restore, "Not Everglow." and "...That's the joke." play through the pause, and only then does
// QUILL's rebuild note show (naming no key). Screenshots: the knock armed, the punchline under the
// pause (no note), the joke landed with the note.
test('FIN under Keep, radio on: the knock-knock lands before the rebuild note', async ({
  page,
}) => {
  test.setTimeout(300_000);
  await page.goto('/?test=1&dialogue=1&save=after_a3m6_keep&map=fin_m01&seed=1');
  await waitForReady(page);
  for (let i = 0; i < 12; i++) {
    // oxlint-disable-next-line no-await-in-loop -- one briefing step after another
    if (!(await page.getByRole('dialog').isVisible())) break;
    const clockIn = page.getByRole('button', { name: 'Clock in' });
    const next = page.locator('.dlg-next');
    // oxlint-disable-next-line no-await-in-loop -- one briefing step after another
    if (await clockIn.isVisible()) await clockIn.click();
    // oxlint-disable-next-line no-await-in-loop -- one briefing step after another
    else if (await next.isVisible()) await next.click();
    // oxlint-disable-next-line no-await-in-loop -- one briefing step after another
    else await page.keyboard.press('Escape');
    // oxlint-disable-next-line no-await-in-loop -- one briefing step after another
    await page.waitForTimeout(300);
  }
  await expect(page.getByTestId('hud')).toBeVisible();
  // Par into Phase 2, then the sim runs on at 1× to Directive 0 so its radio plays in real time.
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
    sd.fastForward(0);
    const st = sd.state()!;
    for (let k = 0; k < 60 * 60 * 40 && st.phase < 2 && st.outcome === 'playing'; k++) {
      sd.fastForward(1);
    }
    sd.autoplay('none');
    sd.setSpeed(1);
  });
  const button = page.getByTestId('forced-input');
  await expect(button).toBeVisible({ timeout: 60_000 });
  const comms = page.getByTestId('comms');
  await expect(button).toHaveAttribute('data-armed', 'true', { timeout: 60_000 });
  // Armed only with the knock whole on the panel: nothing of it left untyped.
  await expect(comms.locator('.dlg-comms-line .dlg-text')).toContainText('Knock knock.');
  await expect(comms.locator('.dlg-untyped')).toHaveCount(0);
  await nextFrames(page);
  await shot(page, FLOW, 3, 'knock-armed');
  await button.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => globalThis.__sd!.state()?.pendingInput)).toBeNull();
  // The punchline follows at once, under the pause, with no note yet.
  await expect(comms).toContainText('Not Everglow.', { timeout: 3000 });
  const note = page.getByTestId('pause-note');
  await expect(note).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Pause' })).toHaveAttribute('aria-pressed', 'true');
  const held = await page.evaluate(() => globalThis.__sd!.state()!.tick);
  await nextFrames(page);
  await shot(page, FLOW, 4, 'not-everglow');
  // The joke lands; then, once it has typed, QUILL's word.
  await expect(comms).toContainText("That's the joke.", { timeout: 10_000 });
  await expect(note).toBeVisible({ timeout: 10_000 });
  await expect(note).toContainText('Rebuild, then press play.');
  await expect(note).not.toContainText('Space');
  expect(await page.evaluate(() => globalThis.__sd!.state()!.tick)).toBe(held);
  await nextFrames(page);
  await shot(page, FLOW, 5, 'joke-then-note');
  await page.keyboard.press('Space');
  await expect(note).toHaveCount(0);
});
