// T521: A2M5 *The Long Walk* reached the normal way, from the Sector map on the reference profile
// (`save=after_a2m4_returned`: A2M4 won, C2 taken as Return): The Long Walk's Start, par's loadout
// (Zapcoil, Lookout, Rivet, Thumper), Lock in, Bricks's briefing, then par (`autoplay('par')`). The
// setup, W1's Cantor walking its Glimmers under its dashed ring, the Sunderglass Penitent coming down
// the road in W5 (Ves'thara's cue), its shield breaking (the shards and her second cue), the pivot as
// W6 starts: a pausing panel mid-fight (the battle holds under it: Ves'thara, the PA, Bricks), the
// Ward kneeling where she stood and the first refugees on the road with the meter relabelled
// Evacuated, Bricks and Pebble at W11, and the debrief and the Prism Spire's gift on Results. Before
// each shot the sim plays a moment at 1×, so the frame isn't a fast-forward's pile. Fast text
// (`&fasttext=1`) shows each line whole. Screenshots in <out>/screens/a2m5/ (look at them: the
// aura, the shards, the panel, the Ward over the refugees).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

/** What the flow waits for, checked in the page against the live sim state. */
type Cond = 'setup' | 'cantor' | 'penitent' | 'broken' | 'prepivot' | 'escort' | 'w11' | 'end';

