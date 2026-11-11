// T622: A3M3 *The Gap* reached the normal way, from the Sector map, through both doors. From
// `save=after_a3m2_rivet` (A3M2 won, the Rivet revoked, C3 not yet asked; the intake said
// `lettuce`): The Gap's Start, par's four (Scuttle Den, Mindspike, Thumper, Prism), Lock in, and
// Bricks's briefing: the jar for Pebble, the Amended Survey, "Why'd you really come out here?"
// answered "The signing bonus." (not the file's reason, so "Files lie. I wrote one."), and C3,
// whose options wait 700 ms. The convoy flow picks the convoy: the door is saved as the briefing
// closes, the battle restarts on it, and par plays: the setup (Bricks on his post, the first group
// on the convoy road), Bricks holding Undertows at the choke in W7, the {name} tag at W10's
// countdown, QUILL's vitals cue as W13 starts, the last group in at the convoy door, and the SEAL
// as W14 starts; a press, and Results' "Held." card. The warren flow picks the warren and plays to
// the SEAL, its groups walking in from the south-west to the east door. Before each shot the sim
// plays a moment at 1×. Fast text (`&fasttext=1`) shows each line whole. Screenshots in
// <out>/screens/a3m3/ (look at them: the briefing's C3, the choke, the tag, the vitals, the SEAL).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

/** What the flow waits for, checked in the page against the live sim state. */
type Cond = 'setup' | 'held' | 'tag' | 'vitals' | 'last' | 'seal';

/** Plays par one tick at a time (up to `max`) until `cond` holds, then lets two frames render. */
async function until(page: Page, cond: Cond, max = 60 * 900): Promise<boolean> {
  const held = await page.evaluate(
    ([c, limit]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      const st = sd.state()!;
      const walking = (): number => {
        let n = 0;
        for (let i = 0; i < st.allies.used; i++) {
          const a = st.allies.items[i]!;
          if (a.alive && a.kind === 'refugee' && a.dist > 0) n++;
        }
        return n;
      };
      const blocking = (): number => {
        for (let i = 0; i < st.allies.used; i++) {
          const a = st.allies.items[i]!;
          if (a.alive && a.kind === 'bricks') return a.blocking;
        }
        return 0;
      };
      const check = (): boolean => {
        switch (c) {
          case 'setup':
            return st.towers.live >= 3 && walking() >= 5;
          case 'held':
            return st.wave === 7 && blocking() >= 1;
          case 'tag':
            return st.schedule.phase === 'countdown' && st.schedule.countdownWave === 10;
          case 'vitals':
            return st.wave === 13;
          case 'last':
            return (
              st.schedule.phase === 'countdown' &&
              st.schedule.countdownWave === 14 &&
              walking() >= 6
            );
          case 'seal':
            return st.pendingInput !== null;
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
const save = (page: Page) => page.evaluate(() => globalThis.__sd!.save());

/** Picks par's loadout on the loadout screen and locks it in. */
async function parLoadout(page: Page): Promise<void> {
  const want = ['Scuttle Den', 'Mindspike Obelisk', 'Thumper', 'Prism Spire'];
  const names = ['Sprinkler', 'Skyhook', 'Zapcoil', 'Lookout Shack', 'Grapple Harpoon', ...want];
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
}

/** Reads the briefing on to its next choice (Next until an answer group shows). */
async function toChoice(page: Page): Promise<void> {
  const answer = page.getByRole('group', { name: 'Your answer' });
  await expect(async () => {
    if (!(await answer.isVisible())) {
      await page.getByRole('button', { name: /^(Skip|Next)$/ }).click({ timeout: 500 });
    }
    await expect(answer).toBeVisible({ timeout: 500 });
  }).toPass({ timeout: 15_000 });
}

/**
 * From the Sector map through the briefing: Start, par's loadout, Bricks's lines, the arrival
 * answer, and C3 answered `door` (its options wait 700 ms first). Returns once the battle restarted
 * on the door, paused, with par at the controls.
 */
async function briefAndChoose(page: Page, door: 'convoy' | 'warren', look: boolean): Promise<void> {
  await page.goto('/?test=1&dialogue=1&fasttext=1&seed=1&save=after_a3m2_rivet');
  await waitForReady(page);
  expect((await save(page))?.story.flags.door_choice).toBeUndefined();
  await expect(page.getByRole('heading', { name: 'Sector map' })).toBeVisible();
  await page.getByRole('button', { name: 'Start The Gap' }).click();
  await expect(page.getByText('The Gap')).toBeVisible();
  await parLoadout(page);

  const brief = page.getByRole('dialog');
  await expect(brief).toContainText(
    "Take this home, Pebble. It's someone. I kept 'em in a jar for fifteen years like a fool.",
  );
  await expect(brief).toContainText('Held the Door');
  await expect(brief).toContainText('Much Obliged');
  await toChoice(page);
  const answer = page.getByRole('group', { name: 'Your answer' });
  await answer.getByRole('button', { name: 'The signing bonus.' }).click();
  await toChoice(page);
  // Not the file's reason (lettuce): Bricks noticed, on the way to C3.
  await expect(brief).toContainText('Not what your file says. ...Files lie. I wrote one.');
  await expect(brief).toContainText('Your call, Thorn. Which door do I hold?');
  const pick =
    door === 'convoy'
      ? answer.getByRole('button', { name: "The convoy. Goldie's people." })
      : answer.getByRole('button', { name: "The warren. Pebble's people." });
  // C3 waits 700 ms before it takes a press (D141), and holds the briefing until answered.
  await expect(pick).toHaveAttribute('aria-disabled', 'true');
  if (look) await shot(page, 'a3m3', 1, 'c3');
  await expect(pick).not.toHaveAttribute('aria-disabled', 'true');
  await pick.click();
  await expect(brief).toContainText(
    door === 'convoy' ? 'Goldie will remember that.' : 'Bramble will remember that.',
  );
  // Closing the briefing commits the door; the battle restarts on it.
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await save(page))?.story.flags.door_choice).toBe(door);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
    sd.fastForward(0);
  });
}

/** The SEAL: one button, pressed; then Results' "Held." card. */
async function seal(page: Page, look: boolean): Promise<void> {
  // Par's last step would press it at once: the player's hand presses it here ('none' has no steps).
  await page.evaluate(() => globalThis.__sd!.autoplay('none'));
  expect(await until(page, 'seal')).toBe(true);
  const state = await page.evaluate(() => {
    const st = globalThis.__sd!.state()!;
    let bricks = 1;
    let walking = 0;
    for (let i = 0; i < st.allies.used; i++) {
      const a = st.allies.items[i]!;
      if (a.alive && a.kind === 'bricks') bricks = a.health;
      if (a.alive && a.kind === 'refugee') walking++;
    }
    return { wave: st.wave, pending: st.pendingInput, bricks, walking };
  });
  // W14 starts as the last of them is through: the road is empty, Bricks on his floor.
  expect(state).toEqual({ wave: 14, pending: 'seal', bricks: 0.05, walking: 0 });
  await page.evaluate(() => globalThis.__sd!.setSpeed(1));
  const button = page.getByTestId('forced-input');
  await expect(button).toBeVisible();
  await expect(button).toHaveText('SEAL');
  await expect(page.getByTestId('comms')).toContainText('Do it,', { timeout: 15_000 });
  await expect(button).toHaveAttribute('data-armed', 'true');
  if (look) await shot(page, 'a3m3', 6, 'seal');
  await button.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => globalThis.__sd!.state()?.outcome)).toBe('won');
  const card = page.getByTestId('results-held');
  await expect(card).toBeVisible({ timeout: 10_000 });
  await expect(card.getByRole('heading', { level: 1 })).toHaveText('Held.');
  await expect(page.getByTestId('results-held-line')).toHaveText(/^Evacuated: \d+\.$/);
  if (look) await shot(page, 'a3m3', 7, 'held');
}

