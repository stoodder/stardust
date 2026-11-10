// T522: A2M6 *Sundown* reached the normal way, from the Sector map on the reference profile
// (`save=after_a2m5`: A2M5 won, the Prism Spire given): Sundown's Start, par's loadout (Prism Spire,
// Thumper, Skyhook, Rivet), Lock in, Ves'thara's briefing, then par (`autoplay('par')`). The setup
// at dusk with the Prism on the watchtower, W3's Fractures breaking into Shards at the merge, W5's
// Rift Moths flickering Phased over the wall, W9's flock frozen by Ves'thara's Stillness, W12's
// build phase in full Long Night darkness with Goldie's "Lights out in Dome 3" on the radio (the
// sim's darkness is 1 there: only the lamps and the Prism's light hold the dark back), the last
// surge in the dark, and Ishael's debrief full-screen before Results (D138). Before each shot the sim plays a moment at
// 1×, so the frame isn't a fast-forward's pile. Fast text (`&fasttext=1`) shows each line whole.
// Screenshots in <out>/screens/a2m6/ (look at them: the dusk, the splits, the flicker, the frozen
// flock, the full dark).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

/** What the flow waits for, checked in the page against the live sim state. */
type Cond = 'setup' | 'shards' | 'phased' | 'stillness' | 'w12' | 'surge' | 'end';

/** Plays par one tick at a time (up to `max`) until `cond` holds, then lets two frames render. */
async function until(page: Page, cond: Cond, max = 60 * 900): Promise<boolean> {
  const held = await page.evaluate(
    ([c, limit]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      const st = sd.state()!;
      const count = (pick: (e: (typeof st.enemies.items)[number]) => boolean): number => {
        let n = 0;
        for (let i = 0; i < st.enemies.used; i++) {
          const e = st.enemies.items[i]!;
          if (e.alive && pick(e)) n++;
        }
        return n;
      };
      const check = (): boolean => {
        switch (c) {
          case 'setup':
            return st.towers.live >= 4;
          case 'shards':
            return st.wave === 3 && count((e) => e.def?.id === 'fracture_shard') >= 2;
          case 'phased':
            return (
              st.wave === 5 &&
              count((e) => e.def?.id === 'riftmoth' && e.phased) >= 1 &&
              count((e) => e.def?.id === 'riftmoth' && !e.phased && e.dist > 6) >= 1
            );
          case 'stillness':
            return (
              st.wave === 9 && count((e) => e.def?.id === 'riftmoth' && e.stasisTicks > 0) >= 4
            );
          case 'w12':
            return st.schedule.phase === 'countdown' && st.schedule.countdownWave === 12;
          case 'surge':
            return st.wave === 14 && count((e) => e.def?.id === 'riftmoth' && e.dist > 6) >= 8;
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

const towerCard = (page: Page, name: string) =>
  page.getByRole('button', { name: new RegExp(`^${name},`) });

test('A2M6: from the Sector map, the splits, the flicker, Stillness, full dark, and Ishael', async ({
  page,
}) => {
  test.setTimeout(150_000);
  await page.goto('/?test=1&dialogue=1&fasttext=1&seed=1&save=after_a2m5');
  await waitForReady(page);

  // The Sector map's normal flow: Sundown is next up; its Start, par's loadout, Lock in.
  await expect(page.getByRole('heading', { name: 'Sector map' })).toBeVisible();
  await page.getByRole('button', { name: 'Start Sundown' }).click();
  await expect(page.getByText('Shift 11 · Sundown')).toBeVisible();
  // Par's loadout: drop what the save's last four carry that par doesn't, then add par's.
  const want = ['Prism Spire', 'Thumper', 'Skyhook', 'Rivet'];
  const names = ['Zapcoil', 'Lookout Shack', 'Sprinkler', ...want];
  const pressed = await Promise.all(
    names.map(
      async (name) => (await towerCard(page, name).getAttribute('aria-pressed')) === 'true',
    ),
  );
  const toggle = names.filter((name, i) => pressed[i] !== want.includes(name));
  const off = toggle.filter((name) => !want.includes(name));
  const on = toggle.filter((name) => want.includes(name));
  for (const name of [...off, ...on]) {
    // oxlint-disable-next-line no-await-in-loop -- each toggle changes the next one's slot
    await towerCard(page, name).click();
  }
  await Promise.all(
    want.map((name) => expect(towerCard(page, name)).toHaveAttribute('aria-pressed', 'true')),
  );
  await page.getByRole('button', { name: 'Lock in' }).click();
  await expect(page.getByTestId('hud')).toBeVisible();

  // Ves'thara on the wall beside the Old Soldier, QUILL's intel, and the medal to aim for.
  const brief = page.getByRole('dialog');
  await expect(brief).toContainText('Tonight I fight beside the Old Soldier.');
  await expect(brief).toContainText('Before the Dark');
  await shot(page, 'a2m6', 1, 'briefing');
  await page.keyboard.press('Escape');

  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
    sd.fastForward(0);
  });
  expect(await until(page, 'setup')).toBe(true);
  await play(page, 300);
  await shot(page, 'a2m6', 2, 'setup-dusk');

  // W3: a Fracture breaks into Shards at the merge.
  expect(await until(page, 'shards')).toBe(true);
  await play(page, 200);
  await shot(page, 'a2m6', 3, 'shards');

  // W5: the Rift Moths cross the wall, one flickering Phased.
  expect(await until(page, 'phased')).toBe(true);
  await nextFrames(page);
  await shot(page, 'a2m6', 4, 'phased');

  // W9: Ves'thara's Stillness holds the flock over the merge.
  expect(await until(page, 'stillness')).toBe(true);
  await play(page, 200);
  await shot(page, 'a2m6', 5, 'stillness');

  // W12's build phase: full Long Night darkness, and Goldie puts the lights out in Dome 3.
  expect(await until(page, 'w12')).toBe(true);
  expect(await page.evaluate(() => globalThis.__sd!.state()!.dark)).toBe(1);
  await page.evaluate(() => globalThis.__sd!.setSpeed(1));
  const comms = page.getByTestId('comms');
  await expect(comms).toContainText('Lights out in Dome 3.', { timeout: 10_000 });
  await page.evaluate(() => globalThis.__sd!.setSpeed(0));
  await page.waitForTimeout(250); // the panel's 160 ms line-in step
  await shot(page, 'a2m6', 6, 'full-dark');
  // Still full dark once the line has played (the build phase hasn't ended).
  expect(await page.evaluate(() => globalThis.__sd!.state()!.dark)).toBe(1);

  // W14: the last flock and the surges, in the dark.
  expect(await until(page, 'surge')).toBe(true);
  await play(page, 300);
  await shot(page, 'a2m6', 7, 'surge-dark');

  // The win: Ishael, full-screen before the card (D138), then the card without her lines.
  expect(await until(page, 'end', 60 * 500)).toBe(true);
  const scene = page.getByRole('dialog', { name: 'Scene' });
  await expect(scene).toContainText('Ishael', { timeout: 10_000 });
  await nextFrames(page);
  await shot(page, 'a2m6', 8, 'debrief');
  // Through to her last line (fast text shows each whole; the silence moves on by itself).
  await expect(async () => {
    await page.keyboard.press('Enter');
    await expect(scene).toContainText('Be awake.', { timeout: 500 });
  }).toPass({ timeout: 15_000 });
  await page.keyboard.press('Escape');
  const card = page.getByRole('dialog', { name: 'PERIMETER SECURED!' });
  await expect(card).toBeVisible({ timeout: 10_000 });
  await expect(card).not.toContainText('Be awake.');
});
