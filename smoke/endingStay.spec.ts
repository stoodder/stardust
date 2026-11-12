// T810, the campaign's close under Stay (story/campaign/finale.md § FIN; core-loop.md § 6.8): the
// strongest choir into the finale (`after_a3m6_strongest`: Thrum spared, the Returned, the warren,
// C4 Rewrite), its win shown by the results fixture with dialogue on. Dawn plays first and Esc
// can't skip it (dawn → mote → visor); then the card; Continue opens Sterling's memo, then C5 at
// first light (the KFA's form, the voices, the two lines); "We stay." Then the epilogue (Esc skips
// nothing; a click moves on a card): the world card under Stay, Thrum's card, the counter's flip
// to REMEMBERED, the credits, and the final image (PERIMETER STATUS: OPEN over Wayside); then the
// Sector map at dawn. Screenshots in <out>/screens/ending-stay/ (look at every one).
import { expect, test } from './fixtures.ts';
import { answerC5, playDawn, watchEpilogueThrough, winFinale } from './ending.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

const FLOW = 'ending-stay';

test('the close under Stay: Dawn, the memo, C5, the epilogue, the post-game star map', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.goto('/?test=1&dialogue=1&fasttext=1&seed=1&save=after_a3m6_strongest');
  await waitForReady(page);
  await expect(page.getByTestId('star-map')).toBeVisible();

  await winFinale(page);
  await playDawn(page, FLOW, 1);

  // The card, then Continue: Sterling's farewell, on Everglow's letterhead.
  const onward = page.getByRole('button', { name: 'Continue' });
  await expect(onward).toBeVisible();
  await nextFrames(page);
  await shot(page, FLOW, 4, 'results');
  await onward.click();
  const memo = page.getByTestId('ending-memo');
  await expect(memo).toBeVisible();
  await expect(memo).toContainText('Clean Exit Complete!');
  await shot(page, FLOW, 5, 'memo');
  await page.waitForTimeout(800); // its Continue waits a beat
  await memo.getByRole('button', { name: 'Continue' }).click();

  await answerC5(page, FLOW, 6, 'We stay. We keep the way open.');
  const cards = await watchEpilogueThrough(page, FLOW, 9, 'stay');
  expect(cards[0]).toMatch(/^The domes on the Long Walk came down/);
  // Spared: Thrum's card; the warren: Bricks's hum; Rewrite + Stay: QUILL keeps the Halls' records.
  expect(cards.join('\n')).toContain('Old Thrum lived to see three more Long Walks');
  expect(cards.join('\n')).toContain("It translates, roughly, to 'Bricks.'");
  expect(cards.join('\n')).toContain("It keeps the Halls' records now");
  for (const c of cards) expect(c).not.toMatch(/[{}]/);
  await expect(page.getByText('PERIMETER STATUS: OPEN')).toHaveCount(0);

  // The post-game star map (the Sector map at dawn until T863).
  await expect(page.getByTestId('star-map')).toBeVisible();
  await nextFrames(page);
  await shot(page, FLOW, 14, 'post-game');
});
