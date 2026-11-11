// T708: the Gathering Maw on its dev range (`?map=dev_gmaw`, render/__fixtures__/devM7.ts), under
// par's Railspikes. Its wide gather (the Maw's tendrils from the boss to a Fracture that caught it
// up, HollowView), the split at 50% (three parts tethered along the road, GatheringMawView, under
// one boss bar refilled to their summed HP), the merge's tell (the tethers pulled taut as the parts
// walk together), and the merged Maw (one body, the bar going on). Screenshots in
// <out>/screens/gmaw/ (look at them: the tendrils, the tethers, and the one bar are the point).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

type Probe = 'gather' | 'split' | 'mergeTell' | 'merged';

/** Steps the sim a tick at a time (up to `max`) until `what` shows in the sim state. */
async function until(page: Page, what: Probe, max = 6000): Promise<boolean> {
  const hit = await page.evaluate(
    ([probe, limit]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      const seen = (): boolean => {
        const st = sd.state()!;
        return st.enemies.items.some((e) => {
          if (!e.alive || e.def === null) return false;
          const id = e.def.id;
          if (probe === 'gather') return id === 'gathering_maw' && e.gatherUid !== 0;
          if (probe === 'split') return id === 'gathering_maw_part';
          if (probe === 'mergeTell') {
            return id === 'gathering_maw_part' && e.mergeTicks > 0 && e.mergeTicks <= 60;
          }
          return id === 'gathering_maw' && e.bossPhase === 3;
        });
      };
      for (let k = 0; k < limit; k++) {
        if (seen()) return true;
        sd.fastForward(1);
      }
      return seen();
    },
    [what, max] as const,
  );
  await nextFrames(page);
  return hit;
}

const look = (page: Page) => page.evaluate(() => globalThis.__sd!.render()!.gmaw);
const bar = (page: Page) => page.evaluate(() => globalThis.__sd!.render()!.bossBar);

test('gmaw: the wide gather, the split under one bar, the merge', async ({ page }) => {
  await page.goto('/?test=1&map=dev_gmaw&seed=1');
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    const at = (c: number, r: number) =>
      sd.state()!.towers.items.find((t) => t.alive && t.col === c && t.row === r)!.uid;
    const rivets = [
      [7, 2],
      [7, 4],
      [12, 2],
      [5, 4],
      [5, 2],
      [3, 4],
    ] as const;
    sd.enqueue({ type: 'build', tower: 'zapcoil', tile: [12, 4] });
    for (const [c, r] of rivets) sd.enqueue({ type: 'build', tower: 'rivet', tile: [c, r] });
    sd.fastForward(1);
    for (const [c, r] of rivets) {
      sd.enqueue({ type: 'upgrade', towerUid: at(c, r) });
      sd.fastForward(1);
      sd.enqueue({ type: 'upgrade', towerUid: at(c, r) });
      sd.fastForward(1);
      sd.enqueue({ type: 'specialize', towerUid: at(c, r), spec: 'b' });
      sd.fastForward(1);
    }
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
    // W1's Motes; call W2 (the boss) as soon as it can be.
    for (let k = 0; k < 1200 && sd.state()!.wave < 2; k++) {
      if (sd.state()!.schedule.phase === 'countdown') sd.enqueue({ type: 'callWave' });
      sd.fastForward(1);
    }
  });

  // Phase 1: the tendrils from the boss to the Fracture it holds.
  expect(await until(page, 'gather')).toBe(true);
  await page.evaluate(() => globalThis.__sd!.fastForward(45)); // the noose half closed
  await nextFrames(page);
  expect(await page.evaluate(() => globalThis.__sd!.render()!.hollow.tells)).toBe(1);
  expect(await bar(page)).toBeGreaterThan(0);
  await shot(page, 'gmaw', 1, 'gather');

  // Phase 2: three parts, tethered, under one bar refilled to their summed HP.
  expect(await until(page, 'split')).toBe(true);
  await page.evaluate(() => globalThis.__sd!.fastForward(10));
  await nextFrames(page);
  expect(await look(page)).toMatchObject({ parts: 3, tethers: 2, taut: 0, splitsSeen: 1 });
  expect(await bar(page)).toBeGreaterThan(140); // ~full: 7200 of 7200, less 10 ticks of fire
  await shot(page, 'gmaw', 2, 'split');

  // The merge's tell: the tethers taut, the parts closing on the lead.
  expect(await until(page, 'mergeTell')).toBe(true);
  await nextFrames(page);
  const tell = await look(page);
  expect(tell.taut).toBeGreaterThan(0);
  expect(tell.taut).toBe(tell.tethers);
  await shot(page, 'gmaw', 3, 'merge-tell');

  // Phase 3: one Maw again, the bar going on.
  expect(await until(page, 'merged')).toBe(true);
  await nextFrames(page);
  expect(await look(page)).toMatchObject({ parts: 0, tethers: 0, mergesSeen: 1 });
  expect(await bar(page)).toBeGreaterThan(0);
  await shot(page, 'gmaw', 4, 'merged');

  // D150: past its puff, the merged Maw rages in its hot-magenta `panic` hide, sorted over the
  // tower bases in front of it (look at the shot: it must read at 1× on the violet ground).
  const raging = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    const merged = () =>
      sd.state()!.enemies.items.find((e) => e.alive && e.splitFrom === null && e.splitMaxHp > 0);
    for (let k = 0; k < 600 && (merged()?.invulnerableTicks ?? 1) > 0; k++) sd.fastForward(1);
    sd.fastForward(20);
    return merged()?.invulnerableTicks === 0;
  });
  expect(raging).toBe(true);
  await nextFrames(page);
  await shot(page, 'gmaw', 5, 'merged-rage');
});
