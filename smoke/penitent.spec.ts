// T506: the Sunderglass Penitent and the pivot on the dev Penitent range (`?map=dev_penitent`,
// render/__fixtures__/devBattle.ts): par's Lookout and Zapcoils break the short Penitent's shield
// (phase 2: three cloaked Glimmer-shards at its side), then push it to 50%, and it pivots in W5:
// it stops and fades out with the Aelari (the stand-down, down the alpha ladder), kneels as the
// Ward (its bowed body and a steady blue ring), and the HUD's core meter becomes the Evacuated
// meter as four refugees file in. W6's Motes come down the north road past the Ward, Chilled
// inside its ring. Screenshots in test-results/screens/penitent/ (look at them: the fade and the
// Ward are the point).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

const MAP = 'dev_penitent';

type Cond = 'shards' | 'fading' | 'ward' | 'chilled';

/** Steps the sim a tick at a time until `cond` holds, then renders. Returns whether it held. */
async function until(page: Page, cond: Cond, max = 20_000): Promise<boolean> {
  const held = await page.evaluate(
    ([c, limit]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      const st = sd.state()!;
      const live = () => st.enemies.items.slice(0, st.enemies.used).filter((e) => e.alive);
      const check = (): boolean => {
        const boss = live().find((e) => e.def?.id === 'dev_penitent');
        switch (c) {
          case 'shards':
            return live().filter((e) => e.def?.id === 'glimmer_shard').length === 3;
          case 'fading':
            // Half way through the stand-down's 1 s fade.
            return boss !== undefined && boss.standDownTicks > 0 && boss.standDownTicks <= 30;
          case 'ward':
            return boss === undefined && st.stats.pivotWave > 0;
          case 'chilled':
            return live().some((e) => e.def?.id === 'mote' && e.chillPct > 0);
        }
        return false;
      };
      for (let k = 0; k < limit; k++) {
        if (check()) return true;
        if (st.outcome !== 'playing') return false;
        sd.fastForward(1);
      }
      return check();
    },
    [cond, max] as const,
  );
  await nextFrames(page);
  return held;
}

test('the Penitent: its shards, the stand-down, the Ward, the Evacuated meter', async ({
  page,
}) => {
  await page.goto(`/?test=1&map=${MAP}&seed=1`);
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  await expect(page.getByTestId('escort-meter')).toHaveCount(0); // Defend until the pivot
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.enqueue({ type: 'build', tower: 'lookout', tile: [4, 2] });
    for (const tile of [
      [2, 0],
      [5, 4],
      [8, 4],
      [10, 3],
      [12, 6],
      [12, 3],
      [14, 4],
    ] as const) {
      sd.enqueue({ type: 'build', tower: 'zapcoil', tile: [tile[0], tile[1]] });
    }
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
  });
  expect(await page.evaluate(() => globalThis.__sd!.state()!.towers.live)).toBe(8);

  // The shield breaks: phase 2, three cloaked shards beside it.
  expect(await until(page, 'shards')).toBe(true);
  const boss = await page.evaluate(() => {
    const st = globalThis.__sd!.state()!;
    const b = st.enemies.items.slice(0, st.enemies.used).find((e) => e.def?.id === 'dev_penitent');
    return { phase: b?.bossPhase, shield: b?.shieldHp };
  });
  expect(boss).toEqual({ phase: 2, shield: 0 });
  await shot(page, 'penitent', 0, 'shards');

  // 50%: the pivot. It stands down with the Aelari, fading where it stopped.
  expect(await until(page, 'fading')).toBe(true);
  const fading = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    const st = sd.state()!;
    const b = st.enemies.items.slice(0, st.enemies.used).find((e) => e.def?.id === 'dev_penitent');
    const r = sd.render()!;
    return { wards: r.wards, alpha: r.enemies.find((e) => e.uid === b?.uid)?.alpha ?? -1 };
  });
  expect(fading).toEqual({ wards: 1, alpha: 0.4 }); // the ladder's third rung, half way
  await shot(page, 'penitent', 1, 'stand-down');

  // Gone: the Ward kneels in its place, and the core meter is now the Evacuated meter.
  expect(await until(page, 'ward')).toBe(true);
  const after = await page.evaluate(() => {
    const st = globalThis.__sd!.state()!;
    return { pivotWave: st.stats.pivotWave, objective: st.objective };
  });
  expect(after).toMatchObject({ pivotWave: 5, objective: 'escort' });
  expect(await page.evaluate(() => globalThis.__sd!.render()!.wards)).toBe(1);
  await expect(page.getByTestId('escort-meter')).toHaveAccessibleName('Evacuated 0 of 4, lost 0/2');
  await shot(page, 'penitent', 2, 'ward');

  // W6's Motes walk into the Ward's ring and slow.
  expect(await until(page, 'chilled')).toBe(true);
  await shot(page, 'penitent', 3, 'chilled');
});
