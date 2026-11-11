// T608: the Stasis Bloom on its dev range (`?map=dev_bloom`, render/__fixtures__/devBloom.ts). A
// Gravity Well Bloom in the road's corner holds a faint violet disc under a dashed violet ring at its
// field's reach; a Mindspike (Stillmind) and a Harpoon (Pinned Down) beside it widen the field 0.3
// tiles and quicken its pulse. Once the wave reaches the corner, the Bloom pulses: the disc flashes
// brighter, the frost ring blows out, and the units inside freeze (BloomView, PulseBurst).
// Screenshots in <out>/screens/bloom/ (look at them: the disc, the ring, and the flash are the
// point).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

/** Steps the sim one tick at a time (up to `max`) until the Bloom has just pulsed, then renders. */
async function untilPulse(page: Page, max = 2400): Promise<number> {
  const frozen = await page.evaluate((limit) => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    const st = sd.state()!;
    const bloom = (): (typeof st.towers.items)[number] | undefined =>
      st.towers.items.find((t) => t.alive && t.def?.id === 'bloom');
    const startFired = bloom()?.firstFiredTick ?? -1;
    let last = bloom()?.cooldownTicks ?? 0;
    for (let k = 0; k < limit; k++) {
      sd.fastForward(1);
      const b = bloom();
      if (b === undefined) return -1;
      // A pulse resets the timer upward (or fires the first time).
      const pulsed = b.cooldownTicks > last || (startFired < 0 && b.firstFiredTick >= 0);
      last = b.cooldownTicks;
      if (!pulsed) continue;
      let n = 0;
      for (let i = 0; i < st.enemies.used; i++) {
        const e = st.enemies.items[i]!;
        if (e.alive && e.stasisTicks > 0) n++;
      }
      if (n > 0) return n;
    }
    return 0;
  }, max);
  await nextFrames(page);
  return frozen;
}

test('bloom: the field disc and ring, Pinned Down and Stillmind, and a pulse freezing the corner', async ({
  page,
}) => {
  await page.goto('/?test=1&map=dev_bloom&seed=1');
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.enqueue({ type: 'build', tower: 'bloom', tile: [9, 2] });
    sd.fastForward(1);
    const bloomUid = (): number => {
      const st = sd.state()!;
      for (let i = 0; i < st.towers.used; i++) {
        const t = st.towers.items[i]!;
        if (t.alive && t.def?.id === 'bloom') return t.uid;
      }
      return 0;
    };
    for (let k = 0; k < 2; k++) {
      sd.enqueue({ type: 'upgrade', towerUid: bloomUid() });
      sd.fastForward(1);
    }
    sd.enqueue({ type: 'specialize', towerUid: bloomUid(), spec: 'a' });
    sd.fastForward(1);
  });
  await nextFrames(page);
  let look = await page.evaluate(() => globalThis.__sd!.render()!.bloom);
  expect(look).toEqual({ fields: 1, flashing: 0 });
  await shot(page, 'bloom', 1, 'gravity-well-field');

  // A Mindspike and a Harpoon beside it: Stillmind and Pinned Down reach the Bloom.
  const linked = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.enqueue({ type: 'build', tower: 'mindspike', tile: [8, 2] });
    sd.enqueue({ type: 'build', tower: 'harpoon', tile: [9, 3] });
    sd.fastForward(1);
    const st = sd.state()!;
    const b = st.towers.items.find((t) => t.alive && t.def?.id === 'bloom')!;
    return { radius: b.linkFieldRadiusTiles, sooner: b.linkPulseSoonerTicks };
  });
  expect(linked.radius).toBeCloseTo(0.3);
  expect(linked.sooner).toBe(60);
  await nextFrames(page);
  await shot(page, 'bloom', 2, 'linked');

  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
  });
  expect(await untilPulse(page)).toBeGreaterThan(0);
  look = await page.evaluate(() => globalThis.__sd!.render()!.bloom);
  expect(look).toEqual({ fields: 1, flashing: 1 });
  await shot(page, 'bloom', 3, 'pulse');
});
