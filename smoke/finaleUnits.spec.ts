// T830: the finale's units as drawn (render/views/ChoirWalkView.ts, SongView.ts, UnsungView.ts,
// EchoView.ts; their looks choirWalkLook.ts, songLook.ts, unsungLook.ts, echoLook.ts). The Unsung
// surfacing among the singers is carried back to where it dug in, never popped (D156).
// - FIN with the strongest choir (`after_a3m6_strongest`: the warren's 28, Thrum, the Returned):
//   the column waits queued beside the colony gate and files out; Pebble leads in her own sprite
//   with Thrum beside her, the song rings round her and each of the Returned; waiting at a leg's
//   end is singing (no HALTED plate, no window); a halt shows the red window and the plate, and
//   Pebble's `halt`; hushed singers wear `hushed`.
// - dev_phases: the Unsung's body is its phase's form sprite (gathers, split parts, risen burrow
//   form, the Song), its surfacing bursts, and at Dawn it is laid to rest in gold.
// - dev_phases with the Quiet Wave cleared (`after_a3m6_weakest`): Thrum's echo warms gold in the
//   song and rises.
// Screenshots in <out>/screens/finale-units/ (look at them: the queue, the halt, the forms).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

const choirLook = (page: Page) => page.evaluate(() => globalThis.__sd!.render()!.choirWalk);

/** Fast-forwards FIN a tick at a time (calling waves) until the choir is `what`; returns whether. */
async function choirUntil(page: Page, what: 'waiting' | 'halted' | 'hushed'): Promise<boolean> {
  const hit = await page.evaluate((w) => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    const seen = (): boolean => {
      const c = sd.state()!.choir;
      if (w === 'waiting') return c.waiting;
      if (w === 'halted') return c.halted;
      return c.voices < c.singers;
    };
    for (let k = 0; k < 20_000 && !seen(); k++) {
      const s = sd.state()!;
      if (s.outcome !== 'playing') break;
      // Called early, the next leg opens at once and it never waits: let waves come on time.
      if (w !== 'waiting' && s.schedule.phase === 'countdown') sd.enqueue({ type: 'callWave' });
      sd.fastForward(1);
    }
    return seen();
  }, what);
  await nextFrames(page);
  return hit;
}

test('finale units: the choir queued at the gate, singing while it waits, halted, hushed', async ({
  page,
}) => {
  await page.goto('/?test=1&map=fin_m01&seed=1&save=after_a3m6_strongest');
  await waitForReady(page);
  await page.getByRole('button', { name: 'Clock in' }).click();
  await page.evaluate(() => globalThis.__sd!.setSpeed(0));
  await nextFrames(page);
  // Before W1: Pebble and Thrum at the gate, every singer queued beside it; three song rings.
  const start = await choirLook(page);
  expect(start.shown).toBe(30); // Pebble, Thrum, 28 singers (the Returned are BearerView's)
  expect(start.queued).toBe(28);
  expect(start.rings).toBe(3);
  expect(start.poses.hushed).toBe(0);
  await shot(page, 'finale-units', 1, 'queued-at-the-gate');

  // W1: the column files out; at the leg's end it waits singing (no plate, no window).
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
  });
  expect(await choirUntil(page, 'waiting')).toBe(true);
  await page.evaluate(() => globalThis.__sd!.fastForward(2));
  await nextFrames(page);
  const waiting = await choirLook(page);
  expect(waiting).toMatchObject({ halted: false, plate: false, window: 'none' });
  expect(waiting.poses.halt).toBe(0);
  expect(waiting.queued).toBeLessThan(28);
  await shot(page, 'finale-units', 2, 'waiting-singing');

  // A Hollow unit in the window: halted, the red window, the plate, Pebble's halt.
  expect(await choirUntil(page, 'halted')).toBe(true);
  await page.evaluate(() => globalThis.__sd!.fastForward(1));
  await nextFrames(page);
  const halted = await choirLook(page);
  expect(halted).toMatchObject({ halted: true, plate: true, window: 'halt' });
  expect(halted.poses.halt).toBe(1);
  await shot(page, 'finale-units', 3, 'halted');

  // Hushed singers trail grey.
  expect(await choirUntil(page, 'hushed')).toBe(true);
  await page.evaluate(() => globalThis.__sd!.fastForward(60));
  await nextFrames(page);
  const hushed = await choirLook(page);
  expect(hushed.hushed).toBeGreaterThan(0);
  expect(hushed.poses.hushed).toBe(hushed.hushed);
  await shot(page, 'finale-units', 4, 'hushed');
});

type Probe = 'unsung' | 'parts' | 'risen' | 'surfaced' | 'song' | 'echo';

/** Steps dev_phases (pressing "Who's there?", calling waves) until `what`; returns whether. */
async function phasesUntil(page: Page, what: Probe, max = 30_000): Promise<boolean> {
  const hit = await page.evaluate(
    ([probe, limit]) => {
      const sd = globalThis.__sd!;
      const seen = (): boolean => {
        const s = sd.state()!;
        const boss = s.enemies.items.find((e) => e.alive && e.def?.id === 'unsung');
        if (probe === 'unsung') return boss !== undefined && s.phase === 2;
        if (probe === 'parts') {
          return s.enemies.items.some((e) => e.alive && e.def?.id === 'unsung_part');
        }
        if (probe === 'risen') return boss?.bossPhase === 3 && boss.invulnerableTicks === 0;
        if (probe === 'surfaced') return boss?.burrowed === false && boss.abilityCount === 1;
        if (probe === 'song') return boss?.bossPhase === 4;
        return s.allies.items.some((a) => a.alive && a.kind === 'echo' && a.restTicks > 40);
      };
      for (let k = 0; k < limit && !seen(); k++) {
        const s = sd.state()!;
        if (s.outcome !== 'playing') break;
        if (s.pendingInput !== null) sd.enqueue({ type: 'scriptInput', id: 'whos_there' });
        if (s.schedule.phase === 'countdown') sd.enqueue({ type: 'callWave' });
        sd.fastForward(1);
      }
      return seen();
    },
    [what, max] as const,
  );
  await nextFrames(page);
  return hit;
}

