// The companion slot (T207b): Sgt. Bricks's Suppressing Fire on E, aimed at a stretch of path. Runs
// on the dev battle (`?map=dev_range`), where Bricks stands at his post on (7,2) beside the bend
// with Suppressing Fire in slot 2 (render/__fixtures__/devBattle.ts). Mouse flow: E aims, a pad
// says "Can't target there" and keeps the aim, a path tile previews the 3-tile segment, a click
// casts it, and E while it recharges says so. Keyboard flow: E, the arrows walk only path tiles,
// Enter fires. Screenshots in test-results/screens/suppress/.
import type { Page } from '@playwright/test';
import { DEV_MAP_ID } from '../src/app/battleSetup.ts';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

/** dev_range tiles: a pad, and the path tile at the bend in front of Bricks's post. */
const PAD = [3, 1] as const;
const BEND = [6, 3] as const;

async function tileClient(page: Page, [c, r]: readonly [number, number]) {
  const p = await page.evaluate(([x, y]) => globalThis.__sd?.tileToClient(x, y) ?? null, [
    c,
    r,
  ] as const);
  expect(p).not.toBeNull();
  return p!; // checked just above
}

async function open(page: Page): Promise<void> {
  await page.goto(`/?test=1&map=${DEV_MAP_ID}&seed=1`);
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  // Pause, start wave 1, and let it walk up to the bend, so there's something to suppress.
  await page.evaluate(() => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    sd.setSpeed(0);
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(480);
  });
}

test('suppress: E aims at the path, previews the segment, and casts it', async ({ page }) => {
  await open(page);
  const bar = page.getByRole('navigation', { name: 'Abilities' });
  await expect(bar.getByRole('button')).toHaveCount(2);
  const slot2 = bar.getByRole('button', { name: /^Suppressing Fire/ });
  await expect(slot2).toHaveAttribute('aria-label', 'Suppressing Fire, ready');
  // The tooltip carries the real numbers (abilityStats).
  await expect(slot2).toHaveAttribute('title', /^Suppressing Fire \(E\): Slows 3 tiles of path/);
  // Bricks is at his post.
  expect(await page.evaluate(() => globalThis.__sd?.state()?.allies.live)).toBe(1);

  // E aims; the hint asks for the path.
  await page.keyboard.press('KeyE');
  await expect(slot2).toHaveAttribute('aria-pressed', 'true');
  await expect(bar.getByRole('status')).toContainText('Pick a stretch of path');

  // A pad isn't the path: "Can't target there", and it stays aimed.
  const pad = await tileClient(page, PAD);
  await page.mouse.move(pad.x, pad.y);
  await page.mouse.click(pad.x, pad.y);
  await expect(page.getByText("Can't target there")).toBeVisible();
  await expect(slot2).toHaveAttribute('aria-pressed', 'true');
  await shot(page, 'suppress', 1, 'off-path');

  // Hovering the bend previews the segment there.
  const bend = await tileClient(page, BEND);
  await page.mouse.move(bend.x, bend.y);
  await nextFrames(page);
  await shot(page, 'suppress', 2, 'aiming');

  // Click casts it (paused: it applies at the end of the next frame).
  await page.mouse.click(bend.x, bend.y);
  await expect(slot2).toHaveAttribute('aria-pressed', 'false');
  await expect
    .poll(() => page.evaluate(() => globalThis.__sd?.state()?.abilityCooldownTicks[1] ?? 0))
    .toBeGreaterThan(0);
  const zones = await page.evaluate(() =>
    (globalThis.__sd?.state()?.zones.items ?? [])
      .filter((z) => z.alive)
      .map((z) => ({ kind: z.kind, slot: z.abilitySlot, from: z.distFrom, to: z.distTo })),
  );
  // dev_range's path tile (6,3) is route index 9: the segment covers tiles 8–10.
  expect(zones).toEqual([{ kind: 'segment', slot: 2, from: 7.5, to: 10.5 }]);
  await expect(slot2).toHaveAttribute('aria-label', /^Suppressing Fire, recharging, 50 s$/);

  // Let it run a moment in real time: the strip flickers, streaks rake it, Bricks fires.
  await page.mouse.move(0, 0);
  await page.evaluate(() => globalThis.__sd?.setSpeed(1));
  await page.waitForTimeout(400);
  await page.evaluate(() => globalThis.__sd?.setSpeed(0));
  await nextFrames(page);
  await shot(page, 'suppress', 3, 'segment');
  const fired = await page.evaluate(() => globalThis.__sd?.state()?.stats.abilityUses ?? 0);
  expect(fired).toBe(1);

  // E while it recharges says so instead of aiming.
  await page.keyboard.press('KeyE');
  await expect(slot2).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText('Suppressing Fire recharging')).toBeVisible();
  await shot(page, 'suppress', 4, 'hud');

  // The zone runs out after 5 s of sim time.
  await page.evaluate(() => globalThis.__sd?.fastForward(300));
  await expect.poll(() => page.evaluate(() => globalThis.__sd?.state()?.zones.live)).toBe(0);
});

test('suppress: keyboard only — E, the arrows walk the path, Enter fires', async ({ page }) => {
  await open(page);
  const say = page.getByTestId('cursor-announce');
  await page.keyboard.press('KeyE');
  // The cursor appears on a path tile, and every move stays on the path.
  for (const key of ['ArrowDown', 'ArrowRight', 'ArrowDown']) {
    await page.keyboard.press(key);
    await expect(say).toHaveText(
      /^(Path|Spawn|Core), column \d+, row \d+\. Enter fires Suppressing Fire here\.$/,
    );
  }
  await shot(page, 'suppress', 5, 'keyboard-aiming');
  await page.keyboard.press('Enter');
  await expect
    .poll(() => page.evaluate(() => globalThis.__sd?.state()?.abilityCooldownTicks[1] ?? 0))
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => globalThis.__sd?.state()?.zones.live)).toBeGreaterThan(0);
});
