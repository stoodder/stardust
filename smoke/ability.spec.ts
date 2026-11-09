// The commander ability flow (T113): aim the slot-1 strike from the HUD (and cancel with Esc), fire
// it by a real click on a tile while paused, fast-forward through the reticle to the impact, and
// check the slot recharges. Screenshots in test-results/screens/ability/. Runs on A1M1 (the
// default battle, app/battleSetup.ts), whose par build equips a strike in slot 1.
import { DEFAULT_MAP_ID } from '../src/app/battleSetup.ts';
import { expect, test } from './fixtures.ts';
import { shot, waitForReady } from './hooks.ts';

/** A tile on A1M1's road, a fallback target when no enemy is on the field yet. */
const ROAD_TILE = [4, 2] as const;

test('ability: aim from the HUD, fire at a tile, see the strike land and recharge', async ({
  page,
}) => {
  await page.goto(`/?test=1&map=${DEFAULT_MAP_ID}&seed=1`);
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  // The briefing opens first, with its button focused: Enter clocks in.
  await expect(page.getByRole('dialog', { name: 'Shift briefing' })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Shift briefing' })).toBeHidden();
  const bar = page.getByRole('navigation', { name: 'Abilities' });
  const slot = bar.getByRole('button');
  await expect(slot).toHaveAttribute('aria-label', /, ready$/);

  // Start wave 1 and let it walk in, so the strike has something to hit (if waves are online).
  await page.evaluate(() => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    sd.setSpeed(0);
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(300);
  });

  // Q aims, Esc cancels.
  await page.keyboard.press('KeyQ');
  await expect(slot).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(slot).toHaveAttribute('aria-pressed', 'false');

  // Aim by the HUD button: the hint shows, and the reticle follows the pointer.
  await slot.click();
  await expect(slot).toHaveAttribute('aria-pressed', 'true');
  await expect(bar.getByRole('status')).toContainText('Pick a target');
  const tile = await page.evaluate(
    ([fc, fr]) => {
      const s = globalThis.__sd?.state();
      const e = s?.enemies.items.find((x) => x.alive);
      return e === undefined ? [fc, fr] : [Math.floor(e.x), Math.floor(e.y)];
    },
    [ROAD_TILE[0], ROAD_TILE[1]] as const,
  );
  const p = await page.evaluate(([c, r]) => globalThis.__sd?.tileToClient(c!, r!) ?? null, tile);
  expect(p).not.toBeNull();
  await page.mouse.move(p!.x, p!.y); // checked just above
  await shot(page, 'ability', 1, 'aiming');

  // Fire by a real click while paused: the host applies it at the end of the next frame.
  await page.mouse.click(p!.x, p!.y);
  await expect(slot).toHaveAttribute('aria-pressed', 'false');
  await expect
    .poll(() => page.evaluate(() => globalThis.__sd?.state()?.stats.abilityUses ?? 0))
    .toBe(1);
  const cast = await page.evaluate(() => {
    const s = globalThis.__sd!.state()!; // a battle is running
    return { cooldown: s.abilityCooldownTicks[0] ?? 0, zones: s.zones.live };
  });
  expect(cast.cooldown).toBeGreaterThan(0);
  expect(cast.zones).toBe(1);
  await expect(slot).toHaveAttribute('aria-label', /recharging/);
  await page.mouse.move(0, 0);
  await shot(page, 'ability', 2, 'reticle');

  // Q while recharging explains itself instead of aiming.
  await page.keyboard.press('KeyQ');
  await expect(slot).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText('Recharging')).toBeVisible();

  // Through the 1 s reticle to the impact: the zone resolves and the effect plays.
  await page.evaluate(() => globalThis.__sd?.fastForward(61));
  await expect.poll(() => page.evaluate(() => globalThis.__sd?.state()?.zones.live)).toBe(0);
  await page.waitForTimeout(60);
  await shot(page, 'ability', 3, 'impact');
  await page.waitForTimeout(250);
  await shot(page, 'ability', 4, 'after');

  // The cooldown runs on sim time: 10 s later the slot counts 10 s less. (The ready state is
  // unit-tested in app/hud.test.ts; playing out the full 45 s here may end the map first.)
  const before = await page.evaluate(() => globalThis.__sd!.state()!.abilityCooldownTicks[0]!);
  await page.evaluate(() => globalThis.__sd?.fastForward(600));
  const secs = Math.ceil((before - 600) / 60);
  await expect(slot).toHaveAttribute('aria-label', new RegExp(`, recharging, ${secs} s$`));
});
