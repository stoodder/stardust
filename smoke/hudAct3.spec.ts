// T631: the Act III HUD on each M6 map, par playing (`?map=` battles, `autoplay('par')`), with
// screenshots at 2× (the default 1280×720) and 1× (640×360) of each moment:
// - A3M1: Bramble's column walking on the objective tracker (The Matriarch's Young, its walkers'
//   count), the Scuttle Den's panel (its family, each one's DoT, the latch), and Underfoot aimed:
//   the ghost snare on one road tile, "Pick a path tile", and off the road no snare.
// - A3M2 after the Clean Exit: the Rivet's slot under LICENSE REVOKED, the strike's under UPLINK
//   REVOKED, ACCESS RESTRICTED in the preview with QUILL's leak line under it.
// - A3M3: the Holdout's Evacuated meter (of the run's refugees, no lost row) and Act III's "Next
//   time." on a forfeited medal's tooltip.
// - The Hum Choir's aura preview: arming it shows its song's reach as the placement ring.
// Screenshots in <out>/screens/hudAct3/ (look at them at both scales).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

/** Plays par a tick at a time (up to `max`) until `cond` holds in the page; false if it ends. */
async function until(page: Page, cond: string, max = 60 * 900): Promise<boolean> {
  const ok = await page.evaluate(
    ([c, limit]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      const st = sd.state()!;
      const walkingIn = (group: number): number => {
        let n = 0;
        for (let i = 0; i < st.allies.used; i++) {
          const a = st.allies.items[i]!;
          if (a.alive && a.group === group && a.dist > 1) n++;
        }
        return n;
      };
      const check = (): boolean => {
        switch (c) {
          // A3M1's W9: Bramble's column (group 2: first, second, bramble) well out on the road.
          case 'bramble':
            return st.wave === 9 && walkingIn(2) >= 4;
          // A3M2: the Clean Exit has fired and the next countdown runs (the leak line is up).
          case 'leak':
            return st.revoked.towers.length > 0 && st.schedule.phase === 'countdown';
          // A3M3: a few refugees in, the losses past the low mark later.
          case 'holdout':
            return st.wave >= 6 && st.stats.evacuated > 0;
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
  return ok;
}

/** Shoots the moment at 2× and at 1× (the viewport at the game's own 640×360), then back. */
async function both(page: Page, n: number, step: string): Promise<void> {
  await shot(page, 'hudAct3', n, `${step}-2x`);
  await page.setViewportSize({ width: 640, height: 360 });
  await nextFrames(page);
  await shot(page, 'hudAct3', n, `${step}-1x`);
  await page.setViewportSize({ width: 1280, height: 720 });
  await nextFrames(page);
}

/** Opens `map` as a `?map=` battle with par autoplaying, paused. */
async function open(page: Page, map: string): Promise<void> {
  await page.goto(`/?test=1&map=${map}&seed=1`);
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
  });
}

test("hudAct3: A3M1's tracker walks Bramble's column; the Den's panel; Underfoot's aim", async ({
  page,
}) => {
  await open(page, 'a3_m01');
  expect(await until(page, 'bramble')).toBe(true);
  const row = page.getByTestId('objective-tracker').locator('[data-objective="matriarchs_young"]');
  await expect(row.getByTestId('objective-walking')).toBeVisible();
  await expect(row).toHaveAttribute('aria-label', /, \d+ on the road:/);

  // The Den's panel: its family, each one's DoT, the latch.
  const den = await page.evaluate(() => {
    const st = globalThis.__sd!.state()!;
    const t = st.towers.items.find((x) => x.alive && x.def?.id === 'burrow');
    return t === undefined ? null : [t.col, t.row];
  });
  expect(den).not.toBeNull();
  const at = await page.evaluate(([c, r]) => globalThis.__sd!.tileToClient(c, r), den!);
  await page.mouse.click(at!.x, at!.y);
  const panel = page.getByRole('region', { name: /Scuttle Den tower/ });
  await expect(panel).toContainText(/\d SWARMLINGS/i);
  await expect(panel).toContainText(/DMG\/S EACH/i);
  await expect(panel).toContainText(/LATCH \d/i);
  await both(page, 1, 'a3m1-den-panel');
  await page.keyboard.press('Escape');

  // Underfoot (slot 2, Bramble's): aimed, a ghost snare on the road tile under the pointer.
  const road = await page.evaluate(() => {
    const st = globalThis.__sd!.state()!;
    for (let i = 0; i < st.allies.used; i++) {
      const a = st.allies.items[i]!;
      const tiles = a.alive && a.group >= 0 ? a.route?.tiles : undefined;
      if (tiles !== undefined && tiles.length > 44) return [tiles[44]![0], tiles[44]![1]];
    }
    return null;
  });
  expect(road).not.toBeNull();
  await page.keyboard.press('e');
  const bar = page.getByRole('navigation', { name: 'Abilities' });
  await expect(bar.getByRole('status')).toContainText('Pick a path tile');
  const p = await page.evaluate(([c, r]) => globalThis.__sd!.tileToClient(c, r), road!);
  await page.mouse.move(p!.x, p!.y);
  await nextFrames(page);
  expect(await page.evaluate(() => globalThis.__sd!.render()!.trapAim)).toEqual({
    col: road![0],
    row: road![1],
  });
  await both(page, 2, 'a3m1-underfoot-aim');
  // Off the road (the top-left corner tile): no snare.
  const off = await page.evaluate(() => globalThis.__sd!.tileToClient(0, 0));
  await page.mouse.move(off!.x, off!.y);
  await nextFrames(page);
  expect(await page.evaluate(() => globalThis.__sd!.render()!.trapAim?.col)).toBe(-1);
  await page.keyboard.press('Escape');
});

test('hudAct3: A3M2 after the Clean Exit: stamped slots, ACCESS RESTRICTED, the leak line', async ({
  page,
}) => {
  await open(page, 'a3_m02');
  expect(await until(page, 'leak')).toBe(true);
  await expect(page.getByTestId('slot-revoked')).toBeVisible();
  await expect(page.getByTestId('ability-1-revoked')).toBeVisible();
  await expect(page.getByTestId('ability-1')).toHaveAttribute('aria-label', /uplink revoked/);
  await expect(page.getByTestId('preview-restricted')).toHaveText('ACCESS RESTRICTED');
  await expect(page.getByTestId('preview-leak')).toBeVisible();
  // The stamps are the baked 34×18 sprites, lying across their slots.
  const stamp = page.getByTestId('slot-revoked').locator('img');
  await expect(stamp).toHaveAttribute('width', '34');
  await both(page, 3, 'a3m2-revoked');
});

test("hudAct3: A3M3's Holdout meter has no lost row; Act III's tracker says 'Next time.'", async ({
  page,
}) => {
  await open(page, 'a3_m03');
  expect(await until(page, 'holdout')).toBe(true);
  const meter = page.getByTestId('escort-meter');
  await expect(meter).toHaveAttribute('data-holdout', 'true');
  await expect(meter).toHaveAccessibleName(/^Evacuated \d+ of \d+(, many lost)?$/);
  await expect(page.getByTestId('escort-lost')).toHaveCount(0);
  const total = await page.evaluate(() => globalThis.__sd!.state()!.refugeeTotal);
  await expect(page.getByTestId('escort-total')).toHaveText(`of ${total}`);
  // A forfeited medal's tooltip spends no "!" in Act III.
  for (const title of await page
    .locator('.hud-medal')
    .evaluateAll((els) => els.map((e) => e.getAttribute('title') ?? ''))) {
    expect(title).not.toContain('!');
  }
  await both(page, 4, 'a3m3-holdout');
});

test("hudAct3: arming the Hum Choir previews its song's reach", async ({ page }) => {
  await page.goto('/?test=1&map=dev_choir&seed=1');
  await waitForReady(page);
  await page.evaluate(() => globalThis.__sd!.setSpeed(0));
  await page.getByRole('button', { name: /^Build Hum Choir/ }).click();
  // The pad the choir flow builds on (smoke/choir.spec.ts).
  const p = await page.evaluate(() => globalThis.__sd!.tileToClient(9, 2));
  await page.mouse.move(p!.x, p!.y);
  await nextFrames(page);
  await both(page, 5, 'choir-preview');
});
