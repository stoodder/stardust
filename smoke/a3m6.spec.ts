// T722: A3M6 *Let Them In* reached the normal way, from the Sector map on the reference profile after
// A3M5 under C4 Keep (`save=after_a3m5_keep`): Let Them In's Start, the loadout (Goldie's Gloop
// Spitter given under the convoy), par's four (Sproing Pad, Lookout Shack, Mindspike Obelisk, Grapple
// Harpoon), Lock in, the briefing (Goldie opens the domes, Asset Recovery schedules the
// repossession, Zibzab's "Price first: nothing."), Clock in and Zibzab's crate opening as the
// briefing closes (Take the crate), then par (`autoplay('par')`): the first group walking down A1M1's
// road at night to the open dome, the knock-knock as W2's countdown opens with the first refugee
// sheltered (**Who's there?** pressed: Pebble does the whole joke, Goldie, Bricks's silence), the
// Gathering Maw a wave ahead, split and merged, and the win to the Waykeeper beat. A second run
// leaves the button alone: Pebble's own punchline, then Goldie. Before each shot the sim plays a
// moment at 1×. Fast text (`&fasttext=1`) shows each line whole. Screenshots in <out>/screens/a3m6/
// (look at them: the night road and the open dome, the knock-knock, the Maw, the split, the card).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

/** What the flow waits for, checked in the page against the live sim state. */
type Cond = 'walking' | 'sheltered' | 'maw' | 'split' | 'merged' | 'end';

