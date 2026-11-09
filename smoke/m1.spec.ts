// The M1 flows (T108b; docs/tech/conventions.md § Browser smoke tests, "Key flows"), on A1M1 as a
// player meets it: title → Start shift → briefing → Clock in → build through the HUD by real
// clicks → start wave 1 → 2× → enemies on screen → `autoplay('par')` + `fastForward` → Thumper
// shells in flight → the Victory results with a non-zero PESTS PROCESSED → Retry → a fresh battle.
// The lose flow: `autoplay('none')` + `fastForward` → Defeat → Title. Screenshots in
// test-results/screens/m1/ and test-results/screens/lose/. Selecting and upgrading through the
// tower panel is hud.spec.ts; the Orbital Strike is ability.spec.ts.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

/** A1M1's greenhouse roof (map.ts): par's first Rivet goes here, and so does ours. */
const ROOF = [7, 2] as const;

/** Sim ticks per `fastForward` chunk while playing a map out (10 s of sim time). */
const CHUNK = 600;

/** Every `fastForward` chunk a map may take before the test gives up (par takes about 25). */
const MAX_CHUNKS = 60;

const tick = (page: Page) => page.evaluate(() => globalThis.__sd?.state()?.tick ?? null);

/** The results counter paragraph (its accessible name is the final line). */
const counter = (page: Page) => page.locator('.sd-results-counter');

/** Fast-forwards the running battle in chunks until the map ends; returns the outcome. */
const playOut = (page: Page) =>
  page.evaluate(
    ([chunk, max]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      for (let i = 0; i < max && sd.state()?.outcome === 'playing'; i++) sd.fastForward(chunk);
      return sd.state()?.outcome ?? null;
    },
    [CHUNK, MAX_CHUNKS] as const,
  );

/** The number in the counter's accessible name ("PESTS PROCESSED: 1,234, Top 5% …"). */
async function pestsProcessed(page: Page): Promise<number> {
  const label = (await counter(page).getAttribute('aria-label')) ?? '';
  const m = /^PESTS PROCESSED: ([\d,]+), Top 5% of Technicians!$/.exec(label);
  expect(m, `counter label: ${label}`).not.toBeNull();
  return Number(m![1]!.replaceAll(',', '')); // matched just above
}

