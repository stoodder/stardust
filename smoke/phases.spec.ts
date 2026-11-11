// T806: phases, the Deep Bore, the Halls checkpoint, and Dawn's light on their dev range
// (`?map=dev_bore`, render/__fixtures__/devPhases.ts), played by par (`autoplay('par')`; with no
// save the run takes `quill_choice = keep`, the flag's first variant, so the Bore runs at 100%).
// W1 starts the Bore: its minimal bar shows under the boss bar's place and fills. W2 cleared is
// the Halls: Phase 2, the 'halls' checkpoint, the Bore stopped with its boss bonus fixed; W3's
// boss walks in with it. The sky warmed a step at W2 (a sky-only key) while the world's grade held.
// W3 cleared is Dawn: the light turns over 8 s (the sky and the grade move, the dark lifts), and
// the map is won 8 s on. Screenshots via shot().
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

type Until = 'bore' | 'halls' | 'boss' | 'dawn' | 'end';

/** Fast-forwards a tick at a time until `cond` holds or the map ends; returns the numbers. */
const until = (page: Page, cond: Until) =>
  page.evaluate((c) => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    const done = (): boolean => {
      const s = sd.state()!;
      if (s.outcome !== 'playing') return true;
      if (c === 'bore') return s.timers[0]!.filled >= 300;
      if (c === 'halls') return s.phase >= 2;
      if (c === 'boss')
        return s.enemies.items.some((e) => e.alive && e.def !== null && e.def.boss !== null);
      if (c === 'dawn') return s.lightingKey !== null && s.tick - s.lightingTick >= 240;
      return false;
    };
    for (let k = 0; k < 20_000 && !done(); k++) sd.fastForward(1);
    const s = sd.state()!;
    const t = s.timers[0]!;
    return {
      outcome: s.outcome,
      wave: s.wave,
      phase: s.phase,
      filled: t.filled,
      ratePct: t.ratePct,
      bonus: t.bossHpPct,
      light: s.lightingKey,
      dark: s.dark,
    };
  }, cond);

const look = (page: Page) =>
  page.evaluate(() => {
    const r = globalThis.__sd!.render()!;
    return { bars: [...r.timerBars], sky: r.lighting.sky, world: r.lighting.world };
  });

test('phases: the Bore fills and stops at the Halls; Dawn turns the light and lifts the dark', async ({
  page,
}) => {
  await page.goto('/?test=1&map=dev_bore&seed=1');
  await waitForReady(page);
  expect((await look(page)).bars).toEqual([-1]); // not started yet
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
    sd.fastForward(0);
  });

  // W1: the Bore runs; its bar fills.
  const bore = await until(page, 'bore');
  expect(bore).toMatchObject({ outcome: 'playing', wave: 1, phase: 1, ratePct: 1, bonus: 0 });
  await nextFrames(page);
  const filling = await look(page);
  expect(filling.bars[0]).toBeGreaterThan(0);
  expect(filling.bars[0]).toBeLessThan(96);
  await shot(page, 'phases', 1, 'bore');

  // W2 cleared: Phase 2 at the Halls; the Bore stops, its bonus fixed. The sky warmed a step at
  // W2 (sky-only); the grade held at the night.
  const halls = await until(page, 'halls');
  expect(halls).toMatchObject({ outcome: 'playing', phase: 2, ratePct: 0 });
  expect(halls.bonus).toBeGreaterThan(0);
  await nextFrames(page);
  const stopped = await look(page);
  // Sky stops: the night, W1's dark key, W2's sky-only key, Dawn; the grade's skip W2's.
  expect(stopped.sky).toBe(2);
  expect(stopped.world).toBe(1);
  await shot(page, 'phases', 2, 'halls');

  const boss = await until(page, 'boss');
  expect(boss.filled).toBe(halls.filled); // stopped
  await nextFrames(page);
  expect((await look(page)).bars[0]).toBe(stopped.bars[0]);
  await shot(page, 'phases', 3, 'boss');

  // W3 cleared: Dawn. 4 s into the turn the sky and the grade are on their way and the dark lifts.
  const dawn = await until(page, 'dawn');
  expect(dawn).toMatchObject({ outcome: 'playing', phase: 3, light: 'dawn' });
  expect(dawn.dark).toBeGreaterThan(0);
  expect(dawn.dark).toBeLessThan(0.6);
  await nextFrames(page);
  const turning = await look(page);
  expect(turning.sky).toBeGreaterThan(2);
  expect(turning.world).toBeGreaterThan(1);
  await shot(page, 'phases', 4, 'dawn');

  const end = await until(page, 'end');
  expect(end).toMatchObject({ outcome: 'won', dark: 0 });
});
