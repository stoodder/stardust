// T705: the Gloop Spitter on its dev range (`?map=dev_gloop`, render/__fixtures__/devGloop.ts). A
// Big Glorp Gloop in the road's corner spits green globs (`projectile.gloop_glob`) at the Compliance
// Officers and the Liability-Class Enforcer: each landing leaves a pool of acid (PuddleView: a
// translucent green ellipse with a solid rim and glints) that dries in steps, and the units it hits
// carry Corroded. A Skyhook beside it forms Sticky Flak (its callout and tether). Screenshots in
// <out>/screens/gloop/ (look at them: the pools under the units and the tether are the point).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

/** Steps the sim a tick at a time (up to `max`) until `n` puddles lie on the road, then renders. */
async function untilPuddles(page: Page, n: number, max = 1800): Promise<number> {
  const live = await page.evaluate(
    ([want, limit]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      const st = sd.state()!;
      const count = (): number => {
        let c = 0;
        for (let i = 0; i < st.zones.used; i++) {
          const z = st.zones.items[i]!;
          if (z.alive && z.kind === 'puddle') c++;
        }
        return c;
      };
      for (let k = 0; k < limit; k++) {
        sd.fastForward(1);
        if (count() >= want) return count();
      }
      return count();
    },
    [n, max] as const,
  );
  await nextFrames(page);
  return live;
}

test('gloop: the spit, Big Glorp’s puddles, Corroded, and Sticky Flak', async ({ page }) => {
  await page.goto('/?test=1&map=dev_gloop&seed=1');
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  const linked = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.enqueue({ type: 'build', tower: 'gloop', tile: [9, 2] });
    sd.enqueue({ type: 'build', tower: 'skyhook', tile: [9, 3] });
    sd.fastForward(1);
    const st = sd.state()!;
    const g = st.towers.items.find((t) => t.alive && t.def?.id === 'gloop')!;
    for (let k = 0; k < 2; k++) {
      sd.enqueue({ type: 'upgrade', towerUid: g.uid });
      sd.fastForward(1);
    }
    sd.enqueue({ type: 'specialize', towerUid: g.uid, spec: 'a' });
    sd.fastForward(1);
    return { spec: g.spec, rate: g.pctRate };
  });
  expect(linked.spec).toBe('a');
  expect(linked.rate).toBeCloseTo(0.1); // Sticky Flak: the Gloop fires 10% faster
  // Sticky Flak's callout floats as it forms, and its tether (T740b: a thick gooey green line with
  // violet beads) joins the two.
  await nextFrames(page);
  expect(await page.evaluate(() => globalThis.__sd!.render()!.tethers)).toBe(1);
  await shot(page, 'gloop', 1, 'big-glorp-sticky-flak');

  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
  });
  expect(await untilPuddles(page, 2)).toBeGreaterThanOrEqual(2);
  const look = await page.evaluate(() => globalThis.__sd!.render()!.gloop);
  expect(look.puddles).toBeGreaterThanOrEqual(2);
  expect(look.spawned).toBeGreaterThanOrEqual(2);
  const corroded = await page.evaluate(() => {
    const st = globalThis.__sd!.state()!;
    return st.enemies.items.filter((e) => e.alive && e.corrodedStacks > 0).length;
  });
  expect(corroded).toBeGreaterThan(0);
  await shot(page, 'gloop', 2, 'puddles');

  // They dry: 3 s with no new globs (the Gloop holds fire) leaves the road clean.
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    const st = sd.state()!;
    const g = st.towers.items.find((t) => t.alive && t.def?.id === 'gloop')!;
    sd.enqueue({ type: 'holdFire', target: g.uid, on: true });
    sd.fastForward(3 * 60 + 2);
  });
  await nextFrames(page);
  expect((await page.evaluate(() => globalThis.__sd!.render()!.gloop)).puddles).toBe(0);
});
