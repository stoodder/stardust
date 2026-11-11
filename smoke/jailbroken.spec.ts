// T740b: the jailbroken Rivet on the field (towers.md § 9; art-direction § Faction rules). With a
// save that holds the Rivet jailbroken (`save=after_a3m4_keep`: the jailbreak bought after A3M3),
// a Rivet built on the Gloop's dev range (`map=dev_gloop`, whose loadout has it) draws its base's
// `_jb` twin (the logo plate scratched out, a brass patch) and its base and head in
// `everglow.jailbroken` (Vrell-orange status lights); the Skyhook beside it, not jailbroken, draws
// plain. Without the save, the Rivet draws plain too. The Gloop and the Skyhook beside it also
// form Sticky Flak, which now draws its tether (T740b). Screenshots in <out>/screens/jailbroken/
// (look at them: the Rivet's orange lights and patched plate against the Skyhook's teal).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

async function build(page: Page): Promise<number> {
  await page.evaluate(() => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    sd.setSpeed(0);
    sd.enqueue({ type: 'build', tower: 'rivet', tile: [9, 4] });
    sd.enqueue({ type: 'build', tower: 'skyhook', tile: [9, 3] });
    sd.enqueue({ type: 'build', tower: 'gloop', tile: [9, 2] });
    sd.fastForward(1);
  });
  await nextFrames(page);
  return page.evaluate(() => globalThis.__sd!.render()!.jailbroken);
}

test('jailbroken: a jailbroken class draws jailbroken, the rest plain', async ({ page }) => {
  await page.goto('/?test=1&map=dev_gloop&seed=1&save=after_a3m4_keep');
  await waitForReady(page);
  const save = await page.evaluate(() => globalThis.__sd!.save());
  expect(save?.unlocks.jailbroken).toEqual(['rivet']);
  expect(await build(page)).toBe(1);
  expect(await page.evaluate(() => globalThis.__sd!.render()!.tethers)).toBeGreaterThanOrEqual(1);
  await shot(page, 'jailbroken', 1, 'rivet-jailbroken');
});

test('jailbroken: without the save, the Rivet draws plain', async ({ page }) => {
  await page.goto('/?test=1&map=dev_gloop&seed=1');
  await waitForReady(page);
  expect(await build(page)).toBe(0);
  await shot(page, 'jailbroken', 2, 'rivet-plain');
});
