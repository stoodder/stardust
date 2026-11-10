// T531: the HUD for M5's mechanics, each on its dev range. Sundown (`dev_dark`): the Rivet out in
// the dark reads its darkened range and "-15% range (dark)", the lamp-lit one "Lit: full range".
// The Prism (`dev_prism`): its panel reads damage per second and its ramp, and the live ramp row
// fills as the beam holds a Glimmer. Results (the fixture, A2M5 won): the debrief's held silence
// shows as a quiet "…" with no empty name plate. The Escort meter's relabel and pips are in
// penitent.spec.ts and escort.spec.ts; Stillness's aim in mindspike.spec.ts. Screenshots in
// <out>/screens/hud-m5/ (look at them: the panel lines and the meter are the point).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

/** Clicks tile (c, r) on the canvas and lets the HUD catch up. */
async function clickTile(page: Page, c: number, r: number): Promise<void> {
  const p = await page.evaluate(([x, y]) => globalThis.__sd!.tileToClient(x, y), [c, r] as const);
  expect(p).not.toBeNull();
  await page.mouse.click(p!.x, p!.y); // checked just above
  await nextFrames(page);
}

test('hud-m5: Sundown’s line in the tower panel, dark and lit', async ({ page }) => {
  await page.goto('/?test=1&map=dev_dark&seed=1');
  await waitForReady(page);
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.enqueue({ type: 'build', tower: 'rivet', tile: [8, 4] }); // inside the bend's lamp
    sd.enqueue({ type: 'build', tower: 'rivet', tile: [3, 6] }); // out in the dark
    sd.enqueue({ type: 'callWave' });
    // W2 as soon as it can be called, then past its ease: full dark.
    for (let k = 0; k < 20_000 && sd.state()!.wave < 2; k++) {
      if (sd.state()!.schedule.phase === 'countdown') sd.enqueue({ type: 'callWave' });
      sd.fastForward(1);
    }
    sd.fastForward(260);
  });
  expect(await page.evaluate(() => globalThis.__sd!.state()!.dark)).toBe(1);
  const panel = page.getByRole('region', { name: 'Rivet tower' });
  await clickTile(page, 3, 6);
  await expect(panel.getByTestId('dark-line')).toHaveText('-15% range (dark)');
  await expect(panel).toContainText('range 2.55'); // 3 × 0.85
  await shot(page, 'hud-m5', 1, 'dark-line');
  await clickTile(page, 8, 4);
  await expect(panel.getByTestId('dark-line')).toHaveText('Lit: full range');
  await expect(panel).toContainText('range 3');
});

test('hud-m5: the Prism reads damage per second and its ramp fills', async ({ page }) => {
  await page.goto('/?test=1&map=dev_prism&seed=1');
  await waitForReady(page);
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.enqueue({ type: 'build', tower: 'prism', tile: [6, 4] });
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
  });
  await clickTile(page, 6, 4);
  const panel = page.getByRole('region', { name: 'Prism Spire tower' });
  await expect(panel).toContainText('12 dmg/s');
  await expect(panel).toContainText('ramp ×4 in 6 s');
  await expect(panel).not.toContainText('4/s');
  const ramp = panel.getByTestId('beam-ramp');
  await expect(ramp).toHaveAttribute('aria-valuetext', '×1.0 of ×4');
  // Hold until the beam has ramped past ×2 on one target.
  const held = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    const prism = () => sd.state()!.towers.items.find((t) => t.alive && t.def?.id === 'prism');
    for (let k = 0; k < 2400 && (prism()?.beamRamp ?? 1) < 2.5; k++) sd.fastForward(1);
    return prism()?.beamRamp ?? 1;
  });
  expect(held).toBeGreaterThanOrEqual(2.5);
  await nextFrames(page);
  await expect(ramp).toHaveAttribute('aria-valuetext', /^×2\.\d of ×4$/);
  await shot(page, 'hud-m5', 2, 'prism-ramp');
});

test('hud-m5: a debrief’s silence holds without an empty name plate', async ({ page }) => {
  await page.goto('/?test=1&save=after_a2m4_returned&fasttext=1');
  await waitForReady(page);
  await page.evaluate(() => globalThis.__sd!.results({ map: 'a2_m05', outcome: 'won' }));
  const card = page.getByRole('dialog').filter({ hasText: 'Not there. Never there.' });
  await expect(card).toBeVisible();
  const debrief = card.getByRole('list', { name: 'Debrief' });
  await expect(debrief.getByTestId('debrief-silence')).toHaveAccessibleName(
    "Ves'thara says nothing",
  );
  // Two spoken lines and the silence: no row is a name plate alone.
  await expect(debrief.getByRole('listitem')).toHaveCount(3);
  await shot(page, 'hud-m5', 3, 'debrief-silence');
});
