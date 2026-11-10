// T504: the Prism Spire's beam on its dev range (`?map=dev_prism`, render/__fixtures__/devPrism.ts):
// a Prism on the high ground inside the U and a Zapcoil beside it (Resonance), against W1's
// Glimmers. The beam locking on (a thin blue thread from the crystal to its target), the ramp
// (the beam widens and whitens as it holds), the Resonance link (+20% vs shields on both), and,
// upgraded to Refractor in W2, two or three beams at once on the Weft Wardens and Glimmers.
// Asserted through `__sd.state()` and `__sd.render().beams`; screenshots in
// test-results/screens/prism/ (look at them: the beams are the point).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

const MAP = 'dev_prism';
const PRISM_TILE = [6, 4] as const;

type Cond = 'lit' | 'ramped' | 'split';

/** Steps the sim one tick at a time (up to `max`) until `cond` holds, then renders. */
async function until(page: Page, cond: Cond, max = 2400): Promise<boolean> {
  const held = await page.evaluate(
    ([c, limit, col, row]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      const prism = () => {
        const st = sd.state()!;
        for (let i = 0; i < st.towers.used; i++) {
          const t = st.towers.items[i]!;
          if (t.alive && t.col === col && t.row === row) return t;
        }
        return null;
      };
      const check = (): boolean => {
        const t = prism();
        if (t === null || !t.beamActive) return false;
        switch (c) {
          case 'lit':
            return true;
          case 'ramped': // two thirds of the way to ×4: the top step
            return t.beamRamp >= 3;
          case 'split':
            return [t.targetUid, t.beam2Uid, t.beam3Uid].filter((u) => u !== 0).length >= 2;
        }
        return false;
      };
      for (let k = 0; k < limit; k++) {
        if (check()) return true;
        sd.fastForward(1);
      }
      return check();
    },
    [cond, max, PRISM_TILE[0], PRISM_TILE[1]] as const,
  );
  await nextFrames(page);
  return held;
}

test('prism: the beam locks, ramps, links with the Zapcoil, and splits as Refractor', async ({
  page,
}) => {
  await page.goto(`/?test=1&map=${MAP}&seed=1`);
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate(
    ([col, row]) => {
      const sd = globalThis.__sd!;
      sd.setSpeed(0);
      sd.enqueue({ type: 'build', tower: 'prism', tile: [col, row] });
      sd.enqueue({ type: 'build', tower: 'zapcoil', tile: [col + 1, row] });
      sd.enqueue({ type: 'callWave' });
      sd.fastForward(1);
    },
    [PRISM_TILE[0], PRISM_TILE[1]] as const,
  );
  expect(await page.evaluate(() => globalThis.__sd!.state()!.towers.live)).toBe(2);

  // Resonance: both partners take +20% against a raised shield.
  const resonance = await page.evaluate(() => {
    const st = globalThis.__sd!.state()!;
    const out: Record<string, number> = {};
    for (let i = 0; i < st.towers.used; i++) {
      const t = st.towers.items[i]!;
      if (t.alive && t.def !== null) out[t.def.id] = t.vsShieldPct;
    }
    return out;
  });
  expect(resonance).toEqual({ prism: 0.2, zapcoil: 0.2 });

  expect(await until(page, 'lit')).toBe(true);
  const lit = await page.evaluate(() => globalThis.__sd!.render()!.beams);
  expect(lit.drawn).toBeGreaterThanOrEqual(1);
  expect(lit.topStep).toBe(0);
  await shot(page, 'prism', 1, 'beam-lock');

  // The Zapcoil kills Glimmers quickly; hold its fire so the Prism's beam can ramp on one.
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    const st = sd.state()!;
    for (let i = 0; i < st.towers.used; i++) {
      const t = st.towers.items[i]!;
      if (t.alive && t.def?.id === 'zapcoil')
        sd.enqueue({ type: 'holdFire', target: t.uid, on: true });
    }
    sd.fastForward(0);
  });
  expect(await until(page, 'ramped')).toBe(true);
  const ramped = await page.evaluate(() => globalThis.__sd!.render()!.beams);
  expect(ramped.topStep).toBe(2);
  expect(ramped.throws).toBeGreaterThan(0); // T530a: each lock throws its thread
  await shot(page, 'prism', 2, 'beam-ramped');

  // Refractor: tiers 2 and 3, then spec a; W2's Wardens and Glimmers take two or three beams.
  await page.evaluate(
    ([col, row]) => {
      const sd = globalThis.__sd!;
      const st = sd.state()!;
      let uid = 0;
      for (let i = 0; i < st.towers.used; i++) {
        const t = st.towers.items[i]!;
        if (t.alive && t.col === col && t.row === row) uid = t.uid;
      }
      sd.enqueue({ type: 'upgrade', towerUid: uid });
      sd.enqueue({ type: 'upgrade', towerUid: uid });
      sd.enqueue({ type: 'specialize', towerUid: uid, spec: 'a' });
      sd.enqueue({ type: 'holdFire', target: 'all', on: false });
      sd.fastForward(0);
    },
    [PRISM_TILE[0], PRISM_TILE[1]] as const,
  );
  expect(
    await page.evaluate(() => {
      const st = globalThis.__sd!.state()!;
      for (let i = 0; i < st.towers.used; i++) {
        const t = st.towers.items[i]!;
        if (t.alive && t.def?.id === 'prism') return t.tier;
      }
      return 0;
    }),
  ).toBe(4);
  expect(await until(page, 'split', 3600)).toBe(true);
  const split = await page.evaluate(() => globalThis.__sd!.render()!.beams);
  expect(split.drawn).toBeGreaterThanOrEqual(2);
  await shot(page, 'prism', 3, 'refractor');
});
