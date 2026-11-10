// T502: M5's Aelari support and blink units on the dev aura range (`?map=dev_aura`,
// render/__fixtures__/devBattle.ts). An Aegis Cantor walks the north road with Glimmers catching it
// up past a Rivet: its continuous shield aura shows as a crawling dashed `blue.4` ring at 2 tiles
// (ShieldAuraView), and a Glimmer the Rivet has chipped regains shield inside it while its own
// regen still waits out its delay (D137: continuous, 15/s, not a pulse). Blinkstriders walk the
// south-west road: each holds still through its 0.8 s tell, its landing ghost shown, and leaves an
// afterimage when it blinks (BlinkView). Screenshots in test-results/screens/aura/ (look at them:
// the ring is the point).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

type Cond = 'cantor' | 'refill' | 'blinkTell' | 'blinked';

/** Steps the sim one tick at a time (up to `max`) until `cond` holds, then renders. */
async function until(page: Page, cond: Cond, max = 1800): Promise<boolean> {
  const held = await page.evaluate(
    ([c, limit]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      const st = sd.state()!;
      const prev = new Map<number, number>();
      let blinked = 0;
      const unit = (id: string, pred: (e: (typeof st.enemies.items)[number]) => boolean) => {
        for (let i = 0; i < st.enemies.used; i++) {
          const e = st.enemies.items[i]!;
          if (e.alive && e.def?.id === id && pred(e)) return e;
        }
        return null;
      };
      const check = (): boolean => {
        switch (c) {
          case 'cantor':
            // Out on the road, past the spawn's edge.
            return unit('cantor', (e) => e.x >= 4) !== null;
          case 'refill': {
            const cantor = unit('cantor', () => true);
            let rose = false;
            for (let i = 0; i < st.enemies.used; i++) {
              const e = st.enemies.items[i]!;
              if (!e.alive || e.def?.id !== 'glimmer') continue;
              const before = prev.get(e.uid);
              prev.set(e.uid, e.shieldHp);
              if (cantor === null || before === undefined) continue;
              const near = Math.hypot(e.x - cantor.x, e.y - cantor.y) <= 2;
              // Its own regen is still waiting: a rise now is the aura's.
              if (near && e.shieldHp > before && e.shieldRegenDelayTicks > 0) rose = true;
            }
            return rose;
          }
          case 'blinkTell': {
            const s = unit('blinkstrider', (e) => {
              const b = e.def?.blink;
              return (
                b !== undefined &&
                b !== null &&
                e.blinkTicks > 0 &&
                e.blinkTicks <= b.tellTicks - 12
              );
            });
            return s !== null;
          }
          case 'blinked': {
            const now = unit('blinkstrider', () => true)?.blinkTicks ?? 0;
            const before = blinked;
            blinked = now;
            return before > 0 && now > before; // the timer restarted: it blinked
          }
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

test('aura: the Cantor rings and refills a chipped Glimmer; a Blinkstrider tells and blinks', async ({
  page,
}) => {
  await page.goto('/?test=1&map=dev_aura&seed=1');
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.enqueue({ type: 'build', tower: 'rivet', tile: [8, 4] });
    sd.enqueue({ type: 'build', tower: 'zapcoil', tile: [14, 4] });
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
  });
  expect(await page.evaluate(() => globalThis.__sd!.state()!.towers.live)).toBe(2);

  expect(await until(page, 'cantor')).toBe(true);
  expect(await page.evaluate(() => globalThis.__sd!.render()!.shields.auras)).toBe(1);
  await shot(page, 'aura', 1, 'ring');

  expect(await until(page, 'refill')).toBe(true);
  expect(await page.evaluate(() => globalThis.__sd!.render()!.shields.auras)).toBe(1);
  // T530a: the Glimmer it refills glints (light catching its glass).
  expect(await page.evaluate(() => globalThis.__sd!.render()!.shields.glints)).toBeGreaterThan(0);
  await shot(page, 'aura', 2, 'refill');

  expect(await until(page, 'blinkTell')).toBe(true);
  expect(await page.evaluate(() => globalThis.__sd!.render()!.blinks.tells)).toBeGreaterThan(0);
  await shot(page, 'aura', 3, 'blink-tell');

  expect(await until(page, 'blinked')).toBe(true);
  await page.waitForTimeout(120); // the afterimage fades on real time
  expect(await page.evaluate(() => globalThis.__sd!.render()!.blinks.afterimages)).toBeGreaterThan(
    0,
  );
  await shot(page, 'aura', 4, 'blinked');
});
