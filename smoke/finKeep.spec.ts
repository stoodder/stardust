// T821: FIN under Keep (`?save=after_a3m6_keep&map=fin_m01`), played by par (`autoplay('par')`) to
// Directive 0, 20 s into Phase 2: QUILL folds the most-invested class (its build slot under the
// LICENSE REVOKED stamp), Time Dilation goes dark, and the one button, "Who's there?", shows and
// arms after the cue's last line ("...Knock knock."). Pressed, it restores the class (no stamp left),
// and par plays on through Dawn (it rebuilds the class, sim/headless.ts) to the win, the stamp never
// back. Screenshots in <out>/screens/fin-keep/ (look at them: the button over the Halls, the bar
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
  await nextFrames(page);
  await shot(page, FLOW, 2, 'restored');

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
