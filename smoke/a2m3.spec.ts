// T422: A2M3 *Second Look* rendered and played by par (`autoplay('par')`), in the save after A2M2
// (`?save=after_a2m2&map=a2_m03`, so the story context has a save to record the rescue in) until
// T301b's star map lands. The briefing (Bricks), the setup in the gold light, W3's fleeing Haulers
// with their young in the sacks, the Peeker's rock lighting up as W5 starts with Pebble on it, the
// player's own click and the rescue cue (her plate reads ???), Bricks naming her at W7 with her in
// his pocket, the dusk by W11, and the debrief's pension line on Results. The story beats and the
// dusk-to-Results end run as two tests (T460: so the gate's workers share them). Before each shot
// the sim plays a moment at 1×, so the frame isn't a fast-forward's pile. Screenshots in
// test-results/screens/a2m3/ (look at them: the young in the sacks, the outlined rock, the light).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

/** What the flow waits for, checked in the page against the live sim state. */
type Cond = 'setup' | 'haulers' | 'rock' | 'w7' | 'dusk' | 'end';

/** The battle, in the save after A2M2, with dialogue on. */
const URL = '/?test=1&dialogue=1&seed=1&save=after_a2m2&map=a2_m03';

/** The Peeker's rock (A1M2's (13,4), moved by A2M3's revisit offset). */
const ROCK = [15, 5] as const;

/** Plays par one tick at a time (up to `max`) until `cond` holds, then lets two frames render. */
async function until(page: Page, cond: Cond, max = 60 * 900): Promise<boolean> {
  const held = await page.evaluate(
    ([c, limit]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      const st = sd.state()!;
      const haulerDown = (): boolean => {
        for (let i = 0; i < st.enemies.used; i++) {
          const e = st.enemies.items[i]!;
          // A fleeing Hauler a few tiles down the road, below the warren mouth.
          if (e.alive && e.def?.id === 'hauler' && e.y > 3) return true;
        }
        return false;
      };
      const check = (): boolean => {
        switch (c) {
          case 'setup':
            return st.towers.live >= 4;
          case 'haulers':
            return st.wave === 3 && haulerDown();
          case 'rock':
            return st.clickable.includes('peeker');
          case 'w7':
            return st.schedule.phase === 'countdown' && st.schedule.countdownWave === 7;
          case 'dusk':
            // W11 has started and the light has had its 240 ticks to arrive.
            return st.wave === 11 && st.tick - st.schedule.startTick[10]! > 300;
          case 'end':
            return st.outcome !== 'playing';
          default:
            return false;
        }
      };
      for (let k = 0; k < limit; k++) {
        if (check()) return true;
        if (st.outcome !== 'playing') return false;
        sd.fastForward(1);
      }
      return check();
    },
    [cond, max] as const,
  );
  await nextFrames(page);
  return held;
}

/** Plays `ms` of real time at 1×, then pauses and lets two frames render. */
async function play(page: Page, ms: number): Promise<void> {
  await page.evaluate(() => globalThis.__sd!.setSpeed(1));
  await page.waitForTimeout(ms);
  await page.evaluate(() => globalThis.__sd!.setSpeed(0));
  await nextFrames(page);
}

test('A2M3: the sacks, the rock, the click, and Pebble named', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto(URL);
  await waitForReady(page);

  const brief = page.getByRole('dialog');
  await expect(brief).toContainText('Same terraces. Different day.');
  await expect(brief).toContainText('Clear Skies');
  await shot(page, 'a2m3', 1, 'briefing');
  await page.keyboard.press('Escape');

  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
    sd.fastForward(0);
  });
  expect(await until(page, 'setup')).toBe(true);
  await play(page, 300);
  await shot(page, 'a2m3', 2, 'setup-gold');

  // W3: the Haulers run with their young in their sacks.
  expect(await until(page, 'haulers')).toBe(true);
  await play(page, 300);
  await shot(page, 'a2m3', 3, 'sacks');
  const hauler = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    const st = sd.state()!;
    for (let i = 0; i < st.enemies.used; i++) {
      const e = st.enemies.items[i]!;
      if (e.alive && e.def?.id === 'hauler') return sd.tileToClient(e.x - 0.5, e.y - 0.5);
    }
    return null;
  });
  expect(hauler).not.toBeNull();
  await page.screenshot({
    path: 'test-results/screens/a2m3/03b-sack-zoom.png',
    clip: { x: hauler!.x - 60, y: hauler!.y - 70, width: 120, height: 100 },
  });

  // W5 starts: the rock lights up with Pebble on it. The player's own click, before par's.
  expect(await until(page, 'rock')).toBe(true);
  const at = await page.evaluate(([c, r]) => globalThis.__sd!.tileToClient(c, r), ROCK);
  expect(at).not.toBeNull();
  await page.mouse.move(at!.x, at!.y);
  await page.waitForTimeout(1_500); // the last purchases' floaters fade (real time; the sim waits)
  await nextFrames(page);
  await page.screenshot({
    path: 'test-results/screens/a2m3/04-rock-zoom.png',
    clip: { x: at!.x - 90, y: at!.y - 70, width: 180, height: 120 },
  });
  await shot(page, 'a2m3', 5, 'rock');
  await page.mouse.click(at!.x, at!.y);
  // The click goes in on the next tick, and the script cues the rescue the tick after.
  await page.evaluate(() => globalThis.__sd!.fastForward(2));
  const clicked = await page.evaluate(() => {
    const s = globalThis.__sd!.state()!;
    return {
      interacted: [...s.interacted],
      clicks: s.commandLog.filter((l) => l.cmd.type === 'interact').length,
    };
  });
  // Par's own click lands on the same tick (autoplay keeps playing); the marker is reached once.
  expect(clicked.interacted).toEqual(['peeker']);
  expect(clicked.clicks).toBeGreaterThanOrEqual(1);

  // The rescue cue: her squeak under a plate that doesn't know her name yet, then Bricks.
  const comms = page.getByTestId('comms');
  await expect(comms).toContainText('(squeak)', { timeout: 20_000 });
  await expect(comms).toContainText('???');
  await page.waitForTimeout(600);
  await shot(page, 'a2m3', 6, 'cue-squeak');
  await expect(comms).toContainText("Pocket's got room.", { timeout: 15_000 });
  await page.waitForTimeout(1_500);
  await shot(page, 'a2m3', 7, 'cue-bricks');
  await expect(comms).toContainText('(squeak, smaller)', { timeout: 15_000 });

  // W7's radio: he names her, with her in his pocket.
  expect(await until(page, 'w7')).toBe(true);
  await expect(comms).toContainText("Pebble. That's you.", { timeout: 10_000 });
  await page.waitForTimeout(1_500);
  await shot(page, 'a2m3', 8, 'named');
});

test('A2M3: the dusk by W11, and the pension on Results', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto(URL);
  await waitForReady(page);
  await expect(page.getByRole('dialog')).toContainText('Same terraces. Different day.');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
    sd.fastForward(0);
  });

  // The dusk by W11.
  expect(await until(page, 'dusk')).toBe(true);
  await play(page, 300);
  await shot(page, 'a2m3', 9, 'dusk');

  // The win and Bricks's pension, read aloud.
  expect(await until(page, 'end', 60 * 400)).toBe(true);
  const card = page.getByRole('dialog', { name: 'PERIMETER SECURED!' });
  await expect(card).toBeVisible({ timeout: 10_000 });
  await expect(card).toContainText('Nineteen years, restructured into a coupon. Ha.');
  await nextFrames(page);
  await shot(page, 'a2m3', 10, 'debrief');
});
