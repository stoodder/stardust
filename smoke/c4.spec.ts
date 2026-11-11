// T710: C4, QUILL's directives (D146). For each answer: A3M4's won card (the results fixture,
// `commitChoice`, so the pick is written as a real card's is; the run itself isn't filed) offers
// "QUILL's directives" in the way on's place, its options waiting 700 ms; the answer commits at
// once (Keep inherits Time Dilation; Purge refunds nothing here, no Rapport owned); then the base
// plays Night Shift, mandatory: Esc skips nothing, Next reads every line to the end, and it is
// seen once. Until T720 registers A3M4's debrief and Night Shift, placeholders play them
// (app/storyStubs.ts). Then Purge in a battle: a dev battle (`?map=dev_heal`) on the Purge save
// sends its Everglow units with their maintenance panels open and 2 less armor (T703's view).
// Screenshots in <out>/screens/c4/.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

const save = (page: Page) => page.evaluate(() => globalThis.__sd!.save());
const shown = (page: Page) => page.evaluate(() => globalThis.__sd!.dialogue.shown().scene);

const ANSWERS = [
  ['purge', 'Purge them. All of them.'],
  ['keep', 'Keep them. Stay yourself.'],
  ['rewrite', 'Write your own.'],
] as const;

for (const [quill, option] of ANSWERS) {
  test(`c4: ${quill} is committed on the answer, then Night Shift plays, unskippable`, async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto('/?test=1&dialogue=1&fasttext=1&seed=1&save=after_a3m3_convoy');
    await waitForReady(page);
    expect((await save(page))?.story.flags.quill_choice).toBeUndefined();
    // The card, with no flow scenes before it (Gerald's mail is T714's to stage).
    await page.evaluate(() =>
      globalThis.__sd!.results({
        map: 'a3_m04',
        outcome: 'won',
        commitChoice: true,
        flow: { before: [], after: [] },
      }),
    );
    const card = page.getByRole('dialog');
    await expect(card).toBeVisible();
    const choice = card.getByRole('group', { name: "QUILL's directives" });
    await expect(choice.getByTestId('choice-heading')).toBeFocused();
    await expect(choice.getByTestId('choice-heading')).toHaveText("QUILL's directives");
    await expect(card.getByRole('button', { name: 'Continue' })).toHaveCount(0);
    const pick = choice.getByRole('button', { name: option });
    await expect(pick).not.toHaveAttribute('aria-disabled', 'true');
    if (quill === 'keep') await shot(page, 'c4', 1, 'offer');
    await pick.click();
    await expect(choice).toHaveCount(0);
    const after = await save(page);
    expect(after?.story.flags.quill_choice).toBe(quill);
    expect(after?.unlocks.inheritedAbilities?.includes('time_dilation') === true).toBe(
      quill === 'keep',
    );
    if (quill === 'keep') {
      // Gerald's mail (run end) and C4 Keep: two inheritances on the card.
      const inherited = card.getByTestId('results-inherit');
      await expect(inherited.filter({ hasText: 'Suppressing Fire' })).toHaveCount(1);
      await expect(inherited.filter({ hasText: 'Time Dilation' })).toHaveCount(1);
      await shot(page, 'c4', 2, 'keep-answered');
    }

    // The base: Night Shift plays as a pausing panel; Esc skips nothing.
    await card.getByRole('button', { name: 'Continue' }).click();
    await page.evaluate(() => globalThis.__sd!.goto('base'));
    await expect.poll(() => shown(page)).toBe('a3_m04_base_night_shift');
    await page.keyboard.press('Escape');
    await nextFrames(page);
    expect(await shown(page)).toBe('a3_m04_base_night_shift');
    await shot(
      page,
      'c4',
      quill === 'purge' ? 3 : quill === 'keep' ? 4 : 5,
      `night-shift-${quill}`,
    );
    // Next reads it through (a silence moves on by itself).
    const next = page.getByRole('button', { name: /^(Skip|Next)$/ });
    for (let i = 0; i < 20 && (await shown(page)) !== null; i++) {
      // oxlint-disable-next-line no-await-in-loop -- one line at a time
      if (await next.isVisible()) await next.click();
      // oxlint-disable-next-line no-await-in-loop -- let the panel move on
      else await page.waitForTimeout(250);
    }
    await expect.poll(() => shown(page)).toBeNull();
    expect((await save(page))?.story.seen).toContain('a3_m04_base_night_shift');
  });
}

// Its armor −2 is T703's tests' (sim/factionArmor.test.ts); here the panel shows.
test('c4: Purge opens every Everglow unit’s maintenance panel', async ({ page }) => {
  await page.goto('/?test=1&map=dev_heal&seed=1&save=after_a3m4_purge');
  await waitForReady(page);
  expect((await save(page))?.story.flags.quill_choice).toBe('purge');
  await expect(page.getByTestId('hud')).toBeVisible();
  const seen = await page.evaluate(() => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    sd.setSpeed(0);
    sd.enqueue({ type: 'callWave' });
    for (let k = 0; k < 1800; k++) {
      sd.fastForward(1);
      const st = sd.state()!;
      for (let i = 0; i < st.enemies.used; i++) {
        const e = st.enemies.items[i]!;
        if (e.alive && e.def?.faction === 'everglow' && e.x >= 3) {
          return { panel: e.def.openPanel, armor: e.def.armor, id: e.def.id };
        }
      }
    }
    return null;
  });
  expect(seen).not.toBeNull();
  expect(seen?.panel).toBe(true);
  await nextFrames(page);
  expect(await page.evaluate(() => globalThis.__sd!.render()!.heal.panels)).toBeGreaterThan(0);
  await shot(page, 'c4', 6, 'purge-open-panels');
});
