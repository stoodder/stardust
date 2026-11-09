// The in-map HUD (T106): build from a slot and a tile, select → upgrade → retarget → sell from the
// tower panel, speed controls, the wave call, and the keyboard shortcuts, with screenshots of each
// step in test-results/screens/hud/. Runs on the dev battle (`?map=dev_range`), whose Thumper
// isn't held back the way A1M1's is until W3.
import type { Page } from '@playwright/test';
import { DEV_MAP_ID } from '../src/app/battleSetup.ts';
import { expect, test } from './fixtures.ts';
import { shot, waitForReady } from './hooks.ts';

/** Free pads on the dev battle (render/__fixtures__/devBattle.ts). */
const PAD_A = [3, 1] as const;
const PAD_B = [7, 4] as const;

async function tileClient(page: Page, [c, r]: readonly [number, number]) {
  const p = await page.evaluate(([x, y]) => globalThis.__sd?.tileToClient(x, y) ?? null, [
    c,
    r,
  ] as const);
  expect(p).not.toBeNull();
  return p!; // checked just above
}

function liveTowers(page: Page) {
  return page.evaluate(() =>
    (globalThis.__sd?.state()?.towers.items ?? [])
      .filter((t) => t.alive)
      .map((t) => ({ uid: t.uid, tier: t.tier, priority: t.priority })),
  );
}

async function open(page: Page): Promise<void> {
  await page.goto(`/?test=1&map=${DEV_MAP_ID}&seed=1`);
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
}

test('hud: build from a slot, then select, upgrade, retarget, and sell', async ({ page }) => {
  await open(page);
  const pause = page.getByRole('button', { name: 'Pause' });
  await pause.click();
  await expect(pause).toHaveAttribute('aria-pressed', 'true');
  const credits0 = await page.evaluate(() => globalThis.__sd?.state()?.credits ?? 0);
  await page.mouse.move(0, 0);
  await shot(page, 'hud', 1, 'start');

  // Build: click slot 1, then a pad. The slot stays armed while another is affordable.
  const slot1 = page.getByRole('button', { name: /^Build Rivet/ });
  await slot1.click();
  await expect(slot1).toHaveAttribute('aria-pressed', 'true');
  const a = await tileClient(page, PAD_A);
  await page.mouse.move(a.x, a.y);
  await shot(page, 'hud', 2, 'armed-ghost');
  await page.mouse.click(a.x, a.y);
  await expect.poll(async () => (await liveTowers(page)).length).toBe(1);
  await expect(slot1).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel(/^Credits /)).toHaveAttribute(
    'aria-label',
    `Credits ${credits0 - 100}`,
  );

  // Esc disarms.
  await page.keyboard.press('Escape');
  await expect(slot1).toHaveAttribute('aria-pressed', 'false');

  // Select: click the tower; its panel opens beside it.
  await page.mouse.click(a.x, a.y);
  const panel = page.getByRole('region', { name: 'Rivet tower' });
  await expect(panel).toBeVisible();
  await expect(panel.getByLabel('Tier 1 of 3')).toBeVisible();
  await page.mouse.move(0, 0);
  await shot(page, 'hud', 3, 'tower-panel');

  // Upgrade by the button, then by U; the last tier says Max tier.
  await panel.getByRole('button', { name: /^Upgrade to tier 2/ }).click();
  await expect(panel.getByLabel('Tier 2 of 3')).toBeVisible();
  await page.keyboard.press('KeyU');
  await expect(panel.getByLabel('Tier 3 of 3')).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Max tier' })).toHaveAttribute(
    'aria-disabled',
    'true',
  );

  // Retarget: the button and T cycle First → Last → Strong.
  await panel.getByRole('button', { name: /^Targeting: First/ }).click();
  await expect.poll(async () => (await liveTowers(page))[0]?.priority).toBe('last');
  await page.keyboard.press('KeyT');
  await expect.poll(async () => (await liveTowers(page))[0]?.priority).toBe('strong');
  await expect(panel.getByRole('button', { name: /^Targeting: Strong/ })).toBeVisible();
  await shot(page, 'hud', 4, 'upgraded');

  // Sell: the tower goes, or (until the sim implements sell, T105b) a notice says why not.
  await panel.getByRole('button', { name: /^Sell for \d+ credits/ }).click();
  await expect
    .poll(async () => {
      if ((await liveTowers(page)).length === 0) return 'sold';
      return (await page.getByText('Not online yet').count()) > 0 ? 'notice' : 'waiting';
    })
    .not.toBe('waiting');
  await shot(page, 'hud', 5, 'after-sell');
});