/** Plays par one tick at a time (up to `max`) until `cond` holds, then lets two frames render. */
async function until(page: Page, cond: Cond, max = 60 * 900): Promise<boolean> {
  const held = await page.evaluate(
    ([c, limit]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      const st = sd.state()!;
      const enemies = (pick: (e: (typeof st.enemies.items)[number]) => boolean): number => {
        let n = 0;
        for (let i = 0; i < st.enemies.used; i++) {
          const e = st.enemies.items[i]!;
          if (e.alive && pick(e)) n++;
        }
        return n;
      };
      const allies = (pick: (a: (typeof st.allies.items)[number]) => boolean): number => {
        let n = 0;
        for (let i = 0; i < st.allies.used; i++) {
          const a = st.allies.items[i]!;
          if (a.alive && pick(a)) n++;
        }
        return n;
      };
      const check = (): boolean => {
        switch (c) {
          case 'setup':
            return st.towers.live >= 4;
          case 'cantor':
            return enemies((e) => e.def?.id === 'cantor' && e.dist > 4) >= 1;
          case 'penitent':
            return enemies((e) => e.def?.id === 'sunderglass_penitent' && e.dist > 3) >= 1;
          case 'broken':
            return enemies((e) => e.def?.id === 'glimmer_shard') >= 3;
          case 'prepivot':
            // Two seconds before W6 starts: the Penitent still on the road.
            return (
              st.schedule.phase === 'countdown' &&
              st.schedule.countdownWave === 6 &&
              st.schedule.countdownTicks <= 120
            );
          case 'escort':
            return allies((a) => a.kind === 'refugee' && a.dist > 5) >= 4;
          case 'w11':
            return st.schedule.countdownWave === 11;
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

const towerCard = (page: Page, name: string) =>
  page.getByRole('button', { name: new RegExp(`^${name},`) });

test('A2M5: from the Sector map, the Penitent, the pivot mid-fight, the escort, and the gift', async ({
  page,
}) => {
  test.setTimeout(150_000);
  await page.goto('/?test=1&dialogue=1&fasttext=1&seed=1&save=after_a2m4_returned');
  await waitForReady(page);

  // The Sector map's normal flow: The Long Walk is next up; its Start, par's loadout, Lock in.
  await expect(page.getByRole('heading', { name: 'Sector map' })).toBeVisible();
  await page.getByRole('button', { name: 'Start The Long Walk' }).click();
  await expect(page.getByText('Shift 10 · The Long Walk')).toBeVisible();
  // Par's loadout: drop what the save's last four carry that par doesn't, then add par's.
  const want = ['Zapcoil', 'Lookout Shack', 'Rivet', 'Thumper'];
  const names = ['Sprinkler', 'Skyhook', ...want];
  const pressed = await Promise.all(
    names.map(
      async (name) => (await towerCard(page, name).getAttribute('aria-pressed')) === 'true',
    ),
  );
  const toggle = names.filter((name, i) => pressed[i] !== want.includes(name));
  const off = toggle.filter((name) => !want.includes(name));
  const on = toggle.filter((name) => want.includes(name));
  for (const name of [...off, ...on]) {
    // oxlint-disable-next-line no-await-in-loop -- each toggle changes the next one's slot
    await towerCard(page, name).click();
  }
  await Promise.all(
    want.map((name) => expect(towerCard(page, name)).toHaveAttribute('aria-pressed', 'true')),
  );
  await page.getByRole('button', { name: 'Lock in' }).click();
  await expect(page.getByTestId('hud')).toBeVisible();

  // Bricks on the pilot, QUILL's foreshadow, and the medal to aim for.
  const brief = page.getByRole('dialog');
  await expect(brief).toContainText('Relocation pilot.');
  await expect(brief).toContainText('Kneel');
  await shot(page, 'a2m5', 1, 'briefing');
  await page.keyboard.press('Escape');

  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
    sd.fastForward(0);
  });
  expect(await until(page, 'setup')).toBe(true);
  await play(page, 300);
  await shot(page, 'a2m5', 2, 'setup');

  // W1: the Aegis Cantor walks its Glimmers down the road under its dashed ring.
  expect(await until(page, 'cantor')).toBe(true);
  await play(page, 200);
  await shot(page, 'a2m5', 3, 'cantor');

  // W5: the Sunderglass Penitent comes down the road; Ves'thara's challenge on the radio.
  const comms = page.getByTestId('comms');
  expect(await until(page, 'penitent')).toBe(true);
  await play(page, 300);
  await shot(page, 'a2m5', 4, 'penitent');

  // Its shield breaks: three cloaked shards at its side, and her second cue.
  expect(await until(page, 'broken')).toBe(true);
  await page.evaluate(() => globalThis.__sd!.setSpeed(1));
  await expect(comms).toContainText('You count them, Counter.', { timeout: 10_000 });
  await page.evaluate(() => globalThis.__sd!.setSpeed(0));
  await nextFrames(page);
  await shot(page, 'a2m5', 5, 'shards');

  // The pivot as W6 starts, mid-fight: a pausing panel, and the battle holds under it.
  expect(await until(page, 'prepivot')).toBe(true);
  await page.evaluate(() => globalThis.__sd!.setSpeed(1));
  const panel = page.getByRole('dialog', { name: 'Comms' });
  await expect(panel).toBeVisible({ timeout: 10_000 });
  await expect(panel).toContainText('Run, small ones. I will be the wall.');
  await expect(page.getByRole('button', { name: 'Pause' })).toHaveAttribute('aria-pressed', 'true');
  const held = await page.evaluate(() => {
    const st = globalThis.__sd!.state()!;
    let penitent = false;
    for (let i = 0; i < st.enemies.used; i++) {
      const e = st.enemies.items[i]!;
      if (e.alive && e.def?.id === 'sunderglass_penitent') penitent = true;
    }
    return { tick: st.tick, objective: st.objective, wave: st.wave, penitent };
  });
  expect(held).toMatchObject({ objective: 'escort', wave: 6, penitent: true });
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => globalThis.__sd!.state()!.tick)).toBe(held.tick);
  await shot(page, 'a2m5', 6, 'pivot');
  const next = panel.getByRole('button', { name: /^(Skip|Next)$/ });
  await next.click();
  await expect(panel).toContainText('Area clearance authorized.');
  await next.click();
  await expect(panel).toContainText("Radio's bad. Can't hear the order.");
  await page.waitForTimeout(250);
  await shot(page, 'a2m5', 7, 'pivot-bricks');
  await next.click();
  await expect(panel).toBeHidden();
  await page.evaluate(() => globalThis.__sd!.setSpeed(0));

  // The Ward kneels where she stood; the first refugees walk past it to the gate.
  expect(await until(page, 'escort')).toBe(true);
  await play(page, 300);
  await shot(page, 'a2m5', 8, 'escort');

  // W11's radio: Pebble's in Bricks's pocket.
  expect(await until(page, 'w11')).toBe(true);
  await expect(comms).toContainText("Pebble's in my pocket.", { timeout: 10_000 });
  await page.waitForTimeout(250);
  await shot(page, 'a2m5', 9, 'pocket');

  // The win: Ves'thara's debrief and her gift on Results.
  expect(await until(page, 'end', 60 * 500)).toBe(true);
  const card = page.getByRole('dialog').filter({ hasText: 'Not there. Never there.' });
  await expect(card).toBeVisible({ timeout: 10_000 });
  await expect(card).toContainText('Prism Spire');
  await nextFrames(page);
  await shot(page, 'a2m5', 10, 'debrief');
});
