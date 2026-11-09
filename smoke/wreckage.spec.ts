// T312a: wreckage and the salvage drone on the dev sky range (`?map=dev_sky`,
// render/__fixtures__/devBattle.ts: wrecks over a hidden power node (1,4), high ground (4,5), and a
// pad (7,2)). An armed click on a wreck says how to clear it; a plain click queues the drone (the
// tile's beacon blinks and it shows its place in line); a second click says the drone's already on
// it; the drone flies out, works, clears the tile to what lay under it, flies on, and goes home.
// Screenshots in test-results/screens/wreckage/.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

const NODE = [1, 4] as const;
const HIGH = [4, 5] as const;
const COLS = 12;

async function tileClient(page: Page, [c, r]: readonly [number, number]) {
  const p = await page.evaluate(([x, y]) => globalThis.__sd?.tileToClient(x, y) ?? null, [
    c,
    r,
  ] as const);
  expect(p).not.toBeNull();
  return p!; // checked just above
}

async function click(page: Page, tile: readonly [number, number]): Promise<void> {
  const p = await tileClient(page, tile);
  await page.mouse.move(p.x, p.y);
  await page.mouse.click(p.x, p.y);
}

async function drone(page: Page) {
  return page.evaluate(() => {
    const w = globalThis.__sd!.state()!.wreckage; // installed: waitForReady passed
    return { queue: [...w.queue], cleared: [...w.cleared] };
  });
}

async function step(page: Page, ticks: number): Promise<void> {
  await page.evaluate((n) => globalThis.__sd!.fastForward(n), ticks);
  await nextFrames(page);
}

test('wreckage: clear it first, queue the drone, watch it clear', async ({ page }) => {
  await page.goto('/?test=1&map=dev_sky&seed=1');
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate(() => globalThis.__sd!.setSpeed(0));
  await shot(page, 'wreckage', 1, 'wrecks');

  // Armed, a wreck can't take a tower yet.
  await page.keyboard.press('Digit1');
  await click(page, NODE);
  await expect(page.getByText('Click it (no tower armed) to send the drone')).toBeVisible();
  await shot(page, 'wreckage', 2, 'clear-it-first');
  await page.keyboard.press('Escape');

  // A plain click queues the drone; a second wreck joins the line behind it.
  await click(page, NODE);
  await click(page, HIGH);
  await step(page, 0);
  const nodeIdx = NODE[1] * COLS + NODE[0];
  const highIdx = HIGH[1] * COLS + HIGH[0];
  expect((await drone(page)).queue).toEqual([nodeIdx, highIdx]);
  await shot(page, 'wreckage', 3, 'queued');

  // Again on a queued wreck: the drone's already on it.
  await click(page, NODE);
  await expect(page.getByText('Drone already on it')).toBeVisible();

  // The drone flies out from the core, then works over the wreck.
  await step(page, 45);
  await shot(page, 'wreckage', 4, 'drone-flying');
  await step(page, 150);
  await shot(page, 'wreckage', 5, 'drone-working');
  await step(page, 120);
  await shot(page, 'wreckage', 6, 'half-cleared');

  // Cleared: the power node it hid shows, the salvage floats up, and the drone flies on.
  await step(page, 50);
  expect((await drone(page)).cleared).toEqual([nodeIdx]);
  await shot(page, 'wreckage', 7, 'node-uncovered');

  // The second clears to high ground, then the drone flies home and parks.
  await step(page, 360);
  expect((await drone(page)).cleared).toEqual([nodeIdx, highIdx]);
  await step(page, 30);
  await shot(page, 'wreckage', 8, 'drone-home');

  // The uncovered node takes a tower.
  const before = await page.evaluate(() => globalThis.__sd!.state()!.towers.live);
  await page.keyboard.press('Digit4');
  await click(page, NODE);
  await step(page, 0);
  expect(await page.evaluate(() => globalThis.__sd!.state()!.towers.live)).toBe(before + 1);
  await shot(page, 'wreckage', 9, 'built-on-node');
});
