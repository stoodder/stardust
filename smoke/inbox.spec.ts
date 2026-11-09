// The base's story tabs (T303): the Everglow Inbox and the codex on `after_a1m3`, whose newest memo
// is unread. The Inbox tab wears a NEW badge; opening the memo reads it and clears the badge; the
// small print opens in one click; the arrow keys walk the memo list; the codex shows an entry with
// its sprite, and reading it clears its NEW tag. Screenshots in test-results/screens/inbox/.
import { expect, test } from './fixtures.ts';
import { shot, waitForReady } from './hooks.ts';

test('inbox: the NEW badge, a memo with its small print, and the codex', async ({ page }) => {
  await page.goto('/?test=1&save=after_a1m3');
  await waitForReady(page);
  await page.getByRole('button', { name: 'Base' }).click();
  await expect(page.getByRole('heading', { name: 'Base' })).toBeVisible();

  // The base still opens on Research; the Inbox and Codex tabs carry their NEW badges.
  const inboxTab = page.getByRole('tab', { name: /^Inbox/ });
  const codexTab = page.getByRole('tab', { name: /^Codex/ });
  await expect(page.getByRole('tab', { name: 'Research' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(inboxTab).toHaveAccessibleName('Inbox (1 new)');
  await expect(codexTab).toContainText('NEW');
  await shot(page, 'inbox', 1, 'base-badges');

  // The Inbox (keyboard: Left from Research twice). The newest memo, unread, opens first.
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(inboxTab).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(inboxTab).toHaveAttribute('aria-selected', 'true');
  const pane = page.getByRole('tabpanel');
  const memo = pane.getByRole('article');
  await expect(memo).toContainText('Mandatory Fun Friday Is Back!');
  await expect(memo).toContainText('Everglow Culture Committee');
  // Reading it (a moment on screen) cleared the badge, and the save says so.
  await expect(inboxTab).not.toContainText('NEW');
  const read = await page.evaluate(() => globalThis.__sd!.save()!.story.memosRead);
  expect(read).toContain('memo_a1_03');

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
