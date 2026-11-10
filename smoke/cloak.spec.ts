// The cloak with the Veilwalker (T430a's look; T501b's flow) on the dev cloak range
// (`?map=dev_cloak`, render/__fixtures__/devBattle.ts): Veilwalkers walk the north road. Wave 1
// meets a Rivet alone: a unit draws faint in its `cloak` look (a checker-dithered body in a dashed
// white outline, T440a), shimmering (no bubble, no bracket: nothing gives it away but the
// shimmer), and walks past the Rivet untouched to leak (enemies.md § 2.5: an undetected cloaked
// unit is untouchable). Wave 2 meets a Lookout too: inside its radius a unit is Revealed, whole, in
// a green target bracket, and takes fire. Screenshots in test-results/screens/cloak/ (look at
// them: the shimmer and the bracket are the point).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

type Cond = 'cloaked' | 'revealed' | 'byRivet';

/** Steps the sim one tick at a time (up to `max`) until `cond` holds for some Veilwalker. */
async function until(page: Page, cond: Cond, max = 1800): Promise<number> {
  const uid = await page.evaluate(
    ([c, limit]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      const find = (): number => {
        const st = sd.state()!;
        for (let i = 0; i < st.enemies.used; i++) {
          const e = st.enemies.items[i]!;
          if (!e.alive || e.def?.id !== 'veilwalker' || e.x < 3) continue;
          if (c === 'revealed' ? e.revealedTicks > 0 : e.revealedTicks <= 0) {
            // The Rivet stands at (10, 3), reach 3: close by it, cloaked.
            if (c !== 'byRivet' || Math.hypot(e.x - 10.5, e.y - 3.5) < 2) return e.uid;
          }
        }
        return 0;
      };
      for (let k = 0; k < limit; k++) {
        const found = find();
        if (found !== 0) return found;
        sd.fastForward(1);
      }
      return find();
    },
    [cond, max] as const,
  );
  await nextFrames(page);
  return uid;
}

test('cloak: a Veilwalker shimmers past a Rivet untouched, then is Revealed and shot', async ({
  page,
}) => {
  await page.goto('/?test=1&map=dev_cloak&seed=1');
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.enqueue({ type: 'build', tower: 'rivet', tile: [10, 3] });
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
  });
  expect(await page.evaluate(() => globalThis.__sd!.state()!.towers.live)).toBe(1);

  // Wave 1: faint, shimmering, and untouchable beside the Rivet.
  const hidden = await until(page, 'byRivet');
  expect(hidden).toBeGreaterThan(0);
  const drawnHidden = await page.evaluate(
    (uid) => globalThis.__sd!.render()!.enemies.find((e) => e.uid === uid) ?? null,
    hidden,
  );
  expect(drawnHidden).not.toBeNull();
  // Faint: its `cloak` look (T440a: a 50% checker body in a dashed white outline) at 60% or 35% on
  // the shimmer, so at most about a third of its body shows.
  expect(drawnHidden!.alpha).toBeLessThanOrEqual(0.6); // checked just above
  expect(drawnHidden!.bracket).toBe(false);
  expect(drawnHidden!.bubble).toBe(false);
  await shot(page, 'cloak', 1, 'cloaked');

  // Every wave-1 Veilwalker walks past the Rivet with its HP and shield whole, and leaks.
  const wave1 = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    const st = sd.state()!;
    const start = st.integrity;
    let touched = 0;
    for (let k = 0; k < 60 * 40 && st.wave < 2; k++) {
      for (let i = 0; i < st.enemies.used; i++) {
        const e = st.enemies.items[i]!;
        const d = e.def;
        if (!e.alive || d?.id !== 'veilwalker') continue;
        if (e.hp < d.hp || e.shieldHp < (d.shield?.hp ?? 0)) touched++;
      }
      const left = st.enemies.items.some((e) => e.alive && e.def?.id === 'veilwalker');
      if (!left) break;
      sd.fastForward(1);
    }
    return { touched, lost: start - st.integrity, kills: st.stats.killsByEnemy['veilwalker'] ?? 0 };
  });
  expect(wave1).toEqual({ touched: 0, lost: 8, kills: 0 }); // four leaks of 2

  // Wave 2, called early, with a Lookout midway: Revealed in its bracket, and shot.
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.enqueue({ type: 'build', tower: 'lookout', tile: [8, 4] });
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
  });
  const seen = await until(page, 'revealed');
  expect(seen).toBeGreaterThan(0);
  await nextFrames(page);
  const drawnSeen = await page.evaluate(
    (uid) => globalThis.__sd!.render()!.enemies.find((e) => e.uid === uid) ?? null,
    seen,
  );
  expect(drawnSeen).toMatchObject({ alpha: 1, bracket: true });
  await shot(page, 'cloak', 2, 'revealed');
  const shotAt = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    const st = sd.state()!;
    for (let k = 0; k < 60 * 20; k++) {
      for (let i = 0; i < st.enemies.used; i++) {
        const e = st.enemies.items[i]!;
        const d = e.def;
        if (e.alive && d?.id === 'veilwalker' && e.shieldHp < (d.shield?.hp ?? 0)) return true;
      }
      sd.fastForward(1);
    }
    return false;
  });
  expect(shotAt).toBe(true);
});
