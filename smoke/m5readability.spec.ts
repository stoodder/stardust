// M5 review round 1 (D138), render's readability fixes, asserted through `__sd.render()`:
// - R9: on Sundown's dev map (`?map=dev_dark`) a Prism at rest shows the ghost of the disc it will
//   light (its rim, dashed), never a lit hole; arming a Prism previews its disc from the hovered
//   tile; the real holes stay the sim's lit discs (no light source while its beam is off).
// - R6: on the dev Penitent range (`?map=dev_penitent`) the boss bar shows the Penitent's shield as
//   a strip under its HP and marks the 50% where it kneels; the strip empties as the shield breaks.
// Screenshots in <SMOKE_OUT>/screens/m5readability/ (look at them: the ghost must not read lit).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

const PRISM = [13, 4] as const;
/** A free pad on dev_dark to preview a Prism on (darkness.spec's dark Rivet's). */
const PREVIEW = [3, 6] as const;

const glow = async (page: Page) => {
  await nextFrames(page);
  return page.evaluate(() => {
    const r = globalThis.__sd!.render()!;
    return { ...r.glow, lights: r.darkness.lights };
  });
};

test('a resting Prism shows its light’s ghost; arming one previews it; neither is lit', async ({
  page,
}) => {
  await page.goto('/?test=1&map=dev_dark&seed=1');
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate(([c, r]) => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.enqueue({ type: 'build', tower: 'prism', tile: [c, r] });
    // darkness.spec's Rivets by a lamp and beside the Prism, so the waves don't run the core down
    // before W2's full dark.
    sd.enqueue({ type: 'build', tower: 'rivet', tile: [8, 4] });
    sd.enqueue({ type: 'build', tower: 'rivet', tile: [c + 1, r] });
    sd.fastForward(1);
  }, PRISM);
  // Build phase: the Prism rests (no beam), so it lights nothing yet; its ghost shows.
  const resting = await glow(page);
  expect(resting.ghosts).toBe(1);
  expect(resting.lights).toBe(0);
  expect(resting.ghostPreview).toBe(false);
  await shot(page, 'm5readability', 1, 'prism-ghost');

  // Arm the Prism (slot 2) and hover a free pad: the preview's ghost shows there.
  const at = await page.evaluate(([c, r]) => globalThis.__sd!.tileToClient(c, r), PREVIEW);
  await page.keyboard.press('Digit2');
  expect(at).not.toBeNull();
  await page.mouse.move(at!.x, at!.y); // checked just above
  await expect.poll(async () => (await glow(page)).ghostPreview).toBe(true);
  await shot(page, 'm5readability', 2, 'prism-preview');
  await page.keyboard.press('Escape');
  await page.mouse.move(0, 0);
  await expect.poll(async () => (await glow(page)).ghostPreview).toBe(false);

  // Full dark (W2, called as soon as it can be): W2's Nibblers reach the Prism's beam. While it
  // beams its real disc is punched out and its ghost goes; at rest the ghost is back, unlit.
  const until = (beam: boolean): Promise<boolean> =>
    page.evaluate((want) => {
      const sd = globalThis.__sd!;
      const st = sd.state()!;
      const prism = () => st.towers.items.find((t) => t.alive && t.def?.id === 'prism');
      for (let k = 0; k < 20_000; k++) {
        if (st.wave >= 2 && st.dark >= 1 && prism()?.beamActive === want) return true;
        if (st.outcome !== 'playing') return false;
        const phase = st.schedule.phase;
        if (st.wave < 2 && (phase === 'setup' || phase === 'countdown')) {
          sd.enqueue({ type: 'callWave' });
        }
        sd.fastForward(1);
      }
      return false;
    }, beam);
  expect(await until(true)).toBe(true);
  const lit = await glow(page);
  expect(lit).toMatchObject({ ghosts: 0, lights: 3, crystals: 1 }); // two lamps and the Prism
  await shot(page, 'm5readability', 3, 'prism-lit');
  expect(await until(false)).toBe(true);
  const dark = await glow(page);
  expect(dark).toMatchObject({ ghosts: 1, lights: 2, crystals: 0 }); // the lamps only
  await shot(page, 'm5readability', 4, 'prism-ghost-dark');
});

test('the Penitent’s boss bar: its shield strip and the 50% kneel mark', async ({ page }) => {
  await page.goto('/?test=1&map=dev_penitent&seed=1');
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  // A Lookout over the road and Zapcoils to break the shield (penitent.spec's build).
  const bar = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.enqueue({ type: 'build', tower: 'lookout', tile: [4, 2] });
    for (const [c, r] of [
      [2, 0],
      [5, 4],
      [8, 4],
      [10, 3],
      [12, 6],
      [12, 3],
      [14, 4],
    ] as const) {
      sd.enqueue({ type: 'build', tower: 'zapcoil', tile: [c, r] });
    }
    sd.enqueue({ type: 'callWave' });
    const st = sd.state()!;
    const boss = () =>
      st.enemies.items
        .slice(0, st.enemies.used)
        .find((e) => e.alive && (e.def?.boss ?? null) !== null);
    for (let k = 0; k < 20_000 && boss() === undefined; k++) sd.fastForward(1);
    return boss() !== undefined;
  });
  expect(bar).toBe(true);
  await nextFrames(page);
  const open = await page.evaluate(() => globalThis.__sd!.render()!);
  expect(open.bossBar).toBe(160);
  // Its shield on its own strip (the Zapcoils may already have chipped it as it stepped in).
  expect(open.bossShield).toBeGreaterThan(100);
  expect(open.bossEnd).toBe(80); // where it kneels: its 50%
  await shot(page, 'm5readability', 5, 'boss-bar-shield');

  // The shield breaks: the strip empties (a re-form ghost may grow along it), the mark stays.
  const broke = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    const st = sd.state()!;
    const boss = () =>
      st.enemies.items
        .slice(0, st.enemies.used)
        .find((e) => e.alive && (e.def?.boss ?? null) !== null);
    for (let k = 0; k < 20_000; k++) {
      const b = boss();
      if (b === undefined || st.outcome !== 'playing') return false;
      if (b.shieldHp <= 0) return true;
      sd.fastForward(1);
    }
    return false;
  });
  expect(broke).toBe(true);
  await page.evaluate(() => globalThis.__sd!.fastForward(60));
  await page.waitForTimeout(300); // past the break's 120 ms flash
  await nextFrames(page);
  const broken = await page.evaluate(() => globalThis.__sd!.render()!);
  expect(broken.bossEnd).toBe(80);
  expect(broken.bossBar).toBeGreaterThanOrEqual(80); // the HP never drains past the mark
  await shot(page, 'm5readability', 6, 'boss-bar-broken');
});
