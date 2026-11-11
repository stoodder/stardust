// T607: the Hum Choir on its dev range (`?map=dev_choir`, render/__fixtures__/devChoir.ts). A
// Lullaby Choir beside the bend sings a dashed gold ring at its aura's reach and a dashed blue
// ring at its Lullaby's, with a gold note over it; a Mindspike beside it forms Harmony (the gold
// ring widens by half a tile). Once the Maw, Motes, and Blinkstriders reach the bend, each Lulled
// unit wears a small blue note over its head (ChoirView). Screenshots in <out>/screens/choir/
// (look at them: the rings and the notes are the point).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

/** Steps the sim one tick at a time (up to `max`) until `n` units are Lulled, then renders. */
async function untilLulled(page: Page, n: number, max = 2400): Promise<boolean> {
  const held = await page.evaluate(
    ([want, limit]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      const st = sd.state()!;
      const count = (): number => {
        let k = 0;
        for (let i = 0; i < st.enemies.used; i++) {
          const e = st.enemies.items[i]!;
          if (e.alive && e.lulled) k++;
        }
        return k;
      };
      for (let k = 0; k < limit; k++) {
        if (count() >= want) return true;
        sd.fastForward(1);
      }
      return count() >= want;
    },
    [n, max] as const,
  );
  await nextFrames(page);
  return held;
}

test('choir: the song and Lullaby rings, Harmony, and Lulled units wearing their note', async ({
  page,
}) => {
  await page.goto('/?test=1&map=dev_choir&seed=1');
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.enqueue({ type: 'build', tower: 'choir', tile: [9, 2] });
    sd.fastForward(1);
    const choirUid = (): number => {
      const st = sd.state()!;
      for (let i = 0; i < st.towers.used; i++) {
        const t = st.towers.items[i]!;
        if (t.alive && t.def?.id === 'choir') return t.uid;
      }
      return 0;
    };
    for (let k = 0; k < 2; k++) {
      sd.enqueue({ type: 'upgrade', towerUid: choirUid() });
      sd.fastForward(1);
    }
    sd.enqueue({ type: 'specialize', towerUid: choirUid(), spec: 'a' });
    sd.fastForward(1);
  });
  await nextFrames(page);
  let look = await page.evaluate(() => globalThis.__sd!.render()!.choir);
  expect(look).toMatchObject({ rings: 1, lullRings: 1, notes: 1, lulled: 0 });
  await shot(page, 'choir', 1, 'lullaby-rings');

  // A Mindspike beside it: Harmony forms and the gold ring widens (the sim's own reach).
  const reach = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.enqueue({ type: 'build', tower: 'mindspike', tile: [8, 2] });
    sd.fastForward(1);
    const st = sd.state()!;
    const choir = st.towers.items.find((t) => t.alive && t.def?.id === 'choir')!;
    return choir.linkAuraRadiusTiles;
  });
  expect(reach).toBe(0.5);

  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
  });
  expect(await untilLulled(page, 2)).toBe(true);
  look = await page.evaluate(() => globalThis.__sd!.render()!.choir);
  expect(look.rings).toBe(1);
  expect(look.lulled).toBeGreaterThanOrEqual(2);
  await shot(page, 'choir', 2, 'lulled');
});
