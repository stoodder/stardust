// T202d: the tower panel's modified stats and bonus lines, high ground, link tethers, the tier-4
// choice, the HUD's medal tracker, and the briefing's medals and threat intel. Runs A1M1 with the
// all_unlocked dev save (`?test=1&save=all_unlocked&map=a1_m01`: every tower and spec owned), and
// once without a save (the choice locked). Screenshots in test-results/screens/specs/.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

/** A1M1's high-ground tile, and the pad beside it (a Crossfire partner). */
const HIGH = [7, 2] as const;
const BESIDE = [6, 2] as const;

interface TowerRow {
  readonly uid: number;
  readonly tier: number;
  readonly spec: string | null;
  readonly col: number;
  readonly row: number;
}

const towers = (page: Page): Promise<TowerRow[]> =>
  page.evaluate(() =>
    (globalThis.__sd?.state()?.towers.items ?? [])
      .filter((t) => t.alive)
      .map((t) => ({ uid: t.uid, tier: t.tier, spec: t.spec, col: t.col, row: t.row })),
  );

/** Clicks tile (c, r) where it's drawn (a raised tile's top face for high ground). */
async function clickTile(page: Page, [c, r]: readonly [number, number]): Promise<void> {
  const p = await page.evaluate(([x, y]) => globalThis.__sd?.tileToClient(x, y) ?? null, [
    c,
    r,
  ] as const);
  expect(p).not.toBeNull();
  await page.mouse.click(p!.x, p!.y); // checked just above
}

/** Opens A1M1 (with a dev save, or none), checks the briefing, and clocks in, paused. */
async function open(page: Page, save: string | null): Promise<void> {
  await page.goto(`/?test=1&seed=1&map=a1_m01${save === null ? '' : `&save=${save}`}`);
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate(() => globalThis.__sd?.setSpeed(0));
}

async function clockIn(page: Page): Promise<void> {
  const briefing = page.getByRole('dialog', { name: 'Shift briefing' });
  await briefing.getByRole('button', { name: 'Clock in' }).click();
  await expect(briefing).toBeHidden();
}

test('specs: the briefing shows the medals and the threat intel', async ({ page }) => {
  await open(page, 'all_unlocked');
  const briefing = page.getByRole('dialog', { name: 'Shift briefing' });
  await expect(briefing).toBeVisible();
  const intel = briefing.getByTestId('threat-intel');
  await expect(intel).toContainText('Fast');
  // The medals by name in view (D156: their names are jokes); what earns each, one press away.
  const row = briefing.getByTestId('briefing-medal-row');
  await expect(row.getByRole('listitem')).toHaveCount(3);
  await expect(row).toContainText('Teamwork Makes the Dream Work');
  const toggle = briefing.getByRole('button', { name: /what earns each medal$/ });
  await expect(toggle).toHaveText(/What earns them · 3 on file/);
  await toggle.click();
  const medals = briefing.getByTestId('briefing-medals');
  await expect(medals.getByRole('listitem')).toHaveCount(3);
  await expect(medals).toContainText('Victory');
  await expect(medals).toContainText('Perfect Core');
  await expect(medals).toContainText('Teamwork Makes the Dream Work');
  await expect(medals).toContainText('Win with a Crossfire link active.');
  // The dev save has won A1M1 with every medal: each is on file.
  await expect(medals.getByText('On file')).toHaveCount(3);
  await shot(page, 'specs', 1, 'briefing');
});

