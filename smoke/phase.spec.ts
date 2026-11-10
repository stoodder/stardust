// T503: phasing and the Fracture's split on the dev rift range (`?map=dev_rift`, render/
// __fixtures__/devBattle.ts): Rift Moths cross an air lane past Skyhooks while Fractures walk the
// north road past Rivets and Zapcoils. A Moth's tell flickers its body whole and dithered over a
// broken teal ring; Phased, it draws as a faint dithered ghost over a steady ring, and no tower
// holds it as a target; a killed Fracture leaves two Shards, and a killed Shard two Motes (asserted
// through `__sd.render()` and the sim). Screenshots in test-results/screens/phase/ (look at them:
// the flicker and the ghost are the point).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

type Cond = 'tell' | 'phased' | 'shard' | 'mote';

/** Steps the sim one tick at a time (up to `max`) until `cond` holds; the unit's uid, or 0. */
async function until(page: Page, cond: Cond, max = 3000): Promise<number> {
  const uid = await page.evaluate(
    ([c, limit]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      const find = (): number => {
        const st = sd.state()!;
        for (let i = 0; i < st.enemies.used; i++) {
          const e = st.enemies.items[i]!;
          if (!e.alive) continue;
          const id = e.def?.id;
          // A tell's dithered step: 15 ticks before it phases (10–19 ticks left dither).
          if (c === 'tell' && id === 'riftmoth' && !e.phased && e.phaseTicks === 15) return e.uid;
          if (c === 'phased' && id === 'riftmoth' && e.phased && e.phaseTicks === 45) return e.uid;
          if (c === 'shard' && id === 'fracture_shard') return e.uid;
          if (c === 'mote' && id === 'mote') return e.uid;
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

/** How the unit `uid` draws now (its body's alpha), or null. */
async function drawn(page: Page, uid: number): Promise<{ alpha: number } | null> {
  return page.evaluate(
    (u) => globalThis.__sd!.render()!.enemies.find((e) => e.uid === u) ?? null,
    uid,
  );
}

test('phasing: the flicker tell, the Phased ghost, and the Fracture’s two-level split', async ({
  page,
}) => {
  await page.goto('/?test=1&map=dev_rift&seed=1');
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    const builds: [string, number, number][] = [
      ['skyhook', 3, 6],
      ['skyhook', 12, 6],
      ['rivet', 4, 2],
      ['rivet', 5, 4],
      ['rivet', 8, 4],
      ['rivet', 10, 3],
      ['rivet', 12, 3],
      ['rivet', 14, 4],
      ['rivet', 16, 5],
      ['zapcoil', 13, 1],
      ['zapcoil', 16, 8],
    ];
    for (const [tower, c, r] of builds) sd.enqueue({ type: 'build', tower, tile: [c, r] });
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
  });
  expect(await page.evaluate(() => globalThis.__sd!.state()!.towers.live)).toBe(11);

  // The tell: a dithered step of the flicker, over the broken ring.
  const telling = await until(page, 'tell');
  expect(telling).toBeGreaterThan(0);
  expect((await drawn(page, telling))!.alpha).toBeLessThan(1); // checked: it's drawn
  expect(await page.evaluate(() => globalThis.__sd!.render()!.phases.tells)).toBeGreaterThan(0);
  await shot(page, 'phase', 1, 'tell');

  // Phased: a faint ghost over a steady ring; no tower holds it as a target.
  const ghost = await until(page, 'phased');
  expect(ghost).toBeGreaterThan(0);
  expect((await drawn(page, ghost))!.alpha).toBeLessThanOrEqual(0.55); // checked: it's drawn
  const phases = await page.evaluate(() => globalThis.__sd!.render()!.phases);
  expect(phases.phased).toBeGreaterThan(0);
  expect(phases.phasedIn).toBeGreaterThan(0);
  const targeted = await page.evaluate((u) => {
    const st = globalThis.__sd!.state()!;
    return st.towers.items.some((t) => t.alive && t.targetUid === u);
  }, ghost);
  expect(targeted).toBe(false);
  await shot(page, 'phase', 2, 'phased');

  // The split: Shards from a Fracture, then Motes from a Shard.
  expect(await until(page, 'shard')).toBeGreaterThan(0);
  await shot(page, 'phase', 3, 'shards');
  expect(await until(page, 'mote')).toBeGreaterThan(0);
});
