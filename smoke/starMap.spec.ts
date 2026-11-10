// The star map (T301b; design/core-loop.md § 1.1, D102): the campaign screen once A1M5 is won, on
// screen the Sector map. The normal flow (the T331 lesson): A1M5 by par from the Shift board →
// Results → Continue → the Base → Sector map (first visit: the access notice) → Rig Nine's Start
// opens A2M1; on the reference profile (after_a1m5_ref), A2M1 by par from its Start → the marker
// on A2M1 and The Glass Witch next, its Start reaching A2M2's loadout; from after_a2m2, Second
// Look's Start reaching A2M3's. On after_a1m5_ref: what shows (and what
// doesn't), the keyboard (arrows, Home, End, Enter, Esc), Replay, and every way back reading
// "Sector map"; an export and import into a real slot, then the Title's Continue, lands on it with
// no second notice. Under reduced motion nothing animates; after A2M4 the frontier is the *Long
// Walk* teaser in the dusk phase. Screenshots in test-results/screens/starmap/ (look at them:
// the chart, the plates, and the panel's placement are the point).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, playShift, shot, waitForReady } from './hooks.ts';

const nodes = (page: Page) => page.getByRole('list', { name: 'Shifts' }).getByRole('button');
const node = (page: Page, name: string) =>
  page.getByRole('list', { name: 'Shifts' }).getByRole('button', {
    name: new RegExp(`^Shift \\d+, ${name}, `),
  });
const heading = (page: Page) => page.getByRole('heading', { name: 'Sector map' });

/** Wins the running battle by par (fast-forwarded) and leaves Results for the Base. */
async function winByPar(page: Page): Promise<void> {
  await page.evaluate(() => globalThis.__sd!.autoplay('par'));
  const outcome = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    for (let i = 0; i < 120 && sd.state()?.outcome === 'playing'; i++) sd.fastForward(600);
    return sd.state()?.outcome ?? null;
  });
  expect(outcome).toBe('won');
  await page
    .getByRole('dialog', { name: 'PERIMETER SECURED!' })
    .getByRole('button', {
      name: 'Continue',
    })
    .click();
  await expect(page.getByRole('heading', { name: 'Base' })).toBeVisible();
}

/**
 * Starts the map from its panel's Start: its loadout screen (its shift and name), then (`battle`)
 * Lock in and its battle.
 */
async function startFrom(page: Page, name: string, shift: number, battle = true): Promise<void> {
  await page.getByRole('button', { name: `Start ${name}` }).click();
  await expect(page.getByText(`Shift ${shift} · ${name}`)).toBeVisible();
  if (!battle) return;
  await page.getByRole('button', { name: 'Lock in' }).click();
  await expect(page.getByTestId('hud')).toBeVisible();
}

