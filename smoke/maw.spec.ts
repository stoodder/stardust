// T602: the Hollow's Act III units and rift lanes on the dev Maw range (`?map=dev_maw`, render/
// __fixtures__/devM6.ts): a Maw walks the road with Motes catching it up past par's Zapcoils and
// Rivet; W2's Motes come up a rift lane that cracks as W1 starts and opens as W2 starts; W3 brings
// an Undertow. Asserted through `__sd.render().hollow` and the sim: the rift's three looks, the
// Maw's tendril tell (both held still), its growth ring after a gather, and the ripple trail
// behind a burrowed Undertow. Screenshots in <out>/screens/maw/ (look at them: the tendrils, the
// ring, and the crack are the point).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

type Cond = 'tell' | 'grown' | 'wave2' | 'burrowed';

/** Steps the sim one tick at a time (up to `max`) until `cond` holds; true if it did. */
async function until(page: Page, cond: Cond, max = 3600): Promise<boolean> {
  const ok = await page.evaluate(
    ([c, limit]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      const holds = (): boolean => {
        const st = sd.state()!;
        if (c === 'wave2') return st.wave >= 2;
        for (let i = 0; i < st.enemies.used; i++) {
          const e = st.enemies.items[i]!;
          if (!e.alive) continue;
          const id = e.def?.id;
          // Mid-tell, so the tendrils have pulled in a little.
          if (c === 'tell' && id === 'maw' && e.gatherUid !== 0 && e.gatherTicks === 30)
            return true;
          if (c === 'grown' && id === 'maw' && e.absorbs >= 1) return true;
          if (c === 'burrowed' && id === 'undertow' && e.burrowed && e.dist > 1.5) return true;
        }
        return false;
      };
      for (let k = 0; k < limit; k++) {
        if (holds()) return true;
        sd.fastForward(1);
      }
      return holds();
    },
    [cond, max] as const,
  );
  await nextFrames(page);
  return ok;
}

async function hollow(page: Page) {
  return page.evaluate(() => globalThis.__sd!.render()!.hollow);
}

test('the Hollow: a Maw’s tendril tell and growth, a rift a wave ahead, an Undertow’s ripples', async ({
  page,
}) => {
  await page.goto('/?test=1&map=dev_maw&seed=1');
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  // Setup: the W2 rift is still closed.
  expect((await hollow(page)).rifts).toEqual(['closed']);
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    const builds: [string, number, number][] = [
      ['zapcoil', 7, 2],
      ['rivet', 12, 4],
      ['zapcoil', 7, 4],
    ];
    for (const [tower, c, r] of builds) sd.enqueue({ type: 'build', tower, tile: [c, r] });
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
  });
  await nextFrames(page);
  // W1 is on: the W2 rift cracks, a wave ahead.
  expect((await hollow(page)).rifts).toEqual(['opening']);
  await shot(page, 'maw', 1, 'rift-opening');

  // The tendril tell: the Maw and the unit it holds both stand still.
  expect(await until(page, 'tell')).toBe(true);
  const held = await page.evaluate(() => {
    const st = globalThis.__sd!.state()!;
    const m = st.enemies.items.find((e) => e.alive && e.def?.id === 'maw')!;
    const v = st.enemies.items.find((e) => e.alive && e.uid === m.gatherUid);
    return { maw: m.paceMul, unit: v?.paceMul ?? -1 };
  });
  expect(held).toEqual({ maw: 0, unit: 0 });
  const telling = await hollow(page);
  expect(telling.tells).toBe(1);
  expect(telling.tellsSeen).toBeGreaterThan(0);
  await shot(page, 'maw', 2, 'tendril-tell');

  // The gather: the Maw wears its growth ring.
  expect(await until(page, 'grown')).toBe(true);
  expect((await hollow(page)).grown).toBeGreaterThan(0);
  await shot(page, 'maw', 3, 'grown');

  // W2: the rift is open, and Motes walk it.
  expect(await until(page, 'wave2')).toBe(true);
  expect((await hollow(page)).rifts).toEqual(['open']);
  await shot(page, 'maw', 4, 'rift-open');

  // W3's Undertow underground: a ripple trail behind it.
  expect(await until(page, 'burrowed', 60 * 90)).toBe(true);
  expect((await hollow(page)).ripples).toBeGreaterThan(0);
  await shot(page, 'maw', 5, 'ripples');
});
