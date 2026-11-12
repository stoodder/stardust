// T862: the three challenge maps (design/maps.md § 8), registered by the finale's lazy chunk, each
// boot from a dev URL (`?map=ch_m0N`) on the post-game dev save (`after_fin_stay`: it owns the
// campaign's towers) with its briefing, and each enforces its rule in the live battle:
// - CH1 Skitterkin Only: Bramble's briefing; the build bar offers the warrens' towers only, and a
//   Rivet the save would bring is refused (`notInLoadout`) while a Gloop Spitter builds.
// - CH2 Lights Out: Ves'thara's briefing; every unit of W1 walks in cloaked (the shimmer).
// - CH3 Glass Core: the console's briefing; core integrity 5 (+ the save's Reinforced Core), no
//   ability in slot 1, and the companion slot empty: comms are down.
// Screenshots in <out>/screens/challenge/ (look at them: the briefing panels, the bar of four
// homes, the shimmering W1 under the wall lamps, the small core meter).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

const FLOW = 'challenge';

/** Boots `map` on the post-game save, its briefing open, text shown whole. */
async function boot(page: Page, map: string): Promise<void> {
  await page.goto(`/?test=1&dialogue=1&fasttext=1&seed=1&save=after_fin_stay&map=${map}`);
  await waitForReady(page);
  await expect(page.getByRole('dialog', { name: 'Shift briefing' })).toBeVisible();
}

/** Closes the briefing (Esc). */
async function clockIn(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Shift briefing' })).toHaveCount(0);
}

test('challenge CH1 Skitterkin Only: only the warrens’ homes deploy', async ({ page }) => {
  await boot(page, 'ch_m01');
  await expect(page.getByRole('dialog', { name: 'Shift briefing' })).toContainText(
    'Your machines stay home today.',
  );
  await nextFrames(page);
  await shot(page, FLOW, 1, 'skitterkin-briefing');
  await clockIn(page);
  const bar = page.getByRole('navigation', { name: 'Build' });
  await expect(bar.getByRole('button', { name: /^Build Gloop Spitter,/ })).toBeVisible();
  await expect(bar.getByRole('button', { name: /^Build Rivet/ })).toHaveCount(0);
  await expect(bar.getByRole('button', { name: /^Build Zapcoil/ })).toHaveCount(0);
  const built = await page.evaluate(() => {
    const sd = globalThis.__sd!; // waitForReady passed
    sd.enqueue({ type: 'build', tile: [9, 6], tower: 'rivet' });
    sd.fastForward(2);
    const refused = sd.state()!.towers.live;
    sd.enqueue({ type: 'build', tile: [9, 6], tower: 'gloop' });
    sd.fastForward(2);
    return { refused, after: sd.state()!.towers.live };
  });
  expect(built).toEqual({ refused: 0, after: 1 });
  await nextFrames(page);
  await shot(page, FLOW, 2, 'skitterkin-bar');
});

test('challenge CH2 Lights Out: every unit walks in cloaked', async ({ page }) => {
  await boot(page, 'ch_m02');
  await expect(page.getByRole('dialog', { name: 'Shift briefing' })).toContainText(
    'wears the dark',
  );
  await nextFrames(page);
  await shot(page, FLOW, 3, 'lights-out-briefing');
  await clockIn(page);
  const w1 = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(60 * 9);
    const s = sd.state()!;
    let live = 0;
    let cloaked = 0;
    for (let i = 0; i < s.enemies.used; i++) {
      const e = s.enemies.items[i]!;
      if (!e.alive || e.def === null) continue;
      live++;
      if (e.def.cloaked) cloaked++;
    }
    return { live, cloaked };
  });
  expect(w1.live).toBeGreaterThan(0);
  expect(w1.cloaked).toBe(w1.live);
  await nextFrames(page);
  await shot(page, FLOW, 4, 'lights-out-w1');
});

test('challenge CH3 Glass Core: a core of 5 and the radio dead', async ({ page }) => {
  await boot(page, 'ch_m03');
  await expect(page.getByRole('dialog', { name: 'Shift briefing' })).toContainText(
    'COMMS: OFFLINE. CORE INTEGRITY: 5.',
  );
  await nextFrames(page);
  await shot(page, FLOW, 5, 'glass-core-briefing');
  await clockIn(page);
  const s = await page.evaluate(() => {
    const st = globalThis.__sd!.state()!;
    return { integrity: st.integrity, max: st.maxIntegrity };
  });
  // Glass Core's 5, and Reinforced Core's ranks (at most 3) on top.
  expect(s.max).toBeGreaterThanOrEqual(5);
  expect(s.max).toBeLessThanOrEqual(8);
  expect(s.integrity).toBe(s.max);
  // Radio Silence: slot 1 is empty, and there's no companion to call.
  await expect(page.getByTestId('ability-1')).toHaveAccessibleName(/empty|Silence/);
  await expect(page.getByTestId('companion-face')).toHaveCount(0);
  await nextFrames(page);
  await shot(page, FLOW, 6, 'glass-core-hud');
});
