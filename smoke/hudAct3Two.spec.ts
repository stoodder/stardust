// T731: the Act III HUD, part two, on dev maps and dev saves, with screenshots at 2× (1280×720)
// and 1× (640×360) of each moment, in <out>/screens/hudAct3Two/ (look at them at both scales):
// - dev_silence: a Jammed tower's panel ("Jammed" and its countdown, the Jammed glyph), then
//   System Reboot and the "Immune 6 s" row; then the Hum Choir selected, its ring in song gold.
// - dev_sproing: the Sproing Pad's Target button reads its fixed picks ("Flyers first"); T says so.
// - A3M5 under C4 Rewrite (`after_a3m4_rewrite`): System Reboot's dark slot beside the bar (padlock,
//   "Offline", why on focus and press), the bearers' meter ("Carried n of 26"), and the loadout's
//   locked card with its reason.
// - A3M5's loadout under C4 Keep (`after_a3m4_keep`): Time Dilation as a Technician pick
//   ("· QUILL's"), the jailbroken Rivet's card in its jailbroken art.
// - A3M6 under C4 Purge (`after_a3m5_purge`): the Sheltered meter, and QUILL's comms portrait in
//   its Purge status-bar frame.
// - dev_gmaw: the Gathering Maw's split under one bar cut into three cells; dev_takeover:
//   Shareholder Value's bar with its two phase marks.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

const FLOW = 'hudAct3Two';

/** Shoots the moment at 2× and at 1× (the viewport at the game's own 640×360), then back. */
async function both(page: Page, n: number, step: string): Promise<void> {
  await shot(page, FLOW, n, `${step}-2x`);
  await page.setViewportSize({ width: 640, height: 360 });
  await nextFrames(page);
  await shot(page, FLOW, n, `${step}-1x`);
  await page.setViewportSize({ width: 1280, height: 720 });
  await nextFrames(page);
}

/** Opens a `?map=` battle (with `save`, if any), paused. */
async function open(page: Page, map: string, save?: string, extra = ''): Promise<void> {
  await page.goto(`/?test=1&map=${map}&seed=1${save === undefined ? '' : `&save=${save}`}${extra}`);
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate(() => globalThis.__sd!.setSpeed(0));
  // A campaign map with a save opens its briefing (and A3M6, Zibzab's crate): clock in past them.
  if (save !== undefined) {
    await page.getByRole('button', { name: 'Clock in' }).click();
    const crate = page.getByTestId('crate-card');
    await page.waitForTimeout(100);
    if (await crate.isVisible()) {
      await crate.getByRole('button', { name: 'Take the crate' }).click();
      await expect(crate).toBeHidden();
    }
    await page.evaluate(() => globalThis.__sd!.setSpeed(0));
  }
}

/** Clicks the tower standing on (col, row). */
async function select(page: Page, col: number, row: number): Promise<void> {
  const at = await page.evaluate(([c, r]) => globalThis.__sd!.tileToClient(c, r), [
    col,
    row,
  ] as const);
  await page.mouse.click(at!.x, at!.y);
}