test('hud: keyboard shortcuts, speed controls, and the wave call', async ({ page }) => {
  await open(page);
  const pause = page.getByRole('button', { name: 'Pause' });
  const normal = page.getByRole('button', { name: 'Normal speed' });
  const fast = page.getByRole('button', { name: 'Double speed' });
  await expect(normal).toHaveAttribute('aria-pressed', 'true');

  // Speed: 2× by the button, F back to 1×, Space pauses (the tick stops), Space resumes.
  await fast.click();
  await expect(fast).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('KeyF');
  await expect(normal).toHaveAttribute('aria-pressed', 'true');
  // Focus is on a HUD button: Space still goes to the game, not the button (keyboard routing).
  await page.keyboard.press('Space');
  await expect(pause).toHaveAttribute('aria-pressed', 'true');
  const t = await page.evaluate(() => globalThis.__sd?.state()?.tick);
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => globalThis.__sd?.state()?.tick)).toBe(t);

  // 1–4 arm build slots; the same key again disarms; an empty slot does nothing.
  const slot1 = page.getByRole('button', { name: /^Build Rivet/ });
  const slot2 = page.getByRole('button', { name: /^Build Thumper/ });
  await page.keyboard.press('Digit2');
  await expect(slot2).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Digit1');
  await expect(slot1).toHaveAttribute('aria-pressed', 'true');
  await expect(slot2).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('Digit1');
  await expect(slot1).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('Digit4');
  await expect(page.getByRole('button', { pressed: true, name: /^Build/ })).toHaveCount(0);

  // Build two by keyboard + clicks; right-click disarms.
  await page.keyboard.press('Digit2');
  const b = await tileClient(page, PAD_B);
  await page.mouse.click(b.x, b.y);
  await expect.poll(async () => (await liveTowers(page)).length).toBe(1);
  await page.mouse.click(b.x, b.y, { button: 'right' });
  await expect(slot2).toHaveAttribute('aria-pressed', 'false');

  // Spend down until Thumper is unaffordable: its slot shows it and won't arm.
  await page.keyboard.press('Digit1');
  const a = await tileClient(page, PAD_A);
  await page.mouse.click(a.x, a.y);
  await expect.poll(async () => (await liveTowers(page)).length).toBe(2);
  // 350 − 125 − 100 = 125 left: the Rivet slot stays armed (100 ≤ 125).
  await expect(slot1).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const sd = globalThis.__sd!; // installed
    const tower = sd.state()!.towers.items.find((x) => x.alive)!; // two are alive
    sd.enqueue({ type: 'upgrade', towerUid: tower.uid });
    sd.fastForward(0);
  });
  await expect(slot2).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('Digit2');
  await expect(slot2).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText('Not enough credits')).toBeVisible();
  await page.mouse.move(0, 0);
  await shot(page, 'hud', 6, 'unaffordable');

  // W starts wave 1 (or, until the sim implements waves, T105b, a notice says why not).
  await page.keyboard.press('KeyW');
  await page.evaluate(() => globalThis.__sd?.fastForward(0));
  await expect
    .poll(async () => {
      if ((await page.evaluate(() => globalThis.__sd?.state()?.wave ?? 0)) > 0) return 'started';
      return (await page.getByText('Not online yet').count()) > 0 ? 'notice' : 'waiting';
    })
    .not.toBe('waiting');
  await shot(page, 'hud', 7, 'wave-call');
});
