// T721: A3M5 *Unsung* reached the normal way, from the Sector map on the reference profile after
// A3M4 under C4 Keep (`save=after_a3m4_keep`): the base first (Night Shift, read through, then the
// Stasis Bloom's attunement, the reference's buy), then Unsung's Start, the loadout (the Sproing Pad given
// as it opens), par's four (Hum Choir, Grapple Harpoon, Stasis Bloom, Thumper), Lock in, Kip's
// ledger, Pebble's Boing and QUILL's apology, then par (`autoplay('par')`). The plant at night
// with the feed lines cut (W1), the first bearers out of the sluice with the Hollow behind them
// (W5), the Auditors' rings (W7), then "Shareholder Value": Sterling's three cues, one per phase
// (it walks in, Hostile Takeover, the jettison onto the crash site), and the win. Before each shot
// the sim plays a moment at 1×. Fast text (`&fasttext=1`) shows each line whole. Screenshots in
// <out>/screens/a3m5/ (look at them: the plant, the bearers, the rings, each phase, the card).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

/** What the flow waits for, checked in the page against the live sim state. */
type Cond = 'setup' | 'bearers' | 'rings' | 'phase1' | 'phase2' | 'phase3' | 'end';

/** Plays par one tick at a time (up to `max`) until `cond` holds, then lets two frames render. */
async function until(page: Page, cond: Cond, max = 60 * 900): Promise<boolean> {
  const held = await page.evaluate(
    ([c, limit]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      const st = sd.state()!;
      const boss = (): number => {
        for (let i = 0; i < st.enemies.used; i++) {
          const e = st.enemies.items[i]!;
          if (e.alive && e.def?.id === 'shareholder_value') return e.bossPhase;
        }
        return 0;
      };
      const bearers = (): number => {
        let n = 0;
        for (let i = 0; i < st.allies.used; i++) {
          const a = st.allies.items[i]!;
          if (a.alive && a.kind === 'bearer' && a.dist > 3) n++;
        }
        return n;
      };
      const ringing = (): boolean => {
        for (let i = 0; i < st.enemies.used; i++) {
          const e = st.enemies.items[i]!;
          if (e.alive && e.def?.id === 'auditor' && e.jamTellTicks > 0) return true;
        }
        return false;
      };
      const check = (): boolean => {
        switch (c) {
          case 'setup':
            return st.towers.live >= 3 && st.wave === 1 && st.tick > 60 * 8;
          case 'bearers':
            return st.wave === 5 && bearers() >= 4;
          case 'rings':
            return st.wave === 7 && ringing();
          case 'phase1':
            return st.wave === 14 && boss() === 1;
          case 'phase2':
            return boss() === 2;
          case 'phase3':
            return boss() === 3;
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

/**
 * The reference's purchase before A3M5: the Stasis Bloom's attunement (Xenotech, 3 Intel). The
 * base plays Night Shift first (mandatory after C4): its lines are read through.
 */
async function prepare(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Base' }).click();
  const scene = page.getByTestId('scene');
  const next = page.getByRole('button', { name: /^(Skip|Next)$/ });
  await expect(async () => {
    if (await next.isVisible()) await next.click();
    else if (await scene.isVisible()) await page.keyboard.press('Escape');
    await expect(scene).toBeHidden({ timeout: 500 });
  }).toPass({ timeout: 60_000 });
  const tab = page.getByRole('tab', { name: /^Xenotech/ });
  await tab.click();
  const bloom = page
    .getByRole('tabpanel')
    .getByRole('listitem')
    .filter({ hasText: 'Stasis Bloom' });
  await bloom.getByRole('button', { name: /^Attune Stasis Bloom, 3 Intel/ }).click();
  await expect(bloom.locator('.sd-offer-owned')).toHaveText('Owned');
  await page.getByRole('button', { name: 'Sector map' }).click();
}

/** Picks par's loadout on the loadout screen and locks it in. */
async function parLoadout(page: Page): Promise<void> {
  const want = ['Hum Choir', 'Grapple Harpoon', 'Stasis Bloom', 'Thumper'];
  const names = [
    'Rivet',
    'Sprinkler',
    'Skyhook',
    'Zapcoil',
    'Lookout Shack',
    'Prism Spire',
    'Scuttle Den',
    'Mindspike Obelisk',
    'Sproing Pad',
    'Gloop Spitter',
    ...want,
  ];
  const pressed = await Promise.all(
    names.map(async (name) => {
      const card = towerCard(page, name);
      if ((await card.count()) === 0) return false;
      return (await card.getAttribute('aria-pressed')) === 'true';
    }),
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

/** Waits for Sterling's cue `text` on the comms line, then reads the panel through. */
async function sterling(page: Page, text: string): Promise<void> {
  await expect(page.getByTestId('line-announce')).toContainText(`Sterling: ${text}`, {
    timeout: 15_000,
  });
}

test('A3M5: from the Sector map, the bearers, the rings, Sterling on each phase, the win', async ({
  page,
}) => {
  test.setTimeout(300_000);
  await page.goto('/?test=1&dialogue=1&fasttext=1&seed=1&save=after_a3m4_keep');
  await waitForReady(page);
  await expect(page.getByRole('heading', { name: 'Sector map' })).toBeVisible();
  await prepare(page);

  // The Sector map's normal flow: Unsung is next up; its Start, par's four.
  await page.getByRole('button', { name: 'Start Unsung' }).click();
  await expect(page.getByText('Unsung')).toBeVisible();
  await expect(towerCard(page, 'Sproing Pad')).toBeVisible();
  await parLoadout(page);

  // Kip's ledger, Pebble's Boing, QUILL's apology; the medal to aim for.
  const brief = page.getByRole('dialog');
  await expect(brief).toContainText('Here. The ledger. Every batch, every date.');
  const next = brief.getByRole('button', { name: /^Next/ });
  await expect(async () => {
    if (await next.isVisible()) await next.click();
    await expect(brief).toContainText("Jammers inbound. Prim's model.", { timeout: 500 });
  }).toPass({ timeout: 20_000 });
  await expect(brief).toContainText('Declined');
  await shot(page, 'a3m5', 1, 'briefing');
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
    sd.fastForward(0);
  });

  // The plant at night: par's first towers, the feed lines going, Motes toward the vats.
  expect(await until(page, 'setup')).toBe(true);
  await play(page, 400);
  await shot(page, 'a3m5', 2, 'plant-night');

  // W5: Kip opens the vats; the first bearers walk out of the sluice, the Hollow behind them.
  expect(await until(page, 'bearers')).toBe(true);
  await play(page, 300);
  await shot(page, 'a3m5', 3, 'bearers');

  // W7: an Auditor's ring.
  expect(await until(page, 'rings')).toBe(true);
  await play(page, 200);
  await shot(page, 'a3m5', 4, 'rings');

  // W14: "Shareholder Value", Sterling by remote on each phase.
  expect(await until(page, 'phase1')).toBe(true);
  await sterling(page, 'Four-Forty-Seven!');
  await play(page, 300);
  await shot(page, 'a3m5', 5, 'platform');
  expect(await until(page, 'phase2')).toBe(true);
  await sterling(page, "It's just a name! Mostly!");
  await play(page, 300);
  await shot(page, 'a3m5', 6, 'takeover');
  expect(await until(page, 'phase3')).toBe(true);
  await sterling(page, 'That plating was leased!');
  await play(page, 300);
  const plates = await page.evaluate(() => globalThis.__sd!.state()!.tilesOpened.length);
  expect(plates).toBe(4);
  await shot(page, 'a3m5', 7, 'jettison');

  // The win: every bearer group carried or lost, the card.
  expect(await until(page, 'end', 60 * 900)).toBe(true);
  expect(await page.evaluate(() => globalThis.__sd!.state()!.outcome)).toBe('won');
  const card = page.getByRole('dialog').filter({ hasText: 'Unsung' });
  await expect(card.first()).toBeVisible({ timeout: 30_000 });
  await shot(page, 'a3m5', 8, 'won');
});
