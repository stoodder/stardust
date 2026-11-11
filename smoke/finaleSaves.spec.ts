// The finale's dev saves (T800b; meta-runtime.md § Dev saves) load into the app: the reference into
// the finale under each C4 answer, the choir's two extremes, and the saves after C5. Until the
// finale is registered each reaches the Sector map with the finale teased (they equal A3M6's).
// One screenshot per save in <out>/screens/finale-saves/.
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

const SAVES = [
  'after_a3m6_keep',
  'after_a3m6_purge',
  'after_a3m6_weakest',
  'after_a3m6_strongest',
  'after_fin_stay',
  'after_fin_go',
] as const;

test('the finale dev saves open on the Sector map', async ({ page }) => {
  for (const [i, id] of SAVES.entries()) {
    // oxlint-disable-next-line no-await-in-loop -- one save after another
    await page.goto(`/?test=1&seed=1&save=${id}`);
    // oxlint-disable-next-line no-await-in-loop -- one save after another
    await waitForReady(page);
    // oxlint-disable-next-line no-await-in-loop -- one save after another
    await expect(page.getByTestId('star-map'), id).toBeVisible();
    // oxlint-disable-next-line no-await-in-loop -- one save after another
    await expect(
      page.getByRole('list', { name: 'Shifts' }).getByRole('button', { name: /Clearing the Way/ }),
      id,
    ).toBeVisible();
    // oxlint-disable-next-line no-await-in-loop -- one save after another
    await nextFrames(page);
    // oxlint-disable-next-line no-await-in-loop -- one save after another
    await shot(page, 'finale-saves', i + 1, id);
  }
});
