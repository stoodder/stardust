// The loadout screen after its declutter (T803d; D153), and where it now bends to a run's rules.
// (1) A2M3 on `all_unlocked`: the threats sit beside the heading, under the kicker's own line; an
// unpicked Field Protocol is its name, and its effect shows on the peek line while hovered; the
// formed links' names show, the whole list opens from "Every link" above the Lock in button and Esc
// closes it (not the screen); two heads-ups (T871) sit whole in the footer, beside its buttons. (2) A
// replay under Short-Handed (T860): the cap of 3 by the tower count, and a fourth pick refused with
// why. (3) Skitterkin Only from the post-game plate (T862): the loadout first, the other factions'
// towers greyed with "Stays home", the pick warren-only, kept per map. (4) Endless gets its loadout
// too. Screenshots in <out>/screens/loadout-declutter/ (look at each).
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

const FLOW = 'loadout-declutter';

const towerCard = (page: Page, name: string) =>
  page.getByRole('button', { name: new RegExp(`^${name},`) });

/** `a`'s bottom edge is at or above `b`'s top edge. */
async function above(a: Locator, b: Locator): Promise<boolean> {
  const x = await a.boundingBox();
  const y = await b.boundingBox();
  return x !== null && y !== null && x.y + x.height <= y.y + 0.5;
}

test('loadout declutter: threats row, protocol peek, Every link, heads-ups beside the buttons', async ({
  page,
}) => {
  await page.goto('/?test=1&seed=1&save=all_unlocked&map=a2_m03');
  await waitForReady(page);
  await page.evaluate(() => globalThis.__sd!.goto('loadout'));
  const lockIn = page.getByRole('button', { name: 'Lock in' });
  await expect(lockIn).toBeVisible();

  // The kicker has its own line: the threats start below it.
  expect(await above(page.locator('.sd-lo-header .sd-kicker'), page.locator('.sd-lo-intel'))).toBe(
    true,
  );
  // The pick-order hint is the Towers heading's tooltip (the footer holds only notices).
  await expect(page.locator('#sd-lo-towers-label')).toHaveAttribute('title', /build-slot order/);

  // An unpicked protocol shows its name; its effect is the peek line's while hovered.
  const head = page.locator('[data-protocol="head_start"]');
  await expect(head).toHaveAttribute('aria-pressed', 'false');
  await expect(head.locator('.sd-lo-protocol-effect')).toBeHidden();
  await head.hover();
  await expect(page.getByTestId('protocol-peek')).toHaveText('Head Start: +10% starting credits');
  await page.mouse.move(0, 0);
  await expect(page.getByTestId('protocol-peek')).toHaveText('');
  // Equipped, its effect is in its row.
  await head.click();
  await expect(head.locator('.sd-lo-protocol-effect')).toBeVisible();

  // Down to the Thumper alone: two heads-ups (Shields, Air), whole, beside the footer's buttons.
  const picked = page.locator('.sd-lo-tower[aria-pressed="true"]');
  // oxlint-disable-next-line no-await-in-loop -- one card after another
  while ((await picked.count()) > 0) {
    // oxlint-disable-next-line no-await-in-loop -- one card after another
    await picked.first().click();
  }
  await towerCard(page, 'Thumper').click();
  const warnings = page.locator('.sd-lo-warning');
  await expect(warnings).toHaveCount(2);
  await nextFrames(page);
  await shot(page, FLOW, 1, 'heads-up');
  // Whole inside the panel, and beside the buttons, never under them.
  const panel = await page.locator('.sd-lo-panel').boundingBox();
  const last = await warnings.last().boundingBox();
  expect(last!.y + last!.height).toBeLessThanOrEqual(panel!.y + panel!.height);
  const foot = await page.locator('.sd-lo-foot').boundingBox();
  const back = await page.getByRole('button', { name: 'Sector map' }).boundingBox();
  expect(foot!.x + foot!.width).toBeLessThanOrEqual(back!.x);

  // The formed links in view, each with its bonus in the Technician column's open band (D156); the
  // whole list one press away, above Lock in; Esc closes it.
  await towerCard(page, 'Rivet').click();
  const linked = page.getByTestId('loadout-linked');
  await expect(linked.getByRole('listitem')).toHaveCount(1);
  await expect(linked).toContainText('Crossfire');
  await expect(page.locator('.sd-lo-linked-bonus')).not.toHaveText('');
  const more = page.getByRole('button', { name: /^Every link/ });
  await more.click();
  const list = page.getByTestId('loadout-links');
  await expect(list).toBeVisible();
  expect(await above(list, lockIn)).toBe(true);
  await nextFrames(page);
  await shot(page, FLOW, 2, 'every-link');
  await page.keyboard.press('Escape');
  await expect(list).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Loadout' })).toBeVisible();
});

