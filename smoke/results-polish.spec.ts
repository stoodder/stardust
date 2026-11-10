// T565: the debrief's text column on Results. A2M6's won card (`__sd.results`, a made-up run:
// app/resultsFixture.ts) on the reference save after A2M5: Ves'thara's name plate is wider than
// STERLING's, and every spoken line (hers, Bricks's, and his held silence's "…") still starts in one
// column. Screenshot in <out>/screens/results-polish/ (look at it: the name plates, the column).
import { expect, test } from './fixtures.ts';
import { shot, waitForReady } from './hooks.ts';

test("results-polish: A2M6's debrief lines share one text column past VES'THARA", async ({
  page,
}) => {
  await page.goto('/?test=1&seed=1&save=after_a2m5');
  await waitForReady(page);
  await page.evaluate(() => globalThis.__sd!.results({ map: 'a2_m06', outcome: 'won' }));
  const debrief = page.getByRole('list', { name: 'Debrief' });
  await expect(debrief).toContainText('Be awake.');
  const lefts = await debrief.evaluate((list) => {
    const at = (sel: string) =>
      [...list.querySelectorAll(sel)].map((el) => Math.round(el.getBoundingClientRect().left));
    const plates = [...list.querySelectorAll('.sd-results-speaker')];
    return {
      names: plates.map((el) => el.textContent),
      plateRights: plates.map((el) => Math.round(el.getBoundingClientRect().right)),
      lines: at('.sd-results-line'),
      silences: at('.sd-results-silence > span'),
    };
  });
  // Ves'thara's lines and Bricks's, and the silence between them.
  expect(lefts.names).toContain("Ves'thara");
  expect(lefts.names).toContain('Bricks');
  expect(lefts.silences).toHaveLength(1);
  const column = lefts.lines[0]!;
  expect(new Set([...lefts.lines, ...lefts.silences])).toEqual(new Set([column]));
  // The column clears the widest name plate.
  expect(Math.max(...lefts.plateRights)).toBeLessThan(column);
  await shot(page, 'results-polish', 1, 'a2m6-debrief');
});
