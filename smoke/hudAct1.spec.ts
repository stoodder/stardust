// T312c: the Act I HUD. On the dev sky range (`?map=dev_sky`): the wave preview's NEW tags and the
// callsign plate, Gerald making Hold (all) pulse with its hint until it's used, and QUILL's Time
// Dilation cast from its slot with one press. On the dev market (`?map=dev_market`, dev_range with
// Zibzab): Clearance Sale's prices on the build slots and the tower panel, its tag, and its charges
// and wave cooldown on the slot. Screenshots in test-results/screens/hud-act1/ (look at them).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

async function open(page: Page, map: string): Promise<void> {
  await page.goto(`/?test=1&map=${map}&seed=1`);
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate(() => globalThis.__sd!.setSpeed(0)); // installed: waitForReady passed
}

/** Steps the sim a tick at a time (up to `max`) until a neutral unit (Gerald) is out. */
async function untilGerald(page: Page, max = 600): Promise<boolean> {
  const out = await page.evaluate((limit) => {
    const sd = globalThis.__sd!;
    const pool = sd.state()!.enemies;
    const geraldOut = (): boolean => {
      for (let i = 0; i < pool.used; i++) {
        const e = pool.items[i]!;
        if (e.alive && e.def?.id === 'gerald') return true;
      }
      return false;
    };
    for (let k = 0; k < limit; k++) {
      sd.fastForward(1);
      if (geraldOut()) return true;
    }
    return false;
  }, max);
  await nextFrames(page);
  return out;
}

test('hud act1: NEW tags, the plate, the Gerald pulse, and Time Dilation on a press', async ({
  page,
}) => {
  await open(page, 'dev_sky');
  // No save: every type in W1 is new to this player, and the plate falls back to Sprout.
  const preview = page.getByRole('list', { name: 'Next: wave 1' });
  await expect(preview.locator('.hud-preview-group.new')).toHaveCount(3);
  await expect(preview.getByLabel(/^1 Gerald, new/)).toBeVisible();
  await expect(page.getByTestId('callsign-plate')).toHaveText(/JPT-1 · Sprout/i);
  await page.mouse.move(0, 0);
  await shot(page, 'hud-act1', 1, 'new-tags-plate');

  // Gerald flies: Hold (all) pulses and the hint says why, until the master switch is used.
  const holdAll = page.getByTestId('hold-fire-all');
  await expect(holdAll).not.toHaveClass(/pulse/);
  await page.evaluate(() => globalThis.__sd!.enqueue({ type: 'callWave' }));
  expect(await untilGerald(page)).toBe(true);
  await expect(holdAll).toHaveClass(/pulse/);
  await expect(page.getByTestId('hold-fire-hint')).toHaveText(/Gerald is the mail\. Hold fire/i);
  await shot(page, 'hud-act1', 2, 'gerald-pulse');
  await page.keyboard.press('Shift+H');
  await expect(holdAll).toHaveAttribute('aria-pressed', 'true');
  await expect(holdAll).not.toHaveClass(/pulse/);
  await expect(page.getByTestId('hold-fire-hint')).toHaveCount(0);
  // Released again, it stays quiet: it has been used this run.
  await page.keyboard.press('Shift+H');
  await expect(holdAll).toHaveAttribute('aria-pressed', 'false');
  await expect(holdAll).not.toHaveClass(/pulse/);

  // Time Dilation: E casts it at once (no aiming), even while paused.
  const td = page.getByTestId('ability-2');
  await expect(td).toHaveAttribute('aria-label', /^Time Dilation, ready, casts at once/);
  await page.keyboard.press('KeyE');
  await expect
    .poll(() => page.evaluate(() => globalThis.__sd!.state()!.abilityCooldownTicks[1] ?? 0))
    .toBeGreaterThan(0);
  await expect(td).toHaveAttribute('aria-label', /, recharging, \d+ s$/);
  await expect(page.locator('.hud-aim-hint')).toHaveCount(0);
  await page.evaluate(() => globalThis.__sd!.fastForward(20));
  await nextFrames(page);
  await shot(page, 'hud-act1', 3, 'time-dilation');
});

test('hud act1: Clearance Sale prices the slots and the panel', async ({ page }) => {
  await open(page, 'dev_market');
  const slot1 = page.getByRole('button', { name: /^Build Rivet/ });
  await expect(slot1).toHaveAttribute('aria-label', /^Build Rivet, 100 credits$/);
  await expect(page.getByTestId('sale-tag')).toHaveCount(0);

  // The sale: one press of E loads three charges at 40% off.
  await page.evaluate(() => globalThis.__sd!.enqueue({ type: 'callWave' }));
  await page.evaluate(() => globalThis.__sd!.fastForward(1));
  const sale = page.getByTestId('ability-2');
  await expect(sale).toHaveAttribute('aria-label', /^Clearance Sale, ready/);
  await page.keyboard.press('KeyE');
  await expect(page.getByTestId('sale-tag')).toHaveText(/Sale -40% x3/i);
  await expect(slot1).toHaveAttribute('aria-label', /^Build Rivet, 60 credits, on sale$/);
  await expect(sale).toHaveAttribute(
    'aria-label',
    /^Clearance Sale, recharging, 4 waves, 3 purchases left$/,
  );
  await page.mouse.move(0, 0);
  await shot(page, 'hud-act1', 4, 'sale-slots');

  // A build at the sale price spends a charge; the slot never refuses what the sale covers.
  const credits = await page.evaluate(() => globalThis.__sd!.state()!.credits);
  await slot1.click();
  const pad = await page.evaluate(() => globalThis.__sd!.tileToClient(3, 1));
  expect(pad).not.toBeNull();
  await page.mouse.click(pad!.x, pad!.y); // checked just above
  await expect
    .poll(() => page.evaluate(() => globalThis.__sd!.state()!.credits))
    .toBe(credits - 60);
  await expect(page.getByTestId('sale-tag')).toHaveText(/Sale -40% x2/i);
  await page.keyboard.press('Escape');

  // The tower panel prices its upgrade on sale too.
  await page.mouse.click(pad!.x, pad!.y); // checked above
  const panel = page.getByRole('region', { name: 'Rivet tower' });
  await expect(
    panel.getByRole('button', { name: /^Upgrade to tier 2, \d+ credits, on sale/ }),
  ).toBeVisible();
  await page.mouse.move(0, 0);
  await shot(page, 'hud-act1', 5, 'sale-panel');
});
