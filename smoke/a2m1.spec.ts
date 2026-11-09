// T420: A2M1 *Rig Nine* rendered, played by par (`autoplay('par')`), reached with `?map=a2_m01`
// until T301b's star map lands (the Shift board is Act I's, D102, so it never lists Rig Nine). The
// briefing (Sterling, Bricks, the threat strip with Skittish and the clusters, Hiccup Contained),
// the setup with both crew-log rigs cleared, a hush on the Spires road (W3, the
// Mote's teach), the double cluster meeting at the merge (W7), and the yard cut down the
// dark east edge (W10). Before each shot the sim plays a moment at 1×, so the frame isn't a
// fast-forward's pile. Screenshots in test-results/screens/a2m1/ (look at them: the chase, the hush
// ring and the clusters' read against Act II's gold are the point).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

/** What the flow waits for, checked in the page against the live sim state. */
type Cond = 'logsCleared' | 'hush' | 'merge' | 'cut';

/**
 * Plays par one tick at a time (up to `max` ticks) until `cond` holds, then lets two frames render.
 * Returns whether it held.
 */
async function until(page: Page, cond: Cond, max = 60 * 700): Promise<boolean> {
  const held = await page.evaluate(
    ([c, limit]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      const st = sd.state()!;
      const live = () => {
        const out = [];
        for (let i = 0; i < st.enemies.used; i++) {
          const e = st.enemies.items[i]!;
          if (e.alive && e.def !== null) out.push(e);
        }
        return out;
      };
      const check = (): boolean => {
        switch (c) {
          case 'logsCleared':
            return st.stats.wreckageCleared >= 2;
          case 'hush':
            // A third of the way into the 0.5 s tell, so the ring is up.
            return live().some((e) => e.hushTicks > 0 && e.hushTicks <= 20);
          case 'merge': {
            // W7's clusters meeting at the merge.
            const at = live().filter((e) => (e.x - 8.5) ** 2 + (e.y - 6.5) ** 2 < 9);
            return st.wave === 7 && at.length >= 12;
          }
          case 'cut':
            return (
              st.wave === 10 &&
              live().filter((e) => e.route?.id === 'cut' && e.dist > 5).length >= 6
            );
          default:
            return false;
        }
      };
      for (let k = 0; k < limit; k++) {
        if (check()) return true;
        if (st.outcome !== 'playing') return false;
        sd.fastForward(1);
      }
      return check();
    },
    [cond, max] as const,
  );
  await nextFrames(page);
  return held;
}

/** Plays `ms` of real time at 1×, then pauses and lets two frames render. */
async function play(page: Page, ms: number): Promise<void> {
  await page.evaluate(() => globalThis.__sd!.setSpeed(1));
  await page.waitForTimeout(ms);
  await page.evaluate(() => globalThis.__sd!.setSpeed(0));
  await nextFrames(page);
}

test('A2M1: the briefing, a hush on the Spires road, the clusters, and the yard cut', async ({
  page,
}) => {
  test.setTimeout(150_000);
  await page.goto('/?test=1&map=a2_m01&seed=1');
  await waitForReady(page);

  // The briefing: Sterling's hiccup, the threat strip (Skittish has its glyph), the medals.
  const brief = page.getByRole('dialog');
  await expect(brief).toContainText('Minor operational hiccup at Rig Nine!');
  await expect(brief).toContainText('Skittish');
  await expect(brief).toContainText('Hiccup Contained');
  await shot(page, 'a2m1', 1, 'briefing');
  await page.keyboard.press('Escape');

  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
    sd.fastForward(0);
  });
  // Par sends the drone to both crew-log rigs before W1.
  expect(await until(page, 'logsCleared')).toBe(true);
  await nextFrames(page);
  await shot(page, 'a2m1', 2, 'setup');

  // W3: Motes catch a runner under the west ledge.
  expect(await until(page, 'hush')).toBe(true);
  await shot(page, 'a2m1', 3, 'hush');

  // W7: both roads' clusters meet at the merge.
  expect(await until(page, 'merge')).toBe(true);
  await play(page, 800);
  await shot(page, 'a2m1', 4, 'merge');

  // W10: the yard cut, down the dark east edge.
  expect(await until(page, 'cut')).toBe(true);
  await play(page, 800);
  await shot(page, 'a2m1', 5, 'cut');
  expect(await page.evaluate(() => globalThis.__sd!.state()!.outcome)).toBe('playing');
});
