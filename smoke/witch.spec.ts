// T404: the Glass Witch's blink on the dev Witch range (`?map=dev_witch`, render/__fixtures__/
// devBattle.ts): par's Zapcoils push a short Witch past 70%; her blink's tell (a violet ghost of her
// where she'll land, outlined in white over a ring, while she holds still, shimmers, and wears a
// violet rim), the afterimage she leaves, and her retreat at 40% (T430a; asserted through
// `__sd.render()`). Screenshots in test-results/screens/witch/ (look at them: the ghost is the
// point).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

const MAP = 'dev_witch';

type Cond = 'tell' | 'blinked' | 'retreat';

/** Steps the sim one tick at a time (up to `max`) until `cond` holds, then renders. */
async function until(page: Page, cond: Cond, max = 4000): Promise<boolean> {
  const held = await page.evaluate(
    ([c, limit]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      const st = sd.state()!;
      const witch = () => {
        for (let i = 0; i < st.enemies.used; i++) {
          const e = st.enemies.items[i]!;
          if (e.alive && e.def?.id === 'dev_glass_witch') return e;
        }
        return null;
      };
      const check = (): boolean => {
        const w = witch();
        const tell = w?.def?.boss?.phases[1]?.blink?.tellTicks ?? 0;
        switch (c) {
          case 'tell':
            // Half way into the 1.5 s tell.
            return w !== null && !w.leaving && w.blinkTicks > 0 && w.blinkTicks <= tell / 2;
          case 'blinked':
            return st.stats.bossBlinks > 0;
          case 'retreat':
            return w !== null && w.leaving;
        }
        return false;
      };
      for (let k = 0; k < limit; k++) {
        if (check()) return true;
        sd.fastForward(1);
      }
      return check();
    },
    [cond, max] as const,
  );
  await nextFrames(page);
  return held;
}

test('the Witch: the blink tell, the afterimage, the retreat', async ({ page }) => {
  await page.goto(`/?test=1&map=${MAP}&seed=1`);
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    for (const tile of [
      [4, 2],
      [5, 4],
      [8, 4],
      [10, 3],
      [12, 3],
      [13, 1],
      [14, 4],
    ] as const) {
      sd.enqueue({ type: 'build', tower: 'zapcoil', tile: [tile[0], tile[1]] });
    }
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
  });
  expect(await page.evaluate(() => globalThis.__sd!.state()!.towers.live)).toBe(7);

  expect(await until(page, 'tell')).toBe(true);
  await page.waitForTimeout(400); // the Zapcoils' arcs fade on real time; the tell holds (sim ticks)
  const tell = await page.evaluate(() => globalThis.__sd!.render()!);
  expect(tell.blinks.tells).toBe(1);
  expect(tell.enemies.some((e) => e.rim === 'blink')).toBe(true);
  await shot(page, 'witch', 1, 'blink-tell');

  expect(await until(page, 'blinked')).toBe(true);
  await page.waitForTimeout(120); // the afterimage fades on real time
  const after = await page.evaluate(() => globalThis.__sd!.render()!);
  expect(after.blinks.afterimages).toBeGreaterThan(0);
  expect(after.enemies.some((e) => e.rim === 'blink')).toBe(false);
  await shot(page, 'witch', 2, 'afterimage');

  expect(await until(page, 'retreat')).toBe(true);
  await page.evaluate(() => globalThis.__sd!.fastForward(30));
  await nextFrames(page);
  await shot(page, 'witch', 3, 'retreat');
});
