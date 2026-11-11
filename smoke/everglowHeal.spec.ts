// T703: Everglow Security, part two, on the dev heal range (`?map=dev_heal`, render/__fixtures__/
// devHeal.ts). A Maintenance Associate walks among Compliance Drones that a Rivet has hurt: its
// healer aura shows as a solid `green.3` ring at 1.5 tiles with a `green.4` pulse expanding out to
// it once a second, and every drone it is mending wears a green ✚ (HealAuraView). Then W2: two
// Asset Recovery Gunships on the air lane and two Black Budget Operatives shimmering on the road.
// Screenshots in <out>/screens/everglow-heal/ (look at them: the ring, the pulse and the ✚ are the
// point). C4 Purge's open panels are unit-tested (healLook.test.ts, devHeal.test.ts): no boot
// parameter adds a modifier until battleSetup does (T710).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

type Cond = 'mending' | 'pulse' | 'wave2';

/** Steps the sim one tick at a time (up to `max`) until `cond` holds, then renders. */
async function until(page: Page, cond: Cond, max = 3600): Promise<boolean> {
  const held = await page.evaluate(
    ([c, limit]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      const st = sd.state()!;
      const check = (): boolean => {
        let src: { x: number; y: number; uid: number } | null = null;
        let flyers = 0;
        let operatives = 0;
        for (let i = 0; i < st.enemies.used; i++) {
          const e = st.enemies.items[i]!;
          if (!e.alive) continue;
          if (e.def?.id === 'associate' && e.x >= 3) src = e;
          if (e.def?.id === 'gunship' && e.x >= 3) flyers++;
          if (e.def?.id === 'blackbudget' && e.x >= 3) operatives++;
        }
        if (c === 'wave2') return flyers > 0 && operatives > 0;
        if (src === null) return false;
        // A pulse step shows (healLook.ts `pulseStep`: 4 steps of 8 ticks a second, by uid).
        if (c === 'pulse' && (st.tick + src.uid * 17) % 60 >= 32) return false;
        for (let i = 0; i < st.enemies.used; i++) {
          const e = st.enemies.items[i]!;
          if (!e.alive || e.def?.id !== 'compliance' || e.hp >= e.def.hp) continue;
          const dx = e.x - src.x;
          const dy = e.y - src.y;
          if (dx * dx + dy * dy <= 2.25) return true;
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

test('everglow heal: the Associate’s ring pulses and mends the drones; gunships and Operatives walk in', async ({
  page,
}) => {
  await page.goto('/?test=1&map=dev_heal&seed=1');
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    // A T1 Rivet nicks the drones early on the road; a Lookout for W2's Operatives.
    sd.enqueue({ type: 'build', tower: 'rivet', tile: [1, 2] });
    sd.enqueue({ type: 'build', tower: 'lookout', tile: [5, 2] });
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
  });
  expect(await page.evaluate(() => globalThis.__sd!.state()!.towers.live)).toBe(2);

  expect(await until(page, 'mending')).toBe(true);
  const look = await page.evaluate(() => globalThis.__sd!.render()!.heal);
  expect(look.rings).toBe(1);
  expect(look.pluses).toBeGreaterThan(0);
  expect(look.panels).toBe(0); // no Purge here
  await shot(page, 'everglow-heal', 1, 'ring-and-plus');

  expect(await until(page, 'pulse')).toBe(true);
  const pulsing = await page.evaluate(() => globalThis.__sd!.render()!.heal);
  expect(pulsing.rings).toBe(1);
  expect(pulsing.pulses).toBe(1);
  await shot(page, 'everglow-heal', 2, 'pulse');

  await page.evaluate(() => globalThis.__sd!.enqueue({ type: 'callWave' }));
  expect(await until(page, 'wave2')).toBe(true);
  await shot(page, 'everglow-heal', 3, 'gunships-and-operatives');
});
