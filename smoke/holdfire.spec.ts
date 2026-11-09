// Hold Fire in the HUD (T206c; core-loop §2.7): H holds the selected tower and Shift+H (or the
// "all" button) every tower, each held tower wears the pause plate; the spare-runners controls
// stay hidden until they unlock (all_unlocked shows them, and Alt+H sets them); and Results offers
// Change loadout (T220) where the map offers the loadout screen. Screenshots in
// test-results/screens/holdfire/.
import type { Page } from '@playwright/test';
import { DEV_MAP_ID } from '../src/app/battleSetup.ts';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

/** Free pads on the dev battle (render/__fixtures__/devBattle.ts). */
const PAD_A = [3, 1] as const;
const PAD_B = [7, 4] as const;

async function tileClient(page: Page, [c, r]: readonly [number, number]) {
  const p = await page.evaluate(([x, y]) => globalThis.__sd?.tileToClient(x, y) ?? null, [
    c,
    r,
  ] as const);
  expect(p).not.toBeNull();
  return p!; // checked just above
}

/** Every standing tower's uid and fire-control flags, in build order. */
const towers = (page: Page) =>
  page.evaluate(() =>
    (globalThis.__sd?.state()?.towers.items ?? [])
      .filter((t) => t.alive)
      .map((t) => ({ uid: t.uid, holdFire: t.holdFire, spareRunners: t.spareRunners })),
  );

const fireControl = (page: Page) =>
  page.evaluate(() => {
    const s = globalThis.__sd?.state();
    return { holdFireAll: s?.holdFireAll ?? null, spareRunnersAll: s?.spareRunnersAll ?? null };
  });

const shiftRow = (page: Page, name: string) => page.getByRole('listitem').filter({ hasText: name });

/** Fast-forwards the running battle until the map ends; returns the outcome. */
const playOut = (page: Page) =>
  page.evaluate(() => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    for (let i = 0; i < 60 && sd.state()?.outcome === 'playing'; i++) sd.fastForward(600);
    return sd.state()?.outcome ?? null;
  });

test('hold fire: H holds the selected tower, Shift+H and the all button hold every tower', async ({
  page,
}) => {
  await page.goto(`/?test=1&map=${DEV_MAP_ID}&seed=1`);
  await waitForReady(page);
  await page.getByRole('button', { name: 'Pause' }).click();

  // No save in play: the spare-runners controls are hidden, and Alt+H does nothing.
  const all = page.getByTestId('hold-fire-all');
  await expect(all).toBeVisible();
  await expect(all).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('spare-runners-all')).toHaveCount(0);

  // Two Rivets.
  await page.getByRole('button', { name: /^Build Rivet/ }).click();
  const [a, b] = [await tileClient(page, PAD_A), await tileClient(page, PAD_B)];
  await page.mouse.click(a.x, a.y);
  await page.mouse.click(b.x, b.y);
  await expect.poll(async () => (await towers(page)).length).toBe(2);
  await page.keyboard.press('Escape');

  // H with nothing selected says how.
  await page.keyboard.press('KeyH');
  await expect(page.getByRole('status').filter({ hasText: 'Pick a turret first' })).toBeVisible();

  // Select the first; H holds it, and only it.
  await page.mouse.click(a.x, a.y);
  const panel = page.getByRole('region', { name: 'Rivet tower' });
  const hold = panel.getByTestId('hold-fire');
  await expect(hold).toHaveText(/Hold fire/);
  await expect(panel.getByTestId('spare-runners')).toHaveCount(0);
  await page.keyboard.press('KeyH');
  await expect.poll(async () => (await towers(page)).map((t) => t.holdFire)).toEqual([true, false]);
  await expect(hold).toHaveAttribute('aria-pressed', 'true');
  await expect(hold).toHaveText(/Holding fire/);
  await expect(all).toHaveAccessibleName('Hold fire, all: 1 holding');
  await page.mouse.move(0, 0);
  await nextFrames(page);
  await shot(page, 'holdfire', 1, 'one-held');

  // The panel's toggle releases it again.
  await hold.click();
  await expect
    .poll(async () => (await towers(page)).map((t) => t.holdFire))
    .toEqual([false, false]);

  // Shift+H: every tower holds (the master switch), and the button says so in words.
  await page.keyboard.press('Shift+KeyH');
  await expect.poll(async () => (await towers(page)).map((t) => t.holdFire)).toEqual([true, true]);
  expect((await fireControl(page)).holdFireAll).toBe(true);
  await expect(all).toHaveAttribute('aria-pressed', 'true');
  await expect(all).toHaveText(/Held/);
  await page.keyboard.press('Escape');
  await page.mouse.move(0, 0);
  await nextFrames(page);
  await shot(page, 'holdfire', 2, 'all-held');

  // The all button turns the master switch off: every tower fires again.
  await all.click();
  await expect
    .poll(async () => (await towers(page)).map((t) => t.holdFire))
    .toEqual([false, false]);
  await expect(all).toHaveAttribute('aria-pressed', 'false');

  // Alt+H is spare runners, still locked here: nothing changes.
  await page.keyboard.press('Alt+KeyH');
  await nextFrames(page);
  expect((await fireControl(page)).spareRunnersAll).toBe(false);
});

