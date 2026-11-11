// T704: the Sproing Pad on its dev range (`?map=dev_sproing`, render/__fixtures__/devM7.ts). A pad
// with a Hum Choir (Bounce Chorus) and a Seer's Lantern (Lookie Here) beside it, and a ground-only
// Thumper. W1's Puffwings fly in along the bottom: the leaper boings out on an arc (LeaperView: a
// young Skitterkin over its shadow), bonks a Puffwing (an orange pop), and the Puffwing is grounded
// (an orange ring under it and gold dizzy stars over its head) while the Pin holds. Asserted
// through `__sd.state()` and `__sd.render().sproing`; screenshots under the smoke output's
// screens/sproing/ (look at them: the arc, the ring, and the stars are the point).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

type Cond = 'midair' | 'grounded';

/** Steps the sim one tick at a time (up to `max`) until `cond` holds, then renders. */
async function until(page: Page, cond: Cond, max = 3600): Promise<boolean> {
  const held = await page.evaluate(
    ([c, limit]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      const check = (): boolean => {
        const st = sd.state()!;
        if (c === 'midair') {
          // A leaper well out from its pad (1.4 tiles or more), clear of its neighbours, so it shows.
          return st.allies.items.some((a) => {
            if (!a.alive || a.kind !== 'leaper' || a.swarmState !== 'out') return false;
            const pad = st.towers.items.find((t) => t.alive && t.uid === a.ownerUid);
            return pad !== undefined && Math.hypot(a.x - pad.x, a.y - pad.y) >= 1.4;
          });
        }
        return st.enemies.items.some(
          (e) => e.alive && e.def?.layer === 'air' && e.pinnedTicks > 30,
        );
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

test('sproing: leapers boing, bonk, and ground a flyer; both links form', async ({ page }) => {
  await page.goto('/?test=1&map=dev_sproing&seed=1');
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  const linked = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.enqueue({ type: 'build', tower: 'sproing', tile: [6, 4] });
    sd.enqueue({ type: 'build', tower: 'dev_thumper', tile: [7, 4] });
    sd.enqueue({ type: 'build', tower: 'choir', tile: [5, 4] });
    sd.enqueue({ type: 'build', tower: 'lantern', tile: [6, 5] });
    sd.fastForward(2);
    const st = sd.state()!;
    const pad = st.towers.items.find((t) => t.alive && t.def?.id === 'sproing')!;
    return { pin: pad.linkPinTicks, marked: pad.linkPreferMarked, range: pad.flatRange };
  });
  // Bounce Chorus: the Pin +0.5 s; Lookie Here: +0.5 range and Marked first.
  expect(linked).toEqual({ pin: 30, marked: true, range: 0.5 });

  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
  });
  expect(await until(page, 'midair')).toBe(true);
  let look = await page.evaluate(() => globalThis.__sd!.render()!.sproing);
  expect(look.out).toBeGreaterThanOrEqual(1);
  await shot(page, 'sproing', 1, 'leap');

  expect(await until(page, 'grounded')).toBe(true);
  look = await page.evaluate(() => globalThis.__sd!.render()!.sproing);
  expect(look.bonks).toBeGreaterThanOrEqual(1);
  expect(look.groundings).toBeGreaterThanOrEqual(1);
  expect(look.grounded).toBeGreaterThanOrEqual(1);
  await shot(page, 'sproing', 2, 'grounded');

  // The Pin lapses (2 s with Bounce Chorus) and the marks go with it once no flyer is held.
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    const st = sd.state()!;
    const pad = st.towers.items.find((t) => t.alive && t.def?.id === 'sproing')!;
    sd.enqueue({ type: 'holdFire', target: pad.uid, on: true });
    sd.fastForward(3 * 60);
  });
  await nextFrames(page);
  look = await page.evaluate(() => globalThis.__sd!.render()!.sproing);
  expect(look.grounded).toBe(0);
  expect(look.out).toBe(0);
});
