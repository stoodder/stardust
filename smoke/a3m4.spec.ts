// T720: A3M4 *Empty Slot* reached the normal way, from the Sector map on the reference profile
// (`save=after_a3m3_convoy`: the Gap held, the convoy's door): the base first, where the reference
// takes the jailbreak (free under the convoy: the Rivet back, jailbroken), then Empty Slot's Start,
// the loadout (the Hum Choir given as it opens), par's four (Hum Choir, Grapple Harpoon, Mindspike
// Obelisk, Rivet), Lock in, QUILL's System Reboot and Goldie's briefing, then par
// (`autoplay('par')`). The shelters with the HE HELD THE DOOR door by the hall (W1), the first
// Silencer's tendril and its jam (W4), Gerald down the mail chute with every tower holding fire
// (W7), the Hollow surge's Silencers met by the Reboot (W10), then the win: Gerald's mail before
// the card, and the card offering C4 ("QUILL's directives"), answered Keep. Before each shot the
// sim plays a moment at 1×. Fast text (`&fasttext=1`) shows each line whole. Screenshots in
// <out>/screens/a3m4/ (look at them: the hall, the tendril and the Jammed tower, Gerald's pass,
// the surge, the mail, the C4 card).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

/** What the flow waits for, checked in the page against the live sim state. */
type Cond = 'setup' | 'jammed' | 'gerald' | 'surge' | 'end';

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
      const jammed = (): number => {
        let n = 0;
        for (let i = 0; i < st.towers.used; i++) {
          const t = st.towers.items[i]!;
          if (t.alive && t.jamTicks > 0) n++;
        }
        return n;
      };
      const check = (): boolean => {
        switch (c) {
          case 'setup':
            return st.towers.live >= 4 && st.wave === 1 && count(() => true) >= 4;
          case 'jammed':
            return st.wave === 4 && jammed() >= 1;
          case 'gerald':
            return st.wave === 7 && count((e) => e.def?.id === 'gerald' && e.dist > 6) >= 1;
          case 'surge':
            return st.wave === 10 && count((e) => e.def?.id === 'silencer' && e.dist > 14) >= 2;
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

/** The reference's purchase before A3M4: the jailbreak, free under the convoy. */
async function prepare(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Base' }).click();
  // A base visit scene may be due first (they wait for nothing here): read each one through.
  const scene = page.getByTestId('scene');
  await expect(async () => {
    if (await scene.isVisible()) await page.keyboard.press('Escape');
    await expect(scene).toBeHidden({ timeout: 500 });
  }).toPass({ timeout: 15_000 });
  await page.getByRole('tab', { name: /^Shop/ }).click();
  const row = page
    .getByRole('region', { name: 'Firmware' })
    .getByRole('listitem')
    .filter({ hasText: 'Jailbreak' });
  await row.getByRole('button', { name: /^Buy Jailbreak/ }).click();
  await expect(row).toContainText('Owned');
  const save = await page.evaluate(() => globalThis.__sd!.save());
  expect(save?.unlocks.jailbroken).toEqual(['rivet']);
  await page.getByRole('button', { name: 'Sector map' }).click();
}

/** Picks par's loadout on the loadout screen and locks it in. */
async function parLoadout(page: Page): Promise<void> {
  const want = ['Hum Choir', 'Grapple Harpoon', 'Mindspike Obelisk', 'Rivet'];
  const names = [
    'Thumper',
    'Sprinkler',
    'Skyhook',
    'Zapcoil',
    'Lookout Shack',
    'Prism Spire',
    'Scuttle Den',
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

test('A3M4: from the Sector map, the first jam, Gerald held for, the surge, the mail and C4', async ({
  page,
}) => {
  test.setTimeout(300_000);
  await page.goto('/?test=1&dialogue=1&fasttext=1&seed=1&save=after_a3m3_convoy');
  await waitForReady(page);
  await expect(page.getByRole('heading', { name: 'Sector map' })).toBeVisible();
  await prepare(page);

  // The Sector map's normal flow: Empty Slot is next up; its Start, par's four.
  await page.getByRole('button', { name: 'Start Empty Slot' }).click();
  await expect(page.getByText('Empty Slot')).toBeVisible();
  await expect(towerCard(page, 'Hum Choir')).toBeVisible();
  await parLoadout(page);

  // QUILL patches in System Reboot; the convoy's Goldie; the medal to aim for.
  const brief = page.getByRole('dialog');
  await expect(brief).toContainText("I've patched in System Reboot.");
  const next = brief.getByRole('button', { name: /^Next/ });
  await expect(async () => {
    if (await next.isVisible()) await next.click();
    await expect(brief).toContainText('Two hundred people, six trucks, and a lot of lettuce.', {
      timeout: 500,
    });
  }).toPass({ timeout: 15_000 });
  await expect(brief).toContainText('Keep the Lights On');
  await shot(page, 'a3m4', 1, 'briefing');
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
    sd.fastForward(0);
  });

  // The shelters: par's first towers, drones down the service tunnel, the door by the hall.
  expect(await until(page, 'setup')).toBe(true);
  await play(page, 400);
  await shot(page, 'a3m4', 2, 'shelters');

  // W4: the first Silencer's tendril lands; a tower goes quiet.
  expect(await until(page, 'jammed')).toBe(true);
  await play(page, 300);
  await shot(page, 'a3m4', 3, 'jammed');

  // W7: Gerald down the mail chute, every tower holding fire.
  expect(await until(page, 'gerald')).toBe(true);
  await play(page, 300);
  const held = await page.evaluate(() => globalThis.__sd!.state()!.stats.neutralHits);
  expect(held).toBe(0);
  await shot(page, 'a3m4', 4, 'gerald');

  // W10: the Hollow surge's Silencers at the junction.
  expect(await until(page, 'surge')).toBe(true);
  await play(page, 400);
  await shot(page, 'a3m4', 5, 'surge');

  // The win: Gerald's mail before the card, then the card offering C4.
  expect(await until(page, 'end', 60 * 900)).toBe(true);
  expect(await page.evaluate(() => globalThis.__sd!.state()!.outcome)).toBe('won');
  const mail = page.getByRole('dialog', { name: 'Scene' });
  await expect(mail).toContainText('Pebble, c/o the Deep Halls.', { timeout: 30_000 });
  await shot(page, 'a3m4', 6, 'mail');
  await expect(async () => {
    if (await mail.isVisible()) await page.keyboard.press('Escape');
    await expect(mail).toBeHidden({ timeout: 500 });
  }).toPass({ timeout: 30_000 });
  const card = page
    .getByRole('dialog')
    .filter({ has: page.getByRole('group', { name: "QUILL's directives" }) });
  await expect(card).toBeVisible({ timeout: 15_000 });
  await expect(card).toContainText("I'd decide for myself, but I'm not permitted to.");
  await expect(card).toContainText('Signature: Received');
  await shot(page, 'a3m4', 7, 'c4');
  await card.getByRole('button', { name: 'Keep them. Stay yourself.' }).click();
  await expect
    .poll(() => page.evaluate(() => globalThis.__sd!.save()?.story.flags.quill_choice))
    .toBe('keep');
  await shot(page, 'a3m4', 8, 'c4-answered');
});
