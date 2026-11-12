// T863, the post-game shell (design/core-loop.md § 1.1 *After the finale*, § 2.8; design/maps.md
// § 8): after the finale the Sector map wakes at dawn with every node cleared and the post-game
// plate leading. Under Stay (after_fin_stay, imported into a real slot): the Title's dawn and its
// "Remember them." tip, Continue onto the chart (Wayside struck over Everglow Gardens, Endless selected with its Start
// focused), a challenge's panel, Esc back to its row, a campaign node's Replay panel, and "Watch
// the epilogue" (Esc closes it, back on the chart). Under Go (after_fin_go): the unlit colony, no
// Wayside. Endless launched from its panel on a typed seed: the generated run (more than its five
// warm-up waves), the HUD's Next line naming the block, 3x speed offered, and the
// run's end on the score screen with the seed's record. Screenshots in <out>/screens/post-game/
// (look at every one: the plate's calm, the chart's dawn, the one column clear of the west nodes).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

const FLOW = 'post-game';

/** The post-game plate's row for `name`. */
const row = (page: Page, name: RegExp) =>
  page.getByTestId('post-game').getByRole('button', { name });

test('post-game: the Title at dawn, the Sector map at dawn under Stay, the plate, the epilogue', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto('/?test=1&seed=1&save=after_fin_stay');
  await waitForReady(page);
  await expect(page.getByTestId('star-map')).toBeVisible();

  // Into a real slot (export, then import), so the Title has a post-game save to continue.
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Export code' }).click();
  const code = await page.getByRole('textbox', { name: 'Shift code' }).inputValue();
  await page.getByRole('button', { name: 'Back' }).click();
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
  await expect(page.getByTestId('star-map')).toBeVisible();

  // The Title of a post-game save: dawn's theme and "Remember them."
  await page.getByRole('button', { name: 'Title' }).click();
  const title = page.getByTestId('title');
  await expect(title).toHaveClass(/sd-title-dawn/);
  await expect(page.getByTestId('title-tip')).toContainText('Remember them.');
  await nextFrames(page);
  await shot(page, FLOW, 1, 'title-dawn');

  // Continue → the post-game star map, Endless selected and its Start focused.
  await page.getByRole('button', { name: 'Continue' }).click();
  const map = page.getByTestId('star-map');
  await expect(map).toBeVisible();
  await expect(map).toHaveAttribute('data-phase', 'dawn');
  await expect(page.getByRole('heading', { name: "QUILL's sim deck" })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start The Long Shift' })).toBeFocused();
  await expect(row(page, /^Endless: The Long Shift/)).toHaveAttribute('aria-pressed', 'true');
  // Stay: the colony's label is Wayside, Everglow's old words struck above it.
  const gardens = page.locator('[data-region="gardens"]');
  await expect(gardens).toContainText('Wayside');
  await expect(gardens.locator('s')).toHaveText('Everglow Gardens');
  // Every campaign node is cleared; nothing is next.
  const nodes = page.getByRole('list', { name: 'Shifts' }).getByRole('button');
  await expect(nodes).toHaveCount(18);
  await expect(page.locator('.sd-star-open, .sd-star-coming_soon')).toHaveCount(0);
  await nextFrames(page);
  await shot(page, FLOW, 2, 'stay-endless');
  // The panel stands above the plate on screen but follows it in Tab order (S2-5): from the
  // deck's last row, Tab reaches the open entry's seed field, not the Title.
  const boxes = page.locator('[data-testid="post-game"] > .sd-pg-box');
  await expect(boxes.first()).toHaveClass(/sd-pg-plate/);
  await expect(boxes.last()).toHaveClass(/sd-pg-head/);
  const plateY = (await boxes.first().boundingBox())?.y ?? 0;
  const headY = (await boxes.last().boundingBox())?.y ?? 0;
  expect(headY).toBeLessThan(plateY);
  await page.getByRole('button', { name: 'Watch the epilogue' }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('post-game-panel').locator(':focus')).toHaveCount(1);

  // One column (T803c): with Endless open, neither box covers the west nodes (The Long Walk,
  // The Preserve), which take a click.
  for (const west of ['The Long Walk', 'The Preserve']) {
    const at = page
      .getByRole('list', { name: 'Shifts' })
      .getByRole('button', { name: new RegExp(`^Shift \\d+, ${west}, `) });
    // oxlint-disable-next-line no-await-in-loop -- one node at a time
    const hit = await at.evaluate((el) => {
      const b = el.getBoundingClientRect();
      const top = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
      return top === el || el.contains(top);
    });
    expect(hit, `${west}'s node is clear of the post-game column`).toBe(true);
  }

  // A challenge: its panel under the heading, its tagline, threats and required counters in view,
  // its medals and what they pay one press away; Esc closes that, then returns to its row.
  const skitterkin = row(page, /^Challenge: Skitterkin Only/);
  await skitterkin.click();
  const panel = page.getByTestId('post-game-panel');
  await expect(panel).toContainText("Only the warrens' towers deploy.");
  await expect(panel.getByRole('list', { name: 'Threat intel' })).toBeVisible();
  await expect(panel.getByRole('list', { name: 'Medals' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Start Skitterkin Only' })).toBeFocused();
  await shot(page, FLOW, 3, 'challenge');
  const more = panel.getByRole('button', { name: /^Medals/ });
  await more.click();
  await expect(panel.getByRole('list', { name: 'Medals' })).toBeVisible();
  await expect(panel).toContainText('Medals here pay Intel.');
  await page.keyboard.press('Escape');
  await expect(panel.getByRole('list', { name: 'Medals' })).toBeHidden();
  await expect(more).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(skitterkin).toBeFocused();

  // A campaign node still opens its own panel (the plate's panel gives way).
  await page
    .getByRole('list', { name: 'Shifts' })
    .getByRole('button', { name: /^Shift 1, Orientation Day, / })
    .click();
  await expect(page.getByTestId('star-panel')).toContainText('Orientation Day');
  await expect(page.getByTestId('post-game-panel')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Replay Orientation Day' })).toBeFocused();
  await shot(page, FLOW, 4, 'node-replay');

  // "Watch the epilogue": the epilogue again, Esc closes it, back on the chart.
  await page.getByRole('button', { name: 'Watch the epilogue' }).click();
  const layer = page.getByTestId('epilogue');
  await expect(layer).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('epilogue-card')).toBeVisible();
  await page.waitForTimeout(900); // the card fades in
  await shot(page, FLOW, 5, 'epilogue');
  await page.keyboard.press('Escape');
  await expect(layer).toHaveCount(0);
  await expect(map).toBeVisible();
});

test('post-game: Go leaves the colony unlit and keeps its old name', async ({ page }) => {
  await page.goto('/?test=1&seed=1&save=after_fin_go');
  await waitForReady(page);
  await expect(page.getByTestId('star-map')).toHaveAttribute('data-phase', 'dawn');
  const gardens = page.locator('[data-region="gardens"]');
  await expect(gardens).toHaveText('Everglow Gardens');
  await nextFrames(page);
  await shot(page, FLOW, 6, 'go');
});

test('post-game: Endless on a typed seed, the Next line, 3x, and the score screen', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto('/?test=1&seed=1&save=after_fin_stay');
  await waitForReady(page);
  await expect(page.getByTestId('star-map')).toBeVisible();
  const seed = page.getByTestId('endless-seed');
  await seed.fill('31337');
  await expect(page.getByTestId('endless-best')).toHaveText('No run on this seed yet.');
  await seed.fill('abc');
  await expect(page.getByRole('button', { name: 'Start The Long Shift' })).toBeDisabled();
  await seed.fill('31337');
  await page.getByRole('button', { name: 'Start The Long Shift' }).click();
  const lockIn = page.getByRole('button', { name: 'Lock in' });
  await expect(lockIn.or(page.getByTestId('hud'))).toBeVisible();
  if (await lockIn.isVisible()) await lockIn.click();
  await expect(page.getByTestId('hud')).toBeVisible();

  // The run is the seed's generated one, not the 5-wave warm-up; par plays it (closing the briefing).
  const waves = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.autoplay('par');
    sd.fastForward(1);
    return sd.state()!.schedule.resolved.length;
  });
  expect(waves).toBeGreaterThan(5);
  // The HUD's Next line names the warm-up block, and the wave count has no last wave.
  const next = page.getByTestId('preview-endless');
  await expect(next).toBeVisible();
  await expect(next).toContainText('Warm-up');
  await expect(page.getByRole('region', { name: 'Waves' }).getByLabel(/^Wave \d+$/)).toBeVisible();
  // 3x is offered (the finale is won).
  const triple = page.getByRole('button', { name: 'Triple speed' });
  await expect(triple).toBeVisible();
  await triple.click();
  await expect(triple).toHaveAttribute('aria-pressed', 'true');
  await nextFrames(page);
  await shot(page, FLOW, 7, 'endless-hud');

  // Into the warm-up's last waves: the line names what the next block brings.
  const wave = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    for (
      let i = 0;
      i < 60 && (sd.state()?.wave ?? 0) < 4 && sd.state()?.outcome === 'playing';
      i++
    ) {
      sd.fastForward(300);
    }
    return sd.state()?.wave ?? 0;
  });
  expect(wave).toBeGreaterThanOrEqual(4);
  await expect(next).toContainText('Then');
  await nextFrames(page);
  await shot(page, FLOW, 8, 'endless-block');

  // Give up: sell everything and let the waves through. The run ends on the score screen.
  const outcome = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.autoplay('none');
    const st = sd.state()!;
    for (let i = 0; i < st.towers.used; i++) {
      const t = st.towers.items[i]!;
      if (t.alive) sd.enqueue({ type: 'sell', towerUid: t.uid });
    }
    sd.fastForward(1);
    for (let k = 0; k < 120 && st.outcome === 'playing'; k++) sd.fastForward(600);
    return st.outcome;
  });
  expect(outcome).toBe('lost');
  const score = page.getByTestId('endless-score');
  await expect(score).toBeVisible();
  await expect(page.getByTestId('endless-score-seed')).toHaveText('Seed 31337 · New best.');
  // The save's only record is this run: no list to repeat it (T803e; it shows once another seed's
  // record is there to compare with).
  await expect(score.getByRole('list', { name: 'Your records' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Run it again' })).toBeFocused();
  await shot(page, FLOW, 9, 'endless-score');
  await page.getByRole('button', { name: 'Sector map' }).click();
  await expect(page.getByTestId('star-map')).toBeVisible();
  await page.getByTestId('endless-seed').fill('31337');
  await expect(page.getByTestId('endless-best')).toContainText('Best on this seed');
});
