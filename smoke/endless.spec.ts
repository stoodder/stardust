// T861: Endless's map, END_M01 *The Long Shift*, registered by the finale's lazy chunk, opens
// as a battle (`?map=end_m01`): A1M1's Dome Row at dawn in its 22×14 band (two rifts, two air lanes
// from the north corners, ten new buildable tiles), the core on A1M1's gate. The battle plays the
// map's authored warm-up (the generated waves are the post-game shell's to swap in, T863): W1's
// Nibblers walk the old road. Screenshots in <out>/screens/endless/ (look at them: the dawn
// palette, the band's pads, the power node west and the high ground east).
import { expect, test } from './fixtures.ts';
import { shot, waitForReady } from './hooks.ts';

test('endless: The Long Shift boots at dawn and W1 walks the old road', async ({ page }) => {
  await page.goto('/?test=1&map=end_m01&skipIntro=1&seed=7');
  await waitForReady(page);
  const start = await page.evaluate(() => {
    const s = globalThis.__sd!.state()!; // waitForReady passed: a battle is running
    return { tick: s.tick, wave: s.wave, credits: s.credits, integrity: s.integrity };
  });
  // The map's 900 credits and 20 integrity, plus the save's meta (Seed Money, Reinforced Core).
  expect(start.wave).toBe(0);
  expect(start.credits).toBeGreaterThanOrEqual(900);
  expect(start.integrity).toBeGreaterThanOrEqual(20);
  await shot(page, 'endless', 1, 'setup');

  // A Zapcoil by the gate, then W1: the Nibblers come down from A1M1's spawn.
  const walking = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.enqueue({ type: 'build', tile: [10, 9], tower: 'zapcoil' });
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(60 * 8);
    const s = sd.state()!;
    let live = 0;
    for (let i = 0; i < s.enemies.used; i++) if (s.enemies.items[i]!.alive) live++;
    return { wave: s.wave, live, towers: s.towers.live };
  });
  expect(walking.wave).toBe(1);
  expect(walking.towers).toBe(1);
  expect(walking.live).toBeGreaterThan(0);
  await shot(page, 'endless', 2, 'w1');
});
