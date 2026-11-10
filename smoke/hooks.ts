// Helpers for driving `window.__sd` from Node-side specs.
import type { Page } from '@playwright/test';
import type { TestHooks } from '../src/app/testHookTypes.ts';

declare global {
  // `page.evaluate` callbacks run in the page, where boot installs the hooks (only with ?test=1).
  var __sd: TestHooks | undefined;
  // The page's, for `page.evaluate` callbacks (the smoke tsconfig has no DOM lib).
  function requestAnimationFrame(cb: () => void): number;
}

/** Waits until boot has finished (`__sd.ready` resolved). */
export async function waitForReady(page: Page, timeoutMs = 10_000): Promise<void> {
  await page.waitForFunction(() => globalThis.__sd !== undefined, null, { timeout: timeoutMs });
  await page.evaluate(() => globalThis.__sd?.ready);
}

/** Saves a screenshot to `test-results/screens/<flow>/<nn>-<step>.png`. */
export async function shot(page: Page, flow: string, n: number, step: string): Promise<void> {
  const nn = String(n).padStart(2, '0');
  await page.screenshot({ path: `test-results/screens/${flow}/${nn}-${step}.png` });
}

/** Waits for two animation frames, so the canvas shows the sim state as it now stands. */
export async function nextFrames(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

/**
 * Opens a map from the campaign screen, whichever it is (D102): on the Shift board, its row's
 * Start or Replay; on the star map (the Sector map, once A1M5 is won), its node, then the panel's
 * Start or Replay. `name` is the map's display name.
 */
export async function playShift(page: Page, name: string): Promise<void> {
  await page.getByRole('heading', { name: /^(Shift board|Sector map)$/ }).waitFor();
  const shifts = page.getByRole('list', { name: 'Shifts' });
  const node = shifts.getByRole('button', { name: new RegExp(`^Shift \\d+, ${name}, `) });
  if ((await node.count()) > 0) {
    await node.click();
    await page.getByRole('button', { name: new RegExp(`^(Start|Replay) ${name}$`) }).click();
  } else {
    await shifts.getByRole('listitem').filter({ hasText: name }).getByRole('button').click();
  }
}