test('specs: high ground, a Crossfire tether, and the tier-4 choice', async ({ page }) => {
  await open(page, 'all_unlocked');
  await clockIn(page);
  const tracker = page.getByRole('list', { name: /^Medals:/ });
  await expect(tracker.getByRole('listitem')).toHaveCount(3);

  // A Rivet on A1M1's high ground, taken to tier 3; clicking the raised block selects it.
  await page.evaluate(([c, r]) => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    sd.enqueue({ type: 'build', tile: [c, r], tower: 'rivet' });
    sd.fastForward(0);
  }, HIGH);
  const rivet = (await towers(page))[0]!; // built above
  await page.evaluate((uid) => {
    const sd = globalThis.__sd!; // installed
    sd.enqueue({ type: 'upgrade', towerUid: uid });
    sd.enqueue({ type: 'upgrade', towerUid: uid });
    sd.fastForward(0);
  }, rivet.uid);
  await clickTile(page, HIGH);
  const panel = page.getByRole('region', { name: 'Rivet tower' });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('+25% range (high ground)');
  await expect(panel).toContainText('Specialize: pick one');
  await nextFrames(page);
  await shot(page, 'specs', 2, 'high-ground');

  // Earn the credits and the Thumper (it ships at W3's countdown on A1M1): play the waves at
  // their own pace until both are there.
  await page.evaluate(() => {
    const sd = globalThis.__sd!; // installed
    sd.enqueue({ type: 'callWave' });
    for (let i = 0; i < 600; i++) {
      const s = sd.state()!; // a battle is running
      if (s.credits >= 125 + 300 && s.lockedTowers.length === 0) break;
      sd.fastForward(30);
    }
  });
  const state = await page.evaluate(() => {
    const s = globalThis.__sd!.state()!; // a battle is running
    return { credits: s.credits, locked: s.lockedTowers.length, outcome: s.outcome };
  });
  expect(state.outcome).toBe('playing');
  expect(state.locked).toBe(0);
  expect(state.credits).toBeGreaterThanOrEqual(425);

  // A Thumper beside it links them (Crossfire): the tether shows, and the panel says so.
  await page.evaluate(([c, r]) => {
    const sd = globalThis.__sd!; // installed
    sd.enqueue({ type: 'build', tile: [c, r], tower: 'thumper' });
    sd.fastForward(1); // the links system runs on the tick
  }, BESIDE);
  expect(
    await page.evaluate(() => globalThis.__sd?.state()?.linkPairs.length ?? 0),
  ).toBeGreaterThan(0);
  await clickTile(page, HIGH);
  await expect(panel).toContainText('+10% rate (Crossfire)');
  await nextFrames(page);
  await shot(page, 'specs', 3, 'linked');

  // Specialize: Railspike. The tower is tier 4 with its spec's name on the panel.
  await panel.getByRole('button', { name: /^Specialize: Railspike/ }).click();
  await expect
    .poll(async () => (await towers(page)).find((t) => t.uid === rivet.uid)?.spec)
    .toBe('b');
  const spec = page.getByRole('region', { name: 'Railspike tower' });
  await expect(spec).toBeVisible();
  await expect(spec).toContainText('T4');
  await nextFrames(page);
  await shot(page, 'specs', 4, 'railspike');

  // Selling the Thumper breaks the link.
  const thumper = (await towers(page)).find((t) => t.col === BESIDE[0] && t.row === BESIDE[1])!;
  await page.evaluate((uid) => {
    const sd = globalThis.__sd!; // installed
    sd.enqueue({ type: 'sell', towerUid: uid });
    sd.fastForward(1);
  }, thumper.uid);
  expect(await page.evaluate(() => globalThis.__sd?.state()?.linkPairs.length ?? -1)).toBe(0);
  await nextFrames(page);
  await shot(page, 'specs', 5, 'unlinked');
});

test('specs: without the unlock the choice is locked and says what opens it', async ({ page }) => {
  await open(page, null);
  await clockIn(page);
  await page.evaluate(() => {
    const sd = globalThis.__sd!; // installed
    sd.enqueue({ type: 'build', tile: [6, 1], tower: 'rivet' });
    sd.fastForward(0);
  });
  const rivet = (await towers(page))[0]!; // built above
  await page.evaluate((uid) => {
    const sd = globalThis.__sd!; // installed
    sd.enqueue({ type: 'upgrade', towerUid: uid });
    sd.enqueue({ type: 'upgrade', towerUid: uid });
    sd.fastForward(0);
  }, rivet.uid);
  await clickTile(page, [6, 1]);
  const panel = page.getByRole('region', { name: 'Rivet tower' });
  await expect(panel).toContainText(/Engineering unlocks\s*after The Audit/);
  const storm = panel.getByRole('button', { name: /^Specialize: Rivet Storm/ });
  await expect(storm).toHaveAttribute('aria-disabled', 'true');
  // Pressing it anyway: the sim refuses, and the notice says so.
  await storm.click({ force: true });
  await expect(page.getByText('Specialization locked')).toBeVisible();
  await shot(page, 'specs', 6, 'locked');
});