test('hudAct3Two: the Jammed panel and its countdown, then Reboot’s immunity', async ({ page }) => {
  await open(page, 'dev_silence');
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.enqueue({ type: 'build', tower: 'choir', tile: [7, 2] });
    sd.enqueue({ type: 'build', tower: 'rivet', tile: [5, 2] });
    sd.enqueue({ type: 'build', tower: 'rivet', tile: [3, 2] });
    sd.enqueue({ type: 'build', tower: 'rivet', tile: [12, 2] });
    sd.fastForward(1);
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(1);
  });
  // Until the Silencer's jam lands (on the Choir: a Choir in reach first), then a second more.
  const jammed = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    const st = sd.state()!;
    for (let k = 0; k < 1800; k++) {
      if (st.towers.items.some((t) => t.alive && t.jamTicks > 0)) break;
      sd.fastForward(1);
    }
    sd.fastForward(30);
    const t = st.towers.items.find((x) => x.alive && x.jamTicks > 0);
    return t === undefined ? null : { name: t.def!.name, col: t.col, row: t.row };
  });
  expect(jammed).not.toBeNull();
  await select(page, jammed!.col, jammed!.row);
  const panel = page.getByRole('region', { name: new RegExp(`${jammed!.name} tower`) });
  const row = panel.getByTestId('jam-row');
  await expect(row).toContainText(/JAMMED\s*\d S/i);
  await expect(row).toHaveAttribute('aria-label', /^Jammed, \d s left$/);
  await expect(row.locator('img.icon')).toHaveCount(1); // the Jammed glyph
  await both(page, 1, 'jammed-panel');

  // The countdown counts: a second later it reads a second less (or the jam has ended).
  const before = Number((await row.getAttribute('aria-label'))!.match(/\d+/)![0]);
  await page.evaluate(() => globalThis.__sd!.fastForward(60));
  await nextFrames(page);
  await expect(row).toHaveAttribute('aria-label', new RegExp(`(Jammed, ${before - 1} s|Immune)`));

  // System Reboot (slot 1): every tower immune for 6 s, the row says so.
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.enqueue({ type: 'ability', slot: 1 });
    sd.fastForward(1);
  });
  await nextFrames(page);
  await expect(row).toHaveAttribute('aria-label', 'Immune to jamming, 6 s left');
  await expect(row).toContainText(/IMMUNE\s*6 S/i);
  await both(page, 2, 'reboot-immune');
  // The immunity runs out: the row goes, and the panel is as it was.
  await page.evaluate(() => globalThis.__sd!.fastForward(6 * 60 + 1));
  await nextFrames(page);
  await expect(row).toHaveCount(0);
  // The Hum Choir selected: its ring in its song's gold, as its placement preview's (T731).
  await page.keyboard.press('Escape');
  await select(page, 7, 2);
  await expect(page.getByRole('region', { name: /Hum Choir tower/ })).toBeVisible();
  await both(page, 10, 'choir-selected-ring');
});

test('hudAct3Two: the Sproing Pad’s fixed targeting', async ({ page }) => {
  await open(page, 'dev_sproing');
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.enqueue({ type: 'build', tower: 'sproing', tile: [6, 4] });
    sd.fastForward(1);
  });
  await nextFrames(page);
  await select(page, 6, 4);
  const panel = page.getByRole('region', { name: /Sproing Pad tower/ });
  const target = panel.getByTestId('targeting');
  await expect(target).toContainText(/FLYERS FIRST/i);
  await expect(target).toHaveAttribute('aria-disabled', 'true');
  await expect(target).toHaveAccessibleName(/Flyers first, fixed/);
  await page.keyboard.press('t');
  await expect(page.locator('.hud-notice')).toContainText(/LEAPERS PICK THEIR OWN/i);
  await both(page, 3, 'sproing-target');
});

test('hudAct3Two: A3M5 under Rewrite: Reboot locked, the bearers’ meter, the loadout', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await open(page, 'a3_m05', 'after_a3m4_rewrite');
  const locked = page.getByTestId('ability-locked-system_reboot');
  await expect(locked).toBeVisible();
  await expect(locked).toHaveAccessibleName(
    'System Reboot, locked. QUILL is offline. It runs the reboot.',
  );
  await expect(locked).toContainText(/OFFLINE/i);
  // Keyboard reachable: it takes the focus, and Enter says why.
  await locked.focus();
  await expect(locked).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.hud-notice')).toContainText(/QUILL IS OFFLINE/i);
  const carried = page.getByTestId('bearers-carried');
  await expect(carried).toContainText(/CARRIED\s*0\s*OF\s*\d+/i);
  await expect(page.getByTestId('asset-meter')).toHaveAttribute(
    'aria-label',
    /^Long Walk \d+ of \d+(, low)?\. Carried home 0 of \d+$/,
  );
  // Par plays until the first bearers are home.
  await page.evaluate(() => globalThis.__sd!.autoplay('par'));
  const home = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    const st = sd.state()!;
    for (let k = 0; k < 60 * 900 && st.stats.bearersHome === 0; k++) {
      if (st.outcome !== 'playing') break;
      sd.fastForward(1);
    }
    return st.stats.bearersHome;
  });
  expect(home).toBeGreaterThan(0);
  await nextFrames(page);
  await expect(carried).toContainText(new RegExp(`CARRIED\\s*${home}\\s*OF`, 'i'));
  await both(page, 4, 'a3m5-rewrite-hud');

  // The loadout: System Reboot's card, locked, with why; not a pick.
  await page.evaluate(() => globalThis.__sd!.goto('loadout'));
  await expect(page.getByRole('heading', { name: 'Loadout' })).toBeVisible();
  const card = page.locator('[data-locked="system_reboot"]');
  await expect(card).toContainText(/QUILL IS OFFLINE/i);
  await expect(page.getByRole('radio', { name: /System Reboot/ })).toHaveCount(0);
  await page.waitForTimeout(200);
  await both(page, 5, 'a3m5-rewrite-loadout');
});

