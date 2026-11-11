// T707: Everglow's jammers on their dev range (`?map=dev_takeover`, render/__fixtures__/devM7.ts).
// The Auditor's ring (JamRingView: a faint orange outline of its reach and an orange ring growing
// out to it, then the towers it reached Jammed), then "Shareholder Value" under par's four
// Railspikes: the hangar door opening over the platform before its drones launch, Hostile
// Takeover's red laser and reticle on the tower it picked (TakeoverView), and the jettison's four
// plates on the crash markers. Screenshots in <out>/screens/takeover/ (look at them: the ring, the
// laser and its reticle, and the plates are the point).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

type Probe = 'ring' | 'door' | 'laser' | 'jettison';

/** Steps the sim a tick at a time (up to `max`) until `what` shows in the sim state. */
async function until(page: Page, what: Probe, max = 6000): Promise<boolean> {
  const hit = await page.evaluate(
    ([probe, limit]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      const seen = (): boolean => {
        const st = sd.state()!;
        return st.enemies.items.some((e) => {
          if (!e.alive || e.def === null) return false;
          if (probe === 'ring') return e.def.jam?.kind === 'ring' && e.jamTellTicks > 0;
          if (probe === 'laser') return e.jamTellTicks > 0 && e.takeoverTowers.length > 0;
          if (probe === 'jettison') return e.jettisoned;
          const phase = e.def.boss?.phases[e.bossPhase - 1] ?? null;
          return (
            (phase?.hangar ?? null) !== null &&
            e.invulnerableTicks === 0 &&
            e.abilityTicks > 0 &&
            e.abilityTicks <= 60
          );
        });
      };
      for (let k = 0; k < limit; k++) {
        if (seen()) return true;
        sd.fastForward(1);
      }
      return seen();
    },
    [what, max] as const,
  );
  await nextFrames(page);
  return hit;
}

const look = (page: Page) => page.evaluate(() => globalThis.__sd!.render()!.everglowJams);

test('takeover: the Auditor’s ring', async ({ page }) => {
  await page.goto('/?test=1&map=dev_takeover&seed=1');
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    // Plain Rivets beside the road: the Auditors live long enough to ring.
    sd.enqueue({ type: 'build', tower: 'choir', tile: [7, 2] });
    sd.enqueue({ type: 'build', tower: 'rivet', tile: [5, 2] });
    sd.enqueue({ type: 'build', tower: 'rivet', tile: [3, 2] });
    sd.enqueue({ type: 'build', tower: 'rivet', tile: [12, 4] });
    sd.fastForward(1);
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
  });
  expect(await until(page, 'ring', 1800)).toBe(true);
  await page.evaluate(() => globalThis.__sd!.fastForward(70)); // most of the way out
  await nextFrames(page);
  expect(await look(page)).toMatchObject({ rings: 1, ringsSeen: 1 });
  await shot(page, 'takeover', 1, 'ring');
  await page.evaluate(() => globalThis.__sd!.fastForward(60)); // landed
  await nextFrames(page);
  expect(await page.evaluate(() => globalThis.__sd!.render()!.jams.jammed)).toBeGreaterThan(0);
  await shot(page, 'takeover', 2, 'ring-jammed');
});

test('takeover: the hangar, Hostile Takeover’s laser, and the jettison’s plates', async ({
  page,
}) => {
  await page.goto('/?test=1&map=dev_takeover&seed=1');
  await waitForReady(page);
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    const at = (c: number, r: number) =>
      sd.state()!.towers.items.find((t) => t.alive && t.col === c && t.row === r)!.uid;
    for (const [c, r] of [
      [5, 2],
      [7, 4],
      [3, 2],
      [12, 4],
      [12, 2],
    ] as const) {
      sd.enqueue({ type: 'build', tower: 'rivet', tile: [c, r] });
    }
    sd.enqueue({ type: 'build', tower: 'choir', tile: [7, 2] });
    sd.fastForward(1);
    for (const [c, r] of [
      [5, 2],
      [7, 4],
      [3, 2],
      [12, 2],
    ] as const) {
      sd.enqueue({ type: 'upgrade', towerUid: at(c, r) });
      sd.fastForward(1);
      sd.enqueue({ type: 'upgrade', towerUid: at(c, r) });
      sd.fastForward(1);
      sd.enqueue({ type: 'specialize', towerUid: at(c, r), spec: 'b' });
      sd.fastForward(1);
    }
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
  });
  // W1's Auditors fall; call W2 (the boss) as soon as it can be.
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    for (let k = 0; k < 1200 && sd.state()!.wave < 2; k++) {
      if (sd.state()!.schedule.phase === 'countdown') sd.enqueue({ type: 'callWave' });
      sd.fastForward(1);
    }
  });

  // Phase 1: the hangar door opens over the platform before a launch.
  expect(await until(page, 'door')).toBe(true);
  await page.evaluate(() => globalThis.__sd!.fastForward(40)); // the door nearly open
  await nextFrames(page);
  expect((await look(page)).doors).toBe(1);
  await shot(page, 'takeover', 3, 'hangar-door');

  // Phase 2: the laser and its reticle on the tower it picked.
  expect(await until(page, 'laser')).toBe(true);
  await page.evaluate(() => globalThis.__sd!.fastForward(120)); // two thirds in: wide, closing
  await nextFrames(page);
  expect(await look(page)).toMatchObject({ lasers: 1, lasersSeen: 1 });
  await shot(page, 'takeover', 4, 'laser');

  // Phase 3: the jettison; four plates on the crash markers.
  expect(await until(page, 'jettison')).toBe(true);
  await page.evaluate(() => globalThis.__sd!.fastForward(2));
  await nextFrames(page);
  expect(await look(page)).toMatchObject({ plates: 4, jettisons: 1, lasers: 0 });
  await shot(page, 'takeover', 5, 'plates');
});