/** Sets the Unsung's (or each part's) HP to just above `pct` of its max. */
async function edge(page: Page, id: 'unsung' | 'unsung_part', pct: number): Promise<void> {
  await page.evaluate(
    ([enemy, share]) => {
      for (const e of globalThis.__sd!.state()!.enemies.items) {
        if (!e.alive || e.def?.id !== enemy) continue;
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a test reaches into the sim
        (e as { hp: number }).hp = share * (e.def.hp + e.bonusMaxHp) + 1;
      }
    },
    [id, pct] as const,
  );
}

async function buildRing(page: Page): Promise<void> {
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.enqueue({ type: 'build', tower: 'zapcoil', tile: [4, 3] });
    for (const [c, r] of [
      [8, 3],
      [4, 1],
      [8, 1],
      [8, 5],
      [4, 5],
    ] as const) {
      sd.enqueue({ type: 'build', tower: 'rivet', tile: [c, r] });
    }
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
  });
}

const forms = (page: Page) => page.evaluate(() => globalThis.__sd!.render()!.unsung.forms);

test("finale units: the Unsung's forms by phase, its surfacing, laid to rest in gold", async ({
  page,
}) => {
  await page.goto('/?test=1&map=dev_phases&seed=1');
  await waitForReady(page);
  await buildRing(page);
  expect(await phasesUntil(page, 'unsung')).toBe(true);
  expect(await forms(page)).toEqual(['enemy.unsung']);
  await shot(page, 'finale-units', 5, 'unsung-gathers');

  await edge(page, 'unsung', 0.75);
  expect(await phasesUntil(page, 'parts')).toBe(true);
  await page.evaluate(() => globalThis.__sd!.fastForward(5));
  await nextFrames(page);
  expect((await forms(page)).filter((f) => f === 'enemy.unsung_part')).toHaveLength(3);

  // The parts fall inside the song: laid to rest in gold; it rises in its burrowing form.
  await edge(page, 'unsung_part', 0);
  expect(await phasesUntil(page, 'risen')).toBe(true);
  expect(await forms(page)).toEqual(['enemy.unsung_burrow']);
  const song = await page.evaluate(() => globalThis.__sd!.render()!.song);
  expect(song.restsSeen).toBeGreaterThanOrEqual(3);
  await shot(page, 'finale-units', 6, 'risen-parts-at-rest');

  expect(await phasesUntil(page, 'surfaced')).toBe(true);
  const up = await page.evaluate(() => globalThis.__sd!.render()!.unsung);
  expect(up.bursts).toBe(1);
  // D156: the song drives it back to where it dug in; its body is carried there, never popped.
  expect(up.throwsSeen).toBe(1);
  expect(up.thrown === 0 || up.thrownPx > 0).toBe(true);
  await shot(page, 'finale-units', 7, 'surfaced-among-the-singers');
  await page.waitForTimeout(600); // past THROW_MS: landed
  await nextFrames(page);
  expect(await page.evaluate(() => globalThis.__sd!.render()!.unsung)).toMatchObject({
    thrown: 0,
    thrownPx: 0,
  });

  await edge(page, 'unsung', 0.25);
  expect(await phasesUntil(page, 'song')).toBe(true);
  expect(await forms(page)).toEqual(['enemy.unsung_song']);
  await shot(page, 'finale-units', 8, 'the-song');

  // Dawn: laid to rest (its own gold flip; the map is won on that tick, so read the view).
  await page.evaluate(() => {
    const s = globalThis.__sd!.state()!;
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a test reaches into the sim
    (s as { restPoints: number }).restPoints = s.restTarget;
    globalThis.__sd!.fastForward(1);
  });
  await nextFrames(page);
  const rest = await page.evaluate(() => globalThis.__sd!.render()!.song);
  expect(rest.rests).toBeGreaterThan(0);
  expect(rest.held).toBe(0);
});

test("finale units: Thrum's echo warms gold in the song and rises", async ({ page }) => {
  await page.goto('/?test=1&map=dev_phases&seed=1&save=after_a3m6_weakest');
  await waitForReady(page);
  await buildRing(page);
  expect(await phasesUntil(page, 'unsung')).toBe(true);
  // Halfway through the countdown the echo comes (spared_quiet_wave = false).
  await page.evaluate(() => {
    const s = globalThis.__sd!.state()!;
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a test reaches into the sim
    (s as { restPoints: number }).restPoints = s.restTarget * 0.49;
  });
  expect(await phasesUntil(page, 'echo')).toBe(true);
  const echoes = await page.evaluate(() => globalThis.__sd!.render()!.echoes);
  expect(echoes.rise).toBe(1);
  expect(echoes.arrivedSeen).toBe(1);
  await shot(page, 'finale-units', 9, 'echo-rising');
});
