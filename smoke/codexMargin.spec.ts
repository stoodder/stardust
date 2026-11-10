// Act II part two's codex (T511, T501e): Ves'thara's margin note under QUILL's on the Brood Hauler,
// both under the record, behind their own rules; a margin note alone on the Glass Witch; her
// first entry over her `touched` portrait; Kip's plant-coat portrait; the Long Night's "Too dark".
// The unlocks themselves are unit-tested (story/codex.test.ts); this checks the page, on the real
// `after_a2m6` save (A2M6 won: the margin notes unlocked, none read yet). Screenshots in
// <out>/screens/codex/.
import { expect, test } from './fixtures.ts';
import { shot, waitForReady } from './hooks.ts';

test("codex: Ves'thara's margin notes, under QUILL's, and Act II part two's people", async ({
  page,
}) => {
  await page.goto('/?test=1&save=after_a2m6');
  await waitForReady(page);
  await page.getByRole('heading', { name: 'Sector map' }).waitFor();
  await page.getByRole('button', { name: 'Base' }).click();
  await page.getByRole('tab', { name: /^Codex/ }).click();
  const pane = page.getByRole('tabpanel');
  const entry = pane.getByRole('article');

  // The Hauler: NEW for its notes; the record dimmed, QUILL's note, then hers.
  const hauler = pane.getByRole('button', { name: /^Brood Hauler/ });
  await expect(hauler).toHaveAttribute('aria-label', 'Brood Hauler, new');
  await hauler.click();
  await expect(entry).toContainText('Pest Field Guide · Pests · Annotated');
  await expect(entry.locator('.sd-codex-record')).toContainText('Do not inspect cargo.');
  const notes = entry.locator('.sd-codex-note');
  await expect(notes).toHaveCount(2);
  await expect(notes.nth(0)).toContainText('[QUILL: Cargo inspected.');
  await expect(notes.nth(1)).toHaveClass(/sd-codex-margin/);
  await expect(notes.nth(1)).toContainText(
    "[In the margin, in Ves'thara's hand: They are carrying their children away from what you made.]",
  );
  const seen = await page.evaluate(() => globalThis.__sd!.save()!.story.seen);
  expect(seen).toContain('codex_brood_hauler__margin');
  await expect(hauler).toHaveAttribute('aria-label', 'Brood Hauler');
  await shot(page, 'codex', 1, 'hauler-margin');

  // The Glass Witch: her margin note alone under Everglow's "Probably sad!".
  await pane.getByRole('button', { name: /^The Glass Witch/ }).click();
  await expect(entry.locator('.sd-codex-record')).toContainText('Probably sad!');
  await expect(entry.locator('.sd-codex-note')).toHaveCount(1);
  await expect(entry.locator('.sd-codex-margin')).toContainText('Not sad. Awake.');
  await shot(page, 'codex', 2, 'witch-margin');

  // Personnel: Ves'thara over her touched portrait; Kip in his plant coat.
  await pane.getByRole('button', { name: /^Ves'thara/ }).click();
  await expect(entry).toContainText("Ves'thara is not known to Everglow.");
  await expect(entry.locator('img.sd-codex-sprite')).toBeVisible();
  await shot(page, 'codex', 3, 'vesthara');
  await pane.getByRole('button', { name: /^Kip Vandermeer/ }).click();
  await expect(entry).toContainText('The smear on the pocket is product.');
  await expect(entry.locator('img.sd-codex-sprite')).toBeVisible();
  await shot(page, 'codex', 4, 'kip');

  // QUILL's A2M4 note on Stardust; the Long Night's photo frame.
  await pane.getByRole('button', { name: /^Stardust/ }).click();
  await expect(entry.locator('.sd-codex-note')).toContainText('(Per policy.)');
  await shot(page, 'codex', 5, 'stardust-annotated');
  await pane.getByRole('button', { name: /^The Long Night/ }).click();
  await expect(entry.locator('.sd-codex-pending')).toHaveText('Too dark');
  await shot(page, 'codex', 6, 'long-night');
});
