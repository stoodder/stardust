// Veteran replays (T860; design/progression.md § 6). From after_a2m6's Sector map: Orientation Day's
// Replay → its loadout → the briefing shows the veteran picker (eight toggles, a short line each,
// the total and the Veteran medal; the detail line on hover). Four picks (Hardened Hides, Lean
// Budget, No Protocols, Rush Hour: +105%) reach the medal; Clock in restarts the battle under
// them (fewer credits, no protocols); par wins it, Results lists the Veteran medal as new, the
// save records the best, and the Sector map's node carries the veteran pip. On Rig Nine, Radio
// Silence darkens the companion's slot under its own name. Screenshots in
// <out>/screens/veteran/ (look at them: the picker's density and the pip are the point).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, playShift, shot, waitForReady } from './hooks.ts';

const FLOW = 'veteran';

/** Opens `name` from the Sector map (its Replay), through the loadout screen, to its briefing. */
async function replayToBriefing(page: Page, name: string): Promise<void> {
  await playShift(page, name);
  const lockIn = page.getByRole('button', { name: 'Lock in' });
  await lockIn.waitFor({ timeout: 10_000 }).catch(() => undefined);
  if (await lockIn.isVisible()) await lockIn.click();
  await expect(page.getByRole('dialog', { name: 'Shift briefing' })).toBeVisible();
}

const toggle = (page: Page, name: string) =>
  page.getByTestId('veteran-picker').getByRole('button', { name: new RegExp(`^${name},`) });

test('veteran: the picker on a replay briefing, the medal on Results, the pip on the map', async ({
  page,
}) => {
  await page.goto('/?test=1&seed=1&save=after_a2m6');
  await waitForReady(page);
  await replayToBriefing(page, 'Orientation Day');
  const picker = page.getByTestId('veteran-picker');
  await expect(picker).toBeVisible();
  await expect(picker.getByRole('button')).toHaveCount(8);
  await expect(page.getByTestId('veteran-total')).toHaveText('Optional');
  await expect(page.getByTestId('veteran-medal')).toHaveText('Veteran medal at +100%');
  await nextFrames(page);
  await shot(page, FLOW, 1, 'picker');

  const plain = await page.evaluate(() => globalThis.__sd!.state()!.credits);
  for (const name of ['Hardened Hides', 'Lean Budget', 'No Protocols', 'Rush Hour']) {
    await toggle(page, name).click();
    await expect(toggle(page, name)).toHaveAttribute('aria-pressed', 'true');
  }
  await expect(page.getByTestId('veteran-total')).toHaveText('+105% Stardust');
  await expect(page.getByTestId('veteran-medal')).toHaveText('Veteran medal in reach');
  await toggle(page, 'Glass Core').hover();
  await expect(page.getByTestId('veteran-detail')).toHaveText(
    'Core integrity 5. Handle with care. Then with more care.',
  );
  const saved = await page.evaluate(() => globalThis.__sd!.save()?.veteran?.a1_m01 ?? null);
  expect(saved).toEqual({
    mods: ['hardened_hides', 'lean_budget', 'no_protocols', 'rush_hour'],
    best: 0,
  });
  await nextFrames(page);
  await shot(page, FLOW, 2, 'picked');

  // Clock in: the battle restarts under the picks (Lean Budget's −30% credits among them).
  await page.getByRole('button', { name: 'Clock in' }).click();
  await expect(page.getByRole('dialog', { name: 'Shift briefing' })).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => globalThis.__sd!.state()!.credits))
    .toBeLessThan(plain);

  await page.evaluate(() => globalThis.__sd!.autoplay('par'));
  const outcome = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    for (let i = 0; i < 120 && sd.state()?.outcome === 'playing'; i++) sd.fastForward(600);
    return sd.state()?.outcome ?? null;
  });
  expect(outcome).toBe('won');
  const results = page.getByRole('dialog', { name: 'PERIMETER SECURED!' });
  await expect(results).toBeVisible({ timeout: 15_000 });
  await expect(results.getByLabel(/^Veteran: new/i)).toBeVisible();
  await nextFrames(page);
  await shot(page, FLOW, 3, 'results');
  const after = await page.evaluate(() => {
    const s = globalThis.__sd!.save()!;
    return { vet: s.veteran?.a1_m01 ?? null, medals: s.campaign.maps.a1_m01?.medals ?? [] };
  });
  expect(after.vet?.best).toBe(105);
  expect(after.medals).toContain('veteran');

  // Back on the Sector map: the node says so, and carries the pip.
  await page.evaluate(() => globalThis.__sd!.goto('campaign'));
  await expect(page.getByRole('heading', { name: 'Sector map' })).toBeVisible();
  const node = page
    .getByRole('list', { name: 'Shifts' })
    .getByRole('button', { name: /^Shift 1, Orientation Day, / });
  await expect(node).toHaveAccessibleName(/Veteran medal\.$/);
  await expect(page.locator('[data-node="a1_m01"] [data-testid="star-veteran"]')).toHaveCount(1);
  await expect(page.locator('[data-testid="star-veteran"]')).toHaveCount(1);
  await nextFrames(page);
  await shot(page, FLOW, 4, 'star-pip');
});

test('veteran: Radio Silence darkens the companion slot under its own name', async ({ page }) => {
  await page.goto('/?test=1&seed=1&save=after_a2m6');
  await waitForReady(page);
  await replayToBriefing(page, 'Rig Nine');
  await toggle(page, 'Radio Silence').click();
  await toggle(page, 'Glass Core').click();
  await expect(page.getByTestId('veteran-total')).toHaveText('+65% Stardust');
  await page.getByRole('button', { name: 'Clock in' }).click();
  await expect(page.getByRole('dialog', { name: 'Shift briefing' })).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => globalThis.__sd!.state()!.integrity))
    .toBeLessThanOrEqual(8);
  const slot2 = page.getByTestId('ability-2');
  await expect(slot2).toHaveAttribute('title', 'Radio Silence');
  await nextFrames(page);
  await shot(page, FLOW, 5, 'radio-silence');
  // The pick stays for the next replay of the map (shown on its briefing again).
  await page.evaluate(() => globalThis.__sd!.goto('campaign'));
  await replayToBriefing(page, 'Rig Nine');
  await expect(toggle(page, 'Radio Silence')).toHaveAttribute('aria-pressed', 'true');
});
