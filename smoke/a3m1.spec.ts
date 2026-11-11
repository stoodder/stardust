// T620: A3M1 *The Preserve* reached the normal way, from the Sector map on the reference profile
// (`save=after_a2m6`: Sundown won, C1 cleared): The Preserve's Start, the loadout with the Scuttle
// Den (the briefing's gift, given as the loadout opens), par's four (Scuttle Den, Thumper, Prism
// Spire, Skyhook), Lock in, Bramble's briefing through Ves'thara, then par (`autoplay('par')`).
// The setup with the first group walking out of the basin, the north rift cracking (W1) and open
// (W2), the first Maw's tendrils on a Mote (W4, Ves'thara's cue on the radio), the Rift Moths over
// the second group (W5), Bramble's column on the road with W9's Maws, the last group out (W14),
// then the Leaving Song full-screen before Results (Pebble hums alone: Thrum wasn't spared) and the
// card with the gift-stones debrief. A second flow replays the map from `after_a3m1_spared`: Old
// Thrum's group walks as W10 starts with Pebble's "Grandmother!" on the radio, and the song ends
// on the C1 echo. Before each shot the sim plays a moment at 1×. Fast text (`&fasttext=1`) shows
// each line whole. Screenshots in <out>/screens/a3m1/ (look at them: the spiral, the cracks, the
// Maw, the Moths, the column, the song).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

/** What the flow waits for, checked in the page against the live sim state. */
type Cond = 'setup' | 'w2' | 'gather' | 'moths' | 'column' | 'thrum' | 'last' | 'end';

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
      const walking = (): number => {
        let n = 0;
        for (let i = 0; i < st.allies.used; i++) {
          const a = st.allies.items[i]!;
          if (a.alive && a.kind === 'refugee' && a.dist > 0) n++;
        }
        return n;
      };
      const check = (): boolean => {
        switch (c) {
          case 'setup':
            return st.towers.live >= 3 && walking() >= 6;
          case 'w2':
            return st.wave === 2 && count((e) => e.route?.id === 'rift_n') >= 4;
          case 'gather':
            return st.wave === 4 && count((e) => e.def?.id === 'maw' && e.gatherUid > 0) >= 1;
          case 'moths':
            return st.wave === 5 && count((e) => e.def?.id === 'riftmoth') >= 2 && walking() >= 4;
          case 'column':
            return st.wave === 9 && count((e) => e.def?.id === 'maw') >= 2 && walking() >= 6;
          case 'thrum':
            return st.wave === 10 && walking() >= 10;
          case 'last':
            return st.wave === 14 && walking() >= 6 && count((e) => e.def?.id === 'riftmoth') >= 3;
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

/** Picks par's loadout on the loadout screen and locks it in. */
async function parLoadout(page: Page): Promise<void> {
  const want = ['Scuttle Den', 'Thumper', 'Prism Spire', 'Skyhook'];
  const names = ['Rivet', 'Zapcoil', 'Lookout Shack', 'Sprinkler', ...want];
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
}

/** Closes the briefing and hands the battle to par, paused. */
async function startPar(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
    sd.fastForward(0);
  });
}

/** Plays the map out, then reads the Leaving Song to its answer. Returns the scene dialog. */
async function toTheSong(page: Page) {
  expect(await until(page, 'end', 60 * 600)).toBe(true);
  const scene = page.getByRole('dialog', { name: 'Scene' });
  await expect(scene).toContainText('(hum, six notes)', { timeout: 10_000 });
  return scene;
}

