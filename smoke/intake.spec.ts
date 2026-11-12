// Character creation (T306; design/core-loop.md § 6.1): Start shift → the intake → A1M1's
// briefing, the name on the Shift board, Settings' file edit; a v1 save's Continue runs the intake
// first; Back (Esc) drops a new game without writing it. `?test=1` skips the intake, so these
// specs turn it back on with `&intake=1`.
import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { shot, waitForReady } from './hooks.ts';

const URL = '/?test=1&seed=1&intake=1';

const intake = (page: Page) => page.getByRole('main', { name: 'New hire intake' });

test('intake: a new game files the profile, then A1M1; the name shows on the Shift board', async ({
  page,
}) => {
  await page.goto(URL);
  await waitForReady(page);
  await page.getByRole('button', { name: 'Start shift' }).click();
  const form = intake(page);
  await expect(form).toBeVisible();
  // The employee number once, on the ID badge (T803c); the name's hint while the name has focus.
  await expect(form.getByRole('figure', { name: 'ID badge preview' })).toContainText(
    'JPT-1 · #ED-447',
  );
  await expect(form).not.toContainText('Employee #ED-447');
  await expect(form).toContainText('Assigned in the field by your supervisor');
  const name = form.getByRole('textbox', { name: 'Name' });
  await expect(name).toBeFocused();
  const hint = form.getByText(/^As it goes on your name tag/);
  await expect(hint).toBeVisible();
  // Nothing is picked for the player.
  await expect(form.getByRole('radio')).toHaveCount(6);
  await expect(form.getByRole('radio', { checked: true })).toHaveCount(0);
  await expect(page.getByTestId('file-note')).toContainText('Pick pronouns');
  await shot(page, 'intake', 1, 'blank');

  // Signing it blank: cheerful problems, the focus on the name.
  await form.getByRole('button', { name: 'Sign and submit' }).click();
  await expect(form).toContainText('Your name tag needs a name!');
  await expect(form).toContainText('Pick the pronouns the team should use!');
  await expect(form).toContainText("Pick a reason. Any reason! They're all approved.");
  await expect(name).toBeFocused();
  await shot(page, 'intake', 2, 'problems');

  // Keyboard: type the name, Tab to the pronouns, the arrows pick.
  await name.fill('Ada Okafor-Quinn');
  await expect(page.getByTestId('badge-name')).toHaveText('Ada Okafor-Quinn');
  await page.keyboard.press('Tab');
  await expect(form.getByRole('radio', { name: 'she/her' })).toBeFocused();
  await expect(hint).toBeHidden();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(form.getByRole('radio', { name: 'he/him' })).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('ArrowRight');
  await expect(form.getByRole('radio', { name: 'they/them' })).toBeFocused();
  await expect(page.getByTestId('file-note')).toHaveText(
    'File note: They are cleared for perimeter duty. Their helmet is one size fits most!',
  );
  await form.getByRole('radio', { name: 'I like lettuce' }).click();
  await expect(form).not.toContainText('Pick the pronouns');
  await shot(page, 'intake', 3, 'filled');

  await form.getByRole('button', { name: 'Sign and submit' }).click();
  const briefing = page.getByRole('dialog', { name: 'Shift briefing' });
  await expect(briefing).toBeVisible();
  const save = await page.evaluate(() => globalThis.__sd!.save());
  expect(save?.profile).toEqual({ name: 'Ada Okafor-Quinn', pronouns: 'they', callsign: 'sprout' });
  expect(save?.story.flags.arrival_reason).toBe('lettuce');

  await page.evaluate(() => globalThis.__sd!.goto('campaign'));
  await expect(page.getByTestId('technician')).toContainText('Ada Okafor-Quinn');
  await shot(page, 'intake', 4, 'shift-board');

  // Settings: the name and pronouns change; the callsign and reason are read-only.
  await page.getByRole('button', { name: 'Settings' }).click();
  const file = page.getByRole('group', { name: 'Your file' });
  await expect(file).toContainText('Sprout');
  await expect(file).toContainText('I like lettuce');
  await file.getByRole('textbox').fill('Ada');
  await file.getByRole('radio', { name: 'she/her' }).click();
  await file.getByRole('button', { name: 'Update file' }).click();
  await expect(file).toContainText('Filed!');
  await shot(page, 'intake', 5, 'settings');
  const edited = await page.evaluate(() => globalThis.__sd!.save());
  expect(edited?.profile).toEqual({ name: 'Ada', pronouns: 'she', callsign: 'sprout' });
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('technician')).toContainText('Ada');
});

test('intake: Continue on a v1 save runs the intake, then its Shift board', async ({ page }) => {
  const v1 = readFileSync(
    new globalThis.URL('../src/meta/__fixtures__/save.v1.json', import.meta.url),
    'utf8',
  );
  await page.addInitScript((raw) => {
    if (localStorage.getItem('stardust:slot:1') === null) {
      localStorage.setItem('stardust:slot:1', raw);
      localStorage.setItem('stardust:lastSlot', '1');
    }
  }, v1);
  await page.goto(URL);
  await waitForReady(page);
  await page.getByRole('button', { name: 'Continue' }).click();
  const form = intake(page);
  await expect(form).toBeVisible();
  await expect(form).toContainText('Records switched to a new form!');
  await form.getByRole('textbox', { name: 'Name' }).fill('Kofi');
  await form.getByRole('radio', { name: 'he/him' }).click();
  await form.getByRole('radio', { name: 'The signing bonus' }).click();
  await shot(page, 'intake', 6, 'v1-continue');
  // Enter in the name field signs the form.
  await form.getByRole('textbox', { name: 'Name' }).press('Enter');
  await expect(page.getByTestId('technician')).toContainText('Kofi');
  const save = await page.evaluate(() => globalThis.__sd!.save());
  expect(save?.profile).toEqual({ name: 'Kofi', pronouns: 'he', callsign: 'sprout' });
  expect(save?.story.flags.arrival_reason).toBe('bonus');
  // The v1 save's progress survived.
  expect(save?.campaign.maps.a1_m01?.completed).toBe(true);
});

test('intake: Esc backs out of a new game without writing it', async ({ page }) => {
  await page.goto(URL);
  await waitForReady(page);
  await page.getByRole('button', { name: 'Start shift' }).click();
  await expect(intake(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Start shift' })).toBeFocused();
  expect(await page.evaluate(() => localStorage.getItem('stardust:slot:1'))).toBeNull();
});
