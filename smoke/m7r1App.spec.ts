// M7 review round 1, the app's fixes (D150). Pixels and the mouse, where the DOM alone said yes:
// (1) A1: the jailbreak's confirmation and Zibzab's crate card are chamfered panels outside the
// HUD; a pixel inside each is its fill, never the edge colour (the confirmation drew as a solid
// orange box). (2) A2: at 1280×720, A3M5's 14-card tower grid scrolls inside the loadout panel,
// "▾ More" says so, and the mouse wheels down to the Sproing Pad and clicks it (it sat under the
// footer, out of reach). (3) A5: Kip's silence in A3M5's briefing is an ellipsis under his plate,
// never a bare name plate, and his portrait lit. (4) A6: the crate card carries Zibzab's "Price
// first: nothing." under his plate. (5) A4: A3M5's Results says its "Carried" line once.
// Screenshots in <out>/screens/m7r1-app/ (look at them).
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { shot, waitForReady } from './hooks.ts';

/** The colour (r, g, b) of the screen pixel at page point (x, y), as shot. */
async function pixelAt(page: Page, x: number, y: number): Promise<number[]> {
  const png = await page.screenshot({
    clip: { x: Math.round(x), y: Math.round(y), width: 1, height: 1 },
  });
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext('2d')!; // a 2D context always exists for a fresh canvas
    g.drawImage(img, 0, 0);
    return Array.from(g.getImageData(0, 0, 1, 1).data.slice(0, 3));
  }, png.toString('base64'));
}

/** `el`'s CSS colour of `prop` as (r, g, b). */
const cssColor = (el: Locator, prop: string): Promise<number[]> =>
  el.evaluate((e, p) => {
    const m = /(\d+),\s*(\d+),\s*(\d+)/.exec(getComputedStyle(e).getPropertyValue(p));
    return [Number(m?.[1]), Number(m?.[2]), Number(m?.[3])];
  }, prop);

const near = (a: readonly number[], b: readonly number[]): boolean =>
  a.every((v, i) => Math.abs(v - b[i]!) <= 24);

/**
 * Asserts a panel draws as a frame with a fill (A1): a pixel just inside its left edge, halfway
 * down (in its padding), isn't the edge colour `edge`.
 */
async function expectFilled(page: Page, panel: Locator, edge: readonly number[]): Promise<void> {
  const box = (await panel.boundingBox())!; // visible: the callers wait for it
  const inside = await pixelAt(page, box.x + 6, box.y + box.height / 2);
  expect(near(inside, edge), `fill ${inside.join(',')} vs edge ${edge.join(',')}`).toBe(false);
  // The edge itself is drawn (the 1 px ring at 2× zoom: two screen pixels in).
  const ring = await pixelAt(page, box.x + 1, box.y + box.height / 2);
  expect(near(ring, edge), `ring ${ring.join(',')} vs edge ${edge.join(',')}`).toBe(true);
}

test('A1: the jailbreak confirmation is a framed panel, not an orange box', async ({ page }) => {
  await page.goto('/?test=1&seed=1&save=after_a3m3_warren');
  await waitForReady(page);
  await page.evaluate(() => globalThis.__sd!.goto('base'));
  await page.getByRole('tab', { name: /^Shop/ }).click();
  const row = page
    .getByRole('region', { name: 'Firmware' })
    .getByRole('listitem')
    .filter({ hasText: 'Jailbreak' });
  await row.getByRole('button', { name: /^Buy Jailbreak/ }).click();
  const confirm = page.getByRole('dialog', { name: 'Jailbreak' });
  await expect(confirm).toBeVisible();
  await expectFilled(page, confirm, await cssColor(confirm.locator('.jb-title'), 'color'));
  await shot(page, 'm7r1-app', 1, 'jailbreak-confirm');
});

