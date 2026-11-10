// Act II's close (T512; act2.md § A2M6, core-loop.md § 1.1 and § 6.6): A2M6's Results (the results
// fixture, `__sd.results`, on the after_a2m6 save) → Continue → the stinger over the dark (a held
// beat, the PA's "Shift change.", the caption as the jingle plays once in its minor arrangement,
// then a beat while it rings out) → the base, with no Bounty tab (it retires with Act II, without
// comment; after_a2m5's base still has it) → the Sector map at night: the `act3` phase and Act
// III's theme, Sundown cleared under the marker, *The Preserve* (A3M1) as its Coming soon teaser
// with no Start, the Long Walk named, and nothing past the teaser. Screenshots in
// <out>/screens/act2-close/ (look at them: the dark stinger and the night chart are the point).
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

const node = (page: import('@playwright/test').Page, name: string) =>
  page.getByRole('list', { name: 'Shifts' }).getByRole('button', {
    name: new RegExp(`^Shift \\d+, ${name}, `),
  });

test("act II's close: A2M6's card → the PA's minor stinger → the base → the night Sector map", async ({
  page,
}) => {
  await page.goto('/?test=1&dialogue=1&fasttext=1&audio=1&seed=1&save=after_a2m6');
  await waitForReady(page);
  void page.evaluate(() => globalThis.__sd!.results({ map: 'a2_m06', outcome: 'won' }));
  const card = page.getByRole('dialog', { name: 'PERIMETER SECURED!' });
  await expect(card).toBeVisible();
  await expect(card).toContainText('Be awake.');
  // Leaving the card is the gesture that unlocks the audio.
  await card.getByRole('button', { name: 'Continue' }).click();

  const scene = page.getByRole('dialog', { name: 'Scene' });
  await expect(scene).toBeVisible();
  // The dark first, then the PA (the silence moves on by itself).
  await expect(scene).toContainText('Shift change.', { timeout: 5000 });
  await nextFrames(page);
  await shot(page, 'act2-close', 1, 'stinger-pa');
  const status = () => page.evaluate(() => globalThis.__sd!.audio.status());
  // The jingle in minor: the PA's arrangement (audio/storyCues.ts `PA_JINGLE_CUE`), else the
  // wave-clear one's (`minor_sting`).
  const minorJingles = async (): Promise<number> => {
    const played = (await status()).played;
    return (played['cue:pa_shift_minor'] ?? 0) + (played['cue:minor_sting'] ?? 0);
  };
  expect(await minorJingles()).toBe(0);
  const next = scene.getByRole('button', { name: /^(Next|Skip)$/ });
  await expect(next).toHaveText('Next');
  await next.click();
  await expect(scene).toContainText('The jingle plays once, over the dark. In minor.');
  // The jingle, in minor, as the caption shows: once, and never Act I's bright sting.
  await expect.poll(minorJingles).toBe(1);
  expect((await status()).played).not.toHaveProperty('cue:bright_sting');
  await nextFrames(page);
  await shot(page, 'act2-close', 2, 'stinger-jingle');
  await expect(next).toHaveText('Next');
  await next.click();
  // A held beat while it rings out, then the base (the dev save has seen QUILL's loophole and
  // Pebble's hum, so it opens clear: app/baseScenes.test.ts).
  await expect(scene).toBeHidden({ timeout: 6000 });
  await expect(page.getByRole('heading', { name: 'Base' })).toBeVisible();
  expect(await minorJingles()).toBe(1);

  // The Bounty Board is gone, with no message.
  const tabs = page.getByRole('tablist', { name: 'Base' });
  await expect(tabs.getByRole('tab', { name: 'Inbox' })).toBeVisible();
  await expect(tabs.getByRole('tab', { name: 'Bounty' })).toHaveCount(0);

  // The Sector map at night: Act III's phase and theme, the teaser selected and focused.
  await page.getByRole('button', { name: 'Sector map' }).click();
  const map = page.getByTestId('star-map');
  await expect(map).toHaveAttribute('data-phase', 'act3');
  await expect(map).toHaveAttribute('data-act', '3');
  await expect(node(page, 'Sundown')).toHaveAttribute('aria-current', 'location');
  const teaser = node(page, 'The Preserve');
  await expect(teaser).toHaveAccessibleName(
    'Shift 12, The Preserve, The Preserve. Coming soon. The Hollow is inside the Preserve, ' +
      'where you led them. Get them out.',
  );
  await expect(teaser).toBeFocused();
  const panel = page.getByRole('region', { name: 'The Preserve' });
  await expect(panel).toContainText('Coming soon');
  await expect(panel).toContainText(
    'The Hollow is inside the Preserve, where you led them. Get them out.',
  );
  await expect(panel.getByRole('button')).toHaveCount(0);
  await expect(page.getByText('The Long Walk', { exact: true })).toBeAttached();
  // Nothing past the teaser is named anywhere on the page.
  for (const later of ['License Revoked', 'The Gap', 'Empty Slot']) {
    // oxlint-disable-next-line no-await-in-loop -- one assertion per name
    await expect(page.locator('body')).not.toContainText(later);
  }
  // A region label the panel would cover hides under it, never shows through it.
  const visibleUnder = await page.evaluate(() => {
    const p = document.querySelector('.sd-star-panel')?.getBoundingClientRect();
    if (p === undefined) return ['no panel'];
    return [...document.querySelectorAll<HTMLElement>('.sd-star-region')]
      .filter((el) => getComputedStyle(el).visibility !== 'hidden')
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.left < p.right && p.left < r.right && r.top < p.bottom && p.top < r.bottom;
      })
      .map((el) => el.textContent ?? '');
  });
  expect(visibleUnder).toEqual([]);
  await page.waitForTimeout(650); // the marker's walk, if it had one to make
  await nextFrames(page);
  await shot(page, 'act2-close', 3, 'night-sector-map');
});

test("act II's close: the Bounty Board stays through A2M5 and retires once A2M6 is won", async ({
  page,
}) => {
  await page.goto('/?test=1&seed=1&save=after_a2m5');
  await waitForReady(page);
  await page.getByRole('button', { name: 'Base' }).click();
  const tabs = page.getByRole('tablist', { name: 'Base' });
  await tabs.getByRole('tab', { name: 'Bounty' }).click();
  await expect(page.getByText('(on assignment: Reclamation)')).toBeVisible();
  await page.goto('/?test=1&seed=1&save=after_a2m6');
  await waitForReady(page);
  await expect(page.getByTestId('star-map')).toHaveAttribute('data-phase', 'act3');
  await page.getByRole('button', { name: 'Base' }).click();
  await expect(tabs.getByRole('tab', { name: 'Research' })).toBeVisible();
  await expect(tabs.getByRole('tab', { name: 'Bounty' })).toHaveCount(0);
});
