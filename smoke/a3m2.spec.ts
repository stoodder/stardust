// T621: A3M2 *License Revoked* reached the normal way, from the Sector map on the reference profile
// (`save=after_a3m1_cleared`: The Preserve won, C1 cleared): the base first, where the reference
// licenses the Grapple Harpoon (Zibzab's shelf) and attunes the Mindspike (Ves'thara's), then License
// Revoked's Start, par's four (Grapple Harpoon, Mindspike Obelisk, Rivet, Thumper), Lock in, Bricks
// and QUILL's briefing, then par (`autoplay('par')`). The plaza at night with the west rift cracking
// (W1), the drones arriving (W3, Bricks's "There's her engineers."), the Expediter's haste ring
// (W5), the Clean Exit mid-W7 (Sterling on the panel, the Rivets folding away under their stamp, the
// strike's slot dark), W8's countdown with the preview locked and QUILL's leak line under ACCESS
// RESTRICTED, both rifts open (W10), Sterling's shuttle wave (W12), then Results and the Asset Yield
// Log after it. Before each shot the sim plays a moment at 1×. Fast text (`&fasttext=1`) shows each
// line whole. Screenshots in <out>/screens/a3m2/ (look at them: the plaza at night, the drones, the
// stamp, the locked preview, the log).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

/** What the flow waits for, checked in the page against the live sim state. */
type Cond = 'setup' | 'drones' | 'haste' | 'cue' | 'w8' | 'rifts' | 'shuttle' | 'end';

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
            return st.towers.live >= 3 && st.wave === 1 && count(() => true) >= 6;
          case 'drones':
            return st.wave === 3 && count((e) => e.def?.id === 'compliance') >= 3;
          case 'haste':
            return st.wave === 5 && count((e) => e.def?.id === 'expediter' && e.dist > 6) >= 1;
          case 'cue':
            return st.revoked.towers.length > 0;
          case 'w8':
            return st.schedule.phase === 'countdown' && st.schedule.countdownWave === 8;
          case 'rifts':
            return st.wave === 10 && count((e) => e.route?.id === 'rift_e') >= 4;
          case 'shuttle':
            return st.wave === 12 && count((e) => e.def?.id === 'compliance') >= 10;
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
const offerRow = (page: Page, name: string) =>
  page.getByRole('tabpanel').getByRole('listitem').filter({ hasText: name });

/** The reference's purchases before A3M2: the Harpoon's license and the Mindspike's attunement. */
async function prepare(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Base' }).click();
  // A base visit scene may be due first (they wait for nothing here): read each one through.
  const scene = page.getByTestId('scene');
  await expect(async () => {
    if (await scene.isVisible()) await page.keyboard.press('Escape');
    await expect(scene).toBeHidden({ timeout: 500 });
  }).toPass({ timeout: 15_000 });
  await page.getByRole('tab', { name: 'Shop', exact: true }).click();
  const harpoon = offerRow(page, 'Grapple Harpoon license');
  await harpoon.getByRole('button', { name: /^(Buy|License|Order)/ }).click();
  await expect(harpoon).toContainText('Owned');
  await page.getByRole('tab', { name: /^Xenotech/ }).click();
  const mindspike = offerRow(page, 'Mindspike Obelisk');
  await mindspike.getByRole('button', { name: /^Attune Mindspike Obelisk, 3 Intel/ }).click();
  await expect(mindspike.locator('.sd-offer-owned')).toHaveText('Owned');
  const owned = await page.evaluate(() => globalThis.__sd!.save()!.unlocks.towers);
  expect(owned).toEqual(expect.arrayContaining(['harpoon', 'mindspike']));
  await page.getByRole('button', { name: 'Sector map' }).click();
}

