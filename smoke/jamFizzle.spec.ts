// D150: a cancelled jam tell reads. On the dev ranges, System Reboot cast during a Silencer's
// tendril (`dev_silence`) and during an Auditor's ring (`dev_takeover` W1) dooms the tell: it snaps
// off at once (no tendril, no ring drawn) with a violet puff and FIZZLED rising where it was
// (JamView; jamLook.ts `tellDoomed`, `ringDoomed`), and nothing is Jammed. Screenshots in
// <out>/screens/jam-fizzle/ (look at them: FIZZLED over the Act III ground at 1× is the point).
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
  expect(await look(page)).toMatchObject({ rings: 0, fizzles: 1 });
  await shot(page, 'jam-fizzle', 4, 'ring-fizzled');
  await page.evaluate(() => globalThis.__sd!.fastForward(90));
  await nextFrames(page);
  expect(await look(page)).toMatchObject({ jamsSeen: 0, jammed: 0 });
});
