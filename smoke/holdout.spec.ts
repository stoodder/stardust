// T605: the Holdout on its dev range (`?map=dev_holdout`, render/__fixtures__/devM6.ts): the
// convoy (the first door with no save) walks to its door while Motes come down the choke past
// Bricks, who holds two at a time under a health bar that drains on the wave timeline. As W3
// starts the SEAL is forced: play freezes (the sim keeps ticking), the HUD's controls lock, and one
// button is live once armed; pressing it ends the map won. Screenshots via shot() (smoke/out.ts).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

/** Fast-forwards a tick at a time until `cond` holds or the map ends; returns the numbers. */
const until = (page: Page, cond: 'held' | 'sealed') =>
  page.evaluate((c) => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    const done = (): boolean => {
      const s = sd.state()!;
      if (s.outcome !== 'playing') return true;
      if (c === 'held') return s.enemies.items.some((e) => e.alive && e.blockerUid !== 0);
      return s.pendingInput !== null;
    };
    for (let k = 0; k < 20_000 && !done(); k++) sd.fastForward(1);
    const s = sd.state()!;
    const bricks = s.allies.items.find((a) => a.alive && a.kind === 'bricks');
    return {
      outcome: s.outcome,
      tick: s.tick,
      wave: s.wave,
      pending: s.pendingInput,
      health: bricks?.health ?? -1,
      blocking: bricks?.blocking ?? -1,
    };
  }, cond);

test('holdout: Bricks holds the choke on his timeline; the SEAL freezes play until it is pressed', async ({
  page,
}) => {
  await page.goto('/?test=1&map=dev_holdout&seed=1');
  await waitForReady(page);
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
  });

  // Motes reach Bricks: he holds them (his bar over him, a bracket under each).
  const held = await until(page, 'held');
  expect(held).toMatchObject({ outcome: 'playing', pending: null });
  expect(held.blocking).toBeGreaterThan(0);
  await nextFrames(page);
  const look = await page.evaluate(() => globalThis.__sd!.render()!.blocker);
  expect(look.shown).toBe(1);
  expect(look.holding).toBeGreaterThan(0);
  await shot(page, 'holdout', 1, 'held');

  // W3 starts: the SEAL. Bricks is on his 5% floor; the one button is live and focused.
  const sealed = await until(page, 'sealed');
  expect(sealed).toMatchObject({ outcome: 'playing', wave: 3, pending: 'seal', health: 0.05 });
  const seal = page.getByTestId('forced-input');
  await expect(seal).toBeVisible();
  await expect(seal).toHaveText('SEAL');
  await expect(seal).toBeFocused();
  // Every HUD control but the Menu and the speaker is locked (T614; smoke/seal.spec.ts has the rest).
  await expect(page.locator('.hud-lock').first()).toHaveAttribute('inert', '');
  // It takes a press only once armed (700 ms; app/forcedInput.ts).
  await expect(seal).toHaveAttribute('data-armed', 'true');

  // Frozen: the sim ticks on, and nothing moves or starts.
  const frozen = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    const dists = () =>
      sd
        .state()!
        .enemies.items.filter((e) => e.alive)
        .map((e) => e.dist)
        .join(',');
    const before = { tick: sd.state()!.tick, dists: dists(), wave: sd.state()!.wave };
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(120);
    const s = sd.state()!;
    return { ticked: s.tick - before.tick, same: dists() === before.dists, wave: s.wave };
  });
  expect(frozen).toEqual({ ticked: 120, same: true, wave: 3 });
  // The bar catches up with the sim over BAR_EASE_MS of real time: down to the floor, red.
  await expect
    .poll(() => page.evaluate(() => globalThis.__sd!.render()!.blocker.health))
    .toBeCloseTo(0.05, 6);
  await nextFrames(page);
  await shot(page, 'holdout', 2, 'seal');

  // The press ends the map, won.
  await seal.click();
  const end = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.fastForward(1);
    const s = sd.state()!;
    return { outcome: s.outcome, pending: s.pendingInput, resolved: [...s.forcedResolved] };
  });
  expect(end).toEqual({ outcome: 'won', pending: null, resolved: ['seal'] });
});
