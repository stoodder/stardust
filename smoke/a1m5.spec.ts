// T328, T330: A1M5 *Record Quarter* rendered, played by par (`autoplay('par')`). Enemy health bars
// over damaged units (and over a hovered one at full HP), the Matriarch with her own bar at the top
// (and no small one), and the Quiet Wave: a beat after W10 starts, Bricks lowers his cannon and
// keeps it lowered while the younglings, spared (Hold Fire on all), walk past his post to the
// gate. Before each shot the sim plays a moment at 1×, so the frame isn't a fast-forward's pile of
// floaters. Screenshots in test-results/screens/a1m5/ (look at them: Bricks's pose is the point).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

/** What the flow waits for, checked in the page against the live sim state. */
type Cond = 'damaged' | 'fullHp' | 'boss' | 'quiet' | 'quietNearBricks';

/**
 * Plays par one tick at a time (up to `max` ticks) until `cond` holds, then lets two frames render.
 * Returns whether it held.
 */
async function until(page: Page, cond: Cond, max = 60 * 600): Promise<boolean> {
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
      const bricks = () => {
        for (let i = 0; i < st.allies.used; i++) {
          const a = st.allies.items[i]!;
          if (a.alive && a.kind === 'bricks') return a;
        }
        return null;
      };
      const check = (): boolean => {
        switch (c) {
          case 'damaged':
            return live().filter((e) => e.def!.boss === null && e.hp < e.def!.hp).length >= 2;
          case 'fullHp':
            return live().some((e) => e.def!.boss === null && e.hp === e.def!.hp && e.dist > 2);
          case 'boss':
            return live().some((e) => e.def!.boss !== null && e.hp < e.def!.hp * 0.9);
          case 'quiet':
            return st.wave === 10 && live().some((e) => e.tags.includes('quiet_wave'));
          case 'quietNearBricks': {
            const b = bricks();
            return (
              b !== null &&
              live().some(
                (e) => e.tags.includes('youngling') && (e.x - b.x) ** 2 + (e.y - b.y) ** 2 < 9,
              )
            );
          }
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

test('A1M5: health bars, the Matriarch, and Bricks lowering his cannon', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/?test=1&map=a1_m05&seed=1');
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
    sd.fastForward(0);
  });
  await nextFrames(page);
  await shot(page, 'a1m5', 1, 'setup');

  // W1: units the towers have hit wear their bars.
  expect(await until(page, 'damaged')).toBe(true);
  await play(page, 1500);
  await shot(page, 'a1m5', 2, 'health-bars');

  // Hovering a unit at full HP shows its bar too.
  expect(await until(page, 'fullHp')).toBe(true);
  await play(page, 1000);
  const at = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    const st = sd.state()!;
    for (let i = 0; i < st.enemies.used; i++) {
      const e = st.enemies.items[i]!;
      if (!e.alive || e.def === null || e.def.boss !== null || e.hp !== e.def.hp) continue;
      if (e.dist <= 2) continue;
      return sd.tileToClient(e.x - 0.5, e.y - 0.5);
    }
    return null;
  });
  expect(at).not.toBeNull();
  // The body stands above its ground point: aim a few game px up it.
  await page.mouse.move(at!.x, at!.y - 8);
  await nextFrames(page);
  await shot(page, 'a1m5', 3, 'hovered-bar');
  await page.mouse.move(2, 2);

  // W9: Chitterbloom has the boss bar at the top, and no small bar.
  expect(await until(page, 'boss')).toBe(true);
  await play(page, 1500);
  await shot(page, 'a1m5', 4, 'matriarch');

  // W10, the Quiet Wave: spare it (Hold Fire on all). Bricks lowers his cannon a beat after it
  // starts, and holds it low while the younglings walk past his post.
  expect(await until(page, 'quiet')).toBe(true);
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.enqueue({ type: 'holdFire', target: 'all', on: true });
    sd.fastForward(0);
  });
  await play(page, 2500);
  await shot(page, 'a1m5', 5, 'quiet-wave');
  expect(await until(page, 'quietNearBricks')).toBe(true);
  await play(page, 1000);
  await shot(page, 'a1m5', 6, 'quiet-wave-at-post');
  expect(await page.evaluate(() => globalThis.__sd!.state()!.outcome)).toBe('playing');
});
