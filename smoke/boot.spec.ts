import { expect, test } from './fixtures.ts';
import { shot, waitForReady } from './hooks.ts';

test('boot: the game loads, renders, and shows the title', async ({ page }) => {
  await page.goto('/?test=1');
  await waitForReady(page);

  const canvas = page.locator('#game canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(0);
  expect(box?.height ?? 0).toBeGreaterThan(0);
  // 1280×720 viewport at DPR 1: integer scale 2 → 1280×720 canvas.
  expect(box?.width).toBe(1280);
  expect(box?.height).toBe(720);

  await expect(page.getByRole('heading', { name: 'Stardust' })).toBeVisible();
  await shot(page, 'boot', 1, 'title');
});

test('boot: test hooks are exposed only with ?test=1', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Stardust' })).toBeVisible();
  expect(await page.evaluate(() => '__sd' in globalThis)).toBe(false);
});

test('boot: stub hooks have the documented shape', async ({ page }) => {
  await page.goto('/?test=1');
  await waitForReady(page);
  const result = await page.evaluate(() => {
    const sd = globalThis.__sd;
    if (sd === undefined) return null;
    sd.setSpeed(2);
    sd.fastForward(60);
    sd.enqueue({ type: 'callWave' });
    sd.goto('title');
    return {
      state: sd.state(),
      tile: sd.tileToClient(0, 0),
      perfKeys: Object.keys(sd.perf()).toSorted(),
    };
  });
  expect(result).toEqual({
    state: null,
    tile: null,
    perfKeys: ['enemies', 'frameMs', 'particles', 'projectiles', 'simMsPerTick', 'towers'],
  });
});