test('A2: the tower grid scrolls; the mouse reaches the Sproing Pad at 1280×720', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/?test=1&seed=1&save=after_a3m4_keep');
  await waitForReady(page);
  await page.getByRole('button', { name: 'Start Unsung' }).click();
  await expect(page.getByRole('heading', { name: 'Loadout' })).toBeVisible();
  const grid = page.locator('.sd-lo-towers');
  const more = page.getByTestId('loadout-more');
  await expect(more).toBeVisible();
  // The grid ends above the Field Protocols and the footer: no card under them.
  const gridBox = (await grid.boundingBox())!;
  const footer = (await page.locator('.sd-menu-footer').boundingBox())!;
  expect(gridBox.y + gridBox.height).toBeLessThanOrEqual(footer.y);
  await shot(page, 'm7r1-app', 2, 'loadout-top');
  // Make room: drop the first picked tower (by the mouse).
  const picked = grid.locator('[aria-pressed="true"]').first();
  const pickedBox = (await picked.boundingBox())!;
  await page.mouse.click(pickedBox.x + pickedBox.width / 2, pickedBox.y + pickedBox.height / 2);
  await expect(grid.locator('[aria-pressed="true"]')).toHaveCount(3);
  // Wheel down over the grid until the Sproing Pad is in it, then click it where it shows.
  const sproing = page.getByRole('button', { name: /^Sproing Pad,/ });
  await page.mouse.move(gridBox.x + gridBox.width / 2, gridBox.y + gridBox.height / 2);
  await page.mouse.wheel(0, 600);
  await expect(more).toBeHidden();
  const box = (await sproing.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(gridBox.y + gridBox.height + 0.5);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const hit = await page.evaluate(
    ([x, y]) => document.elementFromPoint(x!, y!)?.closest('button')?.getAttribute('aria-label'),
    [cx, cy],
  );
  expect(hit).toMatch(/^Sproing Pad,/);
  await page.mouse.click(cx, cy);
  await expect(sproing).toHaveAttribute('aria-pressed', 'true');
  await shot(page, 'm7r1-app', 3, 'loadout-sproing');
});

test("A5: Kip's silence in A3M5's briefing is an ellipsis under his lit plate", async ({
  page,
}) => {
  await page.goto('/?test=1&dialogue=1&fasttext=1&seed=1&save=after_a3m4_keep&map=a3_m05');
  await waitForReady(page);
  const lines = page.getByTestId('briefing-lines');
  const next = page.getByRole('button', { name: /^Next/ });
  // Read on until Pebble speaks: Kip's silence is then a past row.
  for (let i = 0; i < 8; i++) {
    // oxlint-disable-next-line no-await-in-loop -- each Next reveals the line the next check reads
    if (/boing/i.test(await lines.innerText())) break;
    // oxlint-disable-next-line no-await-in-loop -- one line at a time
    await next.click();
  }
  const kip = lines.locator('.hud-briefing-line').filter({ hasText: /^Kip/i });
  await expect(kip).toHaveCount(2);
  await expect(kip.nth(1).locator('.dlg-text')).toHaveText('…(silence)');
  await shot(page, 'm7r1-app', 4, 'briefing-kip-silence');
});

test("A1, A6: the crate card is framed and carries Zibzab's word", async ({ page }) => {
  await page.goto('/?test=1&seed=1&save=after_a3m5_purge&map=a3_m06');
  await waitForReady(page);
  await page.getByRole('button', { name: 'Clock in' }).click();
  const card = page.getByTestId('crate-card');
  await expect(card).toBeVisible();
  await expect(card.getByTestId('crate-quote')).toHaveText('ZibzabPrice first: nothing.');
  await expectFilled(page, card, await cssColor(card.locator('.cr-title'), 'color'));
  await shot(page, 'm7r1-app', 5, 'crate-card');
});

test('A4: A3M5\'s Results says "Carried" once, beside the Long Walk row', async ({ page }) => {
  await page.goto('/?test=1&seed=1&save=after_a3m4_keep');
  await waitForReady(page);
  await page.evaluate(() => globalThis.__sd!.results({ map: 'a3_m05', outcome: 'won' }));
  const card = page.getByRole('dialog', { name: 'PERIMETER SECURED.' });
  await expect(card.locator('.sd-results-count-done')).toHaveCount(1);
  const text = await card.innerText();
  expect(text.match(/Carried:/gi)).toHaveLength(1);
  await expect(card).toContainText(/Long Walk/i);
  await shot(page, 'm7r1-app', 6, 'results-a3m5');
});
