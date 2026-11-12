// T810, the campaign's close under Go, then a replay (story/campaign/finale.md § FIN; core-loop.md
// § 6.8): the weakest choir into the finale (`after_a3m6_weakest`: the Quiet Wave cleared, C2 Sell,
// the convoy, C4 Purge), its win by the results fixture with dialogue on: Dawn (unskippable), the
// card, the memo, C5 ("We go.", by its badge's 2 key; D156), the epilogue (the freighter, Pebble
// leading the song, the lighthouse, Purge + Go's QUILL, Bricks's jar), the final image from orbit,
// the Sector map, and the post-game one at dawn from `after_fin_go`. Then `after_fin_go` (C5
// answered) wins it again: Dawn now skips with Esc, and Continue goes straight to the star map,
// with no memo, no C5, and no epilogue. All of it under reduced motion.
// Screenshots in <out>/screens/ending-go/.
import { expect, test } from './fixtures.ts';
import { answerC5, playDawn, watchEpilogueThrough, winFinale } from './ending.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

const FLOW = 'ending-go';

test('the close under Go, then a replay that skips C5', async ({ page }) => {
  test.setTimeout(180_000);
  // Under reduced motion (the Stay flow plays it moving): cuts, no slides, the roll a block at a
  // time, the relay held still.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?test=1&dialogue=1&fasttext=1&seed=1&save=after_a3m6_weakest');
  await waitForReady(page);
  await expect(page.getByTestId('star-map')).toBeVisible();

  await winFinale(page);
  await playDawn(page, FLOW, 1);
  await page.getByRole('button', { name: 'Continue' }).click();
  const memo = page.getByTestId('ending-memo');
  await expect(memo).toBeVisible();
  await page.waitForTimeout(800);
  await memo.getByRole('button', { name: 'Continue' }).click();

  await answerC5(page, FLOW, 4, 'We go. We leave them their road.', 'digit');
  const cards = await watchEpilogueThrough(page, FLOW, 7, 'go');
  expect(cards[0]).toMatch(/^The last freighter lifted at first light/);
  const all = cards.join('\n');
  expect(all).toContain('Pebble leads the Leaving Song now');
  expect(all).toContain('SOMEONE');
  expect(all).toContain("'Why did the scarecrow win an award?'");
  // A lettuce arrival under Go: the `you` slot's catch-all, Bricks's jar (its last stone).
  expect(all).toContain('Just a stone.');
  for (const c of cards) expect(c).not.toMatch(/[{}]/);
  // The star map the fixture returns to; then the post-game one at dawn, from the save a won
  // finale under Go leaves (the fixture writes nothing), as the Stay flow shoots it.
  await expect(page.getByTestId('star-map')).toBeVisible();
  await page.goto('/?test=1&seed=1&save=after_fin_go');
  await waitForReady(page);
  await expect(page.getByTestId('post-game')).toBeVisible();
  await expect(page.getByTestId('star-map')).toHaveAttribute('data-phase', 'dawn');
  await nextFrames(page);
  await shot(page, FLOW, 12, 'post-game');

  // A replay: C5 answered, Dawn seen. Esc skips Dawn now, and the card goes on to the star map.
  await page.goto('/?test=1&dialogue=1&fasttext=1&seed=1&save=after_fin_go');
  await waitForReady(page);
  await winFinale(page);
  await expect(page.getByTestId('stage-dawn')).toBeVisible();
  await page.keyboard.press('Escape');
  const onward = page.getByRole('button', { name: 'Continue' });
  await expect(onward).toBeVisible();
  await shot(page, FLOW, 13, 'replay-results');
  await onward.click();
  await expect(page.getByTestId('star-map')).toBeVisible();
  await expect(page.getByTestId('ending-memo')).toHaveCount(0);
  await expect(page.getByTestId('stage-c5')).toHaveCount(0);
  await expect(page.getByTestId('epilogue')).toHaveCount(0);
});
