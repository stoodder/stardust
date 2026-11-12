// T808: the Unsung on its dev range (`?map=dev_phases`, render/__fixtures__/devM8.ts), its minimal
// view (render/views/UnsungView.ts). Par's towers and a ring of Rivets go up; the choir walks to
// the Halls and Phase 2 begins, and the Unsung, held at the song's edge, has the countdown under
// its boss bar (the HUD's finale clock, T832). Its HP is set by hand to each phase's edge (the
// fixture's towers can't burn 30000) so the flow sees every form: the split's three parts, the rise, a dig
// toward the choir (a violet ring on the singers' ground, tightening, then blinking through the
// surfacing tell), the Song's call at the Halls, and Dawn, where it is laid to rest. Screenshots
// in <out>/screens/unsung/ (look at them: the ring under the singers and the countdown are the point).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

type Probe = 'unsung' | 'parts' | 'risen' | 'dig' | 'surfaceTell' | 'surfaced' | 'call' | 'gone';

/**
 * Steps the sim a tick at a time (pressing "Who's there?" when Directive 0 asks, calling waves)
 * until `what` shows (up to `max` ticks); returns whether it did.
 */
async function until(page: Page, what: Probe, max = 12_000): Promise<boolean> {
  const hit = await page.evaluate(
    ([probe, limit]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      // Sim state only: the view's numbers update on frames, not on fast-forwarded ticks.
      const seen = (): boolean => {
        const s = sd.state()!;
        const boss = s.enemies.items.find((e) => e.alive && e.def?.id === 'unsung');
        if (probe === 'unsung') return boss !== undefined && s.phase === 2;
        if (probe === 'parts') {
          return s.enemies.items.some((e) => e.alive && e.def?.id === 'unsung_part');
        }
        if (probe === 'risen') return boss !== undefined && boss.bossPhase === 3;
        if (probe === 'dig') return boss?.burrowed === true && boss.digToDist >= 0;
        if (probe === 'surfaceTell') {
          return boss?.burrowed === true && boss.digToDist >= 0 && boss.abilityTicks <= 60;
        }
        if (probe === 'surfaced') return boss?.burrowed === false && boss.abilityCount === 1;
        if (probe === 'call') {
          return boss?.bossPhase === 4 && boss.invulnerableTicks === 0 && boss.abilityTicks <= 60;
        }
        return boss === undefined && s.phase === 3;
      };
      for (let k = 0; k < limit && !seen(); k++) {
        const s = sd.state()!;
        if (s.outcome !== 'playing') break;
        if (s.pendingInput !== null) sd.enqueue({ type: 'scriptInput', id: 'whos_there' });
        if (s.schedule.phase === 'countdown') sd.enqueue({ type: 'callWave' });
        sd.fastForward(1);
      }
      return seen();
    },
    [what, max] as const,
  );
  await nextFrames(page);
  return hit;
}

/** Sets the Unsung's (or each part's) HP to just above `pct` of its max, so the next hit crosses. */
async function edge(page: Page, id: 'unsung' | 'unsung_part', pct: number): Promise<void> {
  await page.evaluate(
    ([enemy, share]) => {
      for (const e of globalThis.__sd!.state()!.enemies.items) {
        if (!e.alive || e.def?.id !== enemy) continue;
        const max = e.def.hp + e.bonusMaxHp;
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a test reaches into the sim
        (e as { hp: number }).hp = share * max + 1;
      }
    },
    [id, pct] as const,
  );
}

const view = (page: Page) => page.evaluate(() => globalThis.__sd!.render()!.unsung);

test('unsung: held at the Halls, split, risen, a dig toward the choir, the call, laid to rest', async ({
  page,
}) => {
  await page.goto('/?test=1&map=dev_phases&seed=1');
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.enqueue({ type: 'build', tower: 'zapcoil', tile: [4, 3] });
    for (const [c, r] of [
      [8, 3],
      [4, 1],
      [8, 1],
      [8, 5],
      [4, 5],
    ] as const) {
      sd.enqueue({ type: 'build', tower: 'rivet', tile: [c, r] });
    }
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
  });

  // Phase 2: the Unsung held at the song's edge, the countdown on the HUD's clock under its bar.
  expect(await until(page, 'unsung')).toBe(true);
  await page.evaluate(() => globalThis.__sd!.fastForward(120));
  await nextFrames(page);
  // The countdown under its bar: the HUD's finale clock, its gold bar the song's rest (T832).
  await expect(page.locator('[data-testid="finale-clock"][data-kind="counter"]')).toBeVisible();
  expect(await page.evaluate(() => globalThis.__sd!.render()!.bossBar)).toBeGreaterThan(0);
  await shot(page, 'unsung', 1, 'held');

  // The split: three parts, no merge.
  await edge(page, 'unsung', 0.75);
  expect(await until(page, 'parts')).toBe(true);
  await page.evaluate(() => globalThis.__sd!.fastForward(10));
  await nextFrames(page);
  await shot(page, 'unsung', 2, 'split');

  // The rise: the last part's fall raises it in phase 3.
  await edge(page, 'unsung_part', 0);
  expect(await until(page, 'risen')).toBe(true);
  expect((await view(page)).risesSeen).toBe(1);
  await shot(page, 'unsung', 3, 'risen');

  // A dig toward the choir: the ring on the singers' ground, then its surfacing tell.
  expect(await until(page, 'dig')).toBe(true);
  await page.evaluate(() => globalThis.__sd!.fastForward(30));
  await nextFrames(page);
  expect((await view(page)).digs).toBe(1);
  await shot(page, 'unsung', 4, 'dig');
  expect(await until(page, 'surfaceTell')).toBe(true);
  expect((await view(page)).surfaceTells).toBe(1);
  await shot(page, 'unsung', 5, 'surface-tell');
  expect(await until(page, 'surfaced')).toBe(true);
  expect(await view(page)).toMatchObject({ digs: 0, surfacesSeen: 1 });

  // The Song: its call at the Halls.
  await edge(page, 'unsung', 0.25);
  expect(await until(page, 'call')).toBe(true);
  expect((await view(page)).calls).toBe(1);
  await shot(page, 'unsung', 6, 'call');

  // Dawn: laid to rest when the countdown completes.
  await page.evaluate(() => {
    const s = globalThis.__sd!.state()!;
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a test reaches into the sim
    (s as { restPoints: number }).restPoints = s.restTarget;
  });
  expect(await until(page, 'gone', 120)).toBe(true);
  await shot(page, 'unsung', 7, 'dawn');
});
