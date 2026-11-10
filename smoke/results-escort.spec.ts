// T510 (from T305c): an Escort's Results. The dev escort range (`?map=dev_escort`) played to its
// end with nothing built: the card lists the Evacuated meter in Core integrity's place (an Escort
// from the start has no core to defend), with the run's count of the map's refugees. Screenshot in
// test-results/screens/results-escort/.
import { expect, test } from './fixtures.ts';
import { shot, waitForReady } from './hooks.ts';

test('results-escort: an Escort lists Evacuated, not Core integrity', async ({ page }) => {
  await page.goto('/?test=1&map=dev_escort&seed=1');
  await waitForReady(page);
  const end = await page.evaluate(() => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    sd.enqueue({ type: 'callWave' });
    for (let i = 0; i < 200 && sd.state()?.outcome === 'playing'; i++) sd.fastForward(300);
    sd.fastForward(0); // the map has ended: its Results show at once
    const s = sd.state()!;
    return { outcome: s.outcome, evacuated: s.stats.evacuated };
  });
  expect(end.outcome).not.toBe('playing');
  const card = page.getByRole('dialog');
  await expect(card).toBeVisible();
  const escort = card.getByTestId('results-escort');
  await expect(escort).toContainText(new RegExp(`Evacuated\\s*${end.evacuated} / 12`));
  await expect(card).not.toContainText('Core integrity');
  await shot(page, 'results-escort', 1, 'card');
});
