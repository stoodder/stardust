// Act III part two on the Sector map and its Results cards (T712; core-loop.md § 1.1 and § 6.2,
// art-direction.md § 10). (1) The night chart across M7's maps on the dev saves: after A3M4,
// *Unsung* next up by the plant, its vats burning; after A3M5, *Let Them In* next up on Dome Row,
// the plant gone dark; after A3M6, the finale teased ("Coming soon", its tagline, no Start), Dome
// Row open and warm, the Deep Halls labelled, and the callsign Waykeeper on file. (2) The cards:
// A3M5's "Carried: {n} of {total}." beside its Bearers row and its plain "Perfect"; A3M6's
// Sheltered row; the report auto-filed. (3) A scene played over the Sector map covers its node
// panel, plates, and marker. Screenshots in <out>/screens/act3-sector-two/ (look at them).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

const node = (page: Page, name: string) =>
  page.getByRole('list', { name: 'Shifts' }).getByRole('button', {
    name: new RegExp(`^Shift \\d+, ${name}, `),
  });

test('act three, part two, on the Sector map: Unsung, Let Them In, then the finale teased', async ({
  page,
}) => {
  // After A3M4: Unsung next up, the marker on Empty Slot.
  await page.goto('/?test=1&seed=1&save=after_a3m4_keep');
  await waitForReady(page);
  const map = page.getByTestId('star-map');
  await expect(map).toHaveAttribute('data-phase', 'act3');
  await expect(node(page, 'Empty Slot')).toHaveAttribute('aria-current', 'location');
  await expect(node(page, 'Unsung')).toHaveAccessibleName(
    'Shift 16, Unsung, Second Harvest at night. Next up. 0 of 3 medals.',
  );
  await expect(page.getByRole('button', { name: 'Start Unsung' })).toBeFocused();
  const unsung = page.getByRole('region', { name: 'Unsung' });
  await expect(unsung).toContainText('Kip opens the vats.');
  await expect(unsung).toContainText('Perfect');
  await expect(unsung).not.toContainText('Perfect Core');
  for (const name of ['Let Them In', 'Clearing the Way']) {
    // oxlint-disable-next-line no-await-in-loop -- one assertion per name
    await expect(page.locator('body')).not.toContainText(name);
  }
  await nextFrames(page);
  await shot(page, 'act3-sector-two', 1, 'after-a3m4');

  // After A3M5: Let Them In next up on Dome Row; the plant dark.
  await page.goto('/?test=1&seed=1&save=after_a3m5_keep');
  await waitForReady(page);
  await expect(node(page, 'Unsung')).toHaveAttribute('aria-current', 'location');
  await expect(node(page, 'Let Them In')).toHaveAccessibleName(
    'Shift 17, Let Them In, Dome Row at night. Next up. 0 of 3 medals.',
  );
  await expect(page.getByRole('button', { name: 'Start Let Them In' })).toBeFocused();
  await expect(page.locator('body')).not.toContainText('Clearing the Way');
  await nextFrames(page);
  await shot(page, 'act3-sector-two', 2, 'after-a3m5');

  // After A3M6 (M7's last screen): the finale teased, its node taking the arrival focus.
  await page.goto('/?test=1&seed=1&save=after_a3m6');
  await waitForReady(page);
  await expect(map).toHaveAttribute('data-phase', 'act3');
  await expect(node(page, 'Let Them In')).toHaveAttribute('aria-current', 'location');
  const teaser = node(page, 'Clearing the Way');
  await expect(teaser).toHaveAccessibleName(
    'Shift 18, Clearing the Way, The Long Walk to the Deep Halls. Coming soon. Walk them home. ' +
      'The choir sings the jingle as a funeral hymn, and your counter counts down to zero.',
  );
  await expect(teaser).toBeFocused();
  const panel = page.getByRole('region', { name: 'Clearing the Way' });
  await expect(panel).toContainText('Coming soon');
  await expect(panel.getByRole('button')).toHaveCount(0);
  await expect(page.locator('[data-region="deep_halls"]')).toHaveText('The Deep Halls');
  // The panel stands clear of the teaser's name plate.
  const plate = await page
    .locator('.sd-star-nodes > li')
    .filter({ has: page.getByRole('button', { name: /^Shift 18, / }) })
    .locator('.sd-star-plate')
    .boundingBox();
  const box = await panel.boundingBox();
  expect(plate).not.toBeNull();
  expect(box).not.toBeNull();
  // (Screen px at 2×: within a pixel counts as apart, the panel kept inside the chart's edge.)
  const apart =
    plate!.x + plate!.width <= box!.x + 1 ||
    box!.x + box!.width <= plate!.x + 1 ||
    plate!.y + plate!.height <= box!.y + 1 ||
    box!.y + box!.height <= plate!.y + 1;
  expect(apart, JSON.stringify({ plate, box })).toBe(true);
  await nextFrames(page);
  await shot(page, 'act3-sector-two', 3, 'after-a3m6-finale-teased');

  // Pebble's name for you is on file.
  await page.evaluate(() => globalThis.__sd!.goto('settings'));
  await expect(page.locator('.sd-file-facts')).toContainText('Waykeeper');
});