test('hudAct3Two: A3M5’s loadout under Keep: QUILL’s Time Dilation, the jailbroken Rivet', async ({
  page,
}) => {
  await open(page, 'a3_m05', 'after_a3m4_keep');
  await page.evaluate(() => globalThis.__sd!.goto('loadout'));
  await expect(page.getByRole('heading', { name: 'Loadout' })).toBeVisible();
  const td = page.getByRole('radio', { name: /Time Dilation/ });
  await expect(td).toBeVisible();
  await expect(td.getByTestId('loadout-inherited')).toContainText(/QUILL'S/i);
  await expect(page.getByRole('radio', { name: /System Reboot/ })).toHaveCount(1);
  await expect(page.locator('[data-testid="loadout-locked"]')).toHaveCount(0);
  const rivet = page.getByRole('button', { name: /^Rivet, jailbroken,/ });
  await expect(rivet).toContainText(/JAILBROKEN/i);
  await page.waitForTimeout(200);
  await both(page, 6, 'a3m5-keep-loadout');
});

test('hudAct3Two: A3M6 under Purge: Sheltered, and QUILL’s status-bar portrait', async ({
  page,
}) => {
  await open(page, 'a3_m06', 'after_a3m5_purge', '&dialogue=1&fasttext=1');
  await expect(page.locator('.hud-escort')).toContainText(/SHELTERED/i);
  await page.evaluate(() => globalThis.__sd!.dialogue.play('a3_m06_cue_sheltered'));
  const portrait = page.locator('.hud .dlg-portrait');
  await expect(portrait.first()).toHaveAttribute('data-frame', /^purge\./);
  await both(page, 7, 'a3m6-purge-sheltered');
});

test('hudAct3Two: the Maw’s parts as cells on one bar; Shareholder Value’s marks', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await open(page, 'dev_gmaw');
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
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
    for (let k = 0; k < 1200 && sd.state()!.wave < 2; k++) {
      if (sd.state()!.schedule.phase === 'countdown') sd.enqueue({ type: 'callWave' });
      sd.fastForward(1);
    }
    // The split, then a second of fire into the parts.
    const st = sd.state()!;
    for (let k = 0; k < 6000; k++) {
      if (st.enemies.items.some((e) => e.alive && e.def?.id === 'gathering_maw_part')) break;
      sd.fastForward(1);
    }
    sd.fastForward(60);
  });
  await nextFrames(page);
  const look = () =>
    page.evaluate(() => {
      const r = globalThis.__sd!.render()!;
      return { bar: r.bossBar, cells: r.bossCells };
    });
  expect(await look()).toMatchObject({ cells: 3 });
  expect((await look()).bar).toBeGreaterThan(0);
  await both(page, 8, 'gmaw-cells');

  // Shareholder Value: its bar with the 66% and 33% marks.
  await open(page, 'dev_takeover');
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.enqueue({ type: 'build', tower: 'rivet', tile: [5, 2] });
    sd.fastForward(1);
    const st = sd.state()!;
    for (let k = 0; k < 60 * 300; k++) {
      if (st.enemies.items.some((e) => e.alive && e.def?.id === 'shareholder_value')) break;
      if (st.schedule.phase === 'countdown' || st.wave === 0) sd.enqueue({ type: 'callWave' });
      sd.fastForward(1);
    }
    sd.fastForward(30);
  });
  await nextFrames(page);
  expect(await look()).toMatchObject({ cells: 0 });
  expect((await look()).bar).toBeGreaterThan(0);
  await both(page, 9, 'sv-bar');
});
