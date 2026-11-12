// T810's smoke helpers: the finale's close played from a results fixture (`__sd.results`, a won
// `fin_m01` over a save into the finale: nothing is written, and C5's pick carries to the
// epilogue), with dialogue on. Each step is screenshotted for a look: Dawn's three frames, the
// card, Sterling's memo, C5's form and its two lines, an epilogue card, the counter at zero and
// flipped, the credits, the final image by ending, and the post-game star map.
import type { Page } from '@playwright/test';
import { expect } from './fixtures.ts';
import { nextFrames, shot } from './hooks.ts';

/** Shows a won finale's Results over the save in play (the fixture's flow: Dawn first). */
export async function winFinale(page: Page): Promise<void> {
  // Not awaited: the fixture resolves once the card shows, after Dawn has played.
  await page.evaluate(() => {
    void globalThis.__sd!.results({ map: 'fin_m01', outcome: 'won' });
  });
}

/** Presses the scene's Next until `done` holds (at most `max` presses). */
export async function nextUntil(page: Page, done: () => Promise<boolean>, max = 40): Promise<void> {
  for (let i = 0; i < max; i++) {
    // oxlint-disable-next-line no-await-in-loop -- one press after another
    if (await done()) return;
    // oxlint-disable-next-line no-await-in-loop -- one press after another
    await page.locator('.dlg-next').click();
  }
  expect(await done()).toBe(true);
}

/** Dawn, unskippable the first time: Esc does nothing; Next walks it dawn → mote → visor. */
export async function playDawn(page: Page, flow: string, first: number): Promise<void> {
  const stage = page.getByTestId('stage-dawn');
  await expect(stage).toBeVisible();
  await expect(page.locator('.dlg-next')).toBeVisible();
  await expect(stage).toHaveAttribute('data-frame', 'dawn');
  await nextFrames(page);
  await shot(page, flow, first, 'dawn');
  const before = await page.getByTestId('scene').innerText();
  await page.keyboard.press('Escape');
  await expect(stage).toBeVisible();
  expect(await page.getByTestId('scene').innerText()).toBe(before);
  const frame = (f: string) => async () => (await stage.getAttribute('data-frame')) === f;
  await nextUntil(page, frame('mote'));
  await page.waitForTimeout(1000); // the crossfade
  await shot(page, flow, first + 1, 'dawn-mote');
  await nextUntil(page, frame('visor'));
  await page.waitForTimeout(1000);
  await shot(page, flow, first + 2, 'dawn-visor');
  await nextUntil(page, async () => (await stage.count()) === 0);
}

/**
 * C5 at first light: the KFA's clauses filed on the form, the voices, then the two lines (no
 * "will remember"); takes `answer`.
 */
export async function answerC5(
  page: Page,
  flow: string,
  first: number,
  answer: 'We stay. We keep the way open.' | 'We go. We give it back.',
): Promise<void> {
  const stage = page.getByTestId('stage-c5');
  await expect(stage).toBeVisible();
  await page.waitForTimeout(1600); // the lead-in: dawn alone
  await shot(page, flow, first, 'c5-dawn');
  await nextUntil(page, async () => (await stage.getAttribute('data-clauses')) === '4');
  await shot(page, flow, first + 1, 'c5-form');
  const option = page.getByRole('button', { name: answer });
  await nextUntil(page, async () => (await option.count()) > 0);
  await expect(page.getByRole('button', { name: /^We (stay|go)\./ })).toHaveCount(2);
  await shot(page, flow, first + 2, 'c5-choice');
  await page.waitForTimeout(800); // the story choice's lock
  await option.click();
  await expect(page.getByText(/will remember/i)).toHaveCount(0);
}

/**
 * The epilogue, the first time: Esc skips nothing; a click moves on one beat. Returns the cards'
 * texts. Screenshots the first card, the counter at zero and flipped, the credits, the final image.
 */
export async function watchEpilogueThrough(
  page: Page,
  flow: string,
  first: number,
  ending: 'stay' | 'go',
): Promise<string[]> {
  const epi = page.getByTestId('epilogue');
  await expect(epi).toBeVisible();
  await expect(epi).toHaveAttribute('data-beat', 'card');
  await page.waitForTimeout(700);
  await shot(page, flow, first, 'epilogue-card');
  await page.keyboard.press('Escape');
  await expect(epi).toHaveAttribute('data-index', '0');
  const cards: string[] = [];
  for (let i = 0; i < 20; i++) {
    // oxlint-disable-next-line no-await-in-loop -- one card after another
    if ((await epi.getAttribute('data-beat')) !== 'card') break;
    // oxlint-disable-next-line no-await-in-loop -- one card after another
    cards.push(await page.getByTestId('epilogue-card').innerText());
    // oxlint-disable-next-line no-await-in-loop -- one card after another
    await epi.click();
  }
  await expect(epi).toHaveAttribute('data-beat', 'counter');
  const counter = page.getByTestId('epilogue-counter');
  await expect(counter).toHaveText('PESTS PROCESSED: 0');
  await page.waitForTimeout(700);
  await shot(page, flow, first + 1, 'counter-zero');
  await expect(counter).toHaveAttribute('data-flipped', 'true', { timeout: 5000 });
  await expect(counter).toHaveText(/^REMEMBERED: [\d,]+$/);
  await page.waitForTimeout(600);
  await shot(page, flow, first + 2, 'counter-remembered');
  await epi.click();
  await expect(epi).toHaveAttribute('data-beat', 'credits');
  await page.waitForTimeout(6000); // the roll climbs into view
  await shot(page, flow, first + 3, 'credits');
  await epi.click();
  await expect(epi).toHaveAttribute('data-beat', 'final');
  await expect(page.getByTestId('epilogue-final')).toHaveAttribute('data-ending', ending);
  await page.waitForTimeout(1400); // its fade
  await shot(page, flow, first + 4, `final-${ending}`);
  await epi.click();
  await expect(epi).toHaveCount(0);
  return cards;
}