test('star map: the normal flow, A1M5 won → the Sector map → Rig Nine opens A2M1', async ({
  page,
}) => {
  await page.goto('/?test=1&seed=1&save=after_a1m4');
  await waitForReady(page);
  await playShift(page, 'Record Quarter');
  const lockIn = page.getByRole('button', { name: 'Lock in' });
  if (await lockIn.isVisible()) await lockIn.click();
  await winByPar(page);
  // The Base's way back names the new campaign screen.
  await page.getByRole('button', { name: 'Sector map' }).click();
  await expect(heading(page)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Shift board' })).toHaveCount(0);
  await expect(page.getByTestId('star-notice')).toHaveText(
    'Access upgraded! Perimeter Ops now covers the whole valley.',
  );
  await expect(page.getByRole('button', { name: 'Start Rig Nine' })).toBeFocused();
  await expect(node(page, 'Record Quarter')).toHaveAttribute('aria-current', 'location');
  await startFrom(page, 'Rig Nine', 6);
});

test('star map: A2M1 won from its Start → The Glass Witch next; A2M2 won → Second Look', async ({
  page,
}) => {
  // The reference profile (campaign.md § 4.9: the Lookout license bought after A1M5).
  await page.goto('/?test=1&seed=1&save=after_a1m5_ref');
  await waitForReady(page);
  await startFrom(page, 'Rig Nine', 6);
  await winByPar(page);
  expect(await page.evaluate(() => globalThis.__sd!.save()?.campaign.maps.a2_m01?.completed)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Sector map' }).click();
  // The marker moves to Rig Nine, and The Glass Witch is next up; nothing later is named.
  await expect(node(page, 'Rig Nine')).toHaveAttribute('aria-current', 'location');
  await expect(node(page, 'The Glass Witch')).toHaveAccessibleName(
    'Shift 7, The Glass Witch, Ridge Rigs. Next up. 0 of 3 medals.',
  );
  await expect(page.getByTestId('star-notice')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('Second Look');
  await page.waitForTimeout(650); // the marker's 0.6 s walk from Record Quarter
  await nextFrames(page);
  await shot(page, 'starmap', 4, 'after-a2m1');
  await startFrom(page, 'The Glass Witch', 7, false);

  await page.goto('/?test=1&seed=1&save=after_a2m2');
  await waitForReady(page);
  await expect(node(page, 'The Glass Witch')).toHaveAttribute('aria-current', 'location');
  await startFrom(page, 'Second Look', 8, false);
});

test('star map: after A1M5, the keyboard, Replay, and every way back', async ({ page }) => {
  await page.goto('/?test=1&seed=1&save=after_a1m5_ref');
  await waitForReady(page);
  await expect(heading(page)).toBeVisible();
  // Act I's five nodes cleared with their pips, Rig Nine next up; nothing later in the page.
  await expect(nodes(page)).toHaveCount(6);
  for (const name of ['Orientation Day', 'Hatching Season', 'The Audit', 'Record Quarter']) {
    // oxlint-disable-next-line no-await-in-loop -- one assertion per node, in order
    await expect(node(page, name)).toHaveAccessibleName(/\. Cleared\. \d of 3 medals\.$/);
  }
  await expect(node(page, 'Rig Nine')).toHaveAccessibleName(
    'Shift 6, Rig Nine, The Diggings. Next up. 0 of 3 medals.',
  );
  const panel = page.getByRole('region', { name: 'Rig Nine' });
  await expect(panel).toContainText('Shift 6 · The Diggings');
  await expect(panel).toContainText(
    'Rig Nine stopped answering. Go take a peek. Minor operational hiccup!',
  );
  await expect(panel).toContainText('Required: Splash');
  await expect(panel).toContainText('Hiccup Contained');
  const start = page.getByRole('button', { name: 'Start Rig Nine' });
  await expect(start).toBeFocused();
  for (const later of ['The Glass Witch', 'Second Look', 'Second Harvest', 'The Long Walk']) {
    // oxlint-disable-next-line no-await-in-loop -- one assertion per name
    await expect(page.locator('body')).not.toContainText(later);
  }
  await expect(page.getByRole('img', { name: /^Sector map of the valley/ })).toBeVisible();
  // The first visit: the sweep, then the notice, filed once.
  await expect(page.getByTestId('star-notice')).toBeVisible();
  await expect(page.getByTestId('star-sweep')).toHaveCount(0, { timeout: 3000 });
  expect(await page.evaluate(() => globalThis.__sd!.save()?.story.seen)).toContain(
    'star_map_opened',
  );
  await nextFrames(page);
  await shot(page, 'starmap', 1, 'arrival');

  // Esc in the panel returns to its node; the arrows walk the nodes in campaign order, the panel
  // following; Home and End reach the first and the frontier, with no wrap.
  await page.keyboard.press('Escape');
  await expect(node(page, 'Rig Nine')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(node(page, 'Rig Nine')).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(node(page, 'Record Quarter')).toBeFocused();
  await expect(page.getByRole('region', { name: 'Record Quarter' })).toBeVisible();
  await page.keyboard.press('Home');
  await expect(node(page, 'Orientation Day')).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(node(page, 'Orientation Day')).toBeFocused();
  await page.keyboard.press('End');
  await expect(node(page, 'Rig Nine')).toBeFocused();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  await expect(node(page, 'Hatching Season')).toBeFocused();
  // One tab stop: only the selected node is in the tab order.
  await expect(node(page, 'Hatching Season')).toHaveAttribute('tabindex', '0');
  await expect(node(page, 'Rig Nine')).toHaveAttribute('tabindex', '-1');
  await page.keyboard.press('Enter');
  const replay = page.getByRole('button', { name: 'Replay Hatching Season' });
  await expect(replay).toBeFocused();
  await nextFrames(page);
  await shot(page, 'starmap', 2, 'replay-a1m2');

  // Replay reaches the map's loadout screen; its back reads "Sector map" and returns here.
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Loadout' })).toBeVisible();
  await page.getByRole('button', { name: 'Sector map' }).click();
  await expect(heading(page)).toBeVisible();
  await expect(page.getByTestId('star-notice')).toHaveCount(0);
  // The Base's way back, and Settings' Back.
  await page.getByRole('button', { name: 'Base', exact: true }).click();
  await page.getByRole('button', { name: 'Sector map' }).click();
  await expect(heading(page)).toBeVisible();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Export code' }).click();
  const code = await page.getByRole('textbox', { name: 'Shift code' }).inputValue();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(heading(page)).toBeVisible();

  // Into a real slot: Import lands on the Sector map, and after a reload the Title's Continue
  // does too, with no second notice (the first visit is in the save).
  await page.getByRole('button', { name: 'Title' }).click();
  await page.getByRole('button', { name: 'Import code' }).click();
  await page.getByRole('textbox', { name: 'Paste a shift code' }).fill(code);
  await page.getByRole('button', { name: 'Check code' }).click();
  await page
    .getByRole('list', { name: 'Import into' })
    .getByRole('listitem')
    .first()
    .getByRole('button', { name: 'Import here' })
    .click();
  await expect(heading(page)).toBeVisible();
  await page.getByRole('button', { name: 'Title' }).click();
  await page.goto('/?test=1&seed=1');
  await waitForReady(page);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(heading(page)).toBeVisible();
  await expect(page.getByTestId('star-notice')).toHaveCount(0);
});

test('star map: reduced motion holds still; after A2M4 the Long Walk next up at dusk', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?test=1&seed=1&save=after_a1m5_ref');
  await waitForReady(page);
  await expect(heading(page)).toBeVisible();
  // No sweep, the notice still shows; the beacon and the marker hold still.
  await expect(page.getByTestId('star-sweep')).toHaveCount(0);
  await expect(page.getByTestId('star-notice')).toBeVisible();
  const anim = (sel: string) =>
    page
      .locator(sel)
      .first()
      .evaluate((el) => getComputedStyle(el).animationName);
  expect(await anim('.sd-star-ping')).toBe('none');
  expect(await anim('.sd-star-marker img')).toBe('none');

  await page.goto('/?test=1&seed=1&save=after_a2m4_returned');
  await waitForReady(page);
  await expect(page.getByTestId('star-map')).toHaveAttribute('data-phase', 'act2.dusk');
  await expect(page.getByTestId('star-map')).toHaveAttribute('data-act', '2');
  await expect(node(page, 'Second Harvest')).toHaveAttribute('aria-current', 'location');
  // Built (T521), the frontier is next up, not a teaser: its node, with a Start; nothing past it
  // shows.
  const next = node(page, 'The Long Walk');
  await expect(next).toHaveAccessibleName(/\. Next up\. /);
  const panel = page.getByRole('region', { name: 'The Long Walk' });
  await expect(panel.getByRole('button', { name: 'Start The Long Walk' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Sundown');
  await nextFrames(page);
  await shot(page, 'starmap', 3, 'after-a2m4-next');
});
