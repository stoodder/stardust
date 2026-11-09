// T312b: burrow, split, huddle, and the boss on the dev boss range (`?map=dev_boss`,
// render/__fixtures__/devBattle.ts). Wave 1: a Digger's dig tell and its mound underground, an Elder
// holding its younglings back (the huddle's ring and tethers), a Bunchling splitting. Wave 2: a short
// Chitterbloom: her bar, the sneeze tell and the sneeze, a phase change (the flash and the
// invulnerable shimmer), a burrow, phase 3's panic and huddle, and `driveOff` (she and her brood
// run off the map and their views go). Screenshots in test-results/screens/boss/ (look at them:
// the tells are the point).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

const BOSS_MAP = 'dev_boss';

/** What the flow waits for, checked in the page against the live sim state. */
type Cond =
  | 'digTell'
  | 'burrowed'
  | 'huddled'
  | 'split'
  | 'bossTell'
  | 'sneezed'
  | 'phase2'
  | 'bossBurrowed'
  | 'surfaced'
  | 'phase3'
  | 'leaving'
  | 'gone';

/**
 * Steps the sim one tick at a time (up to `max`) until `cond` holds, then lets two frames render.
 * Returns whether it held.
 */
async function until(page: Page, cond: Cond, max = 3000): Promise<boolean> {
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
      const boss = () => live().find((e) => e.def!.boss !== null) ?? null;
      const count = (id: string) => live().filter((e) => e.def!.id === id).length;
      let nibblers = count('nibbler');
      let bunchlings = count('bunchling');
      const check = (): boolean => {
        const b = boss();
        switch (c) {
          case 'digTell':
            return live().some(
              (e) =>
                e.def!.burrow !== null &&
                !e.burrowed &&
                e.abilityTicks > 0 &&
                e.abilityTicks <= e.def!.burrow.tellTicks - 8,
            );
          case 'burrowed':
            return live().some((e) => e.def!.burrow !== null && e.burrowed);
          case 'huddled':
            return live().filter((e) => e.huddleUid !== 0).length >= 2;
          case 'split': {
            const now = count('bunchling');
            const split = now < bunchlings;
            bunchlings = now;
            return split;
          }
          case 'bossTell':
            // Halfway through the sneeze's 1.5 s tell (90 ticks).
            return b !== null && b.abilityTicks > 0 && b.abilityTicks <= 45 && b.bossPhase === 1;
          case 'sneezed': {
            const now = count('nibbler');
            const sneezed = now > nibblers;
            nibblers = now;
            return sneezed;
          }
          case 'phase2':
            return b !== null && b.bossPhase === 2;
          case 'bossBurrowed':
            return b !== null && b.burrowed;
          case 'surfaced':
            return b !== null && !b.burrowed && b.abilityCount < 2;
          case 'phase3':
            return b !== null && b.bossPhase === 3 && b.invulnerableTicks === 0;
          case 'leaving':
            return b !== null && b.leaving;
          case 'gone':
            return st.enemies.live === 0;
        }
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

async function build(page: Page, tiles: readonly (readonly [number, number])[]): Promise<void> {
  await page.evaluate((list) => {
    const sd = globalThis.__sd!;
    for (const [c, r] of list) sd.enqueue({ type: 'build', tower: 'rivet', tile: [c, r] });
    sd.fastForward(0);
  }, tiles);
}

test('boss: dig tell, mound, huddle, split, and Chitterbloom to driveOff', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto(`/?test=1&map=${BOSS_MAP}&seed=1`);
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.enqueue({ type: 'callWave' });
  });
  // Two Rivets by the road's middle (the split and the huddle play out in their range).
  await build(page, [
    [9, 3],
    [9, 5],
  ]);

  // Wave 1: the Digger's dig tell, then its mound underground.
  expect(await until(page, 'digTell')).toBe(true);
  await shot(page, 'boss', 1, 'dig-tell');
  expect(await until(page, 'burrowed')).toBe(true);
  await page.evaluate(() => globalThis.__sd!.fastForward(20));
  await nextFrames(page);
  await shot(page, 'boss', 2, 'burrow-mound');
  // The Elder holds its younglings back.
  expect(await until(page, 'huddled')).toBe(true);
  await page.evaluate(() => globalThis.__sd!.fastForward(30));
  await nextFrames(page);
  await shot(page, 'boss', 3, 'huddle');
  // A Bunchling splits where it falls.
  expect(await until(page, 'split')).toBe(true);
  await shot(page, 'boss', 4, 'split');

  // Wave 2: Chitterbloom walks in; her bar shows; she telegraphs, then sneezes out Nibblers.
  expect(await until(page, 'bossTell', 3000)).toBe(true);
  await shot(page, 'boss', 5, 'sneeze-tell');
  expect(await until(page, 'sneezed', 120)).toBe(true);
  await page.evaluate(() => globalThis.__sd!.fastForward(10));
  await nextFrames(page);
  await shot(page, 'boss', 6, 'sneeze');

  // Rivets along her road: phase 2 (the flash, then the invulnerable shimmer).
  await build(page, [
    [7, 1],
    [6, 5],
  ]);
  expect(await until(page, 'phase2', 3000)).toBe(true);
  await page.evaluate(() => globalThis.__sd!.fastForward(4));
  await nextFrames(page);
  await shot(page, 'boss', 7, 'phase2-shimmer');
  // Her dig-in, then the mound with her crown showing.
  expect(await until(page, 'bossBurrowed', 1200)).toBe(true);
  await page.evaluate(() => globalThis.__sd!.fastForward(30));
  await nextFrames(page);
  await shot(page, 'boss', 8, 'burrowed');
  expect(await until(page, 'surfaced', 600)).toBe(true);
  await shot(page, 'boss', 9, 'surfaced');

  // More fire: phase 3's panic and huddle.
  await build(page, [
    [12, 5],
    [10, 7],
  ]);
  expect(await until(page, 'phase3', 3000)).toBe(true);
  await page.evaluate(() => globalThis.__sd!.fastForward(20));
  await nextFrames(page);
  await shot(page, 'boss', 10, 'phase3-panic');

  // At 0%: driven off. She and her brood run for the edge, and the map clears with no leak.
  expect(await until(page, 'leaving', 3000)).toBe(true);
  await page.evaluate(() => globalThis.__sd!.fastForward(40));
  await nextFrames(page);
  await shot(page, 'boss', 11, 'drive-off');
  const integrity = await page.evaluate(() => globalThis.__sd!.state()!.integrity);
  expect(await until(page, 'gone', 600)).toBe(true);
  expect(await page.evaluate(() => globalThis.__sd!.state()!.integrity)).toBe(integrity);
  await shot(page, 'boss', 12, 'gone');
});
