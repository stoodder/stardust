// T714: Act III part two's bespoke screens, live.
// - **Gerald's mail** (A3M4's won card, the results fixture on `after_a3m3_convoy`): the envelope
//   leads in, then the pension form, the key's slip and Kip's slip come out with their captions;
//   then the card's C4 ("QUILL's directives", 700 ms lock), answered Keep: "QUILL will remember
//   that."; then the base's Night Shift on its stage in the shelters, mandatory, the lamp blooming
//   as Ves'thara laughs and staying warm after. Reduced motion: the envelope already open.
// - **Zibzab's crate** (A3M6's briefing): Clock in opens the crate's card first; with tune-ups
//   (`after_a3m5_keep`) it lists them and Take the crate clocks in and opens it on the save; with
//   none (`fresh`) it owes a protocol pick (locked 700 ms, Take waiting), then opens on the pick.
// - **QUILL's own list** (A3M6's briefing under Rewrite): the card while its header line shows.
// - **The Waykeeper beat** (A3M6's won card, the results fixture): the debrief full-screen at
//   Dome 1, the plate turning THORN → WAYKEEPER as Pebble's line finishes.
// Screenshots in <out>/screens/t714/.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { shot, waitForReady } from './hooks.ts';

const save = (page: Page) => page.evaluate(() => globalThis.__sd!.save());
const shown = (page: Page) => page.evaluate(() => globalThis.__sd!.dialogue.shown().scene);

/** Presses Next (or Skip) on the scene until `done` holds, a line at a time. */
async function readUntil(page: Page, done: () => Promise<boolean>, max = 20): Promise<void> {
  const next = page.getByRole('button', { name: /^(Skip|Next)$/ });
  for (let i = 0; i < max; i++) {
    // oxlint-disable-next-line no-await-in-loop -- one line at a time
    if (await done()) return;
    // oxlint-disable-next-line no-await-in-loop -- one line at a time
    if (await next.isVisible()) await next.click();
    // oxlint-disable-next-line no-await-in-loop -- let the scene move on (a silence by itself)
    await page.waitForTimeout(300);
  }
}

