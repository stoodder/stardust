// T730b (exploratory first pass): screenshots of A3M4–A3M6 at setup.
import type { Page } from '@playwright/test';
import { test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

async function open(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await waitForReady(page);
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
    sd.fastForward(0);
  });
  await nextFrames(page);
}

test('explore', async ({ page }) => {
  await open(page, '/?test=1&seed=1&save=after_a3m3_convoy&map=a3_m04');
  await shot(page, 'explore', 1, 'a3m4-convoy');
  await open(page, '/?test=1&seed=1&save=after_a3m3_warren&map=a3_m04');
  await shot(page, 'explore', 2, 'a3m4-warren');
  await open(page, '/?test=1&seed=1&save=after_a3m4_keep&map=a3_m05');
  await shot(page, 'explore', 3, 'a3m5');
  await open(page, '/?test=1&seed=1&save=after_a3m5_keep&map=a3_m06');
  await shot(page, 'explore', 4, 'a3m6');
});
