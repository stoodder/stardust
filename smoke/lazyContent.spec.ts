// The story's lazy acts and the battle renderer (T802; architecture.md § 5, *Bundle*): a player's
// game loads Act II, Act III, the finale, and the battle renderer only as a screen needs them
// (app/contentGate.ts), so the Title loads none of the later acts, and an Act I campaign never
// loads Act III or the finale. `&lazy=1` makes a test boot load as a player's game does (a test
// boot otherwise holds every act up front for its hooks).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { shot, waitForReady } from './hooks.ts';

type Chunk = 'a2' | 'a3' | 'fin' | 'BattleScene';

/** Records which lazy chunks the page fetches (by Vite's chunk file names: `assets/a2-<hash>.js`). */
function trackChunks(page: Page): Set<Chunk> {
  const seen = new Set<Chunk>();
  page.on('request', (r) => {
    const m = /\/assets\/(a2|a3|fin|BattleScene)-[\w-]+\.js$/.exec(r.url());
    if (m !== null) seen.add(m[1] as Chunk);
  });
  return seen;
}

/** Lets the page's idle-time preloads run (requestIdleCallback, or a 200 ms timer). */
async function settle(page: Page): Promise<void> {
  await page.waitForTimeout(1500);
}

test('lazy content: the Title loads no later act; idle time preloads Act II and the renderer', async ({
  page,
}) => {
  const chunks = trackChunks(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Stardust' })).toBeVisible();
  await settle(page);
  expect(chunks.has('a3')).toBe(false);
  expect(chunks.has('fin')).toBe(false);
  // Ahead of need: the next act a new game reaches, and the battle renderer.
  expect([...chunks].toSorted()).toEqual(['BattleScene', 'a2']);
});

test('lazy content: an Act I campaign plays without Act III or the finale', async ({ page }) => {
  const chunks = trackChunks(page);
  await page.goto('/?test=1&lazy=1&seed=1&save=after_a1m3');
  await waitForReady(page);
  // A battle on an Act I map waits for Act II (a run's end may open it) and the renderer.
  await page.evaluate(() => globalThis.__sd!.goto('battle'));
  expect(await page.evaluate(() => globalThis.__sd!.state()?.mapId)).toBe('a1_m01');
  await settle(page);
  expect(chunks.has('a2')).toBe(true);
  expect(chunks.has('BattleScene')).toBe(true);
  expect(chunks.has('fin')).toBe(false);
});

test("lazy content: an Act III save's Shift board and Journal show Act III's entries", async ({
  page,
}) => {
  const chunks = trackChunks(page);
  await page.goto('/?test=1&lazy=1&seed=1&save=after_a3m1_spared');
  await waitForReady(page);
  expect(chunks.has('a2')).toBe(true);
  expect(chunks.has('a3')).toBe(true);
  await page.evaluate(() => globalThis.__sd!.goto('base'));
  await expect(page.getByRole('heading', { name: 'Base' })).toBeVisible();
  await page.getByRole('tab', { name: /^Journal/ }).click();
  const journal = page.getByRole('navigation', { name: 'Field Journal entries' });
  await expect(journal).toContainText('Field Journal');
  await shot(page, 'lazy-content', 1, 'act-three-journal');
});

test("lazy content: the finale's battle loads its chunk before its first frame", async ({ page }) => {
  const chunks = trackChunks(page);
  await page.goto('/?test=1&lazy=1&seed=1&map=fin_m01&skipIntro=1');
  await waitForReady(page);
  expect(chunks.has('fin')).toBe(true);
  expect(chunks.has('BattleScene')).toBe(true);
  expect(await page.evaluate(() => globalThis.__sd!.state()?.mapId)).toBe('fin_m01');
});