/** Plays par one tick at a time (up to `max`) until `cond` holds, then lets two frames render. */
async function until(page: Page, cond: Cond, max = 60 * 900): Promise<boolean> {
  const held = await page.evaluate(
    ([c, limit]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      const st = sd.state()!;
      const maw = (part: boolean): boolean => {
        for (let i = 0; i < st.enemies.used; i++) {
          const e = st.enemies.items[i]!;
          const id = e.def?.id;
          if (e.alive && id === (part ? 'gathering_maw_part' : 'gathering_maw')) return true;
        }
        return false;
      };
      const merged = (): boolean => {
        for (let i = 0; i < st.enemies.used; i++) {
          const e = st.enemies.items[i]!;
          if (e.alive && e.def?.id === 'gathering_maw' && e.bossPhase === 3) return true;
        }
        return false;
      };
      const walking = (): number => {
        let n = 0;
        for (let i = 0; i < st.allies.used; i++) {
          const a = st.allies.items[i]!;
          if (a.alive && a.kind === 'refugee' && a.dist > 6) n++;
        }
        return n;
      };
      const check = (): boolean => {
        switch (c) {
          case 'walking':
            return st.wave === 1 && walking() >= 4;
          case 'sheltered':
            return st.stats.evacuated >= 1 && st.schedule.phase === 'countdown';
          case 'maw':
            return st.wave === 16 && maw(false) && st.tick % 60 === 0;
          case 'split':
            return maw(true);
          case 'merged':
            return merged();
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
  const want = ['Sproing Pad', 'Lookout Shack', 'Mindspike Obelisk', 'Grapple Harpoon'];
  const names = [
    'Rivet',
    'Thumper',
    'Sprinkler',
    'Skyhook',
    'Zapcoil',
    'Prism Spire',
    'Scuttle Den',
    'Hum Choir',
    'Stasis Bloom',
    'Gloop Spitter',
    ...want,
  ];
  const pressed = await Promise.all(
    names.map(async (name) => {
      const card = towerCard(page, name);
      if ((await card.count()) === 0) return false;
      return (await card.getAttribute('aria-pressed')) === 'true';
    }),
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

/** Clocks in from the briefing and takes Zibzab's crate as it opens; then par plays. */
async function clockInWithCrate(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Clock in' }).click();
  const crate = page.getByTestId('crate-card');
  await expect(crate).toBeVisible();
  await shot(page, 'a3m6', 2, 'crate');
  await crate.getByRole('button', { name: 'Take the crate' }).click();
  await expect(crate).toBeHidden();
  await expect
    .poll(() => page.evaluate(() => globalThis.__sd!.save()?.story.granted))
    .toContain('crate');
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
    sd.fastForward(0);
  });
}

test('A3M6: from the Sector map, the crate, the knock-knock, the Maw, Waykeeper', async ({
  page,
}) => {
  test.setTimeout(300_000);
  await page.goto('/?test=1&dialogue=1&fasttext=1&seed=1&save=after_a3m5_keep');
  await waitForReady(page);
  await expect(page.getByRole('heading', { name: 'Sector map' })).toBeVisible();

  // The Sector map's normal flow: Let Them In is next up; its Start, par's four.
  await page.getByRole('button', { name: 'Start Let Them In' }).click();
  await expect(page.getByText('Let Them In')).toBeVisible();
  await parLoadout(page);

  // Goldie opens the domes, Asset Recovery, Zibzab's price; the medal to aim for.
  const brief = page.getByRole('dialog');
  await expect(brief).toContainText('Open the domes. All of them.');
  const next = brief.getByRole('button', { name: /^Next/ });
  await expect(async () => {
    if (await next.isVisible()) await next.click();
    await expect(brief).toContainText('Price first: nothing.', { timeout: 500 });
  }).toPass({ timeout: 20_000 });
  await expect(brief).toContainText('Nothing Repossessed');
  await shot(page, 'a3m6', 1, 'briefing');
  await clockInWithCrate(page);

  // The first group down A1M1's road at night, behind its Mote screen, toward the open dome.
  expect(await until(page, 'walking')).toBe(true);
  await play(page, 400);
  await shot(page, 'a3m6', 3, 'night-road');

  // The knock-knock, as W2's countdown opens with the first refugee sheltered: pressed.
  expect(await until(page, 'sheltered')).toBe(true);
  const comms = page.getByRole('log', { name: 'Radio' });
  await expect(comms).toContainText('Knock knock!', { timeout: 15_000 });
  const reply = comms.getByRole('button', { name: "Who's there?" });
  await expect(reply).toBeVisible();
  await shot(page, 'a3m6', 4, 'knock-knock');
  await reply.click();
  await expect(comms).toContainText('QUILL told me that one.');
  await expect(comms).toContainText('Doors are open, sweetheart.', { timeout: 15_000 });
  await shot(page, 'a3m6', 5, 'lettuce-in');

  // W16: the Gathering Maw behind the last group (in the preview since W15 ended), its split and
  // the merge.
  expect(await until(page, 'maw')).toBe(true);
  await play(page, 300);
  await shot(page, 'a3m6', 6, 'gathering-maw');
  expect(await until(page, 'split')).toBe(true);
  await play(page, 300);
  await shot(page, 'a3m6', 7, 'split');
  expect(await until(page, 'merged')).toBe(true);
  await play(page, 300);
  await shot(page, 'a3m6', 8, 'merged');

  // The win, and Pebble names you Waykeeper.
  expect(await until(page, 'end', 60 * 900)).toBe(true);
  expect(await page.evaluate(() => globalThis.__sd!.state()!.outcome)).toBe('won');
  await expect(page.getByText('I picked Waykeeper.').first()).toBeVisible({ timeout: 30_000 });
  await shot(page, 'a3m6', 9, 'waykeeper');
  await expect
    .poll(() => page.evaluate(() => globalThis.__sd!.save()?.profile?.callsign), {
      timeout: 30_000,
    })
    .toBe('waykeeper');
});

test("A3M6: the knock-knock left alone, Pebble's own punchline", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/?test=1&dialogue=1&fasttext=1&seed=1&map=a3_m06&save=after_a3m5_keep');
  await waitForReady(page);
  await clockInWithCrate(page);
  expect(await until(page, 'sheltered')).toBe(true);
  const comms = page.getByRole('log', { name: 'Radio' });
  await expect(comms).toContainText('Knock knock!', { timeout: 15_000 });
  await expect(comms).toContainText("Lettuce! You're supposed to ask.", { timeout: 15_000 });
  await expect(comms).toContainText('Doors are open, sweetheart.', { timeout: 15_000 });
  await shot(page, 'a3m6', 10, 'knock-ignored');
});
