// D150, D151: a cancelled jam tell reads. On the dev ranges, System Reboot cast during a
// Silencer's tendril (`dev_silence`) dooms it: it snaps off at once with a violet puff and FIZZLED
// rising where its tip was (JamView; jamLook.ts `tellDoomed`). An Auditor's ring (`dev_takeover`
// W1) draws on through its tell after a Reboot (a tower built in its reach could still be jammed)
// and fizzles over the Auditor on its landing tick, having jammed nothing (`ringLanded`). Hostile
// Takeover's laser (W2's "Shareholder Value") spent by a Reboot goes out and fizzles over the boss
// (`lasersDoomed`). FIZZLED holds whole 0.8 s. Screenshots in <out>/screens/jam-fizzle/ (look at
// them: FIZZLED over the Act III ground at 1× is the point).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

type Kind = 'tendril' | 'ring';

/** Steps the sim a tick at a time (up to `max`) until a `kind` tell is under way. */
async function untilTell(page: Page, kind: Kind, max = 1800): Promise<boolean> {
  const hit = await page.evaluate(
    ([k, limit]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      const st = sd.state()!;
      const seen = (): boolean =>
        st.enemies.items.some(
          (e) =>
            e.alive &&
            e.jamTellTicks > 0 &&
            (k === 'ring' ? e.def?.jam?.kind === 'ring' : e.jamTarget !== 0),
        );
      for (let i = 0; i < limit; i++) {
        if (seen()) return true;
        sd.fastForward(1);
      }
      return seen();
    },
    [kind, max] as const,
  );
  await nextFrames(page);
  return hit;
}

async function setUp(page: Page, map: string, towers: [string, number, number][]): Promise<void> {
  await page.goto(`/?test=1&map=${map}&seed=1`);
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate((list) => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    for (const [tower, c, r] of list) sd.enqueue({ type: 'build', tower, tile: [c, r] });
    sd.fastForward(1);
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
  }, towers);
}

/** Casts System Reboot (slot 1) and lets a couple of frames draw. */
async function reboot(page: Page): Promise<void> {
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.enqueue({ type: 'ability', slot: 1 });
    sd.fastForward(1);
  });
  await nextFrames(page);
}

const look = (page: Page) =>
  page.evaluate(() => {
    const r = globalThis.__sd!.render()!;
    return { ...r.jams, rings: r.everglowJams.rings };
  });

test('jam fizzle: a Reboot in the tendril’s tell snaps it off with FIZZLED', async ({ page }) => {
  await setUp(page, 'dev_silence', [
    ['choir', 7, 2],
    ['rivet', 12, 2],
  ]);
  expect(await untilTell(page, 'tendril')).toBe(true);
  await page.evaluate(() => globalThis.__sd!.fastForward(60)); // halfway: a long tendril
  await nextFrames(page);
  expect(await look(page)).toMatchObject({ tells: 1, fizzles: 0 });
  await shot(page, 'jam-fizzle', 1, 'tendril');
  await reboot(page);
  expect(await look(page)).toMatchObject({ tells: 0, fizzles: 1, jammed: 0 });
  await shot(page, 'jam-fizzle', 2, 'tendril-fizzled');
  // The doomed tell runs out on nothing: no jam lands, and it fizzles only once.
  await page.evaluate(() => globalThis.__sd!.fastForward(90));
  await nextFrames(page);
  expect(await look(page)).toMatchObject({ jamsSeen: 0, jammed: 0, fizzles: 1 });
});

test('jam fizzle: a Reboot in the Auditor’s ring stops the ring with FIZZLED', async ({ page }) => {
  await setUp(page, 'dev_takeover', [
    ['choir', 7, 2],
    ['rivet', 5, 2],
    ['rivet', 3, 2],
    ['rivet', 12, 4],
  ]);
  expect(await untilTell(page, 'ring')).toBe(true);
  await page.evaluate(() => globalThis.__sd!.fastForward(40));
  await nextFrames(page);
  expect(await look(page)).toMatchObject({ rings: 1, fizzles: 0 });
  await shot(page, 'jam-fizzle', 3, 'ring');
  await reboot(page);
  // The ring draws on: nothing is called before it lands.
  expect(await look(page)).toMatchObject({ rings: 1, fizzles: 0 });
  // To its landing tick: it lands on nothing and fizzles over the Auditor, once.
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    const ringing = (): boolean =>
      sd
        .state()!
        .enemies.items.some((e) => e.alive && e.def?.jam?.kind === 'ring' && e.jamTellTicks > 0);
    for (let k = 0; k < 600 && ringing(); k++) sd.fastForward(1);
  });
  await nextFrames(page);
  expect(await look(page)).toMatchObject({ rings: 0, fizzles: 1, jamsSeen: 0, jammed: 0 });
  await shot(page, 'jam-fizzle', 4, 'ring-fizzled');
  await page.evaluate(() => globalThis.__sd!.fastForward(90));
  await nextFrames(page);
  expect(await look(page)).toMatchObject({ jamsSeen: 0, jammed: 0, fizzles: 1 });
});

test('jam fizzle: a Reboot in Hostile Takeover’s laser puts it out with FIZZLED', async ({
  page,
}) => {
  await page.goto('/?test=1&map=dev_takeover&seed=1');
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  // takeover.spec's build: four specialized Rivets, a Rivet by the column, a Choir.
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    const at = (c: number, r: number) =>
      sd.state()!.towers.items.find((t) => t.alive && t.col === c && t.row === r)!.uid;
    const rivets = [
      [5, 2],
      [7, 4],
      [3, 2],
      [12, 4],
      [12, 2],
    ] as const;
    for (const [c, r] of rivets) sd.enqueue({ type: 'build', tower: 'rivet', tile: [c, r] });
    sd.enqueue({ type: 'build', tower: 'choir', tile: [7, 2] });
    sd.fastForward(1);
    for (const [c, r] of rivets.filter(([x, y]) => !(x === 12 && y === 4))) {
      sd.enqueue({ type: 'upgrade', towerUid: at(c, r) });
      sd.fastForward(1);
      sd.enqueue({ type: 'upgrade', towerUid: at(c, r) });
      sd.fastForward(1);
      sd.enqueue({ type: 'specialize', towerUid: at(c, r), spec: 'b' });
      sd.fastForward(1);
    }
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
    const lasing = (): boolean =>
      sd
        .state()!
        .enemies.items.some((e) => e.alive && e.jamTellTicks > 0 && e.takeoverTowers.length > 0);
    for (let k = 0; k < 60 * 600 && !lasing(); k++) {
      if (sd.state()!.wave < 2 && sd.state()!.schedule.phase === 'countdown') {
        sd.enqueue({ type: 'callWave' });
      }
      sd.fastForward(1);
    }
    sd.fastForward(40);
  });
  await nextFrames(page);
  const laser = () => page.evaluate(() => globalThis.__sd!.render()!.everglowJams.lasers);
  expect(await laser()).toBeGreaterThan(0);
  const before = await look(page);
  await shot(page, 'jam-fizzle', 5, 'laser');
  await reboot(page);
  expect(await laser()).toBe(0);
  expect(await look(page)).toMatchObject({ fizzles: before.fizzles + 1 });
  await shot(page, 'jam-fizzle', 6, 'laser-fizzled');
  // The spent laser runs out on nothing, and fizzles only once.
  await page.evaluate(() => globalThis.__sd!.fastForward(150));
  await nextFrames(page);
  expect(await look(page)).toMatchObject({
    jamsSeen: before.jamsSeen,
    fizzles: before.fizzles + 1,
  });
});
