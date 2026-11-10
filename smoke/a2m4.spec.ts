// T520: A2M4 *Second Harvest* reached the normal way, from the Sector map on the reference profile
// (`save=after_a2m3_ref`: A2M3 won, Zapcoil specs and the Zapcoil and Rivet tune 2 bought): Second
// Harvest's Start, its loadout, Lock in, Kip's tour, then par (`autoplay('par')`). The setup in the
// dusk light with the intake hoppers cleared and the Lookout on one, W3's Veilwalkers shimmering
// into the yard and Revealed there, the truth scene full-screen on W4's clear (W5's build phase,
// nothing on the field: it holds the battle, and the player picks a reply), Kip's "throughput" at
// W6, the Hollow surging up out of the vats at W10, and the debrief's lines on Results up to C2's
// offer (its buttons are T510's). Before each shot the sim plays a moment at 1×, so the frame isn't
// a fast-forward's pile. Fast text (`&fasttext=1`) shows each line whole. Screenshots in
// test-results/screens/a2m4/ (look at them: the shimmer, the scene, the surge at the vats).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';
import { outPath } from './out.ts';

/** What the flow waits for, checked in the page against the live sim state. */
type Cond = 'setup' | 'veils' | 'w4cleared' | 'w6' | 'surge' | 'end';

