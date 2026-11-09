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
          default:
            return false;
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

/** Lets real time pass with the sim paused, so the bar's chip and flashes settle for a shot. */
async function settle(page: Page): Promise<void> {
  await page.waitForTimeout(600);
  await nextFrames(page);
}

/** Builds Rivets on `tiles`; `strong` turns every Rivet to Strongest (the boss over her brood). */
async function build(
  page: Page,
  tiles: readonly (readonly [number, number])[],
  strong = false,
): Promise<void> {
  await page.evaluate(
    ([list, onBoss]) => {
      const sd = globalThis.__sd!;
      for (const [c, r] of list) sd.enqueue({ type: 'build', tower: 'rivet', tile: [c, r] });
      sd.fastForward(0);
      if (!onBoss) return;
      const towers = sd.state()!.towers;
      for (let i = 0; i < towers.used; i++) {
        const t = towers.items[i]!;
        if (t.alive) sd.enqueue({ type: 'targeting', towerUid: t.uid, mode: 'strong' });
      }
      sd.fastForward(0);
    },
    [tiles, strong] as const,
  );
}

async function holdFire(page: Page, on: boolean): Promise<void> {
  await page.evaluate((hold) => {
    const sd = globalThis.__sd!;
    sd.enqueue({ type: 'holdFire', target: 'all', on: hold });
    sd.fastForward(0);
  }, on);
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
  await page.evaluate(() => globalThis.__sd!.fastForward(120));
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
  await build(
    page,
    [
      [7, 1],
      [4, 4],
    ],
    true,
  );
  expect(await until(page, 'phase2', 3000)).toBe(true);
  await page.evaluate(() => globalThis.__sd!.fastForward(4));
  await nextFrames(page);
  await shot(page, 'boss', 7, 'phase2-shimmer');
  // Hold fire so phase 2 lasts: her dig-in, then the mound with her crown showing.
  await holdFire(page, true);
  expect(await until(page, 'bossBurrowed', 1200)).toBe(true);
  await page.evaluate(() => globalThis.__sd!.fastForward(30));
  await settle(page);
  await shot(page, 'boss', 8, 'burrowed');
  expect(await until(page, 'surfaced', 600)).toBe(true);
  await shot(page, 'boss', 9, 'surfaced');

  // Fire again, and more of it: phase 3's panic and huddle.
  await holdFire(page, false);
  await build(
    page,
    [
      [6, 5],
      [12, 5],
      [10, 7],
    ],
    true,
  );
  expect(await until(page, 'phase3', 3000)).toBe(true);
  await page.evaluate(() => globalThis.__sd!.fastForward(20));
  await settle(page);
  await shot(page, 'boss', 10, 'phase3-panic');

  // An Orbital Strike on her finishes it: at 0% she's driven off. She and her brood run for the
  // edge, and the map clears with no leak.
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    const pool = sd.state()!.enemies;
    for (let i = 0; i < pool.used; i++) {
      const e = pool.items[i]!;
      if (!e.alive || e.def?.boss === null) continue;
      sd.enqueue({ type: 'ability', slot: 1, target: [Math.floor(e.x), Math.floor(e.y)] });
    }
    sd.fastForward(0);
  });
  expect(await until(page, 'leaving', 3000)).toBe(true);
  await page.evaluate(() => globalThis.__sd!.fastForward(40));
  await settle(page);
  await shot(page, 'boss', 11, 'drive-off');
  const integrity = await page.evaluate(() => globalThis.__sd!.state()!.integrity);
  expect(await until(page, 'gone', 600)).toBe(true);
  expect(await page.evaluate(() => globalThis.__sd!.state()!.integrity)).toBe(integrity);
  await shot(page, 'boss', 12, 'gone');
});

test("props on cues: Zibzab's shop lands on A1M3 with W6's countdown", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/?test=1&map=a1_m03&seed=1');
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  /** Plays par until wave `wave`'s phase is `phase` (up to 2 minutes of play). */
  const reach = async (wave: number, phase: string): Promise<boolean> => {
    const ok = await page.evaluate(
      ([w, p]) => {
        const sd = globalThis.__sd!;
        const st = sd.state()!;
        for (let k = 0; k < 60 * 240; k++) {
          if (st.wave === w && st.schedule.phase === p) return true;
          if (st.outcome !== 'playing') return false;
          sd.fastForward(1);
        }
        return false;
      },
      [wave, phase] as const,
    );
    await nextFrames(page);
    return ok;
  };
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
  });
  // W5 spawning: the shop's verge (12,8) is bare.
  expect(await reach(5, 'spawning')).toBe(true);
  await shot(page, 'boss', 13, 'a1m3-before-cue');
  // W6's countdown: Zibzab's scene plays, and his shell-shop clanks down on the verge.
  expect(await reach(5, 'countdown')).toBe(true);
  await settle(page);
  await shot(page, 'boss', 14, 'a1m3-shop-landed');
});