test("t714: Gerald's mail, C4 remembered, then Night Shift's laugh", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?test=1&dialogue=1&fasttext=1&seed=1&save=after_a3m3_convoy');
  await waitForReady(page);
  // From the base: the star map's node panel draws over a full-screen scene (a fixture-only view:
  // in play the flow runs over the frozen battle).
  await page.evaluate(() => globalThis.__sd!.goto('base'));
  // The card's flow: Gerald's mail first, full-screen (not awaited: it waits on the scenes).
  void page.evaluate(() =>
    globalThis.__sd!.results({ map: 'a3_m04', outcome: 'won', commitChoice: true }),
  );
  const stage = page.getByTestId('stage-mail');
  await expect(stage).toBeVisible();
  await expect(page.locator('[data-envelope]')).toHaveAttribute('data-envelope', 'shut');
  await page.waitForTimeout(500); // it lands
  await shot(page, 't714', 1, 'mail-envelope');
  await expect(stage).toHaveAttribute('data-out', '1', { timeout: 5000 });
  await expect(page.locator('[data-envelope]')).toHaveAttribute('data-envelope', 'open');
  await expect(page.getByRole('dialog', { name: 'Scene' })).toContainText(
    'Pebble, c/o the Deep Halls.',
  );
  await page.waitForTimeout(400); // the paper's slide
  await shot(page, 't714', 2, 'mail-pension');
  const out = (n: string) => async () =>
    (await stage.getAttribute('data-out', { timeout: 2000 })) === n;
  await readUntil(page, out('2'));
  await expect(stage).toHaveAttribute('data-out', '2');
  await page.waitForTimeout(400);
  await shot(page, 't714', 3, 'mail-key');
  await readUntil(page, out('3'));
  await expect(stage).toHaveAttribute('data-out', '3');
  await page.waitForTimeout(400);
  await shot(page, 't714', 4, 'mail-kip');
  await readUntil(page, async () => (await stage.count()) === 0);

  // The card: C4 as C3's.
  const card = page.getByRole('dialog');
  const choice = card.getByRole('group', { name: "QUILL's directives" });
  await expect(choice.getByTestId('choice-heading')).toBeFocused();
  const keep = choice.getByRole('button', { name: 'Keep them. Stay yourself.' });
  await expect(keep).toHaveAttribute('aria-disabled', 'true');
  await expect(keep).not.toHaveAttribute('aria-disabled', 'true');
  await keep.click();
  await expect(card.getByTestId('choice-answered')).toContainText('Keep them. Stay yourself.');
  await expect(card.getByTestId('choice-remember')).toHaveText('QUILL will remember that.');
  await shot(page, 't714', 5, 'c4-remembered');
  expect((await save(page))?.story.flags.quill_choice).toBe('keep');

  // Night Shift: on its stage, mandatory; the lamp blooms as she laughs, then stays warm.
  await card.getByRole('button', { name: 'Continue' }).click();
  await page.evaluate(() => globalThis.__sd!.goto('base'));
  await expect.poll(() => shown(page)).toBe('a3_m04_base_night_shift');
  const room = page.getByTestId('stage-night-shift');
  await expect(room).toBeVisible();
  await expect(room).toHaveAttribute('data-light', 'cold');
  await page.keyboard.press('Escape');
  expect(await shown(page)).toBe('a3_m04_base_night_shift');
  await page.waitForTimeout(1600); // the room's lead-in
  await shot(page, 't714', 6, 'night-shift-room');
  const light = (v: string) => async () =>
    (await room.getAttribute('data-light', { timeout: 2000 })) === v;
  await readUntil(page, light('laugh'));
  await expect(room).toHaveAttribute('data-light', 'laugh');
  await page.waitForTimeout(700); // the bloom
  await shot(page, 't714', 7, 'night-shift-laugh');
  await readUntil(page, light('warm'));
  await expect(room).toHaveAttribute('data-light', 'warm');
  await readUntil(page, async () => (await shown(page)) === null);
  await expect.poll(() => shown(page)).toBeNull();
  expect((await save(page))?.story.seen).toContain('a3_m04_base_night_shift');
});

test("t714: under reduced motion Gerald's envelope is already open", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/?test=1&dialogue=1&fasttext=1&seed=1&save=after_a3m3_convoy');
  await waitForReady(page);
  void page
    .evaluate(() => globalThis.__sd!.results({ map: 'a3_m04', outcome: 'won' }))
    .catch(() => undefined); // still waiting on the flow as the test ends
  await expect(page.locator('[data-envelope]')).toHaveAttribute('data-envelope', 'open');
  await expect(page.getByTestId('stage-mail')).toHaveAttribute('data-out', '1', { timeout: 3000 });
  await shot(page, 't714', 8, 'mail-still');
  await context.close();
});

/** A3M6's battle on `id`, its briefing up. */
async function a3m6(page: Page, id: string, dialogue = false): Promise<void> {
  const d = dialogue ? '&dialogue=1&fasttext=1' : '';
  await page.goto(`/?test=1${d}&seed=1&map=a3_m06&save=${id}`);
  await waitForReady(page);
  await expect(page.getByRole('button', { name: 'Clock in' })).toBeVisible();
}

test("t714: Zibzab's crate opens as A3M6's briefing closes, its tune-ups listed", async ({
  page,
}) => {
  await a3m6(page, 'after_a3m5_keep');
  await page.getByRole('button', { name: 'Clock in' }).click();
  const crate = page.getByTestId('crate-card');
  await expect(crate).toBeVisible();
  await expect(crate).toHaveAttribute('data-kind', 'tune_ups');
  await expect(crate.getByRole('listitem').first()).toContainText('Tune-up');
  const take = crate.getByRole('button', { name: 'Take the crate' });
  await expect(take).toBeFocused();
  // Esc doesn't clock in past it.
  await page.keyboard.press('Escape');
  await expect(crate).toBeVisible();
  await shot(page, 't714', 9, 'crate-tune-ups');
  await take.click();
  await expect(crate).toBeHidden();
  await expect(page.getByRole('button', { name: 'Clock in' })).toBeHidden();
  await expect.poll(async () => (await save(page))?.story.granted).toContain('crate');
});

