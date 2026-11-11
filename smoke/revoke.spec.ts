// T606: the Clean Exit on the dev revoke range (`?map=dev_revoke`, render/__fixtures__/devM6.ts).
// Two Rivets out-invest the Sprinkler; 5 s into W2's drone column the cue revokes the Rivet class
// (both fold away under a LICENSE REVOKED stamp for 1 s, refunded in full), the slot-1 strike (its
// slot goes dark: REVOKED), and QUILL locks the preview (W3's countdown reads ACCESS RESTRICTED).
// The Rivet's build slot is dead after it: 1 says so and arms nothing. Screenshots via shot()
// (smoke/out.ts): look at the stamp, the slots, and the preview.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

type Cond = 'revoked' | 'countdown3';

/** Steps the sim a tick at a time (calling W2 the moment it can) until `cond` holds. */
const until = (page: Page, cond: Cond) =>
  page.evaluate((c) => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    const done = (): boolean => {
      const s = sd.state()!;
      if (s.outcome !== 'playing') return true;
      if (c === 'revoked') return s.revoked.towers.length > 0;
      return s.wave === 2 && s.schedule.phase === 'countdown';
    };
    for (let k = 0; k < 20_000 && !done(); k++) {
      const s = sd.state()!;
      if (s.wave === 1 && s.schedule.phase === 'countdown') sd.enqueue({ type: 'callWave' });
      sd.fastForward(1);
    }
    const s = sd.state()!;
    return {
      outcome: s.outcome,
      wave: s.wave,
      credits: s.credits,
      towers: [...s.revoked.towers],
      abilities: [...s.revoked.abilities],
      lockout: s.scriptModifiers.quillLockout,
      live: s.towers.live,
    };
  }, cond);

test('revoke: the Clean Exit folds the Rivets under a stamp, darkens the strike, and locks the preview', async ({
  page,
}) => {
  await page.goto('/?test=1&map=dev_revoke&seed=1');
  await waitForReady(page);
  const before = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.enqueue({ type: 'build', tower: 'rivet', tile: [7, 2] });
    sd.enqueue({ type: 'build', tower: 'rivet', tile: [12, 4] });
    sd.enqueue({ type: 'build', tower: 'sprinkler', tile: [7, 4] });
    sd.enqueue({ type: 'build', tower: 'zapcoil', tile: [5, 2] });
    sd.fastForward(1);
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
    return { credits: sd.state()!.credits, live: sd.state()!.towers.live };
  });
  expect(before.live).toBe(4);
  await nextFrames(page);

  // The cue: the Rivet class folds away (refunded), the strike's uplink goes, QUILL locks out.
  const cue = await until(page, 'revoked');
  expect(cue).toMatchObject({
    outcome: 'playing',
    wave: 2,
    towers: ['rivet'],
    abilities: ['dev_strike'],
    lockout: true,
    live: 2,
  });
  await nextFrames(page);
  const look = await page.evaluate(() => globalThis.__sd!.render()!.revoked);
  expect(look).toEqual({ shown: 2, played: 2 });
  await expect(page.getByTestId('slot-revoked')).toBeVisible();
  await expect(page.getByTestId('ability-1-revoked')).toBeVisible();
  await expect(page.getByTestId('ability-1')).toHaveAttribute('aria-label', /uplink revoked/);
  await shot(page, 'revoke', 1, 'stamp');

  // The Rivet's slot is dead: 1 says why and arms nothing; the strike's Q too.
  await page.keyboard.press('1');
  await expect(page.getByTestId('hud-notice')).toHaveText('License revoked');
  await page.keyboard.press('q');
  await expect(page.getByTestId('hud-notice')).toHaveText('Uplink revoked');

  // The stamps last 1 s of real time, then the towers fold away.
  await expect
    .poll(() => page.evaluate(() => globalThis.__sd!.render()!.revoked.shown), { timeout: 3000 })
    .toBe(0);

  // W3's countdown: the preview reads ACCESS RESTRICTED, never the drones.
  const next = await until(page, 'countdown3');
  expect(next).toMatchObject({ outcome: 'playing', wave: 2 });
  await expect(page.getByTestId('preview-restricted')).toHaveText('ACCESS RESTRICTED');
  await expect(page.locator('.hud-preview-group')).toHaveCount(0);
  await nextFrames(page);
  await shot(page, 'revoke', 2, 'restricted');
});
