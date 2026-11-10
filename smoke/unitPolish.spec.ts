// T530a (T501i): render beats no other flow screenshots. The Lookout's two spec heads (Crow's Nest
// and Overclock Rig) on the dev cloak range (`?map=dev_cloak`, whose reference profile unlocks its
// specs), and a fleeing Brood Hauler's sack bursting with its young on A2M3 (`burst_young`: the
// untied sack opens on the young in its mouth, and they scurry back up the road). Screenshots in
// <out>/screens/unit-polish/ (look at them: the heads and the burst are the point).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';
import { outPath } from './out.ts';

/** Builds a Lookout on `tile`, takes it to tier 3, and specializes it; its spec, or null. */
async function lookout(page: Page, tile: readonly [number, number], spec: 'a' | 'b') {
  return page.evaluate(
    ([c, r, s]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      sd.enqueue({ type: 'build', tower: 'lookout', tile: [c, r] });
      sd.fastForward(1);
      const pool = sd.state()!.towers;
      const t = pool.items.slice(0, pool.used).find((x) => x.alive && x.col === c && x.row === r);
      if (t === undefined) return null;
      sd.enqueue({ type: 'upgrade', towerUid: t.uid });
      sd.enqueue({ type: 'upgrade', towerUid: t.uid });
      sd.enqueue({ type: 'specialize', towerUid: t.uid, spec: s });
      sd.fastForward(1);
      const now = pool.items.slice(0, pool.used).find((x) => x.alive && x.uid === t.uid);
      return now?.spec ?? null;
    },
    [tile[0], tile[1], spec] as const,
  );
}

/** A screen clip round tile (col, row), `w` × `h` CSS px. */
async function clipAt(page: Page, col: number, row: number, w: number, h: number) {
  const at = await page.evaluate(([c, r]) => globalThis.__sd!.tileToClient(c, r), [col, row]);
  return { x: at!.x - w / 2, y: at!.y - h * 0.7, width: w, height: h };
}

test("the Lookout's spec heads, idling (T501i)", async ({ page }) => {
  await page.goto('/?test=1&map=dev_cloak&seed=1');
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate(() => globalThis.__sd!.setSpeed(0));
  // One at a time: the range's credits buy one spec, which sells back for the other.
  expect(await lookout(page, [8, 4], 'a')).toBe('a');
  await nextFrames(page);
  await page.screenshot({
    path: outPath('screens/unit-polish/01-lookout-a.png'),
    clip: await clipAt(page, 8.5, 4.5, 120, 90),
  });
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    const pool = sd.state()!.towers;
    for (const t of pool.items.slice(0, pool.used)) {
      if (t.alive) sd.enqueue({ type: 'sell', towerUid: t.uid });
    }
    sd.fastForward(1);
  });
  expect(await lookout(page, [8, 4], 'b')).toBe('b');
  await nextFrames(page);
  await page.screenshot({
    path: outPath('screens/unit-polish/02-lookout-b.png'),
    clip: await clipAt(page, 8.5, 4.5, 120, 90),
  });
});

test("a fleeing Hauler's sack bursts with its young (T501i)", async ({ page }) => {
  await page.goto('/?test=1&map=a2_m03&seed=1');
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  // Par spares the runners, so W3's Haulers walk out untouched; the strike finishes one, softened
  // by hand (a test-only shortcut: the burst is the point, not the build).
  const fell = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
    const haulers = () =>
      sd
        .state()!
        .enemies.items.filter(
          (e) => e.alive && e.def?.id === 'hauler' && e.tags.includes('fleeing'),
        );
    for (let k = 0; k < 12_000; k++) {
      const h = haulers()[0];
      if (h !== undefined && h.dist > 6) break;
      sd.fastForward(1);
    }
    const h = haulers()[0];
    if (h === undefined) return null;
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test-only: soften the target
    (h as { hp: number }).hp = 1;
    sd.enqueue({ type: 'ability', slot: 1, target: [Math.floor(h.x), Math.floor(h.y)] });
    const n = haulers().length;
    for (let k = 0; k < 240; k++) {
      sd.fastForward(1);
      if (haulers().length < n) return { x: h.x, y: h.y };
    }
    return null;
  });
  expect(fell).not.toBeNull();
  await nextFrames(page);
  await shot(page, 'unit-polish', 3, 'burst-young');
  const clip = await clipAt(page, fell!.x, fell!.y, 140, 90);
  await page.waitForTimeout(250); // the young scurry out as the strike's flash fades
  await page.screenshot({ path: outPath('screens/unit-polish/04-burst-young-zoom.png'), clip });
});
