// M7 review round 2, the app's fixes (D151). (1) E2: at 1280×720, A3M5's tower grid scrolls with
// its own visible rail, and "▾ More" is a real button in the gutter under the cards: the mouse and
// the keyboard both scroll the grid with it, and clicking it never selects a card. A pick half
// under the fold scrolls into view, slot number and all. Screenshots in <out>/screens/m7r2-app/.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { shot, waitForReady } from './hooks.ts';

async function a3m5Loadout(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/?test=1&seed=1&save=after_a3m4_keep');
  await waitForReady(page);
  await page.getByRole('button', { name: 'Start Unsung' }).click();
  await expect(page.getByRole('heading', { name: 'Loadout' })).toBeVisible();
}

const scrollTop = (page: Page): Promise<number> =>
  page.locator('.sd-lo-towers').evaluate((e) => e.scrollTop);
const pressed = (page: Page): Promise<string[]> =>
  page
    .locator('.sd-lo-towers [aria-pressed="true"]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? ''));

test('E2: More is a button under the grid; it scrolls and never picks a card', async ({ page }) => {
  await a3m5Loadout(page);
  const grid = page.locator('.sd-lo-towers');
  const more = page.getByTestId('loadout-more');
  const rail = page.getByTestId('loadout-rail');
  await expect(more).toBeVisible();
  await expect(more).toHaveAccessibleName('More');
  await expect(rail).toBeVisible();
  // It covers no card: the button sits below the grid, the rail beside it.
  const gridBox = (await grid.boundingBox())!;
  const moreBox = (await more.boundingBox())!;
  expect(moreBox.y).toBeGreaterThanOrEqual(gridBox.y + gridBox.height);
  const railBox = (await rail.boundingBox())!;
  expect(railBox.x).toBeGreaterThanOrEqual(gridBox.x + gridBox.width);
  const thumb = (await rail.locator('.sd-lo-thumb').boundingBox())!;
  expect(thumb.height).toBeGreaterThan(0);
  expect(thumb.height).toBeLessThan(railBox.height);
  await shot(page, 'm7r2-app', 1, 'loadout-more');
  // The mouse: a click on More scrolls the grid and changes no pick.
  const before = await pressed(page);
  await page.mouse.click(moreBox.x + moreBox.width / 2, moreBox.y + moreBox.height / 2);
  await expect.poll(() => scrollTop(page)).toBeGreaterThan(0);
  expect(await pressed(page)).toEqual(before);
  // The keyboard: Enter on More reads on to the bottom, where it says Top; Top goes back up.
  await more.focus();
  for (let i = 0; i < 6 && (await more.textContent())?.includes('More') === true; i++) {
    // oxlint-disable-next-line no-await-in-loop -- one press at a time, the scroll settling
    await page.keyboard.press('Enter');
    // oxlint-disable-next-line no-await-in-loop -- the smooth scroll lands
    await page.waitForTimeout(400);
  }
  await expect(more).toHaveText(/Top/);
  await expect(more).toBeFocused();
  expect(await pressed(page)).toEqual(before);
  await shot(page, 'm7r2-app', 2, 'loadout-bottom');
  await page.keyboard.press('Enter');
  await expect.poll(() => scrollTop(page)).toBe(0);
  await expect(more).toHaveText(/More/);
});

test('E2: a pick half under the fold scrolls into view with its slot number', async ({ page }) => {
  await a3m5Loadout(page);
  const grid = page.locator('.sd-lo-towers');
  // Make room: drop a pick.
  await grid.locator('[aria-pressed="true"]').first().click();
  // The first card cut off by the grid's bottom edge.
  const gridBox = (await grid.boundingBox())!;
  const bottom = gridBox.y + gridBox.height;
  const cards = grid.locator('.sd-lo-tower');
  let cut = -1;
  for (let i = 0; i < (await cards.count()); i++) {
    // oxlint-disable-next-line no-await-in-loop -- reading each card's box in turn
    const b = (await cards.nth(i).boundingBox())!;
    if (b.y < bottom - 4 && b.y + b.height > bottom + 1) {
      cut = i;
      break;
    }
  }
  test.skip(cut < 0, 'no card straddles the fold at this layout');
  const card = cards.nth(cut);
  const b = (await card.boundingBox())!;
  await page.mouse.click(b.x + b.width / 2, b.y + 4);
  await expect(card).toHaveAttribute('aria-pressed', 'true');
  await expect
    .poll(async () => {
      const now = (await card.boundingBox())!;
      return now.y + now.height <= bottom + 0.5;
    })
    .toBe(true);
  await shot(page, 'm7r2-app', 3, 'loadout-pick-in-view');
});
