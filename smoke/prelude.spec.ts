// The prelude, "Arrival" (T1001; design/core-loop.md § 1 and § 6.1; story-runtime.md § Dialogue in
// play): Start shift plays the seven shots in order (every still and frame, shot here), the lines
// moving on by themselves or with Next, the descent panning down, the still dimming on Form FF-1,
// then the intake rises. Skip and Esc go straight to the intake; Back → Title → Start shift skips
// it the second time; reduced motion rests the pan at its end and cuts the fades; Settings →
// "Watch the arrival" replays it over Settings, and Esc returns there. `?test=1` skips the
// prelude, so these specs turn it on with `&prelude=1` (it needs the intake and dialogue too).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { shot, waitForReady } from './hooks.ts';

const URL = '/?test=1&seed=1&intake=1&dialogue=1&prelude=1';
const FLOW = 'prelude';

/** The cue table's stills and frames, in the order the shots show them (ui/screens/prelude.ts). */
const SHOTS = [
  'scene.prelude_ad|ad',
  'scene.prelude_ad|small_print',
  'scene.freighter|cabin',
  'scene.viewport|ad_on',
  'scene.viewport|ad_off',
  'scene.descent|still',
  'scene.touchdown|one',
  'scene.touchdown|zero',
  'scene.dome_row|still',
  'scene.dome_row|wave',
  'scene.dome_row|gerald',
  'scene.dome_row|gerald|dim',
];

/** The staging's start lock (ms; prelude.ts PRELUDE_LOCK_MS) and a little over. */
const LOCK_WAIT_MS = 800;

const stage = (page: Page) => page.getByTestId('stage-prelude');
const sceneDialog = (page: Page) => page.getByRole('dialog', { name: 'Scene' });
const intake = (page: Page) => page.getByRole('main', { name: 'New hire intake' });

/** The stage's still and frame (and `dim` on Form FF-1), as one key. */
async function shown(page: Page): Promise<string | null> {
  return stage(page)
    .evaluate((el) => {
      const d = (el as unknown as { dataset: Record<string, string> }).dataset;
      const dim = (el as unknown as { classList: { contains(c: string): boolean } }).classList;
      return `${d['still']}|${d['frame']}${dim.contains('dim') ? '|dim' : ''}`;
    })
    .catch(() => null);
}

async function startShift(page: Page): Promise<void> {
  await page.goto(URL);
  await waitForReady(page);
  await page.getByRole('button', { name: 'Start shift' }).click();
  await expect(stage(page)).toBeVisible();
}

test('prelude: Start shift plays every shot in order, then the intake rises', async ({ page }) => {
  test.setTimeout(120_000);
  await startShift(page);
  await expect(sceneDialog(page)).toBeVisible();
  // The Skip for the whole scene, top right, always on show; Tab reaches it from Next.
  const skip = page.getByTestId('scene-skip');
  await expect(skip).toBeVisible();
  const box = await skip.boundingBox();
  const vp = page.viewportSize()!;
  expect(box!.x).toBeGreaterThan(vp.width / 2);
  expect(box!.y).toBeLessThan(vp.height / 4);
  await page.waitForTimeout(LOCK_WAIT_MS);
  const next = sceneDialog(page).getByRole('button', { name: 'Next' });
  await expect(next).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(skip).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(next).toBeFocused();

  const seen: string[] = [];
  let panned = false;
  for (let i = 0; i < 200; i++) {
    const key = await shown(page);
    if (key === null) break;
    if (seen.at(-1) !== key) {
      seen.push(key);
      // Past the 0.9 s crossfade, the still alone.
      await page.waitForTimeout(950);
      await shot(page, FLOW, seen.length, key.replaceAll('|', '-').replace('scene.', ''));
    }
    if (key.startsWith('scene.descent') && !panned) {
      // The descent tilts down 120 px in whole pixels while its lines play.
      const img = stage(page).locator('img[data-still="scene.descent"]');
      await expect(img).toHaveAttribute('data-pan', '120', { timeout: 15_000 });
      await shot(page, FLOW, seen.length, 'descent-panned');
      panned = true;
    }
    if (await next.isVisible().catch(() => false))
      await next.click({ timeout: 1000 }).catch(() => {});
    else await page.waitForTimeout(150);
  }
  expect(seen).toEqual(SHOTS);
  expect(panned).toBe(true);
  // The intake rises off the last line, the form to fill.
  await expect(intake(page)).toBeVisible();
  await expect(intake(page)).toHaveClass(/sd-intake-rise/);
  await expect(stage(page)).toHaveCount(0);
  await page.waitForTimeout(700);
  await shot(page, FLOW, seen.length + 1, 'intake');
});

