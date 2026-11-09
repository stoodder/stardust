// The battle smoke flow (T112): boot straight into BattleScene, build through the hook and by a
// real mouse click, pause and upgrade, fast-forward, and screenshot each step. Runs on the dev
// battle until A1M1 is the default map (app/battleSetup.ts DEFAULT_MAP_ID).
import { battleMapIds, DEFAULT_MAP_ID } from '../src/app/battleSetup.ts';
import { expect, test } from './fixtures.ts';
import { shot, waitForReady } from './hooks.ts';

/** A free pad on the default map, and a second one for the real click (dev_range's layout). */
const HOOK_PAD = [3, 1] as const;
const CLICK_PAD = [7, 4] as const;

test('battle: build by hook and by click, pause and upgrade, fast-forward', async ({ page }) => {
  await page.goto(`/?test=1&map=${DEFAULT_MAP_ID}&seed=1`);
  await waitForReady(page);
  await shot(page, 'battle', 1, 'start');

  // Pause first, so the tick only moves when the test moves it.
  const start = await page.evaluate(() => {
    globalThis.__sd?.setSpeed(0);
    const s = globalThis.__sd?.state();
    return s === null || s === undefined ? null : { tick: s.tick, credits: s.credits };
  });
  expect(start).not.toBeNull();

  // 1. Build through the hook while paused: fastForward(0) applies it without advancing time.
  const built = await page.evaluate(
    ([c, r]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      sd.enqueue({ type: 'build', tile: [c, r], tower: 'dev_rivet' });
      sd.fastForward(0);
      const s = sd.state()!; // a battle is running
      return { towers: s.towers.live, credits: s.credits, tick: s.tick };
    },
    [HOOK_PAD[0], HOOK_PAD[1]] as const,
  );
  expect(built.towers).toBe(1);
  expect(built.credits).toBe((start?.credits ?? 0) - 100);
  expect(built.tick).toBe(start?.tick);

  // 2. Arm build slot 1 (key 1), then build by a real mouse click on a pad.
  const target = await page.evaluate(([c, r]) => globalThis.__sd?.tileToClient(c, r) ?? null, [
    CLICK_PAD[0],
    CLICK_PAD[1],
  ] as const);
  expect(target).not.toBeNull();
  await page.keyboard.press('Digit1');
  await page.mouse.move(target!.x, target!.y); // checked just above
  await shot(page, 'battle', 2, 'placement-ghost');
  await page.mouse.click(target!.x, target!.y);
  // Paused: the host applies the command at the end of the next frame.
  await page.waitForFunction(() => globalThis.__sd?.state()?.towers.live === 2);

  // 3. Select it (click again) and look at the selection and its range ring.
  await page.mouse.click(target!.x, target!.y);
  await shot(page, 'battle', 3, 'selected');

  // 4. Upgrade while paused: it lands without the tick moving.
  const upgraded = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    const s = sd.state()!;
    const tower = s.towers.items.find((t) => t.alive);
    if (tower === undefined) return null;
    sd.enqueue({ type: 'upgrade', towerUid: tower.uid });
    sd.fastForward(0);
    const after = sd.state()!;
    return { tier: after.towers.items[tower.slot]?.tier, tick: after.tick };
  });
  expect(upgraded).toEqual({ tier: 2, tick: start?.tick });

  // 5. Fast-forward ten seconds of sim time.
  const ff = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    const before = sd.state()!.tick;
    sd.fastForward(600);
    return sd.state()!.tick - before;
  });
  expect(ff).toBe(600);

  // 6. Unpause at 2×: the frame loop advances the sim on its own.
  const t0 = await page.evaluate(() => {
    globalThis.__sd?.setSpeed(2);
    return globalThis.__sd?.state()?.tick ?? 0;
  });
  await page.waitForFunction((t) => (globalThis.__sd?.state()?.tick ?? 0) > t + 10, t0);
  const perf = await page.evaluate(() => globalThis.__sd?.perf());
  expect(perf?.towers).toBe(2);
  await page.mouse.move(0, 0);
  await shot(page, 'battle', 4, 'running');
});

test('battle: Esc and right-click cancel the selection; paths never take towers', async ({
  page,
}) => {
  await page.goto(`/?test=1&map=${DEFAULT_MAP_ID}&seed=1`);
  await waitForReady(page);
  // A click on a path tile builds nothing (hard rule).
  const path = await page.evaluate(() => globalThis.__sd?.tileToClient(4, 2) ?? null);
  await page.mouse.click(path!.x, path!.y); // a battle is running, so it's not null
  await page.evaluate(() => globalThis.__sd?.fastForward(1));
  expect(await page.evaluate(() => globalThis.__sd?.state()?.towers.live)).toBe(0);
  // Right-click shows no context menu and builds nothing.
  const pad = await page.evaluate(() => globalThis.__sd?.tileToClient(1, 1) ?? null);
  await page.mouse.click(pad!.x, pad!.y, { button: 'right' });
  await page.keyboard.press('Escape');
  await page.evaluate(() => globalThis.__sd?.fastForward(1));
  expect(await page.evaluate(() => globalThis.__sd?.state()?.towers.live)).toBe(0);
  // Space pauses: the tick stops advancing.
  await page.keyboard.press('Space');
  const a = await page.evaluate(() => globalThis.__sd?.state()?.tick);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => globalThis.__sd?.state()?.tick)).toBe(a);
});

for (const mapId of battleMapIds()) {
  test(`battle: map ${mapId} boots`, async ({ page }) => {
    await page.goto(`/?test=1&map=${mapId}&skipIntro=1&seed=1`);
    await waitForReady(page);
    expect(await page.evaluate(() => globalThis.__sd?.state()?.tick)).toBeGreaterThanOrEqual(0);
    await shot(page, 'maps', 1, mapId);
  });
}