/** Picks par's loadout on the loadout screen and locks it in. */
async function parLoadout(page: Page): Promise<void> {
  const want = ['Grapple Harpoon', 'Mindspike Obelisk', 'Rivet', 'Thumper'];
  const names = [
    'Sprinkler',
    'Skyhook',
    'Zapcoil',
    'Lookout Shack',
    'Prism Spire',
    'Scuttle Den',
    ...want,
  ];
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

test('A3M2: from the Sector map, the drones, the Clean Exit, the locked preview, and the Asset Yield Log', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.goto('/?test=1&dialogue=1&fasttext=1&seed=1&save=after_a3m1_cleared');
  await waitForReady(page);
  await expect(page.getByRole('heading', { name: 'Sector map' })).toBeVisible();
  await prepare(page);

  // The Sector map's normal flow: License Revoked is next up; its Start, par's four.
  await page.getByRole('button', { name: 'Start License Revoked' }).click();
  await expect(page.getByText('License Revoked')).toBeVisible();
  await parLoadout(page);

  // Bricks on Sterling's call, QUILL's intel for the whole map, and the medal to aim for.
  const brief = page.getByRole('dialog');
  await expect(brief).toContainText("Sterling's on the line. She sounds... cheerful.");
  await expect(brief).toContainText('Back on Your Feet');
  await shot(page, 'a3m2', 1, 'briefing');
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
    sd.fastForward(0);
  });

  // The plaza at night: par's first towers, the first Motes down the old road, the west rift
  // cracking through the band.
  expect(await until(page, 'setup')).toBe(true);
  await play(page, 400);
  await shot(page, 'a3m2', 2, 'plaza-night');

  // W3: Sterling's engineers arrive (Bricks on the radio).
  const comms = page.getByTestId('comms');
  expect(await until(page, 'drones')).toBe(true);
  await play(page, 300);
  await shot(page, 'a3m2', 3, 'drones');

  // W5: an Expediter's haste ring over its drones.
  expect(await until(page, 'haste')).toBe(true);
  await play(page, 300);
  await shot(page, 'a3m2', 4, 'haste');

  // The Clean Exit, mid-W7: the Rivets fold away under their stamp (refunded), the strike's slot
  // goes dark, and Sterling is on the panel.
  expect(await until(page, 'cue')).toBe(true);
  const cue = await page.evaluate(() => {
    const st = globalThis.__sd!.state()!;
    return {
      wave: st.wave,
      phase: st.schedule.phase,
      towers: [...st.revoked.towers],
      abilities: [...st.revoked.abilities],
      lockout: st.scriptModifiers.quillLockout,
    };
  });
  expect(cue).toEqual({
    wave: 7,
    phase: 'spawning',
    towers: ['rivet'],
    abilities: ['orbital_strike'],
    lockout: true,
  });
  await nextFrames(page);
  await expect(page.getByTestId('slot-revoked')).toBeVisible();
  await expect(page.getByTestId('line-announce')).toContainText(
    "Sterling: I'm revoking your Corporate Tower License now!",
    { timeout: 10_000 },
  );
  await shot(page, 'a3m2', 5, 'clean-exit');
  // The pausing panel reads on through QUILL's broken tell and the held silence to the buffer, and
  // Sterling's last line; then it closes.
  const panel = page.getByRole('dialog', { name: 'Comms' });
  const next = panel.getByRole('button', { name: /^(Skip|Next)/ });
  await expect(async () => {
    if (await next.isVisible()) await next.click();
    await expect(page.getByTestId('line-announce')).toContainText('Smiling is mandatory', {
      timeout: 500,
    });
  }).toPass({ timeout: 30_000 });
  await shot(page, 'a3m2', 6, 'clean-exit-buffer');
  await expect(async () => {
    if (await next.isVisible()) await next.click();
    await expect(next).toBeHidden({ timeout: 500 });
  }).toPass({ timeout: 15_000 });

  // W8's countdown: the preview is locked, and QUILL leaks the wave's trait under it.
  expect(await until(page, 'w8')).toBe(true);
  await nextFrames(page);
  await expect(page.getByTestId('preview-restricted')).toBeVisible();
  await expect(page.getByTestId('preview-leak')).toContainText('wave eight is mostly Hollow', {
    timeout: 10_000,
  });
  await shot(page, 'a3m2', 7, 'locked-preview');

  // W10: the east rift is open and the Motes come through both.
  expect(await until(page, 'rifts')).toBe(true);
  await play(page, 300);
  await shot(page, 'a3m2', 8, 'both-rifts');

  // W12: the big drone wave, as Sterling's shuttle leaves.
  expect(await until(page, 'shuttle')).toBe(true);
  await play(page, 400);
  await shot(page, 'a3m2', 9, 'shuttle-wave');
  void comms;

  // The win: Results, then Continue plays the Asset Yield Log, and QUILL's lines come in over it.
  expect(await until(page, 'end', 60 * 900)).toBe(true);
  expect(await page.evaluate(() => globalThis.__sd!.state()!.outcome)).toBe('won');
  const card = page
    .getByRole('dialog')
    .filter({ has: page.getByRole('button', { name: 'Continue' }) });
  await expect(card).toBeVisible({ timeout: 15_000 });
  await shot(page, 'a3m2', 10, 'results');
  await card.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('stage-yield-log')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('yield-log-header')).toContainText(
    'ASSET YIELD LOG · ENTRIES: 41,206 + ',
  );
  await page.waitForTimeout(3000);
  await shot(page, 'a3m2', 11, 'yield-log');
  const scene = page.getByRole('dialog', { name: 'Scene' });
  await expect(scene).toContainText('I thought it was inventory.', { timeout: 30_000 });
  await shot(page, 'a3m2', 12, 'inventory');
});
