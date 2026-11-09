// Helpers for driving `window.__sd` from Node-side specs.
import type { Page } from '@playwright/test';
import type { TestHooks } from '../src/app/testHookTypes.ts';

declare global {
  // `page.evaluate` callbacks run in the page, where boot installs the hooks (only with ?test=1).
  var __sd: TestHooks | undefined;
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