/** Plays par one tick at a time (up to `max`) until `cond` holds, then lets two frames render. */
async function until(page: Page, cond: Cond, max = 60 * 900): Promise<boolean> {
  const held = await page.evaluate(
    ([c, limit]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      const st = sd.state()!;
      const count = (pick: (e: (typeof st.enemies.items)[number]) => boolean): number => {
        let n = 0;
        for (let i = 0; i < st.enemies.used; i++) {
          const e = st.enemies.items[i]!;
          if (e.alive && pick(e)) n++;
        }
        return n;
      };
      const check = (): boolean => {
        switch (c) {
          case 'setup':
            return st.towers.live >= 5;
          case 'veils':
            // Both Veilwalkers in the yard, one of them Revealed by the Lookout.
            return (
              st.wave === 3 &&
              count((e) => e.def?.id === 'veilwalker' && e.x < 5 && e.y > 3) >= 1 &&
              count((e) => e.def?.id === 'veilwalker' && e.revealedTicks > 0) >= 1
            );
          case 'w4cleared':
            return st.schedule.resolved[3] === true;
          case 'w6':
            return st.schedule.phase === 'countdown' && st.schedule.countdownWave === 6;
          case 'surge':
            return st.wave === 10 && count((e) => e.route?.id === 'vats' && e.dist > 1) >= 8;
          case 'end':
            return st.outcome !== 'playing';
          default:
            return false;
        }
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

/** Plays `ms` of real time at 1×, then pauses and lets two frames render. */
async function play(page: Page, ms: number): Promise<void> {
  await page.evaluate(() => globalThis.__sd!.setSpeed(1));
  await page.waitForTimeout(ms);
  await page.evaluate(() => globalThis.__sd!.setSpeed(0));
  await nextFrames(page);
}

test('A2M4: from the Sector map, the cloak, the truth scene, the surge, and C2’s offer', async ({
  page,
}) => {
  test.setTimeout(150_000);
  await page.goto('/?test=1&dialogue=1&fasttext=1&seed=1&save=after_a2m3_ref');
  await waitForReady(page);

  // The Sector map's normal flow: Second Harvest is next up; its Start, its loadout, Lock in.
  await expect(page.getByRole('heading', { name: 'Sector map' })).toBeVisible();
  await page.getByRole('button', { name: 'Start Second Harvest' }).click();
  await expect(page.getByText('Shift 9 · Second Harvest')).toBeVisible();
  await page.getByRole('button', { name: 'Lock in' }).click();
  await expect(page.getByTestId('hud')).toBeVisible();

  // Kip's tour, QUILL's cut-off and hint, and the medal to aim for.
  const brief = page.getByRole('dialog');
  await expect(brief).toContainText('Promoted! Reclamation Lead.');
  await expect(brief).toContainText('Nothing Unseen');
  await shot(page, 'a2m4', 1, 'briefing');
  await page.keyboard.press('Escape');

  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
    sd.fastForward(0);
  });
  // Par's loadout is what Lock in took (the loadout screen keeps the save's last four).
  expect(await until(page, 'setup')).toBe(true);
  await play(page, 300);
  await shot(page, 'a2m4', 2, 'setup-dusk');

  // W3: the Veilwalkers shimmer into the intake yard, and the Lookout on the hopper Reveals them.
  expect(await until(page, 'veils')).toBe(true);
  await play(page, 200);
  await shot(page, 'a2m4', 3, 'veils');
  const yard = await page.evaluate(() => globalThis.__sd!.tileToClient(2.5, 5.5));
  expect(yard).not.toBeNull();
  await page.screenshot({
    path: outPath('screens/a2m4/03b-yard-zoom.png'),
    clip: { x: yard!.x - 110, y: yard!.y - 80, width: 220, height: 160 },
  });

  // W4 is cleared in W5's build phase, with nothing on the field: the truth scene's moment.
  expect(await until(page, 'w4cleared')).toBe(true);
  const phase = await page.evaluate(() => {
    const st = globalThis.__sd!.state()!;
    let alive = 0;
    for (let i = 0; i < st.enemies.used; i++) if (st.enemies.items[i]!.alive) alive++;
    return { phase: st.schedule.phase, countdown: st.schedule.countdownWave, wave: st.wave, alive };
  });
  expect(phase).toEqual({ phase: 'countdown', countdown: 5, wave: 4, alive: 0 });
  // At 1× the script cues the scene: full-screen, and the battle holds under it.
  await page.evaluate(() => globalThis.__sd!.setSpeed(1));
  const scene = page.getByRole('dialog', { name: 'Scene' });
  await expect(scene).toBeVisible({ timeout: 10_000 });
  await expect(scene).toContainText('Where does stardust come from?');
  const held = await page.evaluate(() => globalThis.__sd!.state()!.tick);
  const next = scene.getByRole('button', { name: /^(Skip|Next)$/ });
  await next.click();
  await expect(scene).toContainText('Stardust is the dead, Technician.');
  await page.waitForTimeout(300);
  await shot(page, 'a2m4', 4, 'truth');
  await next.click();
  // The save never asked early (after_a2m3_ref), so the choice comes straight after.
  const knew = scene.getByRole('button', { name: 'You knew. All this time.' });
  await expect(knew).toBeVisible();
  await expect(scene.getByRole('button', { name: 'Great. Love that. Very normal.' })).toBeVisible();
  await shot(page, 'a2m4', 5, 'truth-choice');
  await knew.click();
  await expect(scene).toContainText('Can your QUILL say that? Can your Director?');
  expect(await page.evaluate(() => globalThis.__sd!.state()!.tick)).toBe(held);
  await page.waitForTimeout(300);
  await shot(page, 'a2m4', 6, 'truth-end');
  await page.keyboard.press('Escape');
  await expect(scene).toBeHidden();
  await page.evaluate(() => globalThis.__sd!.setSpeed(0));
  expect(await page.evaluate(() => globalThis.__sd!.save()?.story.seen)).toContain(
    'a2_m04_scene_truth',
  );

  // W6's radio: Kip has a word for it.
  expect(await until(page, 'w6')).toBe(true);
  const comms = page.getByTestId('comms');
  await expect(comms).toContainText("It's 'throughput.'", { timeout: 10_000 });
  await page.waitForTimeout(250); // the panel's 160 ms line-in step
  await shot(page, 'a2m4', 7, 'throughput');

  // W10: the Hollow surges up out of the vats' drain hatch.
  expect(await until(page, 'surge')).toBe(true);
  await play(page, 300);
  await shot(page, 'a2m4', 8, 'surge');

  // The win, and the debrief on Results up to C2's offer, price first.
  expect(await until(page, 'end', 60 * 500)).toBe(true);
  const card = page.getByRole('dialog', { name: 'PERIMETER SECURED!' });
  await expect(card).toBeVisible({ timeout: 10_000 });
  await expect(card).toContainText('Reclamation is a sustainability initiative');
  await expect(card).toContainText('Price first. Two offers.');
  await nextFrames(page);
  await shot(page, 'a2m4', 9, 'debrief');
});
