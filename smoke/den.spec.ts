// T604: the Scuttle Den and Bramble's Underfoot on their dev range (`?map=dev_den`,
// render/__fixtures__/devM6.ts): two Dens beside the road against W1's Undertows. The swarmlings
// dash out and latch on (SwarmView: they cling to the body, held on a frame), they ride an
// Undertow underground, and Underfoot, aimed from the HUD's slot 2 and cast by a real click on a
// road tile, lays its moss-green ring (TrapView) and springs on the first Undertow across it.
// Selecting a Den opens its panel. Asserted through `__sd.state()` and `__sd.render().swarm`;
// screenshots under the smoke output's screens/den/ (look at them: the latch, the ring, the burst).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

const DEN_A = [5, 2] as const;
const DEN_B = [12, 4] as const;
const TRAP = [10, 3] as const;

type Cond = 'latched' | 'below' | 'approach' | 'sprung';

/** Steps the sim one tick at a time (up to `max`) until `cond` holds, then renders. */
async function until(page: Page, cond: Cond, max = 3600): Promise<boolean> {
  const held = await page.evaluate(
    ([c, limit]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      const check = (): boolean => {
        const st = sd.state()!;
        if (c === 'latched') {
          return st.allies.items.some((a) => a.alive && a.swarmState === 'latched');
        }
        if (c === 'sprung') return st.trapSprung.length > 0;
        for (let i = 0; i < st.enemies.used; i++) {
          const e = st.enemies.items[i]!;
          if (!e.alive) continue;
          if (c === 'below' && e.burrowed && e.latchCount > 0) return true;
          // The lead Undertow nearing the trap's tile (route distance 12).
          if (c === 'approach' && e.dist >= 10 && e.dist < 11.5) return true;
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

test('den: swarmlings latch (underground too); Underfoot springs on the road', async ({ page }) => {
  await page.goto('/?test=1&map=dev_den&seed=1');
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  const bar = page.getByRole('navigation', { name: 'Abilities' });
  const underfoot = bar.getByRole('button', { name: /^Underfoot/ });
  await expect(underfoot).toHaveAttribute('aria-label', /, ready$/);

  await page.evaluate(
    ([a, b]) => {
      const sd = globalThis.__sd!;
      sd.setSpeed(0);
      sd.enqueue({ type: 'build', tower: 'burrow', tile: [a[0], a[1]] });
      sd.enqueue({ type: 'build', tower: 'burrow', tile: [b[0], b[1]] });
      sd.enqueue({ type: 'callWave' });
      sd.fastForward(2);
    },
    [DEN_A, DEN_B] as const,
  );
  const dens = await page.evaluate(() => {
    const st = globalThis.__sd!.state()!;
    return st.towers.items
      .filter((t) => t.alive && t.def?.id === 'burrow')
      .map((t) => t.swarmAlive);
  });
  expect(dens).toEqual([3, 3]);

  // The swarmlings dash out and latch on.
  expect(await until(page, 'latched')).toBe(true);
  const latched = await page.evaluate(() => globalThis.__sd!.render()!.swarm);
  expect(latched.latched).toBeGreaterThan(0);
  await shot(page, 'den', 1, 'latched');

  // An Undertow digs in with swarmlings on it: they ride it down.
  expect(await until(page, 'below')).toBe(true);
  expect(await page.evaluate(() => globalThis.__sd!.render()!.swarm.latched)).toBeGreaterThan(0);
  await shot(page, 'den', 2, 'underground');

  // Underfoot: aim from the HUD, click a road tile ahead of the lead Undertow.
  expect(await until(page, 'approach')).toBe(true);
  await underfoot.click();
  await expect(underfoot).toHaveAttribute('aria-pressed', 'true');
  const p = await page.evaluate(([c, r]) => globalThis.__sd?.tileToClient(c, r) ?? null, TRAP);
  expect(p).not.toBeNull();
  await page.mouse.move(p!.x, p!.y); // checked just above
  await nextFrames(page);
  await page.mouse.click(p!.x, p!.y);
  await expect(underfoot).toHaveAttribute('aria-pressed', 'false');
  await expect
    .poll(() => page.evaluate(() => globalThis.__sd?.state()?.stats.abilityUses ?? 0))
    .toBe(1);
  await page.mouse.move(0, 0);
  await nextFrames(page);
  expect(await page.evaluate(() => globalThis.__sd!.render()!.swarm.traps)).toBe(1);
  await shot(page, 'den', 3, 'trap');

  expect(await until(page, 'sprung')).toBe(true);
  const sprung = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    const st = sd.state()!;
    return {
      sprung: sd.render()!.swarm.sprung,
      pinned: st.enemies.items.filter((e) => e.alive && e.pinnedTicks > 0).length,
    };
  });
  expect(sprung.sprung).toBeGreaterThan(0);
  expect(sprung.pinned).toBeGreaterThan(0);
  await shot(page, 'den', 4, 'sprung');

  // A Den's panel opens (a spawner's stat line).
  const d = await page.evaluate(([c, r]) => globalThis.__sd?.tileToClient(c, r) ?? null, DEN_A);
  await page.mouse.click(d!.x, d!.y);
  await expect(page.getByRole('region', { name: 'Scuttle Den tower' })).toBeVisible();
  await shot(page, 'den', 5, 'panel');
});
