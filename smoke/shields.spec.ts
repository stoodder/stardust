// T403: Aelari shields on the dev Aelari range (`?map=dev_aelari`, render/__fixtures__/
// devBattle.ts): Glimmers and a Dev Cantor on the road, Lightwings on the air lane. The pulse's
// tell (a blue pool and a held, stepping ring under the Cantor, which wears a blue rim) and its
// ring as it fires, a hit rippling a shield and flashing its hex bubble, the break and its shards,
// and the shield bars (T430a; asserted through `__sd.render()`). Screenshots in
// test-results/screens/shields/ (look at them: the rings are the point).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

const MAP = 'dev_aelari';

type Cond = 'tell' | 'fired' | 'rippled' | 'broken';

/** Steps the sim one tick at a time (up to `max`) until `cond` holds, then renders. */
async function until(page: Page, cond: Cond, max = 1200): Promise<boolean> {
  const held = await page.evaluate(
    ([c, limit]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      const st = sd.state()!;
      const find = (id: string) => {
        for (let i = 0; i < st.enemies.used; i++) {
          const e = st.enemies.items[i]!;
          if (e.alive && e.def?.id === id) return e;
        }
        return null;
      };
      const shielded = (pred: (hp: number, cap: number) => boolean): boolean => {
        for (let i = 0; i < st.enemies.used; i++) {
          const e = st.enemies.items[i]!;
          const s = e.def?.shield ?? null;
          if (e.alive && s !== null && pred(e.shieldHp, s.hp)) return true;
        }
        return false;
      };
      let last = find('dev_cantor')?.pulseTicks ?? 0;
      const check = (): boolean => {
        const cantor = find('dev_cantor');
        const tell = cantor?.def?.pulse?.tellTicks ?? 0;
        switch (c) {
          case 'tell':
            // A third of the way into the 1.5 s tell.
            return cantor !== null && cantor.pulseTicks > 0 && cantor.pulseTicks <= tell - 30;
          case 'fired': {
            const now = cantor?.pulseTicks ?? 0;
            const fired = now > last && last > 0;
            last = now;
            return fired;
          }
          case 'rippled':
            return shielded((hp, cap) => hp > 0 && hp < cap);
          case 'broken':
            return shielded((hp) => hp === 0);
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

test('shields: the pulse tell and ring, the ripple, and the break', async ({ page }) => {
  await page.goto(`/?test=1&map=${MAP}&seed=1`);
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    // A Rivet early on the road (Kinetic: shields ripple and hold), a Zapcoil further on (Energy
    // breaks them), a Skyhook under the lane.
    sd.enqueue({ type: 'build', tower: 'rivet', tile: [4, 1] });
    sd.enqueue({ type: 'build', tower: 'zapcoil', tile: [7, 4] });
    sd.enqueue({ type: 'build', tower: 'skyhook', tile: [9, 4] });
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
  });
  expect(await page.evaluate(() => globalThis.__sd!.state()!.towers.live)).toBe(3);

  expect(await until(page, 'rippled')).toBe(true);
  await page.waitForTimeout(120); // the ripple grows on real time
  const rippled = await page.evaluate(() => globalThis.__sd!.render()!);
  expect(rippled.shields.ripples).toBeGreaterThan(0);
  expect(rippled.enemies.some((e) => e.bubble)).toBe(true);
  await shot(page, 'shields', 1, 'ripple');

  expect(await until(page, 'tell')).toBe(true);
  const telling = await page.evaluate(() => globalThis.__sd!.render()!);
  expect(telling.shields.tells).toBeGreaterThan(0);
  expect(telling.enemies.some((e) => e.rim === 'pulse')).toBe(true);
  await shot(page, 'shields', 2, 'pulse-tell');

  expect(await until(page, 'fired')).toBe(true);
  await page.waitForTimeout(250); // the ring grows on real time
  await shot(page, 'shields', 3, 'pulse-ring');

  expect(await until(page, 'broken')).toBe(true);
  await page.waitForTimeout(120);
  expect(await page.evaluate(() => globalThis.__sd!.render()!.shields.breaks)).toBeGreaterThan(0);
  await shot(page, 'shields', 4, 'broken');

  await page.evaluate(() => globalThis.__sd!.fastForward(240));
  await nextFrames(page);
  await shot(page, 'shields', 5, 'lightwings');
});