test('m1: title → briefing → HUD build → wave → par plays out → Victory → Retry', async ({
  page,
}) => {
  // 1. Title: Start shift, by a real click.
  await page.goto('/?test=1&seed=1');
  await waitForReady(page);
  await page.getByRole('button', { name: 'Start shift' }).click();

  // 2. The briefing; Clock in by a real click.
  const briefing = page.getByRole('dialog', { name: 'Shift briefing' });
  await expect(briefing).toBeVisible();
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.getByRole('button', { name: 'Clock in' }).click();
  await expect(briefing).toBeHidden();

  // Pause through the HUD, so the sim only moves when the test moves it.
  const pause = page.getByRole('button', { name: 'Pause' });
  await pause.click();
  await expect(pause).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('status').filter({ hasText: /^Paused$/ })).toBeVisible();
  const start = await page.evaluate(() => {
    const s = globalThis.__sd!.state()!; // a battle is running
    return { credits: s.credits, wave: s.wave, towers: s.towers.live };
  });
  expect(start).toEqual({ credits: 350, wave: 0, towers: 0 }); // A1M1's start (map.ts)

  // 3. Build a Rivet through the HUD: its slot, then a real click on the roof. Until the first
  // build, slot 1 pulses (onboarding, D026). The held-back Thumper says when it ships.
  const rivetSlot = page.getByRole('button', { name: /^Build Rivet/ });
  await expect(rivetSlot).toHaveClass(/\bpulse\b/);
  await page.keyboard.press('Digit2');
  await expect(page.getByText('Thumper ships at wave 3')).toBeVisible();
  await rivetSlot.click();
  await expect(rivetSlot).not.toBeFocused(); // a pointer press leaves no focus ring behind
  // An armed click on the road explains itself, and the slot stays armed.
  const road = await page.evaluate(() => globalThis.__sd?.tileToClient(4, 3) ?? null);
  await page.mouse.click(road!.x, road!.y); // A1M1's road corner (map.ts)
  await expect(page.getByText("Can't build there")).toBeVisible();
  await expect(rivetSlot).toHaveAttribute('aria-pressed', 'true');
  const roof = await page.evaluate(([c, r]) => globalThis.__sd?.tileToClient(c, r) ?? null, [
    ROOF[0],
    ROOF[1],
  ] as const);
  expect(roof).not.toBeNull();
  await page.mouse.click(roof!.x, roof!.y); // checked just above
  await expect.poll(() => page.evaluate(() => globalThis.__sd?.state()?.towers.live)).toBe(1);
  await page.keyboard.press('Escape');
  const credits = page.getByLabel(/^Credits /);
  await expect(credits).toHaveAttribute('aria-label', 'Credits 250');
  await expect(credits).toContainText('250'); // the readout ticks down to it
  await expect(rivetSlot).not.toHaveClass(/\bpulse\b/);
  await page.mouse.move(0, 0);
  await shot(page, 'm1', 1, 'built');

  // 4. Start wave 1 by the HUD button (pulsing now that a tower stands), then run at 2× for a
  // moment: the frame loop drives the sim.
  const startWave = page.getByRole('button', { name: 'Start wave 1' });
  await expect(startWave).toHaveClass(/\bpulse\b/);
  await startWave.click();
  await expect(page.getByLabel('Wave 1 of 7')).toBeVisible();
  const fast = page.getByRole('button', { name: 'Double speed' });
  await fast.click();
  await expect(fast).toHaveAttribute('aria-pressed', 'true');
  const t0 = (await tick(page)) ?? 0;
  await page.waitForFunction((t) => (globalThis.__sd?.state()?.tick ?? 0) > t + 30, t0);
  await pause.click();

  // 5. Enemies walk in: the sim has them and the renderer draws them.
  await page.evaluate(() => globalThis.__sd?.fastForward(150));
  await nextFrames(page);
  const w1 = await page.evaluate(() => globalThis.__sd!.perf());
  expect(w1.enemies).toBeGreaterThan(0);
  expect(w1.towers).toBe(1);
  await shot(page, 'm1', 2, 'enemies');

  // 6. Par takes over (its roof Rivet is already built, so that step is rejected and par carries
  // on). Play on until W3's Thumper fires, then 20 ticks more: its shell (0.8 s of flight) is
  // mid-arc for the shot.
  await page.evaluate(() => globalThis.__sd?.autoplay('par'));
  const shells = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    for (let i = 0; i < 2000 && sd.state()?.outcome === 'playing'; i++) {
      sd.fastForward(5);
      const s = sd.state()!; // still in the battle
      if (s.wave >= 3 && s.projectiles.live > 0) break;
    }
    sd.fastForward(20);
    return { wave: sd.state()!.wave, ...sd.perf() };
  });
  expect(shells.wave).toBeGreaterThanOrEqual(3);
  expect(shells.projectiles).toBeGreaterThan(0);
  expect(shells.enemies).toBeGreaterThan(0);
  await nextFrames(page);
  await shot(page, 'm1', 3, 'projectiles');

  // 7. Play the map out: the real win, on the results screen.
  expect(await playOut(page)).toBe('won');
  const dialog = page.getByRole('dialog', { name: 'PERIMETER SECURED!' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Shift report · Exemplary!')).toBeVisible();
  await expect(dialog.getByText('Waves survived')).toBeVisible();
  await expect(dialog.getByText('Core integrity')).toBeVisible();
  const killed = await page.evaluate(() => globalThis.__sd!.state()!.stats.skitterkinKilled);
  expect(killed).toBeGreaterThan(0);
  expect(await pestsProcessed(page)).toBe(killed);
  // The counter ticks up to the run's count.
  await expect(counter(page)).toHaveText(
    new RegExp(`^PESTS PROCESSED: ${killed.toLocaleString('en-US')} ★ Top 5% of Technicians!$`),
  );
  // The battle is frozen behind the results.
  const frozen = await tick(page);
  await page.waitForTimeout(200);
  expect(await tick(page)).toBe(frozen);
  await shot(page, 'm1', 4, 'victory');

  // 8. Retry: a fresh run of the same map, at tick 0 with nothing built, the briefing already read.
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(dialog).toBeHidden();
  await page.waitForFunction(() => {
    const s = globalThis.__sd?.state();
    return s !== null && s !== undefined && s.tick > 0 && s.tick < 120;
  });
  const again = await page.evaluate(() => {
    const s = globalThis.__sd!.state()!;
    return { wave: s.wave, towers: s.towers.live, credits: s.credits };
  });
  expect(again).toEqual({ wave: 0, towers: 0, credits: 350 });
  await expect(briefing).toBeHidden();
  await expect(page.getByTestId('hud')).toBeVisible();
  await shot(page, 'm1', 5, 'retried');
});

