// T507: the Mindspike Obelisk and Ves'thara's Stillness on their dev range (`?map=dev_mind`,
// render/__fixtures__/devMind.ts): an Echo Spike on the high ground and a Dread beside the road,
// against W1's Mote cluster and Blinkstriders. Stillness is aimed from the HUD's slot 2 (the
// strike's reticle at its 2.5 radius) and cast by a real click on the cluster: the Motes freeze
// under a pale blue disc. Then a Dread hit leaves a wobbling violet squiggle over its target
// (Unnerved), and an Echo Spike hit rings out to its echo's radius. Asserted through
// `__sd.state()` and `__sd.render().mind`; screenshots in test-results/screens/mindspike/ (look at
// them: the squiggle, the ring, and the disc are the point).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

const ECHO = [6, 4] as const;
const DREAD = [4, 2] as const;

type Cond = 'cluster' | 'unnerved' | 'echo';

/** Steps the sim one tick at a time (up to `max`) until `cond` holds, then renders. */
async function until(page: Page, cond: Cond, max = 2400): Promise<boolean> {
  const held = await page.evaluate(
    ([c, limit]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      const check = (): boolean => {
        const st = sd.state()!;
        let motes = 0;
        for (let i = 0; i < st.enemies.used; i++) {
          const e = st.enemies.items[i]!;
          if (!e.alive) continue;
          if (e.def?.id === 'mote') motes++;
          if (c === 'unnerved' && e.unnervedTicks > 30) return true;
        }
        if (c === 'cluster') return motes >= 4;
        if (c === 'echo') return (sd.render()?.mind.echoes ?? 0) > 0;
        return false;
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

test('mindspike: Stillness freezes the cluster, Dread unnerves, Echo Spike echoes', async ({
  page,
}) => {
  await page.goto('/?test=1&map=dev_mind&seed=1');
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  const bar = page.getByRole('navigation', { name: 'Abilities' });
  const still = bar.getByRole('button', { name: /^Stillness/ });
  await expect(still).toHaveAttribute('aria-label', /, ready$/);

  await page.evaluate(
    ([echo, dread]) => {
      const sd = globalThis.__sd!;
      sd.setSpeed(0);
      sd.enqueue({ type: 'build', tower: 'mindspike', tile: [echo[0], echo[1]] });
      sd.enqueue({ type: 'build', tower: 'mindspike', tile: [dread[0], dread[1]] });
      sd.enqueue({ type: 'build', tower: 'rivet', tile: [7, 2] });
      sd.fastForward(1);
      const st = sd.state()!;
      for (const [tile, spec] of [
        [echo, 'a'],
        [dread, 'b'],
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
    [ECHO, DREAD] as const,
  );
  const specs = await page.evaluate(() =>
    globalThis
      .__sd!.state()!
      .towers.items.filter((t) => t.alive && t.def?.id === 'mindspike')
      .map((t) => t.spec),
  );
  expect(specs.toSorted()).toEqual(['a', 'b']);

  // Stillness: aim from the HUD over the Mote cluster, then click to cast.
  expect(await until(page, 'cluster')).toBe(true);
  const tile = await page.evaluate(() => {
    const st = globalThis.__sd!.state()!;
    let best: [number, number] = [2, 1];
    for (let i = 0; i < st.enemies.used; i++) {
      const e = st.enemies.items[i]!;
      if (e.alive && e.def?.id === 'mote') best = [Math.floor(e.x), Math.floor(e.y)]; // the last out
    }
    return best;
  });
  await still.click();
  await expect(still).toHaveAttribute('aria-pressed', 'true');
  await expect(bar.getByRole('status')).toContainText('Pick a target');
  const p = await page.evaluate(([c, r]) => globalThis.__sd?.tileToClient(c, r) ?? null, tile);
  expect(p).not.toBeNull();
  await page.mouse.move(p!.x, p!.y); // checked just above
  await shot(page, 'mindspike', 1, 'stillness-aim');
  await page.mouse.click(p!.x, p!.y);
  await expect(still).toHaveAttribute('aria-pressed', 'false');
  await expect
    .poll(() => page.evaluate(() => globalThis.__sd?.state()?.stats.abilityUses ?? 0))
    .toBe(1);
  await nextFrames(page);
  const cast = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    const st = sd.state()!;
    return {
      stills: sd.render()!.mind.stills,
      frozen: st.enemies.items.filter((e) => e.alive && e.stasisTicks > 0).length,
      cooldown: st.abilityCooldownTicks[1] ?? 0,
    };
  });
  expect(cast.stills).toBe(1);
  expect(cast.frozen).toBeGreaterThan(0);
  expect(cast.cooldown).toBeGreaterThan(0);
  await page.mouse.move(0, 0);
  await shot(page, 'mindspike', 2, 'stillness');

  // Dread: a squiggle over an Unnerved unit.
  expect(await until(page, 'unnerved')).toBe(true);
  expect(await page.evaluate(() => globalThis.__sd!.render()!.mind.unnerved)).toBeGreaterThan(0);
  await shot(page, 'mindspike', 3, 'unnerved');

  // Echo Spike: a hit rings out to its echo's radius.
  expect(await until(page, 'echo')).toBe(true);
  await shot(page, 'mindspike', 4, 'echo');
});
