// T710: the jailbreak at Zibzab's (D146; towers.md § 9). After A3M3 the shop's first row brings the
// revoked class (the reference's Rivet) back, drawn jailbroken: under the convoy it costs nothing
// ("FREE — Goldie's engineers"), and the player still takes it, so the moment is seen; under the
// warren it costs 300 Stardust. Taking it moves the Rivet from revoked to jailbroken in the save,
// and the row reads Owned. (Zibzab's line on the row is T709's.) The Buy button asks first (T714's
// confirmation: the price line, then Jailbreak it, which waits 700 ms; Not now backs out).
// Screenshots in <out>/screens/jailbreak/.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { shot, waitForReady } from './hooks.ts';

const save = (page: Page) => page.evaluate(() => globalThis.__sd!.save());

for (const [door, price] of [
  ['convoy', "FREE — Goldie's engineers"],
  ['warren', '300 Stardust'],
] as const) {
  test(`jailbreak: taken at the shop under the ${door} (${price})`, async ({ page }) => {
    await page.goto(`/?test=1&seed=1&save=after_a3m3_${door}`);
    await waitForReady(page);
    const before = await save(page);
    expect(before?.unlocks.revokedTowers).toEqual(['rivet']);
    await page.evaluate(() => globalThis.__sd!.goto('base'));
    await page.getByRole('tab', { name: /^Shop/ }).click();
    const firmware = page.getByRole('region', { name: 'Firmware' });
    const row = firmware.getByRole('listitem').filter({ hasText: 'Jailbreak' });
    await expect(row).toContainText(price);
    await expect(row).toContainText('jailbroken firmware');
    await shot(page, 'jailbreak', door === 'convoy' ? 1 : 3, `${door}-offer`);
    const buy = row.getByRole('button', { name: `Buy Jailbreak, ${price}` });
    // T714: the confirmation; Not now backs out with nothing taken.
    await buy.click();
    const confirm = page.getByRole('dialog', { name: 'Jailbreak' });
    await expect(confirm).toBeVisible();
    await expect(confirm.getByTestId('jailbreak-price')).toHaveText(
      door === 'convoy' ? "Free: Goldie's engineers did the work." : 'Price first: 300 Stardust.',
    );
    await confirm.getByRole('button', { name: 'Not now' }).click();
    await expect(confirm).toBeHidden();
    expect((await save(page))?.unlocks.revokedTowers).toEqual(['rivet']);
    await buy.click();
    const go = confirm.getByRole('button', { name: 'Jailbreak it' });
    await expect(go).toHaveAttribute('aria-disabled', 'true');
    await expect(go).not.toHaveAttribute('aria-disabled', 'true');
    await shot(page, 'jailbreak', door === 'convoy' ? 5 : 6, `${door}-confirm`);
    await go.click();
    await expect(confirm).toBeHidden();
    await expect(row).toContainText('Owned');
    const after = await save(page);
    expect(after?.unlocks.revokedTowers).toEqual([]);
    expect(after?.unlocks.jailbroken).toEqual(['rivet']);
    expect(after?.story.granted).toContain('jailbreak');
    expect((before?.currencies.stardust ?? 0) - (after?.currencies.stardust ?? 0)).toBe(
      door === 'convoy' ? 0 : 300,
    );
    await shot(page, 'jailbreak', door === 'convoy' ? 2 : 4, `${door}-taken`);
  });
}
