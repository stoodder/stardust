// M5 review round 2's app fixes (D139), built in round 3. The pivot's held relabel on the dev
// Penitent range (`?map=dev_penitent`, as penitent.spec.ts builds it): the moment it pivots a
// pausing scene opens over the battle (as A2M5's pivot cue does), and under it the meter is the
// old Core meter whole (the core's glyph, "Core" and its last integrity; no "of 4", no pips),
// held for as long as the scene holds; as it closes, the Escort's rows show at once. Then A2M6's
// stinger: the full-screen history keeps "EVERGLOW PA" on one line. Screenshots in
// <out>/screens/m5r3-app/ (look at them: the held meter, the swap, the PA's label).
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

test("the pivot's held relabel shows the old Core meter whole, then the Escort's rows", async ({
  page,
}) => {
  await page.goto('/?test=1&map=dev_penitent&seed=1&dialogue=1&fasttext=1');
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  // To the pivot (penitent.spec.ts's build), and a pausing scene the moment it lands.
  const integrity = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.enqueue({ type: 'build', tower: 'lookout', tile: [4, 2] });
    for (const t of [
      [2, 0],
      [5, 4],
      [8, 4],
      [10, 3],
      [12, 6],
      [12, 3],
      [14, 4],
    ] as const) {
      sd.enqueue({ type: 'build', tower: 'zapcoil', tile: [t[0], t[1]] });
    }
    sd.enqueue({ type: 'callWave' });
    const st = sd.state()!;
    for (let k = 0; k < 20_000 && st.objective !== 'escort' && st.outcome === 'playing'; k++) {
      sd.fastForward(1);
    }
    sd.dialogue.play('a1_m01_cue_dev_survey');
    return st.objective === 'escort' ? st.integrity : -1;
  });
  expect(integrity).toBeGreaterThan(0);
  const scene = page.getByRole('dialog', { name: 'Comms' });
  await expect(scene).toBeVisible();
  await nextFrames(page);

  // Under the scene: the old meter whole, and it holds (the HUD is inert).
  const meter = page.getByTestId('escort-meter');
  const held = page.getByTestId('meter-relabel-held');
  await expect(held).toBeVisible();
  await expect(held).toContainText('Core');
  await expect(page.getByTestId('meter-relabel-from-value')).toHaveText(String(integrity));
  await expect(meter.locator('img, canvas').first()).toBeVisible();
  await expect(page.getByTestId('escort-total')).toHaveCount(0);
  await expect(page.getByTestId('escort-lost')).toHaveCount(0);
  await expect(page.getByTestId('meter-relabel')).toHaveCount(0);
  await shot(page, 'm5r3-app', 0, 'held-under-scene');
  await page.waitForTimeout(1200);
  await expect(held).toBeVisible();

  // The scene ends: the held beat plays out, then every Escort row at once.
  await page.keyboard.press('Escape');
  await scene.getByRole('button', { name: /Great, honestly/ }).click();
  await page.keyboard.press('Escape');
  await expect(scene).toBeHidden();
  await expect(page.getByTestId('meter-relabel')).toContainText('Evacuated');
  await expect(held).toHaveCount(0);
  await expect(page.getByTestId('escort-total')).toHaveText('of 4');
  await expect(page.getByTestId('escort-lost').locator('.hud-pip')).toHaveCount(2);
  await shot(page, 'm5r3-app', 1, 'swapped');
});

test("a full-screen scene's history keeps a long speaker label on one line", async ({ page }) => {
  await page.goto('/?test=1&map=dev_penitent&seed=1&dialogue=1&fasttext=1');
  await waitForReady(page);
  await page.evaluate(() => globalThis.__sd!.dialogue.play('a2_m06_scene_stinger'));
  const scene = page.getByRole('dialog', { name: 'Scene' });
  await expect(scene).toBeVisible();
  const name = scene.locator('.dlg-history .dlg-name', { hasText: /Everglow PA/i });
  for (let i = 0; i < 8 && (await name.count()) === 0; i++) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
  }
  await expect(name).toBeVisible();
  // One line, never two: no taller than its own line's words beside it ("Shift change.").
  const words = scene.locator('.dlg-past', { has: name }).locator('.dlg-text');
  const [nameBox, wordsBox] = [await name.boundingBox(), await words.boundingBox()];
  expect(nameBox).not.toBeNull();
  expect(wordsBox).not.toBeNull();
  expect(nameBox!.height).toBeLessThanOrEqual(wordsBox!.height + 0.5);
  await shot(page, 'm5r3-app', 2, 'pa-label');
});
