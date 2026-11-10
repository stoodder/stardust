// A1M5's end with dialogue on (D098 S4, S11): par plays the map (`autoplay('par')`), holds fire
// through the Quiet Wave, and as the last youngling walks home and the map is won, Bricks's C1
// reaction ("...Sprout." / "Yeah. Okay.") plays on the radio over the frozen battle, before the
// party (two cannons, one each side of the lines); the card keeps his lines and the CONTAINMENT
// LAPSE stamp. Screenshots in test-results/screens/c1-radio/ (look at them).
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

test('c1 radio: Bricks reacts on the radio before the party', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/?test=1&dialogue=1&fasttext=1&map=a1_m05&seed=1');
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  // Par to the Quiet Wave, then Hold Fire on all until one of its seven is left on the road.
  const nearEnd = await page.evaluate(() => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    sd.setSpeed(0);
    sd.autoplay('par');
    const st = sd.state()!;
    const quietLive = (): number => {
      let n = 0;
      for (let i = 0; i < st.enemies.used; i++) {
        const e = st.enemies.items[i]!;
        if (e.alive && e.tags.includes('quiet_wave')) n++;
      }
      return n;
    };
    let held = false;
    for (let k = 0; k < 60 * 900 && st.outcome === 'playing'; k++) {
      if (!held && st.wave === 10 && quietLive() > 0) {
        sd.enqueue({ type: 'holdFire', target: 'all', on: true });
        held = true;
      }
      if (held && st.stats.tagSpawned.quiet_wave === 7 && quietLive() <= 1) return true;
      sd.fastForward(1);
    }
    return false;
  });
  expect(nearEnd).toBe(true);
  // The last one walks home in real time (fast-forwarding past the end would skip the hold).
  await page.evaluate(() => globalThis.__sd!.setSpeed(2));
  const comms = page.getByRole('log', { name: 'Radio' });
  await expect(comms).toContainText('...Sprout.', { timeout: 30_000 });
  expect(await page.evaluate(() => globalThis.__sd!.state()!.outcome)).toBe('won');
  await nextFrames(page);
  await shot(page, 'c1-radio', 1, 'sprout');
  await expect(comms).toContainText('Yeah. Okay.', { timeout: 5000 });
  // The party waits for him: it opens only once his lines are done.
  await expect(page.getByRole('dialog', { name: 'Scene' })).toBeHidden();
  await shot(page, 'c1-radio', 2, 'yeah-okay');
  const party = page.locator('.dlg-stage[data-staging="party"]');
  await expect(party).toBeVisible({ timeout: 6000 });
  await expect(page.getByTestId('stage-cannon')).toHaveCount(2);
  await page.waitForTimeout(400);
  await shot(page, 'c1-radio', 3, 'party');
  // Esc skips the party; the card keeps his lines and the stamp.
  await page.keyboard.press('Escape');
  const card = page.getByRole('dialog', { name: 'PERIMETER SECURED!' });
  await expect(card).toBeVisible();
  await expect(card).toContainText('...Sprout.');
  await expect(card).toContainText('Yeah. Okay.');
  await expect(card).toContainText(/Containment lapse/i);
  await shot(page, 'c1-radio', 4, 'results');
});