test('A3M3: from the Sector map, C3 the convoy, the choke, the tag, the vitals, the SEAL', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await briefAndChoose(page, 'convoy', true);
  expect(await page.evaluate(() => globalThis.__sd!.state()!.refugeeTotal)).toBe(36);

  // The setup: Bricks on his post at the choke; the first group in from the south-east edge.
  expect(await until(page, 'setup')).toBe(true);
  const first = await page.evaluate(() => {
    const st = globalThis.__sd!.state()!;
    const xs: number[] = [];
    for (let i = 0; i < st.allies.used; i++) {
      const a = st.allies.items[i]!;
      if (a.alive && a.kind === 'refugee') xs.push(a.route?.id === 'convoy_road' ? 1 : 0);
    }
    return xs;
  });
  expect(first.length).toBeGreaterThan(0);
  expect(first.every((x) => x === 1)).toBe(true);
  await play(page, 500);
  await shot(page, 'a3m3', 2, 'setup');

  // W7: the Undertows at the choke, Bricks holding them.
  expect(await until(page, 'held')).toBe(true);
  await play(page, 300);
  await shot(page, 'a3m3', 3, 'choke');

  // W10's countdown: the last name tag, {name}, on the newest turret.
  expect(await until(page, 'tag')).toBe(true);
  await play(page, 400);
  await expect(page.getByTestId('comms')).toContainText(
    "This one's yours. Good turret. Doesn't quit.",
  );
  await shot(page, 'a3m3', 4, 'tag');

  // W13: QUILL breaks policy.
  expect(await until(page, 'vitals')).toBe(true);
  await play(page, 400);
  await expect(page.getByTestId('comms')).toContainText('His vitals are dropping.');
  await shot(page, 'a3m3', 5, 'vitals');

  // The last group on the convoy road, then the SEAL as W14 starts.
  expect(await until(page, 'last')).toBe(true);
  await seal(page, true);
});

test('A3M3: C3 the warren, its groups in at the east door, and the SEAL', async ({ page }) => {
  test.setTimeout(240_000);
  await briefAndChoose(page, 'warren', false);
  expect(await until(page, 'setup')).toBe(true);
  const routes = await page.evaluate(() => {
    const st = globalThis.__sd!.state()!;
    const out = new Set<string>();
    for (let i = 0; i < st.allies.used; i++) {
      const a = st.allies.items[i]!;
      if (a.alive && a.kind === 'refugee') out.add(a.route?.id ?? '');
    }
    return [...out];
  });
  expect(routes).toEqual(['warren_road']);
  await play(page, 500);
  await shot(page, 'a3m3', 8, 'warren');
  expect(await until(page, 'last')).toBe(true);
  await seal(page, false);
});
