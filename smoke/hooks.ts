// Helpers for driving `window.__sd` from Node-side specs.
import type { Page } from '@playwright/test';
import type { TestHooks } from '../src/app/testHookTypes.ts';
import { outPath } from './out.ts';

declare global {
  // `page.evaluate` callbacks run in the page, where boot installs the hooks (only with ?test=1).
  var __sd: TestHooks | undefined;
  // Set by `holdFrames`, read by smoke/fixtures.ts's frame cap.
  var smokeHoldFrames: boolean | undefined;
  // The page's, for `page.evaluate` callbacks (the smoke tsconfig has no DOM lib).
  function requestAnimationFrame(cb: () => void): number;
}

/** Waits until boot has finished (`__sd.ready` resolved). */
export async function waitForReady(page: Page, timeoutMs = 10_000): Promise<void> {
  await page.waitForFunction(() => globalThis.__sd !== undefined, null, { timeout: timeoutMs });
  await page.evaluate(() => globalThis.__sd?.ready);
}

/**
 * Stops the page drawing frames (smoke/fixtures.ts `capFrames`): for a test whose work runs off the
 * frame loop, such as the audio's offline renders, so the idle canvas doesn't compete for the CPU.
 * Nothing that waits on a frame (`nextFrames`, the sim at speed, a screenshot of motion) moves
 * while held.
 */
export async function holdFrames(page: Page): Promise<void> {
  await page.evaluate(() => {
    globalThis.smokeHoldFrames = true;
  });
}

/** Saves a screenshot to `<out>/screens/<flow>/<nn>-<step>.png` (smoke/out.ts). */
export async function shot(page: Page, flow: string, n: number, step: string): Promise<void> {
  const nn = String(n).padStart(2, '0');
  await page.screenshot({ path: outPath(`screens/${flow}/${nn}-${step}.png`) });
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
