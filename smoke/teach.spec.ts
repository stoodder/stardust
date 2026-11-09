// The Time Dilation teach (D098 S6) on A1M3, played by par (`autoplay('par')`) up to W5's
// countdown, then by nobody (`autoplay('none')`), so the flock comes in uncast: as a turret first
// shoots at it, the bottom hint names Time Dilation and its key, and its slot pulses; one press
// casts it and both go. Screenshots in test-results/screens/teach/ (look at them).
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

test('teach: Time Dilation on A1M3’s flock, until the first cast', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?test=1&map=a1_m03&seed=1');
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  const reached = await page.evaluate(() => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    sd.setSpeed(0);
    sd.autoplay('par');
    const st = sd.state()!;
    // Par to W5's countdown (par's own cast would come 8 s into the wave).
    for (let k = 0; k < 60 * 600; k++) {
      if (st.wave === 4 && st.schedule.phase === 'countdown') break;
      sd.fastForward(1);
    }
    if (st.wave !== 4) return false;
    sd.autoplay('none');
    // Until a turret shoots at one of the flock's flyers.
    const flockInReach = (): boolean => {
      for (let i = 0; i < st.towers.used; i++) {
        const t = st.towers.items[i]!;
        if (!t.alive || t.targetUid === 0) continue;
        const e = st.enemies.items[t.targetSlot];
        if (e?.alive === true && e.uid === t.targetUid && e.wave === 5 && e.def?.layer === 'air') {
          return true;
        }
      }
      return false;
    };
    for (let k = 0; k < 60 * 60; k++) {
      if (flockInReach()) return true;
      sd.fastForward(1);
    }
    return false;
  });
  expect(reached).toBe(true);
  await nextFrames(page);
  const hint = page.getByTestId('time-dilation-hint');
  await expect(hint).toBeVisible();
  // A1M3's Time Dilation is QUILL's, the companion's slot 2: E.
  await expect(hint).toHaveAttribute('aria-label', 'Time Dilation slows the flock (E)');
  const slot = page.getByTestId('ability-2');
  await expect(slot).toHaveClass(/\bpulse\b/);
  await expect(page.getByTestId('ability-1')).not.toHaveClass(/\bpulse\b/);
  await shot(page, 'teach', 1, 'time-dilation-hint');
  // One press casts it (untargeted): the hint and the pulse go for the rest of the run.
  await page.keyboard.press('KeyE');
  await page.evaluate(() => globalThis.__sd!.fastForward(1));
  await nextFrames(page);
  await expect(hint).toHaveCount(0);
  await expect(slot).not.toHaveClass(/\bpulse\b/);
  await shot(page, 'teach', 2, 'time-dilation-cast');
});
