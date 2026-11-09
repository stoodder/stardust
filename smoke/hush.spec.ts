// T402: the hush rule's minimal look on the dev Hollow range (`?map=dev_hollow`, render/
// __fixtures__/devBattle.ts): fleeing Nibblers run 2.5 s ahead of Motes on both roads, and nothing
// is built. The hush tell (a pale ring closing on the held runner, which shakes and panics, and
// the Mote's acid rim as it reaches), the vanish (a small acid ring), and the Heavy unit's tint
// and swollen pale rim walking on (T430a; asserted through `__sd.render()`). Screenshots in
// test-results/screens/hush/ (look at them: the ring and the tint are the point).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

type Cond = 'tell' | 'heavy';

/** Steps the sim one tick at a time (up to `max`) until `cond` holds, then renders. */
async function until(page: Page, cond: Cond, max = 1800): Promise<boolean> {
  const held = await page.evaluate(
    ([c, limit]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      const check = (): boolean => {
        const st = sd.state()!;
        for (let i = 0; i < st.enemies.used; i++) {
          const e = st.enemies.items[i]!;
          if (!e.alive) continue;
          // A third of the way into the 0.5 s tell, so the ring is up.
          if (c === 'tell' && e.hushTicks > 0 && e.hushTicks <= 20) return true;
          if (c === 'heavy' && e.heavy) return true;
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

test('hush: the tell on the runner, then a Heavy Mote walking on', async ({ page }) => {
  await page.goto('/?test=1&map=dev_hollow&seed=1');
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
  });

  expect(await until(page, 'tell')).toBe(true);
  const tell = await page.evaluate(() => globalThis.__sd!.render()!.enemies);
  expect(tell.some((e) => e.hushRing)).toBe(true);
  expect(tell.some((e) => e.rim === 'hush')).toBe(true);
  await shot(page, 'hush', 1, 'tell');

  expect(await until(page, 'heavy')).toBe(true);
  await page.waitForTimeout(150); // the vanish ring grows on real time
  await shot(page, 'hush', 2, 'hushed');

  await page.evaluate(() => globalThis.__sd!.fastForward(60));
  await nextFrames(page);
  await shot(page, 'hush', 3, 'heavy');
  const st = await page.evaluate(() => {
    const s = globalThis.__sd!.state()!;
    let heavy = 0;
    for (let i = 0; i < s.enemies.used; i++) {
      const e = s.enemies.items[i]!;
      if (e.alive && e.heavy) heavy++;
    }
    return { heavy, outcome: s.outcome };
  });
  expect(st.heavy).toBeGreaterThan(0);
  expect(st.outcome).toBe('playing');
  const drawn = await page.evaluate(() => globalThis.__sd!.render()!.enemies);
  expect(drawn.filter((e) => e.rim === 'heavy').length).toBe(st.heavy);
  expect(drawn.some((e) => e.hushRing)).toBe(false);
});