test('spare runners: shown with all_unlocked; Alt+H sets it on every tower, new ones inherit', async ({
  page,
}) => {
  await page.goto('/?test=1&seed=1&save=all_unlocked');
  await waitForReady(page);
  await shiftRow(page, 'Orientation Day').getByRole('button').click();
  await page.getByRole('button', { name: 'Lock in' }).click();
  await page.getByRole('button', { name: 'Clock in' }).click();
  await page.getByRole('button', { name: 'Pause' }).click();

  const spareAll = page.getByTestId('spare-runners-all');
  await expect(spareAll).toBeVisible();
  await page.keyboard.press('Alt+KeyH');
  await expect.poll(async () => (await fireControl(page)).spareRunnersAll).toBe(true);
  await expect(spareAll).toHaveAttribute('aria-pressed', 'true');

  // A Rivet built now starts sparing runners; its panel shows the toggle on.
  await page.evaluate(() =>
    globalThis.__sd!.enqueue({ type: 'build', tile: [6, 1], tower: 'rivet' }),
  );
  await expect.poll(async () => (await towers(page)).map((t) => t.spareRunners)).toEqual([true]);
  const p = await tileClient(page, [6, 1]);
  await page.mouse.click(p.x, p.y);
  const spare = page.getByRole('region', { name: 'Rivet tower' }).getByTestId('spare-runners');
  await expect(spare).toHaveAttribute('aria-pressed', 'true');
  await expect(spare).toHaveText(/Sparing runners/);
  await page.mouse.move(0, 0);
  await nextFrames(page);
  await shot(page, 'holdfire', 3, 'spare-runners');

  // The panel's toggle turns it off for this tower only.
  await spare.click();
  await expect.poll(async () => (await towers(page)).map((t) => t.spareRunners)).toEqual([false]);
});

test('results: Change loadout goes back to the loadout screen where the map offers it (T220)', async ({
  page,
}) => {
  await page.goto('/?test=1&seed=1&save=all_unlocked');
  await waitForReady(page);
  await shiftRow(page, 'Orientation Day').getByRole('button').click();
  await page.getByRole('button', { name: 'Lock in' }).click();
  await page.getByRole('button', { name: 'Clock in' }).click();
  await page.evaluate(() => globalThis.__sd!.autoplay('none'));
  expect(await playOut(page)).toBe('lost');
  const card = page.getByRole('dialog', { name: 'MINOR OPERATIONAL HICCUP' });
  await expect(card).toBeVisible();
  const change = card.getByRole('button', { name: 'Change loadout' });
  await expect(change).toBeVisible();
  await shot(page, 'holdfire', 4, 'results-change-loadout');
  await change.click();
  await expect(page.getByRole('heading', { name: 'Loadout' })).toBeVisible();
  // Lock in goes on to this map's briefing.
  await page.getByRole('button', { name: 'Lock in' }).click();
  await expect(page.getByRole('dialog', { name: 'Shift briefing' })).toBeVisible();
});

test('results: no Change loadout while the loadout system is locked', async ({ page }) => {
  await page.goto('/?test=1&seed=1');
  await waitForReady(page);
  await page.getByRole('button', { name: 'Start shift' }).click();
  await page.getByRole('button', { name: 'Clock in' }).click();
  await page.evaluate(() => globalThis.__sd!.autoplay('none'));
  expect(await playOut(page)).toBe('lost');
  const card = page.getByRole('dialog', { name: 'MINOR OPERATIONAL HICCUP' });
  await expect(card.getByRole('button', { name: 'Retry' })).toBeVisible();
  await expect(card.getByRole('button', { name: 'Change loadout' })).toHaveCount(0);
});
