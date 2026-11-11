// M6 review round 2, the app's fixes (D144). (1) S1a, S1b: after the Clean Exit took the Thumper,
// A3M3's loadout benches the carried Emergency Bulkhead for Head Start ("Benched: no core on this
// shift") and every protocol row shows whole (its effect and its note, nothing clipped at
// 1280×720), equipped again or not. (2) S4: Next clicked fast through Bricks's briefing (every
// 45 ms, then every 140 ms) answers neither the arrival question nor C3, whatever slides in under
// the cursor; a mouse that moves onto an option answers it once the lock has passed; on a touch
// screen, Next tapped about once a second on its spot answers neither (review R3 F2), and a tap on
// the option elsewhere does. (3) S8: at the
// SEAL, on the convoy's path and the warren's, the button covers neither blast door, the shut one
// included. Screenshots via shot() (look at them).
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

const save = (page: Page) => page.evaluate(() => globalThis.__sd!.save());

/** Whether the Field Protocols list shows whole (no scroll), and its rows' notes inside it. */
const protocolsWhole = (page: Page) =>
  page.locator('.sd-lo-protocols').evaluate((list) => {
    const box = list.getBoundingClientRect();
    const notes = [...list.querySelectorAll('[data-testid="protocol-inert"]')].map((n) =>
      n.getBoundingClientRect(),
    );
    return (
      list.scrollHeight <= list.clientHeight &&
      notes.every((n) => n.bottom <= box.bottom + 0.5 && n.bottom <= window.innerHeight)
    );
  });

test('loadout: the Bulkhead benched on the Holdout, every protocol row whole', async ({ page }) => {
  await page.goto('/?test=1&seed=1&save=after_a3m2_thumper');
  await waitForReady(page);
  expect((await save(page))?.loadouts.protocols).toEqual(['emergency_bulkhead']);
  await page.getByRole('button', { name: 'Start The Gap' }).click();
  await expect(page.getByRole('heading', { name: 'Loadout' })).toBeVisible();
  const bulkhead = page.locator('[data-protocol="emergency_bulkhead"]');
  const head = page.locator('[data-protocol="head_start"]');
  // Benched for the protocol that acts here, and it says so.
  await expect(head).toHaveAttribute('aria-pressed', 'true');
  await expect(bulkhead).toHaveAttribute('aria-pressed', 'false');
  await expect(bulkhead).toContainText('Absorbs the first 5 integrity lost to leaks');
  await expect(bulkhead.getByTestId('protocol-inert')).toHaveText('Benched: no core on this shift');
  expect(await protocolsWhole(page)).toBe(true);
  await nextFrames(page);
  await shot(page, 'm6r2-app', 1, 'loadout-benched');
  // The player's call: equipped again, it reads "No core on this shift", still whole.
  await bulkhead.click();
  await expect(bulkhead).toHaveAttribute('aria-pressed', 'true');
  await expect(head).toHaveAttribute('aria-pressed', 'false');
  await expect(bulkhead.getByTestId('protocol-inert')).toHaveText('No core on this shift');
  expect(await protocolsWhole(page)).toBe(true);
  await nextFrames(page);
  await shot(page, 'm6r2-app', 2, 'loadout-bulkhead-equipped');
  // Back to Head Start, locked in: the save equips it.
  await head.click();
  await page.getByRole('button', { name: 'Lock in' }).click();
  await expect.poll(async () => (await save(page))?.loadouts.protocols).toEqual(['head_start']);
});

test('loadout: the Rivet branch (the Thumper’s chips on two lines) shows its protocols whole', async ({
  page,
}) => {
  await page.goto('/?test=1&seed=1&save=after_a3m2_rivet');
  await waitForReady(page);
  await page.getByRole('button', { name: 'Start The Gap' }).click();
  await expect(page.getByRole('heading', { name: 'Loadout' })).toBeVisible();
  const bulkhead = page.locator('[data-protocol="emergency_bulkhead"]');
  if ((await bulkhead.getAttribute('aria-pressed')) !== 'true') await bulkhead.click();
  await expect(bulkhead.getByTestId('protocol-inert')).toHaveText('No core on this shift');
  expect(await protocolsWhole(page)).toBe(true);
  await shot(page, 'm6r2-app', 3, 'loadout-rivet-branch');
});

/** The centre of `l` in client px. */
async function centre(l: Locator): Promise<{ x: number; y: number }> {
  const b = await l.boundingBox();
  expect(b).not.toBeNull();
  return { x: b!.x + b!.width / 2, y: b!.y + b!.height / 2 }; // checked above
}

/**
 * Clicks Next every `everyMs` (or taps it, `tap`), following it as the lines push it down (a player
 * hammering it), and where it last was once it's gone (whatever slides in under the cursor), until
 * `until` holds, then `afterMs` more. Returns the last spot pressed.
 */
