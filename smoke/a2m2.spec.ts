// T421: A2M2 *The Glass Witch* rendered, played by par (`autoplay('par')`), reached with `?map=a2_m02`
// until T301b's star map lands. The briefing (Sterling's "vandalism", the threat strip with Shielded
// and the boss, Glass Half Empty, the Rigs meter), the setup (the Zapcoil pair either side of the
// Sprinkler on the outcrop, the Thumper and Rivet at the fork), the Rigs meter hit (fire held on
// W2's Glimmers until one reaches the rigs, so the meter has something to show: par alone never
// lets one through), her shield pulse's tell on the branch, the Witch telling a blink in her
// second phase, and her retreat. Before each shot the sim plays a moment at 1×, so the frame isn't
// a fast-forward's pile. Screenshots in test-results/screens/a2m2/ (look at them: the Witch's read
// against Act II's gold, the pulse ring and the blink ghost are the point).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

/** What the flow waits for, checked in the page against the live sim state. */
type Cond = 'setup' | 'glimmers' | 'rigsHit' | 'pulse' | 'tell' | 'retreat';

/**
 * Plays par one tick at a time (up to `max`) until `cond` holds, then lets two frames render.
 * Returns whether it held.
 */
async function until(page: Page, cond: Cond, max = 60 * 700): Promise<boolean> {
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
      const check = (): boolean => {
        const w = find('glass_witch');
        const phase = w?.def?.boss?.phases[(w?.bossPhase ?? 1) - 1];
        switch (c) {
          case 'setup':
            return st.towers.live >= 4;
          case 'glimmers':
            // W2's Glimmers on the ledge run, before any tower reaches them.
            return find('glimmer') !== null;
          case 'rigsHit':
            return st.asset < 10;
          case 'pulse': {
            // Half way into her shield pulse's 1.5 s tell, on the branch's ledge run.
            const tell = phase?.pulse?.tellTicks ?? 0;
            return w !== null && !w.leaving && w.pulseTicks > 0 && w.pulseTicks <= tell / 2;
          }
          case 'tell': {
            // Half way into a blink's tell, in her second phase.
            const tell = phase?.blink?.tellTicks ?? 0;
            return (
              w !== null &&
              !w.leaving &&
              w.bossPhase === 2 &&
              w.invulnerableTicks === 0 &&
              w.blinkTicks > 0 &&
              w.blinkTicks <= tell / 2
            );
          }
          case 'retreat':
            return w !== null && w.leaving;
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

/** Holds (or releases) fire on every turret. */
const holdAll = (page: Page, on: boolean) =>
  page.evaluate((hold) => {
    const sd = globalThis.__sd!;
    sd.enqueue({ type: 'holdFire', target: 'all', on: hold });
    sd.fastForward(1);
  }, on);

test('A2M2: the briefing, the rigs hit, her pulse, a blink tell, and her retreat', async ({
  page,
}) => {
  test.setTimeout(150_000);
  await page.goto('/?test=1&map=a2_m02&seed=1');
  await waitForReady(page);

  // The briefing: Sterling's word for it, the threat strip (Shielded, the boss), the medals.
  const brief = page.getByRole('dialog');
  await expect(brief).toContainText('Vandalism at the ridge rigs!');
  await expect(brief).toContainText('Shielded');
  await expect(brief).toContainText('Glass Half Empty');
  await shot(page, 'a2m2', 1, 'briefing');
  await page.keyboard.press('Escape');

  await expect(page.getByTestId('hud')).toBeVisible();
  const meter = page.getByTestId('asset-meter');
  await expect(meter).toHaveAccessibleName('Rigs 10 of 10');
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
    sd.fastForward(0);
  });
  expect(await until(page, 'setup')).toBe(true);
  await shot(page, 'a2m2', 2, 'setup');

  // W2: fire held as the Glimmers come down the ledge, until the first reaches the rigs.
  expect(await until(page, 'glimmers')).toBe(true);
  await holdAll(page, true);
  expect(await until(page, 'rigsHit')).toBe(true);
  await holdAll(page, false);
  await expect(meter).toHaveAccessibleName(/^Rigs [0-9] of 10$/);
  await play(page, 300);
  await shot(page, 'a2m2', 3, 'rigs-hit');

  // W11: her shield pulse's tell, then a blink's tell in her second phase.
  expect(await until(page, 'pulse')).toBe(true);
  await play(page, 200);
  await shot(page, 'a2m2', 4, 'pulse');
  expect(await until(page, 'tell')).toBe(true);
  await page.waitForTimeout(300); // the Zapcoils' arcs fade on real time; the tell holds (sim ticks)
  await nextFrames(page);
  await shot(page, 'a2m2', 5, 'blink-tell');

  // Her retreat at 40%, before a third blink (par's strike lands on her second phase).
  expect(await until(page, 'retreat')).toBe(true);
  await play(page, 600);
  await shot(page, 'a2m2', 6, 'retreat');
  const end = await page.evaluate(() => {
    const st = globalThis.__sd!.state()!;
    return { blinks: st.stats.bossBlinks, outcome: st.outcome };
  });
  expect(end.blinks).toBeLessThanOrEqual(2);
  expect(end.outcome).not.toBe('lost');
});