test('prelude: Skip and Esc go straight to the intake; the second Start shift skips it', async ({
  page,
}) => {
  await startShift(page);
  // The start lock takes the press that started the shift: Esc does nothing at once.
  await page.keyboard.press('Escape');
  await expect(stage(page)).toBeVisible();
  await page.waitForTimeout(LOCK_WAIT_MS);
  await page.getByTestId('scene-skip').click();
  await expect(intake(page)).toBeVisible();
  await expect(stage(page)).toHaveCount(0);
  // Back to the Title, Start shift again: the prelude is held as seen.
  await intake(page).getByRole('button', { name: 'Back' }).click();
  await page.getByRole('button', { name: 'Start shift' }).click();
  await expect(intake(page)).toBeVisible();
  await expect(stage(page)).toHaveCount(0);

  // A fresh page: Esc past the lock skips the whole prelude too.
  await startShift(page);
  await page.waitForTimeout(LOCK_WAIT_MS);
  await page.keyboard.press('Escape');
  await expect(intake(page)).toBeVisible();
  await expect(stage(page)).toHaveCount(0);
});

test('prelude: reduced motion rests the pan at its end and cuts the fades', async ({ page }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await startShift(page);
  await page.waitForTimeout(LOCK_WAIT_MS);
  const next = sceneDialog(page).getByRole('button', { name: 'Next' });
  for (let i = 0; i < 80; i++) {
    const key = await shown(page);
    if (key === null || key.startsWith('scene.descent')) break;
    if (await next.isVisible().catch(() => false))
      await next.click({ timeout: 1000 }).catch(() => {});
    else await page.waitForTimeout(150);
  }
  const img = stage(page).locator('img[data-still="scene.descent"]').last();
  await expect(img).toHaveAttribute('data-pan', '120');
  // A cut: the new still is up alone at once, with no fade running.
  await expect(stage(page).locator('img')).toHaveCount(1);
  const animation = await img.evaluate(
    (el) =>
      (
        globalThis as unknown as { getComputedStyle(e: unknown): { animationName: string } }
      ).getComputedStyle(el).animationName,
  );
  expect(animation).toBe('none');
  await expect(stage(page)).toHaveAttribute('aria-label', /descent/i);
  await shot(page, FLOW, 20, 'reduced-motion-descent');
});

test('prelude: Settings → Watch the arrival replays it over Settings; Esc returns', async ({
  page,
}) => {
  await page.goto(URL);
  await waitForReady(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  const settings = page.getByRole('main', { name: 'Settings' });
  await expect(settings).toBeVisible();
  await settings.getByRole('button', { name: 'Watch the arrival' }).click();
  await expect(stage(page)).toBeVisible();
  await page.waitForTimeout(LOCK_WAIT_MS);
  await shot(page, FLOW, 21, 'replay');
  await page.keyboard.press('Escape');
  await expect(stage(page)).toHaveCount(0);
  await expect(settings).toBeVisible();
  // Nothing was saved: the Title still offers a new campaign only.
  await settings.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('button', { name: 'Start shift' })).toBeVisible();
});