async function hammer(
  page: Page,
  next: Locator,
  everyMs: number,
  until: () => Promise<boolean>,
  afterMs: number,
  tap = false,
): Promise<{ x: number; y: number }> {
  let at = await centre(next);
  let stopAt = Number.POSITIVE_INFINITY;
  for (let i = 0; i < 400 && Date.now() < stopAt; i++) {
    // Where Next is now, if it's there.
    // oxlint-disable-next-line no-await-in-loop -- one look at a time, in order
    const box = (await next.count()) > 0 ? next.boundingBox({ timeout: 100 }) : null;
    // oxlint-disable-next-line no-await-in-loop -- the same look
    at = (await box?.then(mid, () => null)) ?? at;
    // oxlint-disable-next-line no-await-in-loop -- one click at a time, in order
    await (tap ? page.touchscreen.tap(at.x, at.y) : page.mouse.click(at.x, at.y));
    // oxlint-disable-next-line no-await-in-loop -- paced like a player
    await page.waitForTimeout(everyMs);
    // oxlint-disable-next-line no-await-in-loop -- checked as it goes
    if (stopAt === Number.POSITIVE_INFINITY && (await until())) stopAt = Date.now() + afterMs;
  }
  return at;
}

/** A box's centre, or null. */
function mid(b: { x: number; y: number; width: number; height: number } | null) {
  return b === null ? null : { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

test('C3: Next clicked fast through the briefing answers nothing; a moved mouse does', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto('/?test=1&dialogue=1&fasttext=1&seed=1&save=after_a3m2_rivet');
  await waitForReady(page);
  await page.getByRole('button', { name: 'Start The Gap' }).click();
  await page.getByRole('button', { name: 'Lock in' }).click();
  const brief = page.getByRole('dialog');
  const next = brief.getByRole('button', { name: 'Next' });
  await expect(next).toBeVisible();
  const answer = brief.getByRole('group', { name: 'Your answer' });

  // Every 45 ms, through the lines and on for 2 s over the arrival question.
  await hammer(page, next, 45, () => answer.isVisible(), 2000);
  await expect(brief).toContainText("Why'd you really come out here, Thorn?");
  // Still asked: no option taken (before the fix, "Money for my family." slid under the cursor).
  await expect(answer).toBeVisible();
  await expect(brief.getByTestId('briefing-lines')).not.toContainText(/You\s*Money for my family/);
  await expect(brief).not.toContainText('Ha. Me too, nineteen years back.');
  await expect(brief).not.toContainText('will remember that.');
  await nextFrames(page);
  await shot(page, 'm6r2-app', 4, 'arrival-hammered');
  // The mouse moves onto the first option; once the lock passes, its click answers.
  const first = answer.getByRole('button').first();
  const to = await centre(first);
  await page.mouse.move(to.x + 6, to.y + 2, { steps: 4 });
  await expect(first).not.toHaveAttribute('aria-disabled', 'true');
  await page.mouse.click(to.x, to.y);
  await expect(brief).toContainText('Ha. Me too, nineteen years back.');

  // Every 140 ms, on to C3 and 2 s over it.
  await expect(next).toBeVisible();
  await hammer(
    page,
    next,
    140,
    async () => (await brief.textContent())?.includes('Which door do I hold?') ?? false,
    2000,
  );
  await expect(answer).toBeVisible();
  await expect(brief).not.toContainText('will remember that.');
  expect((await save(page))?.story.flags.door_choice).toBeUndefined();
  await nextFrames(page);
  await shot(page, 'm6r2-app', 5, 'c3-hammered');
  const convoy = answer.getByRole('button', { name: "The convoy. Goldie's people." });
  const c = await centre(convoy);
  await page.mouse.move(c.x + 8, c.y + 1, { steps: 4 });
  await expect(convoy).not.toHaveAttribute('aria-disabled', 'true');
  await page.mouse.click(c.x, c.y);
  await expect(brief).toContainText('Goldie will remember that.');
});

/**
 * The option under `at` (the spot Next was tapped on; `under`: one must be, else the first), and a
 * point on it more than the tap slop (16 px) away from `at`: where a deliberate tap lands.
 */
async function optionUnder(
  page: Page,
  answer: Locator,
  at: { x: number; y: number },
  under = true,
) {
  const texts = await answer.getByRole('button').allInnerTexts();
  const i = await page.evaluate(({ x, y }) => {
    const hit = document.elementFromPoint(x, y)?.closest('.dlg-choice');
    return hit ? [...document.querySelectorAll('.dlg-choice')].indexOf(hit) : -1;
  }, at);
  if (under) {
    expect(i, `an option slid in under the tapped spot (${texts.join(' / ')})`).toBeGreaterThan(-1);
  }
  const option = answer.getByRole('button').nth(Math.max(i, 0));
  const b = (await option.boundingBox())!; // found under the spot above
  const left = b.x + 24;
  const right = b.x + b.width - 24;
  const x = Math.abs(left - at.x) > Math.abs(right - at.x) ? left : right;
  expect(Math.abs(x - at.x)).toBeGreaterThan(16);
  return { option, elsewhere: { x, y: b.y + b.height / 2 } };
}

test.describe('on a touch screen', () => {
  test.use({ hasTouch: true });

  test('C3: Next tapped once a second on its spot answers nothing; a tap elsewhere does', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.goto('/?test=1&dialogue=1&fasttext=1&seed=1&save=after_a3m2_rivet');
    await waitForReady(page);
    await page.getByRole('button', { name: 'Start The Gap' }).tap();
    await page.getByRole('button', { name: 'Lock in' }).tap();
    const brief = page.getByRole('dialog');
    const next = brief.getByRole('button', { name: 'Next' });
    await expect(next).toBeVisible();
    const answer = brief.getByRole('group', { name: 'Your answer' });

    // About once a second, through the lines and 3.5 s over the arrival question (past its lock).
    const spot = await hammer(page, next, 1000, () => answer.isVisible(), 3500, true);
    await expect(brief).toContainText("Why'd you really come out here, Thorn?");
    await expect(answer).toBeVisible();
    await expect(brief.getByTestId('briefing-lines')).not.toContainText(
      /You\s*Money for my family/,
    );
    await expect(brief).not.toContainText('Ha. Me too, nineteen years back.');
    await nextFrames(page);
    await shot(page, 'm6r2-app', 8, 'arrival-tapped');
    // The option under the spot, tapped on another part of it: that's a pick.
    const arrival = await optionUnder(page, answer, spot);
    const said = (await arrival.option.innerText()).replace(/^\d+\s*/, '');
    await page.touchscreen.tap(arrival.elsewhere.x, arrival.elsewhere.y);
    await expect(brief.getByTestId('briefing-lines')).toContainText(said, { ignoreCase: true });

    // On to C3, the same way.
    await expect(next).toBeVisible();
    const spot3 = await hammer(
      page,
      next,
      1000,
      async () => (await brief.textContent())?.includes('Which door do I hold?') ?? false,
      3500,
      true,
    );
    await expect(answer).toBeVisible();
    await expect(brief).not.toContainText('will remember that.');
    expect((await save(page))?.story.flags.door_choice).toBeUndefined();
    await nextFrames(page);
    await shot(page, 'm6r2-app', 9, 'c3-tapped');
    // (Its options sit above Next's last spot at 1280×720; the arrival question's slid under it.)
    const door = await optionUnder(page, answer, spot3, false);
    await page.touchscreen.tap(door.elsewhere.x, door.elsewhere.y);
    await expect(brief).toContainText('will remember that.');
  });
});

