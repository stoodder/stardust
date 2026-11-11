// Act III on the Sector map and its Results cards (T612; core-loop.md § 1.1 and § 6.2,
// art-direction.md § 10). (1) The night chart across M6's maps on the dev saves: after A3M1, *License
// Revoked* next up beside Admin Plaza; after A3M2, *The Gap* next up on the Long Walk; after A3M3,
// *Empty Slot* teased ("Coming soon", its tagline, no Start), as Act II's close teased the
// Preserve; the next glyph in Act III's alarm red; nothing past the frontier named, the Deep Halls
// unlabeled. (2) Act III's cards: the report "Auto-filed" on a win and a loss alike; A3M1's counter
// its Evacuated line; A3M2, a Defend map, no counter line at all (never "Held."); A3M3 the Held
// card. Screenshots in <out>/screens/act3-sector/ (look at them: the nodes on their landmarks, the
// red next glyph, the teaser, and each card are the point).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

const node = (page: Page, name: string) =>
  page.getByRole('list', { name: 'Shifts' }).getByRole('button', {
    name: new RegExp(`^Shift \\d+, ${name}, `),
  });

/** The next glyph's core color (its centre pixel), read off the baked image. */
async function nextCore(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const img = document.querySelector<HTMLImageElement>('.sd-star-open .sd-star-glyph');
    if (img === null) return 'none';
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const g = c.getContext('2d');
    if (g === null) return 'none';
    g.drawImage(img, 0, 0);
    const [r, gg, b] = g.getImageData(7, 7, 1, 1).data;
    return `#${[r, gg, b].map((v) => (v ?? 0).toString(16).padStart(2, '0')).join('')}`;
  });
}

/** Act III's accent, `red.3` (content/palettes/master.ts). */
const RED_3 = '#f0384a';

test('act three on the Sector map: License Revoked, then The Gap, then Empty Slot teased', async ({
  page,
}) => {
  const later = ['Unsung', 'Let Them In', 'Clearing the Way', 'Deep Halls'];

  // After A3M1: License Revoked next up, the marker on The Preserve.
  await page.goto('/?test=1&seed=1&save=after_a3m1_spared');
  await waitForReady(page);
  const map = page.getByTestId('star-map');
  await expect(map).toHaveAttribute('data-phase', 'act3');
  await expect(map).toHaveAttribute('data-act', '3');
  await expect(node(page, 'The Preserve')).toHaveAttribute('aria-current', 'location');
  await expect(node(page, 'License Revoked')).toHaveAccessibleName(
    'Shift 13, License Revoked, Admin Plaza at night. Next up. 0 of 3 medals.',
  );
  await expect(page.getByRole('button', { name: 'Start License Revoked' })).toBeFocused();
  await expect(page.getByRole('region', { name: 'License Revoked' })).toContainText(
    'Sterling is on the line.',
  );
  expect(await nextCore(page)).toBe(RED_3);
  for (const name of ['The Gap', 'Empty Slot', ...later]) {
    // oxlint-disable-next-line no-await-in-loop -- one assertion per name
    await expect(page.locator('body')).not.toContainText(name);
  }
  await nextFrames(page);
  await shot(page, 'act3-sector', 1, 'after-a3m1');

  // After A3M2: The Gap next up on the Long Walk.
  await page.goto('/?test=1&seed=1&save=after_a3m2_rivet');
  await waitForReady(page);
  await expect(node(page, 'License Revoked')).toHaveAttribute('aria-current', 'location');
  await expect(node(page, 'The Gap')).toHaveAccessibleName(
    /^Shift 14, The Gap, Okonkwo's Gap\. Next up\. 0 of 3 medals\.$/,
  );
  await expect(page.getByRole('button', { name: 'Start The Gap' })).toBeFocused();
  expect(await nextCore(page)).toBe(RED_3);
  await expect(page.locator('body')).not.toContainText('Empty Slot');
  await nextFrames(page);
  await shot(page, 'act3-sector', 2, 'after-a3m2');

  // After A3M3 (M6's last screen): Empty Slot teased, its node taking the arrival focus.
  await page.goto('/?test=1&seed=1&save=after_a3m3_convoy');
  await waitForReady(page);
  await expect(map).toHaveAttribute('data-phase', 'act3');
  await expect(node(page, 'The Gap')).toHaveAttribute('aria-current', 'location');
  const teaser = node(page, 'Empty Slot');
  await expect(teaser).toHaveAccessibleName(
    'Shift 15, Empty Slot, The Shelters. Coming soon. ' +
      'The shelters. His portrait is dark. The mail still comes.',
  );
  await expect(teaser).toBeFocused();
  const panel = page.getByRole('region', { name: 'Empty Slot' });
  await expect(panel).toContainText('Coming soon');
  await expect(panel).toContainText('The shelters. His portrait is dark. The mail still comes.');
  await expect(panel.getByRole('button')).toHaveCount(0);
  for (const name of later) {
    // oxlint-disable-next-line no-await-in-loop -- one assertion per name
    await expect(page.locator('body')).not.toContainText(name);
  }
  await nextFrames(page);
  await shot(page, 'act3-sector', 3, 'after-a3m3-teaser');
  // Every cleared node of Act III, selected in turn: its panel stays clear of its node.
  await node(page, 'The Preserve').click();
  await expect(page.getByRole('region', { name: 'The Preserve' })).toBeVisible();
  await nextFrames(page);
  await shot(page, 'act3-sector', 4, 'preserve-selected');
});

