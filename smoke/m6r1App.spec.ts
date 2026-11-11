// M6 review round 1, the app's fixes (D143). (1) R1: C3 can't be made by stray keys. From The
// Gap's Start, Enter mashed through Bricks's briefing never answers "Why'd you really come out
// here?" or C3: each choice's group takes the focus, not an option; and an Enter already held down
// when an option's 700 ms lock passes (its auto-repeat) doesn't answer either; a fresh one does.
// The lock runs on the page's clock, paused while it's checked (Playwright's `page.clock`; see
// a3m3.spec.ts). (2) R4, R9: after the Clean Exit took the Thumper, A3M3's loadout shows it as a
// stamped, locked card ("License revoked") and the Orbital Strike as "Uplink revoked"; on the
// Holdout, the Emergency Bulkhead reads "No core on this shift" and still equips. (3) R8: after
// A3M1 is won, Bricks's survey confession plays over a dimmed base with no memo open, and the
// memo the run delivered opens once it ends. Screenshots via shot() (look at them).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

const save = (page: Page) => page.evaluate(() => globalThis.__sd!.save());

/**
 * Stops the page's clock just ahead of where it is (time, timers, and frames hold until
 * `resume`); the margin covers the round trip, widened on a miss.
 */
async function pauseClock(page: Page, margin = 100): Promise<void> {
  const now = await page.evaluate(() => Date.now());
  try {
    await page.clock.pauseAt(now + margin);
  } catch (e) {
    if (margin >= 3200) throw e;
    await pauseClock(page, margin * 2);
  }
}

/** Presses Enter `n` times, a moment apart (a player hammering the key). */
async function mash(page: Page, n: number): Promise<void> {
  for (let i = 0; i < n; i++) {
    // oxlint-disable-next-line no-await-in-loop -- one press at a time, in order
    await page.keyboard.press('Enter', { delay: 10 });
  }
}

test('C3: Enter mashed from "Start The Gap" answers nothing; a held Enter neither', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.clock.install();
  await page.goto('/?test=1&dialogue=1&fasttext=1&seed=1&save=after_a3m2_rivet');
  await waitForReady(page);
  await page.getByRole('button', { name: 'Start The Gap' }).click();
  // The loadout's Lock in has the focus: the mashing starts here, through the whole briefing.
  await expect(page.getByRole('button', { name: 'Lock in' })).toBeFocused();
  await mash(page, 40);
  const brief = page.getByRole('dialog');
  const answer = brief.getByRole('group', { name: 'Your answer' });
  await expect(answer).toBeVisible();
  await expect(brief).toContainText("Why'd you really come out here, Thorn?");
  // The arrival question waits with its group focused, its lock long past, nothing answered.
  await expect(answer).toBeFocused();
  await expect(answer.getByRole('button').first()).not.toHaveAttribute('aria-disabled', 'true');
  await mash(page, 10);
  await expect(brief.getByTestId('briefing-lines')).not.toContainText(/You\s*The signing bonus/i);
  await expect(brief).not.toContainText('Ha. Me too, nineteen years back.');
  await nextFrames(page);
  await shot(page, 'm6r1-app', 1, 'arrival-mashed');

  // A fresh pick answers it: Down to the first option, Enter.
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(brief).toContainText('Ha. Me too, nineteen years back.');

  // The clock holds from here: C3's 700 ms can't pass while it's checked.
  await pauseClock(page);
  await mash(page, 20);
  await expect(brief).toContainText('Your call, Thorn. Which door do I hold?');
  await expect(answer).toBeFocused();
  const convoy = answer.getByRole('button', { name: "The convoy. Goldie's people." });
  await expect(convoy).toHaveAttribute('aria-disabled', 'true');
  // An Enter that goes down during the lock and is still held as it passes: its repeat is no pick.
  await page.keyboard.press('ArrowDown');
  await expect(convoy).toBeFocused();
  await page.keyboard.down('Enter');
  await page.clock.resume();
  await expect(convoy).not.toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.down('Enter'); // the auto-repeat
  await page.keyboard.up('Enter');
  await nextFrames(page);
  await expect(brief).not.toContainText('will remember that.');
  expect((await save(page))?.story.flags.door_choice).toBeUndefined();
  // Clock in waits on C3.
  await expect(brief.getByRole('button', { name: 'Clock in' })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  // A fresh Enter on it picks it.
  await page.keyboard.press('Enter');
  await expect(brief).toContainText('Goldie will remember that.');
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await save(page))?.story.flags.door_choice).toBe('convoy');
});

