// T603: Everglow Security on the dev revoke range (`?map=dev_revoke`, render/__fixtures__/devM6.ts;
// T606 adds the revocation later). Compliance Drones march down the road and an Expediter catches
// them up: its haste aura shows as a solid `orange.3` ring at 2 tiles beating like a metronome,
// and every drone inside it trails orange speed lines (EverglowView). A drone two T3 Rivets kill shuts
// down: a power-off line at its body and a price tag dropping to the ground (deathLook.ts
// `shutdown`; no explosion). Screenshots in <out>/screens/everglow/ (look at them: the ring and
// the tag are the point).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

type Cond = 'hasted' | 'beat' | 'killed';

/** Steps the sim one tick at a time (up to `max`) until `cond` holds, then renders. */
async function until(page: Page, cond: Cond, max = 2400): Promise<boolean> {
  const held = await page.evaluate(
    ([c, limit]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      const st = sd.state()!;
      const check = (): boolean => {
        if (c === 'killed') return (st.stats.killsByEnemy['compliance'] ?? 0) > 0;
        if (c === 'beat') return st.tick % 30 < 6; // the metronome's bright beat (everglowLook.ts)
        let source = false;
        let hasted = false;
        for (let i = 0; i < st.enemies.used; i++) {
          const e = st.enemies.items[i]!;
          if (!e.alive) continue;
          // The Expediter out on the road, past the spawn's edge, with a drone in its ring.
          if (e.def?.id === 'expediter' && e.x >= 3) source = true;
          if (e.def?.id === 'compliance' && e.auraHastePct > 0) hasted = true;
        }
        return source && hasted;
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

test('everglow: the Expediter rings and hastes the drones; a drone shuts down with a price tag', async ({
  page,
}) => {
  await page.goto('/?test=1&map=dev_revoke&seed=1');
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    // Two Rivets at T3 (armor pierce 3): enough to break armor-4 drones at the bend.
    sd.enqueue({ type: 'build', tower: 'rivet', tile: [12, 4] });
    sd.enqueue({ type: 'build', tower: 'rivet', tile: [12, 2] });
    sd.fastForward(1);
    const st = sd.state()!;
    for (let k = 0; k < 2; k++) {
      for (let i = 0; i < st.towers.used; i++) {
        const t = st.towers.items[i]!;
        if (t.alive) sd.enqueue({ type: 'upgrade', towerUid: t.uid });
      }
      sd.fastForward(1);
    }
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
  });
  expect(await page.evaluate(() => globalThis.__sd!.state()!.towers.live)).toBe(2);

  expect(await until(page, 'hasted')).toBe(true);
  expect(await until(page, 'beat')).toBe(true);
  const look = await page.evaluate(() => globalThis.__sd!.render()!.everglow);
  expect(look.rings).toBe(1);
  expect(look.lines).toBeGreaterThan(0);
  await shot(page, 'everglow', 1, 'haste-ring');

  expect(await until(page, 'killed')).toBe(true);
  // The shutdown runs on real time (its tag falls for 450 ms): catch it mid-fall.
  await page.waitForTimeout(250);
  const after = await page.evaluate(() => globalThis.__sd!.render()!.everglow);
  expect(after.shutdownsPlayed).toBeGreaterThan(0);
  expect(after.shutdowns).toBeGreaterThan(0);
  await shot(page, 'everglow', 2, 'shutdown');
});