test("act three's Results: the report auto-filed, the meter's line, and no counter on a Defend map", async ({
  page,
}) => {
  await page.goto('/?test=1&seed=1&save=after_a3m1_spared');
  await waitForReady(page);

  // A3M1, an Escort: the counter is its Evacuated line (the fixture walks every refugee home).
  await page.evaluate(() => globalThis.__sd!.results({ map: 'a3_m01', outcome: 'won', pests: 0 }));
  const escort = page.getByRole('dialog', { name: 'PERIMETER SECURED.' });
  await expect(escort).toBeVisible();
  await expect(escort.getByText('Shift report · Auto-filed')).toBeVisible();
  await expect(escort.getByTestId('results-escort')).toContainText('30 / 30');
  await expect(escort.getByTestId('results-counter')).toHaveText('Evacuated: 30.');
  await expect(escort).not.toContainText('Held.');
  await shot(page, 'act3-sector', 5, 'results-a3m1');

  // A3M2, a Defend map: no counter line at all. The Pests Processed line is gone, and nothing
  // stands in its place.
  await page.evaluate(() => globalThis.__sd!.results({ map: 'a3_m02', outcome: 'won', pests: 41 }));
  const defend = page.getByRole('dialog', { name: 'PERIMETER SECURED.' });
  await expect(defend.getByText('Shift report · Auto-filed')).toBeVisible();
  await expect(defend.getByTestId('results-integrity')).toBeVisible();
  await expect(defend.getByTestId('results-counter')).toHaveCount(0);
  await expect(defend).not.toContainText('Held.');
  await expect(defend).not.toContainText('Pests processed');
  await shot(page, 'act3-sector', 6, 'results-a3m2');

  // A loss reads the same report: auto-filed.
  await page.evaluate(() => globalThis.__sd!.results({ map: 'a3_m02', outcome: 'lost', pests: 0 }));
  const lost = page.getByRole('dialog', { name: 'MINOR OPERATIONAL HICCUP' });
  await expect(lost.getByText('Shift report · Auto-filed')).toBeVisible();
  await expect(lost.getByTestId('results-counter')).toHaveCount(0);
  await shot(page, 'act3-sector', 7, 'results-a3m2-lost');

  // A3M3, the Holdout: the Held card (Held. is its headline and nowhere else).
  await page.goto('/?test=1&seed=1&save=after_a3m2_rivet');
  await waitForReady(page);
  await page.evaluate(() => globalThis.__sd!.results({ map: 'a3_m03', outcome: 'won', pests: 0 }));
  const held = page.getByTestId('results-held');
  await expect(held.getByRole('heading', { level: 1 })).toHaveText('Held.');
  await expect(page.getByTestId('results-held-line')).toHaveText(/^Evacuated: \d+\.$/);
  await expect(held).not.toContainText('Auto-filed');
  await shot(page, 'act3-sector', 8, 'results-a3m3-held');
});