test('A3M1: from the Sector map, the rifts, the Maw, the Moths, the column, and the Leaving Song', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.goto('/?test=1&dialogue=1&fasttext=1&seed=1&save=after_a2m6');
  await waitForReady(page);

  // The Sector map's normal flow: The Preserve is next up; its Start, the Den given, par's four.
  await expect(page.getByRole('heading', { name: 'Sector map' })).toBeVisible();
  await page.getByRole('button', { name: 'Start The Preserve' }).click();
  await expect(page.getByText('Shift 12 · The Preserve')).toBeVisible();
  await expect(towerCard(page, 'Scuttle Den')).toBeVisible();
  await parLoadout(page);

  // Bramble through Ves'thara, her name, the Den's gift, QUILL's intel, and the medal to aim for.
  const brief = page.getByRole('dialog');
  await expect(brief).toContainText('You chased me off my own road. Now help me walk it.');
  await expect(brief).toContainText("Her name is Bramble. 'Chitterbloom' is a sun-lady word.");
  await expect(brief).toContainText('Nothing Gathered');
  await shot(page, 'a3m1', 1, 'briefing');
  await startPar(page);

  // The setup: par's first towers, the first group walking out of the basin, the north rift
  // cracking through the fence.
  expect(await until(page, 'setup')).toBe(true);
  await play(page, 400);
  await shot(page, 'a3m1', 2, 'setup-crack');

  // W2: the north rift is open and the Motes come down it.
  expect(await until(page, 'w2')).toBe(true);
  await play(page, 300);
  await shot(page, 'a3m1', 3, 'rift-open');

  // W4: the first Maw's tendrils on a Mote, and Ves'thara's line on the radio.
  const comms = page.getByTestId('comms');
  expect(await until(page, 'gather')).toBe(true);
  await nextFrames(page);
  await shot(page, 'a3m1', 4, 'maw-gather');
  await page.evaluate(() => globalThis.__sd!.setSpeed(1));
  await expect(comms).toContainText('It takes them into itself.', { timeout: 10_000 });
  await page.evaluate(() => globalThis.__sd!.setSpeed(0));

  // W5: the Rift Moths over the second group.
  expect(await until(page, 'moths')).toBe(true);
  await play(page, 300);
  await shot(page, 'a3m1', 5, 'moths');

  // W9: Bramble's own column on the road, and two Maws.
  expect(await until(page, 'column')).toBe(true);
  await play(page, 300);
  await shot(page, 'a3m1', 6, 'column');

  // W14: the last group out, the last flock over it.
  expect(await until(page, 'last')).toBe(true);
  await play(page, 300);
  await shot(page, 'a3m1', 7, 'last-group');

  // The win: the Leaving Song, full-screen before Results. Thrum wasn't spared: Pebble hums alone.
  const scene = await toTheSong(page);
  await nextFrames(page);
  await shot(page, 'a3m1', 8, 'song');
  await expect(async () => {
    await page.keyboard.press('Enter');
    await expect(scene.getByRole('button', { name: '(hum along)' })).toBeVisible({
      timeout: 500,
    });
  }).toPass({ timeout: 15_000 });
  await expect(scene).not.toContainText('Old Thrum');
  await shot(page, 'a3m1', 9, 'song-answer');
  await scene.getByRole('button', { name: '(hum along)' }).click();
  await expect(scene).toContainText('They thought you were mourning them.', { timeout: 5000 });
  // Cleared: after Ves'thara the scene simply ends, and the card has the first gift stones.
  await expect(async () => {
    await page.keyboard.press('Enter');
    await expect(scene).toBeHidden({ timeout: 500 });
  }).toPass({ timeout: 15_000 });
  const card = page.getByRole('dialog').filter({ hasText: 'She says: these are ours.' });
  await expect(card).toBeVisible({ timeout: 10_000 });
  const end = await page.evaluate(() => globalThis.__sd!.state()!.stats);
  await expect(card.getByTestId('results-escort')).toContainText(`${end.evacuated} / 24`);
  await nextFrames(page);
  await shot(page, 'a3m1', 10, 'debrief');
});

test('A3M1 spared: Old Thrum’s group walks at W10, and the song ends on the C1 echo', async ({
  page,
}) => {
  test.setTimeout(150_000);
  await page.goto('/?test=1&dialogue=1&fasttext=1&seed=1&save=after_a3m1_spared');
  await waitForReady(page);
  await expect(page.getByRole('heading', { name: 'Sector map' })).toBeVisible();
  // Replay The Preserve from the chart (its node, then Replay), par's four, Lock in.
  await page.getByRole('button', { name: /^Shift 12, The Preserve, The Preserve\./ }).click();
  await page.getByRole('button', { name: 'Replay The Preserve' }).click();
  await parLoadout(page);
  await startPar(page);
  expect(await page.evaluate(() => globalThis.__sd!.state()!.refugeeTotal)).toBe(30);

  // W10: Old Thrum's group walks out of the basin, and Pebble sees her grandmother.
  expect(await until(page, 'thrum')).toBe(true);
  await page.evaluate(() => globalThis.__sd!.setSpeed(1));
  await expect(page.getByTestId('comms')).toContainText('Grandmother!', { timeout: 10_000 });
  await page.evaluate(() => globalThis.__sd!.setSpeed(0));
  await nextFrames(page);
  await shot(page, 'a3m1', 11, 'thrum-group');

  // The song: Thrum hums with Pebble, and the C1 echo closes it.
  const scene = await toTheSong(page);
  await expect(async () => {
    await page.keyboard.press('Enter');
    await expect(scene.getByRole('button', { name: "I know it. I'm so sorry." })).toBeVisible({
      timeout: 500,
    });
  }).toPass({ timeout: 15_000 });
  await scene.getByRole('button', { name: "I know it. I'm so sorry." }).click();
  await expect(async () => {
    await page.keyboard.press('Enter');
    await expect(scene).toContainText('Old Thrum remembered.', { timeout: 500 });
  }).toPass({ timeout: 15_000 });
  await nextFrames(page);
  await shot(page, 'a3m1', 12, 'song-echo');
});