test("act three, part two's Results: Carried on A3M5, Sheltered on A3M6, auto-filed", async ({
  page,
}) => {
  await page.goto('/?test=1&seed=1&save=after_a3m4_keep');
  await waitForReady(page);

  // A3M5: the bearers carried home beside the Bearers row; Perfect, not Perfect Core.
  await page.evaluate(() =>
    globalThis.__sd!.results({ map: 'a3_m05', outcome: 'won', bearers: { home: 21 } }),
  );
  const won = page.getByRole('dialog', { name: 'PERIMETER SECURED.' });
  await expect(won.getByText('Shift report · Auto-filed')).toBeVisible();
  await expect(won.getByTestId('results-asset')).toContainText('12 / 12');
  await expect(won.getByTestId('results-counter')).toHaveText(/^Carried: 21 of \d+\.$/);
  await expect(won).toContainText('Perfect');
  await expect(won).not.toContainText('Perfect Core');
  await expect(won).not.toContainText('Held.');
  await shot(page, 'act3-sector-two', 4, 'results-a3m5');

  // A loss reads the same report, half the bearers home.
  await page.evaluate(() => globalThis.__sd!.results({ map: 'a3_m05', outcome: 'lost' }));
  const lost = page.getByRole('dialog', { name: 'MINOR OPERATIONAL HICCUP' });
  await expect(lost.getByText('Shift report · Auto-filed')).toBeVisible();
  await expect(lost.getByTestId('results-counter')).toHaveText(/^Carried: \d+ of \d+\.$/);
  await shot(page, 'act3-sector-two', 5, 'results-a3m5-lost');

  // A3M6: Sheltered, said once by its row.
  await page.goto('/?test=1&seed=1&save=after_a3m6');
  await waitForReady(page);
  await page.evaluate(() =>
    globalThis.__sd!.results({ map: 'a3_m06', outcome: 'won', escort: { evacuated: 40 } }),
  );
  const domes = page.getByRole('dialog', { name: 'PERIMETER SECURED.' });
  await expect(domes.getByText('Shift report · Auto-filed')).toBeVisible();
  await expect(domes.getByTestId('results-escort')).toContainText('Sheltered');
  await expect(domes.getByTestId('results-escort')).toContainText('40 /');
  await expect(domes.getByTestId('results-counter')).toHaveCount(0);
  await shot(page, 'act3-sector-two', 6, 'results-a3m6');
});

test('a scene played over the Sector map covers its node panel, plates, and marker', async ({
  page,
}) => {
  await page.goto('/?test=1&dialogue=1&fasttext=1&seed=1&save=after_a3m5_keep');
  await waitForReady(page);
  const panel = page.getByTestId('star-panel');
  await expect(panel).toBeVisible();
  const box = (await panel.boundingBox())!;
  const marker = (await page.getByTestId('star-marker').boundingBox())!;
  void page
    .evaluate(() => globalThis.__sd!.results({ map: 'a3_m06', outcome: 'won' }))
    .catch(() => undefined); // still waiting on the flow as the test ends
  await expect(page.getByTestId('stage-waykeeper')).toBeVisible();
  // What the player sees at the panel's centre and on the marker is the scene, not the map.
  const onTop = (x: number, y: number) =>
    page.evaluate(
      ([px, py]) => document.elementFromPoint(px!, py!)?.closest('.dlg-stage') != null,
      [x, y],
    );
  expect(await onTop(box.x + box.width / 2, box.y + box.height / 2)).toBe(true);
  expect(await onTop(marker.x + marker.width / 2, marker.y + marker.height / 2)).toBe(true);
  await page.waitForTimeout(400);
  await shot(page, 'act3-sector-two', 7, 'scene-over-map');
});
