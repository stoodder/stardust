// The base's story tabs (T303, T320, T411): the Everglow Inbox and the codex on `after_a1m3`, whose
// newest memo is unread, so the base opens on the Inbox (T320): reading the memo clears the badge;
// the small print opens in one click; the arrow keys walk the memo list; the codex shows an entry
// with its sprite, and reading it clears its NEW tag. After A1M5's stinger the base lands on
// Sterling's Record Quarter memo, not a shelf. On `after_a2m3`: the pension memo, A2M2's KFA form
// on its form panel, QUILL's annotations under the records they annotate, and the withheld
// "Pebble" entry. Screenshots in test-results/screens/inbox/.
import { expect, test } from './fixtures.ts';
import { shot, waitForReady } from './hooks.ts';

test('inbox: the NEW badge, a memo with its small print, and the codex', async ({ page }) => {
  await page.goto('/?test=1&save=after_a1m3');
  await waitForReady(page);
  await page.getByRole('button', { name: 'Base' }).click();
  await expect(page.getByRole('heading', { name: 'Base' })).toBeVisible();

  // A memo is NEW, so the base opens on the Inbox (T320), its tab focused, the newest memo shown;
  // the Codex tab carries its own NEW badge.
  const inboxTab = page.getByRole('tab', { name: /^Inbox/ });
  const codexTab = page.getByRole('tab', { name: /^Codex/ });
  await expect(inboxTab).toHaveAttribute('aria-selected', 'true');
  await expect(inboxTab).toBeFocused();
  await expect(codexTab).toContainText('NEW');
  const pane = page.getByRole('tabpanel');
  const memo = pane.getByRole('article');
  await expect(memo).toContainText('Mandatory Fun Friday Is Back!');
  await expect(memo).toContainText('Everglow Culture Committee');
  await shot(page, 'inbox', 1, 'base-opens-on-inbox');
  // Reading it (a moment on screen) cleared the badge, and the save says so.
  await expect(inboxTab).toHaveAccessibleName('Inbox');
  await expect(inboxTab).not.toContainText('NEW');
  const read = await page.evaluate(() => globalThis.__sd!.save()!.story.memosRead);
  expect(read).toContain('memo_a1_03');
  // The tabs are a keyboard row: Right to the Codex and Left back.
  await page.keyboard.press('ArrowRight');
  await expect(codexTab).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(inboxTab).toHaveAttribute('aria-selected', 'true');

  // The small print: collapsed, then one click away.
  const toggle = memo.getByRole('button', { name: 'Small print' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(memo.getByText('Mail-drone incidents')).toBeHidden();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(memo.getByText('Mail-drone incidents must be reported on Form 88-B.')).toBeVisible();
  await shot(page, 'inbox', 2, 'memo-small-print');

  // The list: newest first; Down moves to the next memo and shows it.
  const list = pane.getByRole('navigation', { name: 'Memos' }).getByRole('button');
  await expect(list).toHaveCount(4);
  await expect(list.first()).toHaveAttribute('aria-current', 'true');
  await list.first().focus();
  await page.keyboard.press('ArrowDown');
  await expect(list.nth(1)).toBeFocused();
  await expect(memo).toContainText('Introducing the Pest Bounty Board!');
  await page.keyboard.press('End');
  await expect(memo).toContainText('WELCOME TO THE GARDENS!');
  await expect(memo).toContainText('Your Orbital Strike uplink');
  await shot(page, 'inbox', 3, 'welcome-memo');

  // The codex: the Pest Field Guide, an entry with its sprite; reading it clears its NEW tag.
  await codexTab.click();
  await expect(codexTab).toHaveAttribute('aria-selected', 'true');
  await expect(pane).toContainText('Pest Field Guide');
  const hauler = pane.getByRole('button', { name: /^Brood Hauler/ });
  await expect(hauler).toHaveAccessibleName('Brood Hauler, new');
  await hauler.click();
  const entry = pane.getByRole('article');
  await expect(entry.getByRole('heading', { name: 'Brood Hauler' })).toBeVisible();
  await expect(entry).toContainText('Do not inspect cargo.');
  await expect(entry.locator('img.sd-codex-sprite')).toBeVisible();
  await expect(hauler).toHaveAccessibleName('Brood Hauler'); // picked: read at once
  const seen = await page.evaluate(() => globalThis.__sd!.save()!.story.seen);
  expect(seen).toContain('codex_brood_hauler__original');
  await shot(page, 'inbox', 4, 'codex-hauler');

  // A place with a prop for a picture, and the strike's small print.
  await pane.getByRole('button', { name: /^Orbital Strike Uplink/ }).click();
  await entry.getByRole('button', { name: 'Small print' }).click();
  await expect(entry).toContainText('Uplink access contingent on Q2 extraction targets.');
  await pane.getByRole('button', { name: /^Everglow Gardens/ }).click();
  await expect(entry.locator('img.sd-codex-sprite')).toBeVisible();
  await shot(page, 'inbox', 5, 'codex-place');
});

// T320 / T335: after A1M5's stinger the base lands on the Inbox and Sterling's Record Quarter memo
// (its small print: Rig Nine's "scheduled quiet period"), not on a bright shelf. The flow starts
// from the base (a menu); the dev save has seen Zibzab's arrival, as real play has by A1M5.
test('inbox: after the stinger, the base lands on the Record Quarter memo', async ({ page }) => {
  await page.goto('/?test=1&dialogue=1&fasttext=1&seed=1&save=after_a1m5');
  await waitForReady(page);
  // A1M5's flow (shown from the base, a menu): the party before the card (skipped), the card, then
  // Continue: the stinger plays full-screen, and skipping it lands in the base again. The save
  // holds an unread memo, and the Inbox pane marks a memo it opened by itself as read after 0.8 s
  // on screen, so the base is opened and the flow started in one evaluate: a gap between them
  // under load would read the memo before the card covers the pane (the dwell waits while it's covered).
  void page.evaluate(async () => {
    const base = [...document.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Base',
    );
    base!.click();
    await new Promise<void>((done) => {
      const tick = (): void => {
        const heads = [...document.querySelectorAll('h1, h2')];
        if (heads.some((h) => h.textContent?.trim() === 'Base')) done();
        else requestAnimationFrame(tick);
      };
      tick();
    });
    await globalThis.__sd!.results({
      map: 'a1_m05',
      outcome: 'won',
      quietWave: { spawned: 7, leaked: 0 },
    });
  });
  const full = page.getByRole('dialog', { name: 'Scene' });
  const card = page.getByRole('dialog', { name: 'PERIMETER SECURED!' });
  await expect(full).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Continue' }).click();
  await expect(full).toBeVisible();
  await expect(full).toContainText('Rig Nine. Status: not answering.');
  await page.keyboard.press('Escape');
  await expect(full).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Base' })).toBeVisible();
  await expect(page.getByRole('tab', { name: /^Inbox/ })).toHaveAttribute('aria-selected', 'true');
  const memo = page.getByRole('tabpanel').getByRole('article');
  await expect(memo).toContainText("Record Quarter! You're Top 5%!");
  await memo.getByRole('button', { name: 'Small print' }).click();
  await expect(memo).toContainText('Rig Nine is in a scheduled quiet period.');
  await shot(page, 'inbox', 6, 'stinger-landing');
});

test('inbox: Act II, the pension memo, the KFA form, and QUILL in the codex', async ({ page }) => {
  await page.goto('/?test=1&save=after_a2m3');
  await waitForReady(page);
  await page.getByRole('button', { name: 'Base' }).click();
  const pane = page.getByRole('tabpanel');
  const memo = pane.getByRole('article');

  // The newest memo: Bricks's pension, cc'd to the player, with the beneficiary in the small print.
  await expect(page.getByRole('tab', { name: /^Inbox/ })).toHaveAttribute('aria-selected', 'true');
  await expect(memo).toContainText('Pension Restructuring Opportunity!');
  await expect(memo).toContainText('Sgt. I. Okonkwo');
  await memo.getByRole('button', { name: 'Small print' }).click();
  await expect(memo).toContainText('To name a beneficiary, file Form P-19 in person.');
  await shot(page, 'inbox', 7, 'a2-pension');

  // Sterling's "disregard it", then the form itself, under her memo: the KFA's panel and stamp.
  const list = pane.getByRole('navigation', { name: 'Memos' }).getByRole('button');
  await list.filter({ hasText: 'Please Use' }).click();
  await expect(memo).toContainText('An automated form went out by mistake.');
  await list.filter({ hasText: 'Form 7-C' }).click();
  await expect(memo).toHaveClass(/sd-form/);
  await expect(memo).toContainText('Kepler Frontier Authority');
  await expect(memo).toContainText('Status: filed, pending.');
  await expect(memo.locator('.sd-form-stamp')).toHaveText('Stamped: PENDING');
  await shot(page, 'inbox', 8, 'a2-kfa-form');
  await memo.locator('.sd-form-box').scrollIntoViewIfNeeded();
  await shot(page, 'inbox', 9, 'a2-kfa-stamp');

  // The codex: QUILL's note under the Hauler's original; the Mote unredacted; Pebble withheld.
  await page.getByRole('tab', { name: /^Codex/ }).click();
  const entry = pane.getByRole('article');
  await pane.getByRole('button', { name: /^Brood Hauler/ }).click();
  await expect(entry).toContainText('Pest Field Guide · Pests · Annotated');
  await expect(entry.locator('.sd-codex-record')).toContainText('Do not inspect cargo.');
  await expect(entry.locator('.sd-codex-note')).toContainText('[QUILL: Cargo inspected.');
  const seen = await page.evaluate(() => globalThis.__sd!.save()!.story.seen);
  expect(seen).toContain('codex_brood_hauler__annotated');
  await shot(page, 'inbox', 10, 'a2-hauler-annotated');
  await pane.getByRole('button', { name: /^Mote/ }).click();
  await expect(entry.locator('.sd-codex-note')).toContainText('Event Class H');
  await shot(page, 'inbox', 11, 'a2-mote-unredacted');
  await pane.getByRole('button', { name: /^Pebble/ }).click();
  await expect(entry).toContainText('Pest Field Guide · Personnel');
  await expect(entry).toContainText('[QUILL: Entry withheld.]');
  await expect(entry.locator('.sd-codex-pending')).toHaveText('Withheld');
  await shot(page, 'inbox', 12, 'a2-pebble-withheld');
  await pane.getByRole('button', { name: /^Weft Warden/ }).click();
  await expect(entry.locator('img.sd-codex-sprite')).toBeVisible();
  await shot(page, 'inbox', 13, 'a2-weft-warden');
});
