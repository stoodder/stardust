// T409: clickable world objects on the dev clickable range (`?map=dev_click`, render/__fixtures__/
// devBattle.ts): the Peeker's rock (9,6) is decor until W1 starts, then holds Pebble under a dashed
// gold outline with the pointer hand on hover. A click (or, keyboard-only, the tile cursor and
// Enter) issues `interact` into the command log and empties the rock; with no click, W1's clear
// interacts by fallback. While she can be reached and as she lifts, the rock sorts over the walkers
// round it and their health bars hide near it (D135). Screenshots in
// test-results/screens/clickable/.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

/** dev_click's `peeker` marker. */
const ROCK = [9, 6] as const;

/** The dev map, paused; W1 called and started when `start`. */
async function open(page: Page, start: boolean): Promise<void> {
  await page.goto('/?test=1&map=dev_click&seed=1');
  await waitForReady(page);
  await page.evaluate((go) => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    sd.setSpeed(0);
    if (!go) return;
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
  }, start);
  await nextFrames(page);
}

const clicks = (page: Page) =>
  page.evaluate(() => {
    const s = globalThis.__sd!.state()!;
    return {
      clickable: [...s.clickable],
      interacted: [...s.interacted],
      interacts: s.commandLog.filter((l) => l.cmd.type === 'interact').length,
    };
  });

/** The rock sorts raised over the walkers round it (D135). */
const raised = (page: Page) => page.evaluate(() => globalThis.__sd!.render()!.peekerRaised);

const pointer = (page: Page) => page.evaluate(() => document.querySelector('canvas')?.style.cursor);

async function rockClip(
  page: Page,
): Promise<{ x: number; y: number; width: number; height: number }> {
  const at = await page.evaluate(([c, r]) => globalThis.__sd!.tileToClient(c, r), ROCK);
  expect(at).not.toBeNull();
  return { x: at!.x - 70, y: at!.y - 60, width: 140, height: 100 };
}

test('clickable: the rock holds Pebble under the outline; a click reaches her', async ({
  page,
}) => {
  await open(page, false);
  const clip = await rockClip(page);
  expect(await clicks(page)).toEqual({ clickable: [], interacted: [], interacts: 0 });
  await page.screenshot({ path: 'test-results/screens/clickable/01-decor.png', clip });

  // W1 starts: the rock turns clickable.
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
  });
  await nextFrames(page);
  expect(await clicks(page)).toEqual({ clickable: ['peeker'], interacted: [], interacts: 0 });
  await expect(page.getByTestId('action-announce')).toHaveText(/^The Peeker's rock: within reach/);
  // Nothing draws over her while she can be reached (D134 K2): floaters and the name plate keep
  // clear of the armed rock.
  expect(await page.evaluate(() => globalThis.__sd!.render()!.keepClear)).toBe(1);
  expect(await raised(page)).toBe(true);
  const at = await page.evaluate(([c, r]) => globalThis.__sd!.tileToClient(c, r), ROCK);
  await page.mouse.move(at!.x, at!.y);
  await nextFrames(page);
  expect(await pointer(page)).toBe('pointer');
  await page.screenshot({ path: 'test-results/screens/clickable/02-holding.png', clip });
  await shot(page, 'clickable', 3, 'holding-field');

  // Armed or not, the click interacts: one `interact` in the log, and the rock stands empty.
  await page.keyboard.press('Digit1');
  await page.mouse.click(at!.x, at!.y);
  await page.evaluate(() => globalThis.__sd!.fastForward(0));
  await nextFrames(page);
  expect(await clicks(page)).toEqual({ clickable: [], interacted: ['peeker'], interacts: 1 });
  // As she lifts off the rock it's still kept clear (D134 K2), and still over the walkers (D135).
  expect(await page.evaluate(() => globalThis.__sd!.render()!.keepClear)).toBe(1);
  expect(await raised(page)).toBe(true);
  await page.mouse.move(at!.x + 1, at!.y);
  await nextFrames(page);
  expect(await pointer(page)).not.toBe('pointer');
  await page.screenshot({ path: 'test-results/screens/clickable/04-reached.png', clip });

  // A second click changes nothing: the rock is decor again.
  await page.mouse.click(at!.x, at!.y);
  await page.evaluate(() => globalThis.__sd!.fastForward(0));
  expect(await clicks(page)).toMatchObject({ interacted: ['peeker'], interacts: 1 });
});

