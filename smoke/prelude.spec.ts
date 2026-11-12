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
  const el = stage(page);
  if ((await el.count()) === 0) return null;
  const [still, frame, cls] = await Promise.all([
    el.getAttribute('data-still', { timeout: 1000 }),
    el.getAttribute('data-frame', { timeout: 1000 }),
    el.getAttribute('class', { timeout: 1000 }),
  ]).catch(() => [null, null, null]);
  if (still === null || frame === null) return null;
  return `${still}|${frame}${(cls ?? '').split(' ').includes('dim') ? '|dim' : ''}`;
}

/**
 * One step through the prelude: notes what the stage shows (calling `onNew` as a still or frame
 * first comes up), then presses Next, or waits out a silence. Returns null once it has closed.
 */
async function stepOnce(
  page: Page,
  seen: string[],
  onNew: (key: string) => Promise<void>,
): Promise<string | null> {
  const key = await shown(page);
  if (key === null) return null;
  if (seen.at(-1) !== key) {
    seen.push(key);
    await onNew(key);
  }
  const next = sceneDialog(page).getByRole('button', { name: 'Next' });
  if (await next.isVisible().catch(() => false)) {
    await next.click({ timeout: 1000 }).catch(() => {});
  } else await page.waitForTimeout(150);
  return key;
}

/**
 * Whether the Skip is really on show (Playwright's `toBeVisible` counts `opacity: 0` as visible):
 * its own and every ancestor's opacity multiplied, its visibility, and what's hit at its centre.
 */
async function skipOnShow(
  page: Page,
): Promise<{ opacity: number; hit: boolean; visible: boolean }> {
  return page.getByTestId('scene-skip').evaluate((el) => {
    let opacity = 1;
    for (let n: Element | null = el; n !== null; n = n.parentElement)
      opacity *= Number(getComputedStyle(n).opacity);
    const r = el.getBoundingClientRect();
    const at = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return {
      opacity,
      hit: at !== null && el.contains(at),
      visible: getComputedStyle(el).visibility === 'visible',
    };
  });
}

async function startShift(page: Page): Promise<void> {
  await page.goto(URL);
  await waitForReady(page);
  await page.getByRole('button', { name: 'Start shift' }).click();
  await expect(stage(page)).toBeVisible();
}

test('prelude: Start shift plays every shot in order, then the intake rises', async ({ page }) => {
  test.setTimeout(240_000);
  await startShift(page);
  await expect(sceneDialog(page)).toBeVisible();
  // The Skip for the whole scene, top right, always on show (from the first frame, over the
  // lead-in's ad alone); Tab reaches it from Next.
  const skip = page.getByTestId('scene-skip');
  await expect(skip).toBeVisible();
  const first = await skipOnShow(page);
  expect(first.opacity).toBeGreaterThan(0.9);
  expect(first.hit).toBe(true);
  expect(first.visible).toBe(true);
  await shot(page, FLOW, 0, 'first-frame-skip');
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
  const onNew = async (key: string): Promise<void> => {
    // Past the 0.9 s crossfade, the still alone.
    await page.waitForTimeout(950);
    await shot(page, FLOW, seen.length, key.replaceAll('|', '-').replace('scene.', ''));
    if (key.startsWith('scene.descent')) {
      // The descent tilts down 120 px in whole pixels while its lines play.
      const img = stage(page).locator('img[data-still="scene.descent"]');
      await expect(img).toHaveAttribute('data-pan', '120', { timeout: 15_000 });
      await shot(page, FLOW, seen.length, 'descent-panned');
      panned = true;
    }
  };
  for (let i = 0; i < 200; i++) {
    // oxlint-disable-next-line no-await-in-loop -- each step depends on what the last one showed
    if ((await stepOnce(page, seen, onNew)) === null) break;
  }
  expect(seen).toEqual(SHOTS);
  expect(panned).toBe(true);
  // The intake rises off the last line, the form to fill, over Dome Row's dimmed still; the name
  // field has the focus.
  await expect(intake(page)).toBeVisible();
  await expect(intake(page)).toHaveClass(/sd-intake-rise/);
  await expect(stage(page)).toHaveCount(0);
  await expect(intake(page).locator('.sd-intake-backdrop')).toHaveCount(1);
  await expect(page.locator('#sd-intake-name')).toBeFocused();
  await page.waitForTimeout(150);
  await shot(page, FLOW, seen.length + 1, 'intake-rising');
  await page.waitForTimeout(700);
  await shot(page, FLOW, seen.length + 2, 'intake');
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

  // A fresh page: Esc past the lock skips the whole prelude too, and a double tap's second Esc
  // doesn't back out of the intake as it rises.
  await startShift(page);
  await page.waitForTimeout(LOCK_WAIT_MS);
  await page.keyboard.press('Escape');
  await expect(intake(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await expect(intake(page)).toBeVisible();
  await expect(stage(page)).toHaveCount(0);
});

test('prelude: reduced motion rests the pan at its end and cuts the fades', async ({ page }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await startShift(page);
  await page.waitForTimeout(LOCK_WAIT_MS);
  const seen: string[] = [];
  for (let i = 0; i < 80 && !(seen.at(-1) ?? '').startsWith('scene.descent'); i++) {
    // oxlint-disable-next-line no-await-in-loop -- each step depends on what the last one showed
    if ((await stepOnce(page, seen, () => Promise.resolve())) === null) break;
  }
  const img = stage(page).locator('img[data-still="scene.descent"]').last();
  await expect(img).toHaveAttribute('data-pan', '120');
  // A cut: the new still is up alone at once, with no fade running.
  await expect(stage(page).locator('img')).toHaveCount(1);
  await expect(img).toHaveCSS('animation-name', 'none');
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
  // Still in the lead-in (the ad alone): the Skip is on show.
  expect((await skipOnShow(page)).opacity).toBeGreaterThan(0.9);
  await shot(page, FLOW, 21, 'replay');
  await page.keyboard.press('Escape');
  await expect(stage(page)).toHaveCount(0);
  await expect(settings).toBeVisible();
  // The focus is back on the button that started it.
  await expect(settings.getByRole('button', { name: 'Watch the arrival' })).toBeFocused();
  // Nothing was saved: the Title still offers a new campaign only.
  await settings.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('button', { name: 'Start shift' })).toBeVisible();
});