test('loadout after the Clean Exit: the Thumper stamped, the uplink revoked, no core', async ({
  page,
}) => {
  await page.goto('/?test=1&seed=1&save=after_a3m2_thumper');
  await waitForReady(page);
  await page.getByRole('button', { name: 'Start The Gap' }).click();
  await expect(page.getByRole('heading', { name: 'Loadout' })).toBeVisible();
  const revoked = page.getByTestId('loadout-revoked');
  await expect(revoked).toHaveCount(2);
  const thumper = page.locator('[data-revoked="thumper"]');
  await expect(thumper).toContainText('Thumper');
  await expect(thumper).toContainText('License revoked');
  // A card to read, not a control: no button carries its name.
  await expect(page.getByRole('button', { name: /^Thumper,/ })).toHaveCount(0);
  await expect(page.locator('[data-revoked="orbital_strike"]')).toContainText('Uplink revoked');
  await expect(page.getByText('No abilities issued yet.')).toHaveCount(0);
  // The Holdout has no core: the Bulkhead says so, and still equips.
  const bulkhead = page.locator('[data-protocol="emergency_bulkhead"]');
  await expect(bulkhead).toContainText('No core on this shift');
  // Equipped or not, it's the player's call: it toggles like any other.
  const was = await bulkhead.getAttribute('aria-pressed');
  await bulkhead.click();
  await expect(bulkhead).not.toHaveAttribute('aria-pressed', was ?? 'false');
  await bulkhead.click();
  await expect(bulkhead).toHaveAttribute('aria-pressed', was ?? 'false');
  // The splash heads-up stays as it was.
  await expect(page.locator('.sd-lo-warning')).toContainText(/Splash/);
  await nextFrames(page);
  await shot(page, 'm6r1-app', 2, 'loadout-revoked');
});

const towerCard = (page: Page, name: string) =>
  page.getByRole('button', { name: new RegExp(`^${name},`) });

test('the survey confession plays over a dimmed base, no memo open; the memo opens after', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.goto('/?test=1&dialogue=1&fasttext=1&seed=1&save=after_a2m6');
  await waitForReady(page);
  await page.getByRole('button', { name: 'Start The Preserve' }).click();
  // Par's four, locked in; the briefing closed; par plays to the win.
  const want = ['Scuttle Den', 'Thumper', 'Prism Spire', 'Skyhook'];
  for (const name of ['Rivet', 'Zapcoil', 'Lookout Shack', 'Sprinkler', ...want]) {
    // oxlint-disable-next-line no-await-in-loop -- each toggle changes the next one's slot
    const on = (await towerCard(page, name).getAttribute('aria-pressed')) === 'true';
    // oxlint-disable-next-line no-await-in-loop -- in order
    if (on !== want.includes(name)) await towerCard(page, name).click();
  }
  await page.getByRole('button', { name: 'Lock in' }).click();
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.keyboard.press('Escape');
  const won = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
    for (let k = 0; k < 60 * 900 && sd.state()!.outcome === 'playing'; k++) sd.fastForward(1);
    return sd.state()!.outcome;
  });
  expect(won).toBe('won');
  // The Leaving Song: read to its answer, answered, read out.
  const scene = page.getByRole('dialog', { name: 'Scene' });
  await expect(async () => {
    await page.keyboard.press('Escape');
    await expect(scene.getByRole('button', { name: '(hum along)' })).toBeVisible({ timeout: 500 });
  }).toPass({ timeout: 20_000 });
  await scene.getByRole('button', { name: '(hum along)' }).click();
  await expect(async () => {
    await page.keyboard.press('Escape');
    await expect(scene).toBeHidden({ timeout: 500 });
  }).toPass({ timeout: 15_000 });
  // Continue leads to the base (its visit scene is due).
  await page.getByRole('button', { name: 'Continue' }).click({ timeout: 15_000 });
  await expect(page.getByRole('heading', { name: 'Base' })).toBeVisible();

  // Bricks's confession over the base: the base dimmed, the Inbox with no memo open.
  const survey = page.getByRole('dialog', { name: 'Comms' });
  await expect(survey).toContainText('Got something to say, Thorn.');
  await expect(page.locator('.sd-base-panel')).toHaveClass(/sd-base-dim/);
  await expect(page.getByTestId('inbox-reader-empty')).toBeVisible();
  await nextFrames(page);
  await shot(page, 'm6r1-app', 3, 'survey-over-base');
  // Read to its choice, answered, read out.
  await expect(async () => {
    await page.keyboard.press('Escape');
    await expect(survey.getByRole('button', { name: '...', exact: true })).toBeVisible({
      timeout: 500,
    });
  }).toPass({ timeout: 10_000 });
  await survey.getByRole('button', { name: '...', exact: true }).click();
  await expect(async () => {
    await page.keyboard.press('Escape');
    await expect(survey).toBeHidden({ timeout: 500 });
  }).toPass({ timeout: 15_000 });
  // The memo the run delivered opens now, the base lit again.
  await expect(page.locator('.sd-base-panel')).not.toHaveClass(/sd-base-dim/);
  await expect(page.getByTestId('inbox-reader-empty')).toHaveCount(0);
  await expect(page.locator('.sd-story-item-on')).toHaveCount(1);
  await expect(page.locator('.sd-story-reader')).toBeVisible();
  await nextFrames(page);
  await shot(page, 'm6r1-app', 4, 'memo-after');
});