test('lose: no build plays out to a hiccup, not a scolding; Title returns', async ({ page }) => {
  await page.goto('/?test=1&skipIntro=1&seed=1');
  await waitForReady(page);
  // An unknown build is an error, not a silent no-op.
  const err = await page.evaluate(() => {
    try {
      globalThis.__sd!.autoplay('nope'); // installed: waitForReady passed
      return null;
    } catch (e) {
      return String(e);
    }
  });
  expect(err).toMatch(/no build 'nope'/);

  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('none'); // also closes the briefing
  });
  await expect(page.getByRole('dialog', { name: 'Shift briefing' })).toBeHidden();
  expect(await playOut(page)).toBe('lost');

  const dialog = page.getByRole('dialog', { name: 'MINOR OPERATIONAL HICCUP' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Shift report · Incident logged')).toBeVisible();
  // The counter is there on a loss too: nothing built, nothing processed.
  await expect(counter(page)).toBeVisible();
  expect(await pestsProcessed(page)).toBe(
    await page.evaluate(() => globalThis.__sd!.state()!.stats.skitterkinKilled),
  );
  await expect(page.getByRole('button', { name: 'Retry' })).toBeFocused();
  // Game hotkeys are off on the results screen: F doesn't touch the frozen battle.
  await page.keyboard.press('KeyF');
  const t0 = await tick(page);
  await page.waitForTimeout(200);
  expect(await tick(page)).toBe(t0);
  await shot(page, 'lose', 1, 'defeat');

  // Title leaves the battle; goto('results') shows the last finished run again.
  await page.getByRole('button', { name: 'Title' }).click();
  await expect(page.getByRole('heading', { name: 'Stardust' })).toBeVisible();
  expect(await tick(page)).toBeNull();
  await shot(page, 'lose', 2, 'title');
  await page.evaluate(() => globalThis.__sd?.goto('results'));
  await expect(dialog).toBeVisible();
});

test("radio and leak feedback: the first leak plays QUILL's line and flashes the core", async ({
  page,
}) => {
  // `radio=1`: the ticker is off under test=1 unless a spec asks for it (D026).
  await page.goto('/?test=1&skipIntro=1&seed=1&radio=1');
  await waitForReady(page);
  const integrity = await page.evaluate(() => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    sd.setSpeed(0);
    sd.autoplay('none'); // nothing built: W1's first Nibbler leaks
    for (let i = 0; i < 400 && sd.state()!.integrity === 20; i++) sd.fastForward(10);
    return sd.state()!.integrity;
  });
  expect(integrity).toBeLessThan(20);
  const radio = page.getByRole('log', { name: 'Radio' });
  await expect(radio).toContainText('QUILL');
  await expect(radio).toContainText(
    'Pest escaped containment! (Toward... the wilderness? Odd. Logging it.)',
  );
  await expect(page.locator('.hud-leak-flash')).toBeAttached();
  await nextFrames(page);
  await shot(page, 'm1', 6, 'first-leak-radio');
});
