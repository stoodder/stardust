// T430a: the cloak's look on the dev cloak range (`?map=dev_cloak`, render/__fixtures__/
// devBattle.ts): cloaked Dev Veils walk the north road past a Lookout and a Rivet. Unrevealed, a
// unit draws faint with its white outline shimmering (no bubble, no bracket: nothing gives it
// away but the shimmer); inside the Lookout's radius it is Revealed, whole, in a green target
// bracket, and takes fire. No cloaked unit ships in M4 (T501b's flow uses the Veilwalker).
// Screenshots in test-results/screens/cloak/ (look at them: the shimmer and the bracket are the
// point).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

type Cond = 'cloaked' | 'revealed';

/** Steps the sim one tick at a time (up to `max`) until `cond` holds for some Dev Veil. */
async function until(page: Page, cond: Cond, max = 1800): Promise<number> {
  const uid = await page.evaluate(
    ([c, limit]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      const find = (): number => {
        const st = sd.state()!;
        for (let i = 0; i < st.enemies.used; i++) {
          const e = st.enemies.items[i]!;
          if (!e.alive || e.def?.id !== 'dev_veil' || e.x < 3) continue;
          if (c === 'cloaked' ? e.revealedTicks <= 0 : e.revealedTicks > 0) return e.uid;
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

test('cloak: a faint shimmering outline, then Revealed in its bracket', async ({ page }) => {
  await page.goto('/?test=1&map=dev_cloak&seed=1');
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.enqueue({ type: 'build', tower: 'lookout', tile: [8, 4] });
    sd.enqueue({ type: 'build', tower: 'rivet', tile: [10, 3] });
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
  });
  expect(await page.evaluate(() => globalThis.__sd!.state()!.towers.live)).toBe(2);

  const hidden = await until(page, 'cloaked');
  expect(hidden).toBeGreaterThan(0);
  const drawnHidden = await page.evaluate(
    (uid) => globalThis.__sd!.render()!.enemies.find((e) => e.uid === uid) ?? null,
    hidden,
  );
  expect(drawnHidden).not.toBeNull();
  expect(drawnHidden!.alpha).toBeLessThan(0.5); // checked just above
  expect(drawnHidden!.bracket).toBe(false);
  expect(drawnHidden!.bubble).toBe(false);
  await shot(page, 'cloak', 1, 'cloaked');

  const seen = await until(page, 'revealed');
  expect(seen).toBeGreaterThan(0);
  await nextFrames(page);
  const drawnSeen = await page.evaluate(
    (uid) => globalThis.__sd!.render()!.enemies.find((e) => e.uid === uid) ?? null,
    seen,
  );
  expect(drawnSeen).toMatchObject({ alpha: 1, bracket: true });
  await shot(page, 'cloak', 2, 'revealed');
});