test('clickable: keyboard only, the tile cursor reaches the rock by name and Enter interacts', async ({
  page,
}) => {
  await open(page, true);
  const say = page.getByTestId('cursor-announce');
  const name = /^The Peeker's rock, column 10, row 7\. Enter reaches for it\.$/;
  // The first arrow shows the cursor nearest the map's middle; walk until it's on the rock.
  const keys = ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowDown', 'ArrowLeft'];
  for (let i = 0; i < 12; i++) {
    // oxlint-disable-next-line no-await-in-loop -- each press depends on what the last one showed
    if (name.test((await say.textContent()) ?? '')) break;
    // oxlint-disable-next-line no-await-in-loop -- one key press at a time, in order
    await page.keyboard.press(keys[i % keys.length]!);
  }
  await expect(say).toHaveText(name);
  await shot(page, 'clickable', 5, 'keyboard-cursor');
  await page.keyboard.press('Enter');
  await page.evaluate(() => globalThis.__sd!.fastForward(0));
  expect(await clicks(page)).toEqual({ clickable: [], interacted: ['peeker'], interacts: 1 });
  await nextFrames(page);
  await expect(say).toHaveText(/^Ground, column 10, row 7\.$/);
});

test('clickable: with no click, W1 cleared reaches her by fallback', async ({ page }) => {
  await open(page, true);
  const clip = await rockClip(page);
  const end = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    for (let k = 0; k < 120 && sd.state()!.interacted.length === 0; k++) sd.fastForward(60);
    return sd.state()!.schedule.resolved[0];
  });
  expect(end).toBe(true);
  expect(await clicks(page)).toEqual({ clickable: [], interacted: ['peeker'], interacts: 0 });
  await nextFrames(page);
  await page.screenshot({ path: 'test-results/screens/clickable/06-fallback.png', clip });
});

test('clickable: walkers near the armed rock pass behind it with their health bars down', async ({
  page,
}) => {
  await open(page, true);
  // A Rivet by the road beside the rock, so the walkers come by hurt (their bars would show).
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.enqueue({ type: 'build', tower: 'rivet', tile: [8, 4] });
    sd.fastForward(1);
  });
  // Step the sim (paused: speed 0) until a hurt walker is within 1.5 tiles of the rock's center,
  // and another hurt one stands well away from it; let the views draw, then read their bars.
  const seen = await page.evaluate(
    async ([c, r]) => {
      const sd = globalThis.__sd!;
      const bars: { near: boolean | null; far: boolean | null } = { near: null, far: null };
      for (let k = 0; k < 1500 && (bars.near === null || bars.far === null); k++) {
        sd.fastForward(1);
        const s = sd.state()!;
        for (let i = 0; i < s.enemies.used; i++) {
          const e = s.enemies.items[i]!;
          if (!e.alive || e.def === null || e.hp >= e.def.hp) continue;
          const d = Math.hypot(e.x - (c + 0.5), e.y - (r + 0.5));
          const which = d < 1.45 ? 'near' : d > 2 ? 'far' : null;
          if (which === null || bars[which] !== null) continue;
          // The views sync on the next frames (inline: this function runs in the page).
          for (let f = 0; f < 2; f++) {
            // oxlint-disable-next-line no-await-in-loop -- one frame after another
            await new Promise((res) => requestAnimationFrame(() => res(null)));
          }
          bars[which] = sd.render()!.enemies.find((v) => v.uid === e.uid)?.bar ?? null;
        }
      }
      return { ...bars, armed: sd.state()!.clickable.includes('peeker') };
    },
    [ROCK[0], ROCK[1]] as const,
  );
  expect(seen).toEqual({ near: false, far: true, armed: true });
  await page.screenshot({
    path: 'test-results/screens/clickable/07-walkers.png',
    clip: await rockClip(page),
  });
});
