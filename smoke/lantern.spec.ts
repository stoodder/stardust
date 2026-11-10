// T508: the Seer's Lantern on its dev range (`?map=dev_lantern`, render/__fixtures__/devLantern.ts):
// a Truthlight Lantern on the high ground beside a Prism (Lightsong), an All-Seeing Lantern on the
// north arm, and Rivets, against W1's Veilwalkers, Rift Moths, and Blinkstriders. A Marked unit
// wears a pink eye beside its head (All-Seeing's crowd), and Truthlight's target a filled gold
// eye while it can't cloak, blink, phase, or burrow; the Lantern's light-beam is BeamView's thin
// thread. Asserted through `__sd.state()` and `__sd.render().marks`; screenshots in the flow's
// screens folder (look at them: the eyes are the point).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

const TRUTHLIGHT = [6, 4] as const;
const ALL_SEEING = [4, 2] as const;
const PRISM = [7, 4] as const;

type Cond = 'marks' | 'truth';

/** Steps the sim one tick at a time (up to `max`) until `cond` holds, then renders. */
async function until(page: Page, cond: Cond, max = 2400): Promise<boolean> {
  const held = await page.evaluate(
    ([c, limit]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      const check = (): boolean => {
        const st = sd.state()!;
        let marked = 0;
        for (let i = 0; i < st.enemies.used; i++) {
          const e = st.enemies.items[i]!;
          if (!e.alive || e.burrowed || e.phased) continue;
          if (c === 'truth' && e.noEvadeTicks > 30) return true;
          if (e.markTicks > 0) marked++;
        }
        return c === 'marks' && marked >= 3;
      };
      for (let k = 0; k < limit; k++) {
        if (check()) return true;
        sd.fastForward(1);
      }
      return check();
    },
    [cond, max] as const,
  );
  await nextFrames(page);
  return held;
}

test('lantern: All-Seeing Marks the crowd, Truthlight holds one, Lightsong links the Prism', async ({
  page,
}) => {
  await page.goto('/?test=1&map=dev_lantern&seed=1');
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();

  await page.evaluate(
    ([truth, all, prism]) => {
      const sd = globalThis.__sd!;
      sd.setSpeed(0);
      sd.enqueue({ type: 'build', tower: 'lantern', tile: [truth[0], truth[1]] });
      sd.enqueue({ type: 'build', tower: 'lantern', tile: [all[0], all[1]] });
      sd.enqueue({ type: 'build', tower: 'prism', tile: [prism[0], prism[1]] });
      sd.enqueue({ type: 'build', tower: 'rivet', tile: [7, 2] });
      sd.fastForward(1);
      const st = sd.state()!;
      for (const [tile, spec] of [
        [truth, 'b'],
        [all, 'a'],
      ] as const) {
        const t = st.towers.items.find((x) => x.alive && x.col === tile[0] && x.row === tile[1]);
        const uid = t?.uid ?? 0;
        sd.enqueue({ type: 'upgrade', towerUid: uid });
        sd.enqueue({ type: 'upgrade', towerUid: uid });
        sd.enqueue({ type: 'specialize', towerUid: uid, spec });
      }
      sd.enqueue({ type: 'callWave' });
      sd.fastForward(1);
    },
    [TRUTHLIGHT, ALL_SEEING, PRISM] as const,
  );
  const built = await page.evaluate(() => {
    const st = globalThis.__sd!.state()!;
    const lanterns = st.towers.items.filter((t) => t.alive && t.def?.id === 'lantern');
    return {
      specs: lanterns.map((t) => String(t.spec)).toSorted(),
      markPct: Math.max(...lanterns.map((t) => t.linkMarkPct)),
      rampPct: Math.max(
        ...st.towers.items
          .filter((t) => t.alive && t.def?.id === 'prism')
          .map((t) => t.linkRampPct),
      ),
    };
  });
  expect(built.specs).toEqual(['a', 'b']);
  expect(built.markPct).toBeCloseTo(0.05, 9); // Lightsong: the Truthlight Lantern's Marks +5%
  expect(built.rampPct).toBeCloseTo(0.3, 9); // and the Prism's ramp 30% faster

  // All-Seeing: every unit near it wears the Mark's eye.
  expect(await until(page, 'marks')).toBe(true);
  expect(await page.evaluate(() => globalThis.__sd!.render()!.marks.marked)).toBeGreaterThanOrEqual(
    3,
  );
  await shot(page, 'lantern', 1, 'marked');

  // Truthlight: its target's eye fills gold and white while it can't evade.
  expect(await until(page, 'truth')).toBe(true);
  expect(await page.evaluate(() => globalThis.__sd!.render()!.marks.truth)).toBeGreaterThan(0);
  await shot(page, 'lantern', 2, 'truthlight');
});