test("t714: Zibzab's crate with no tune-up to give asks for a Field Protocol", async ({ page }) => {
  await a3m6(page, 'fresh');
  const before = (await save(page))?.unlocks.protocols ?? [];
  await page.keyboard.press('Escape'); // Esc clocks in, and so opens the card
  const crate = page.getByTestId('crate-card');
  await expect(crate).toHaveAttribute('data-kind', 'pick');
  const take = crate.getByRole('button', { name: 'Take the crate' });
  await expect(take).toHaveAttribute('aria-disabled', 'true');
  const first = crate.getByRole('radio').first();
  await expect(first).toHaveAttribute('aria-disabled', 'true');
  await expect(first).not.toHaveAttribute('aria-disabled', 'true');
  await first.click();
  await expect(first).toHaveAttribute('aria-checked', 'true');
  await expect(take).not.toHaveAttribute('aria-disabled', 'true');
  await shot(page, 't714', 10, 'crate-pick');
  await take.click();
  await expect(crate).toBeHidden();
  await expect
    .poll(async () => ((await save(page))?.unlocks.protocols ?? []).length)
    .toBe(before.length + 1);
});

test("t714: QUILL's own list shows with its header line (A3M6, Rewrite)", async ({ page }) => {
  await a3m6(page, 'after_a3m5_rewrite', true);
  const list = page.getByTestId('quill-list');
  await readUntil(page, async () => (await list.count()) > 0);
  await expect(list).toBeVisible();
  await expect(list.getByRole('listitem')).toHaveCount(5);
  await expect(list).toContainText('Directive 1');
  // The header is the briefing line's, under QUILL.SYS (no Everglow plate), never the card's (D150).
  await expect(list).not.toContainText(/Entries/i);
  const header = page
    .getByTestId('briefing-lines')
    .locator('.hud-briefing-line')
    .filter({ hasText: /QUILL\.DIRECTIVES/i });
  await expect(header.locator('.dlg-name')).toHaveText(/^QUILL\.SYS$/i);
  await shot(page, 't714', 11, 'quill-list');
  // It stays up through QUILL's payoff line, Directive 1 (D151), then goes.
  const now = page.getByTestId('briefing-lines').locator('.hud-briefing-line.now');
  await readUntil(page, async () => /written by me/.test((await now.textContent()) ?? ''));
  await expect(now).toContainText('Directive 1, written by me');
  await expect(list).toBeVisible();
  await page.getByRole('button', { name: /^(Skip|Next)$/ }).click();
  await expect(now).toHaveCount(0);
  await expect(list).toBeHidden();
});

test('t714: Pebble names you Waykeeper at Dome 1', async ({ page }) => {
  await page.goto('/?test=1&dialogue=1&fasttext=1&seed=1&save=after_a3m5_keep');
  await waitForReady(page);
  await page.evaluate(() => globalThis.__sd!.goto('base'));
  void page
    .evaluate(() => globalThis.__sd!.results({ map: 'a3_m06', outcome: 'won' }))
    .catch(() => undefined); // still waiting on the flow as the test ends
  const stage = page.getByTestId('stage-waykeeper');
  await expect(stage).toBeVisible();
  await expect(stage).toHaveAttribute('data-turned', 'false');
  await expect(stage).toHaveAttribute('data-turned', 'true', { timeout: 6000 });
  await expect(page.getByRole('dialog', { name: 'Scene' })).toContainText('Waykeeper');
  await page.waitForTimeout(600); // the name written in
  await shot(page, 't714', 12, 'waykeeper');
});