test('loadout declutter: Short-Handed caps the pick at 3 and says so', async ({ page }) => {
  await page.goto('/?test=1&seed=1&save=after_a2m6');
  await waitForReady(page);
  await page.getByRole('heading', { name: 'Sector map' }).waitFor();
  const node = page
    .getByRole('list', { name: 'Shifts' })
    .getByRole('button', { name: /^Shift \d+, Orientation Day, / });
  await node.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Replay Orientation Day' }).click();
  await page.getByRole('button', { name: 'Lock in' }).click();
  const briefing = page.getByRole('dialog', { name: 'Shift briefing' });
  await expect(briefing).toBeVisible();
  // Short-Handed on the replay's picker, then back to the loadout.
  const picker = page.getByTestId('veteran-picker');
  await picker.getByRole('button', { name: 'Choose' }).click();
  await picker.getByRole('button', { name: /^Short-Handed,/ }).click();
  await expect(picker.getByRole('button', { name: /^Short-Handed,/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await briefing.getByRole('button', { name: 'Change loadout' }).click();
  await expect(page.getByRole('heading', { name: 'Loadout' })).toBeVisible();
  await expect(page.getByTestId('loadout-cap')).toHaveText('Short-Handed');
  const picked = page.locator('.sd-lo-tower[aria-pressed="true"]');
  await expect(picked).toHaveCount(3);
  await expect(page.locator('#sd-lo-towers-label .sd-lo-count')).toHaveText('3 / 3');
  // A fourth is refused (the card is aria-disabled: pressed by keyboard), and the footer says why.
  await page.locator('.sd-lo-tower[aria-pressed="false"]').first().focus();
  await page.keyboard.press('Enter');
  await expect(picked).toHaveCount(3);
  await expect(page.locator('.sd-lo-hint')).toHaveText(
    '3 towers is the limit (Short-Handed). Drop one to swap this one in.',
  );
  await nextFrames(page);
  await shot(page, FLOW, 3, 'short-handed');
});

test('loadout declutter: Skitterkin Only greys the other towers; Endless gets a loadout', async ({
  page,
}) => {
  await page.goto('/?test=1&seed=1&save=after_fin_stay');
  await waitForReady(page);
  await expect(page.getByTestId('star-map')).toBeVisible();
  await page
    .getByTestId('post-game')
    .getByRole('button', { name: /^Challenge: Skitterkin Only/ })
    .click();
  await page.getByRole('button', { name: 'Start Skitterkin Only' }).click();
  await expect(page.getByRole('heading', { name: 'Loadout' })).toBeVisible();
  await expect(page.locator('.sd-lo-header .sd-kicker')).toHaveText('Skitterkin Only');
  const rivet = towerCard(page, 'Rivet');
  await expect(rivet).toHaveAttribute('aria-disabled', 'true');
  await expect(rivet.getByTestId('loadout-stays')).toHaveText('Stays home');
  await expect(rivet).toHaveAccessibleName(/stays home: Skitterkin Only/);
  // aria-disabled: pressed by keyboard, refused, and the footer says why.
  await rivet.focus();
  await page.keyboard.press('Enter');
  await expect(rivet).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.sd-lo-hint')).toHaveText('Rivet stays home: Skitterkin Only.');
  const picked = page.locator('.sd-lo-tower[aria-pressed="true"]');
  await expect(picked).not.toHaveCount(0);
  await nextFrames(page);
  await shot(page, FLOW, 4, 'skitterkin-only');
  const chosen = await picked.evaluateAll((cards) =>
    cards.map((c) => c.querySelector('.sd-lo-name')?.textContent ?? ''),
  );
  for (const name of chosen)
    expect(name).toMatch(/Scuttle Den|Hum Choir|Gloop Spitter|Sproing Pad/);
  await page.getByRole('button', { name: 'Lock in' }).click();
  await expect(page.getByRole('dialog', { name: 'Shift briefing' })).toBeVisible();
  const preset = await page.evaluate(
    () => globalThis.__sd!.save()?.loadouts.byMap.ch_m01?.towers ?? [],
  );
  expect(preset).toHaveLength(chosen.length);

  // Endless: Start from the plate goes through its own loadout screen.
  await page.evaluate(() => globalThis.__sd!.goto('campaign'));
  await expect(page.getByTestId('star-map')).toBeVisible();
  await page
    .getByTestId('post-game')
    .getByRole('button', { name: /^Endless: / })
    .click();
  await page.getByRole('button', { name: 'Start The Long Shift' }).click();
  await expect(page.getByRole('heading', { name: 'Loadout' })).toBeVisible();
  await expect(page.locator('.sd-lo-header .sd-kicker')).toHaveText('The Long Shift');
  await nextFrames(page);
  await shot(page, FLOW, 5, 'endless');
  await page.getByRole('button', { name: 'Lock in' }).click();
  await expect(page.getByTestId('hud')).toBeVisible();
});