/** Plays `url`'s A3M3 by par to W13, then by hand to the SEAL (paused). */
async function toSeal(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await waitForReady(page);
  const pending = await page.evaluate(() => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    sd.setSpeed(0);
    sd.autoplay('par');
    sd.fastForward(0);
    const st = sd.state()!;
    for (let k = 0; k < 60 * 1200 && st.outcome === 'playing' && st.wave < 13; k++) {
      sd.fastForward(1);
    }
    // 'none' has no steps: par's last step would press the SEAL at once.
    sd.autoplay('none');
    for (let k = 0; k < 60 * 600 && st.outcome === 'playing' && st.pendingInput === null; k++) {
      sd.fastForward(1);
    }
    return st.pendingInput;
  });
  expect(pending).toBe('seal');
  await nextFrames(page);
}

/** Whether the SEAL button (in game px) overlaps any box the screen keeps clear. */
async function sealCoversADoor(page: Page): Promise<{ covers: boolean; doors: number }> {
  const button = page.getByTestId('forced-input');
  await expect(button).toBeVisible();
  const b = (await button.boundingBox())!; // visible above
  const k = page.viewportSize()!.width / 640; // the HUD's scale (game px to client px)
  const avoid = await page.evaluate(() => globalThis.__sd!.sealAvoid());
  const x = b.x / k;
  const y = b.y / k;
  const w = b.width / k;
  const h = b.height / k;
  const covers = avoid.some((a) => x < a.x + a.w && a.x < x + w && y < a.y + a.h && a.y < y + h);
  return { covers, doors: avoid.length };
}

test('the SEAL covers neither blast door, open or shut: the convoy’s path', async ({ page }) => {
  test.setTimeout(120_000);
  await toSeal(page, '/?test=1&map=a3_m03&seed=1');
  expect(await sealCoversADoor(page)).toEqual({ covers: false, doors: 2 });
  await shot(page, 'm6r2-app', 6, 'seal-convoy');
});

test('the SEAL covers neither blast door, open or shut: the warren’s path', async ({ page }) => {
  test.setTimeout(120_000);
  await toSeal(page, '/?test=1&seed=1&save=after_a3m3_warren&map=a3_m03');
  expect(await sealCoversADoor(page)).toEqual({ covers: false, doors: 2 });
  await shot(page, 'm6r2-app', 7, 'seal-warren');
});
