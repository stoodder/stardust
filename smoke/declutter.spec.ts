// T803's declutter guard: every screen and state at 1280×720, captured and measured by
// smoke/declutter.ts (what it records, the guard it runs, and DECLUTTER_RECORD / DECLUTTER_BASELINE
// are documented there). The flows below only get to each screen; screenshots in
// <out>/screens/declutter/<id>.png, measures in <out>/declutter/<id>.json.
import type { Page } from '@playwright/test';
import type { ResultsFixture } from '../src/app/testHookTypes.ts';
import { expect, test } from './fixtures.ts';
import {
  baseTab,
  boot,
  capture,
  clockIn,
  nextUntil,
  playTo,
  readUntil,
  type ScreenId,
} from './declutter.ts';

// ---- T803b: the battle ----

test('declutter b: Act I HUD, armed slot, tower panel, comms, bark, pause', async ({ page }) => {
  test.setTimeout(60_000);
  await boot(page, '&dialogue=1&fasttext=1&map=a1_m03');
  await clockIn(page);
  await page.evaluate(() => globalThis.__sd!.setSpeed(0));
  await capture(page, 'hud-a1-build');

  await page.getByRole('navigation', { name: 'Build' }).getByRole('button').first().click();
  await capture(page, 'hud-a1-armed');
  await page.keyboard.press('Escape');

  await playTo(page, 'par', 3, 120);
  const at = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    const t = sd.state()!.towers.items.find((x) => x.alive);
    return t === undefined ? null : sd.tileToClient(t.col, t.row);
  });
  expect(at).not.toBeNull();
  if (at !== null) await page.mouse.click(at.x, at.y);
  await expect(page.getByRole('region', { name: / tower$/ })).toBeVisible();
  await page.mouse.move(0, 0);
  await capture(page, 'hud-tower-panel');
  await page.keyboard.press('Escape');

  await page.evaluate(() => globalThis.__sd!.dialogue.play('a1_m03_w05'));
  await expect
    .poll(() => page.evaluate(() => globalThis.__sd!.dialogue.shown().comms))
    .not.toBe(null);
  await capture(page, 'hud-comms');

  await page.evaluate(() => globalThis.__sd!.dialogue.bark('quill_map_start_a1_99'));
  await expect(page.getByRole('button', { name: "Who's there?" })).toBeVisible();
  await capture(page, 'hud-bark');

  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Shift paused' })).toBeVisible();
  await capture(page, 'pause');
});

test('declutter b: Act III HUD mid-wave', async ({ page }) => {
  test.setTimeout(60_000);
  await boot(page, '&map=a3_m05');
  await clockIn(page);
  await playTo(page, 'par', 6, 600);
  await capture(page, 'hud-a3-wave');
});

test('declutter b: a boss on the HUD', async ({ page }) => {
  test.setTimeout(60_000);
  await boot(page, '&map=a1_m05');
  await clockIn(page);
  const boss = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
    sd.fastForward(0);
    const st = sd.state()!;
    const hurt = (): boolean =>
      st.enemies.items.some(
        (e) => e.alive && e.def !== null && e.def.boss !== null && e.hp < e.def.hp * 0.9,
      );
    for (let k = 0; k < 90_000 && !hurt() && st.outcome === 'playing'; k++) sd.fastForward(1);
    return hurt();
  });
  expect(boss).toBe(true);
  await capture(page, 'hud-boss');
});

test('declutter b: the finale HUD, Descent to Dawn', async ({ page }) => {
  test.setTimeout(150_000);
  await boot(page, '&map=fin_m01');
  await clockIn(page);
  type Cond = 'started' | 'walking' | 'held' | 'phase2' | 'dawn';
  const until = (cond: Cond) =>
    page.evaluate((c) => {
      const sd = globalThis.__sd!;
      const st = sd.state()!;
      const check = (): boolean => {
        switch (c) {
          case 'started':
            return st.wave === 1 && (st.timers[0]?.filled ?? 0) > 60 * 4;
          case 'walking':
            return st.wave >= 6 && st.choir.dist > 8;
          case 'held':
            return st.schedule.phase === 'held';
          case 'phase2':
            return st.phase >= 2 && st.tick - st.phaseTick > 60 * 25;
          case 'dawn':
            return st.phase >= 3 && st.tick - st.phaseTick > 60 * 2;
          default:
            return false;
        }
      };
      for (let k = 0; k < 300_000 && !check() && st.outcome === 'playing'; k++) sd.fastForward(1);
      return check();
    }, cond);
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('par');
    sd.fastForward(0);
  });
  expect(await until('started')).toBe(true);
  await capture(page, 'hud-fin-descent');
  expect(await until('walking')).toBe(true);
  await capture(page, 'hud-fin-phase1');
  if (await until('held')) await capture(page, 'hud-fin-held');
  expect(await until('phase2')).toBe(true);
  await capture(page, 'hud-fin-phase2');
  expect(await until('dawn')).toBe(true);
  await expect(page.getByTestId('hud')).toHaveAttribute('data-dawn', 'true');
  await capture(page, 'hud-fin-dawn');
});

test('declutter b: the Endless HUD and a challenge HUD', async ({ page }) => {
  test.setTimeout(60_000);
  await boot(page, '&save=after_fin_stay&map=end_m01');
  const lockIn = page.getByRole('button', { name: 'Lock in' });
  if (await lockIn.isVisible()) await lockIn.click();
  await expect(page.getByTestId('hud')).toBeVisible();
  await playTo(page, 'par', 4, 300);
  await capture(page, 'hud-endless');

  await boot(page, '&save=after_fin_stay&map=ch_m03');
  await clockIn(page);
  await playTo(page, 'par', 2, 300);
  await capture(page, 'hud-challenge');
});

// ---- T803c: the shell ----

test('declutter c: Title (new, saves, load), Import, Settings', async ({ page }) => {
  await boot(page, '');
  await expect(page.getByRole('button', { name: 'Start shift' })).toBeVisible();
  await capture(page, 'title-new');
  await page.getByRole('button', { name: 'Import code' }).click();
  await expect(page.getByRole('textbox', { name: 'Paste a shift code' })).toBeVisible();
  await capture(page, 'import');

  // A campaign in a real slot (a dev save plays in memory, so the Title wouldn't list it).
  await boot(page, '');
  await page.getByRole('button', { name: 'Start shift' }).click();
  await expect(page.getByRole('dialog', { name: 'Shift briefing' })).toBeVisible();
  await page.evaluate(() => globalThis.__sd!.goto('title'));
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
  await capture(page, 'title-saves');
  await page.getByRole('button', { name: 'Load', exact: true }).click();
  await capture(page, 'title-load');
  await page.evaluate(() => globalThis.__sd!.goto('settings'));
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await capture(page, 'settings');
});

test('declutter c: the post-game Title', async ({ page }) => {
  // The post-game save into a real slot by its code (a dev save plays in memory).
  await boot(page, '&save=after_fin_stay');
  await page.evaluate(() => globalThis.__sd!.goto('settings'));
  await page.getByRole('button', { name: 'Export code' }).click();
  const code = await page.getByRole('textbox', { name: 'Shift code' }).inputValue();
  await page.evaluate(() => globalThis.__sd!.goto('title'));
  await page.getByRole('button', { name: 'Import code' }).click();
  await page.getByRole('textbox', { name: 'Paste a shift code' }).fill(code);
  await page.getByRole('button', { name: 'Check code' }).click();
  await page
    .getByRole('list', { name: 'Import into' })
    .getByRole('listitem')
    .first()
    .getByRole('button', { name: 'Import here' })
    .click();
  await expect(page.getByTestId('star-map')).toBeVisible();
  await page.evaluate(() => globalThis.__sd!.goto('title'));
  await expect(page.getByTestId('title-tip')).toContainText('Remember them.');
  await capture(page, 'title-postgame');
});

test('declutter c: Intake and the Shift board', async ({ page }) => {
  await boot(page, '&intake=1');
  await page.getByRole('button', { name: 'Start shift' }).click();
  await expect(page.getByTestId('file-note')).toBeVisible();
  await capture(page, 'intake');

  await boot(page, '&save=after_a1m3');
  await expect(page.getByRole('heading', { name: 'Shift board' })).toBeVisible();
  await capture(page, 'shift-board');
});

test('declutter c: the Sector map by phase', async ({ page }) => {
  const sector = async (save: string, id: ScreenId): Promise<void> => {
    await boot(page, `&save=${save}`);
    await expect(page.getByTestId('star-map')).toBeVisible();
    await capture(page, id);
  };
  await sector('after_a1m5_ref', 'sector-act2');
  await sector('after_a2m4_returned', 'sector-dusk');
  await sector('after_a2m6', 'sector-act3');
  await sector('after_a3m6_keep', 'sector-act3-late');
});

test('declutter c: the post-game star map, a challenge, a replay, Go', async ({ page }) => {
  await boot(page, '&save=after_fin_stay');
  await expect(page.getByRole('heading', { name: 'After the dawn' })).toBeVisible();
  await capture(page, 'postgame-map');
  const shifts = page.getByRole('list', { name: 'Shifts' });
  await page
    .getByTestId('post-game')
    .getByRole('button', { name: /^Challenge: Skitterkin Only/ })
    .click();
  await expect(page.getByTestId('post-game-panel')).toBeVisible();
  await capture(page, 'postgame-challenge');
  await shifts.getByRole('button', { name: /^Shift 1, Orientation Day, / }).click();
  await expect(page.getByRole('button', { name: 'Replay Orientation Day' })).toBeVisible();
  await capture(page, 'postgame-node');

  await boot(page, '&save=after_fin_go');
  await expect(page.getByTestId('star-map')).toHaveAttribute('data-phase', 'dawn');
  await capture(page, 'postgame-go');
});

// ---- T803d: the loadout and the shelves ----

test('declutter d: the loadout screen', async ({ page }) => {
  await boot(page, '&save=all_unlocked&map=a2_m03');
  await page.evaluate(() => globalThis.__sd!.goto('loadout'));
  await expect(page.getByRole('button', { name: /lock in/i })).toBeVisible();
  await capture(page, 'loadout');

  await boot(page, '&save=after_a3m5_keep&map=a3_m06');
  await page.evaluate(() => globalThis.__sd!.goto('loadout'));
  await expect(page.getByRole('button', { name: /lock in/i })).toBeVisible();
  await capture(page, 'loadout-a3');

  await boot(page, '&save=after_a3m6_keep&map=fin_m01');
  await page.evaluate(() => globalThis.__sd!.goto('loadout'));
  await expect(page.getByTestId('loadout-companions')).toBeVisible();
  await capture(page, 'loadout-fin');
});

test('declutter d: Research, Shop, Engineering, Xenotech, the Bounty Board', async ({ page }) => {
  await boot(page, '&save=after_a1m1');
  await baseTab(page, 'Research');
  await capture(page, 'research-early');

  // Act II's close: every shelf open, with things still to buy (prices up) and 300 Stardust.
  await boot(page, '&save=after_a2m6');
  await baseTab(page, 'Research');
  await capture(page, 'research');
  await baseTab(page, 'Shop');
  await capture(page, 'shop');
  await baseTab(page, 'Engineering');
  await capture(page, 'engineering');
  await baseTab(page, /^Xenotech/);
  await capture(page, 'xenotech');

  await boot(page, '&save=after_a2m3');
  await baseTab(page, /^Bounty/);
  await capture(page, 'bounty');
});

// ---- T803e: the story screens ----

test('declutter e: briefings and the crate', async ({ page }) => {
  await boot(page, '&map=a1_m01');
  await expect(page.getByRole('dialog', { name: 'Shift briefing' })).toBeVisible();
  await capture(page, 'briefing-a1');

  await boot(page, '&save=after_a3m5_keep&map=a3_m06');
  await expect(page.getByRole('dialog', { name: 'Shift briefing' })).toBeVisible();
  await capture(page, 'briefing-a3');
  await page.getByRole('button', { name: 'Clock in' }).click();
  await expect(page.getByTestId('crate-card')).toBeVisible();
  await capture(page, 'crate');
});

test('declutter e: the finale and challenge briefings', async ({ page }) => {
  await boot(page, '&save=after_a3m6_keep&map=fin_m01');
  await expect(page.getByRole('dialog', { name: 'Shift briefing' })).toBeVisible();
  await capture(page, 'briefing-fin');

  await boot(page, '&save=after_fin_stay&map=ch_m01');
  await expect(page.getByRole('dialog', { name: 'Shift briefing' })).toBeVisible();
  await capture(page, 'briefing-challenge');
});

test('declutter e: the veteran picker, closed and open', async ({ page }) => {
  await boot(page, '&save=after_a2m6');
  const node = page
    .getByRole('list', { name: 'Shifts' })
    .getByRole('button', { name: /^Shift \d+, Orientation Day, / });
  // A3M1's Next-up panel covers this node: the keyboard reaches it (T863's note for T803c).
  await node.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Replay Orientation Day' }).click();
  const lockIn = page.getByRole('button', { name: 'Lock in' });
  if (await lockIn.isVisible()) await lockIn.click();
  const picker = page.getByTestId('veteran-picker');
  await expect(picker).toBeVisible();
  await capture(page, 'veteran-closed');
  await picker.getByRole('button', { name: 'Choose' }).click();
  await expect(picker.getByRole('list', { name: 'Veteran modifiers' })).toBeVisible();
  await capture(page, 'veteran-open');
});

test('declutter e: Results cards', async ({ page }) => {
  test.setTimeout(60_000);
  const card = async (save: string, fixture: ResultsFixture, id: ScreenId): Promise<void> => {
    await boot(page, `&save=${save}`);
    await page.evaluate((f) => {
      void globalThis.__sd!.results(f);
    }, fixture);
    await expect(page.locator('#sd-results-heading')).toBeVisible();
    await capture(page, id);
  };
  await card('after_a1m1', { map: 'a1_m02', outcome: 'won' }, 'results-win');
  await card(
    'after_a2m2',
    { map: 'a2_m03', outcome: 'lost', checkpoint: { latest: 6 } },
    'results-loss',
  );
  await card('after_a2m6', { map: 'a3_m01', outcome: 'won' }, 'results-escort');
  await card('after_a3m2_rivet', { map: 'a3_m03', outcome: 'won' }, 'results-held');
  await card('after_a3m6_keep', { map: 'fin_m01', outcome: 'won' }, 'results-finale');
});

test('declutter e: the Endless score screen', async ({ page }) => {
  test.setTimeout(60_000);
  await boot(page, '&save=after_fin_stay&map=end_m01');
  const lockIn = page.getByRole('button', { name: 'Lock in' });
  if (await lockIn.isVisible()) await lockIn.click();
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.setSpeed(0);
    sd.autoplay('none');
    sd.fastForward(1);
    const st = sd.state()!;
    for (let k = 0; k < 120 && st.outcome === 'playing'; k++) sd.fastForward(600);
  });
  await expect(page.getByTestId('endless-score')).toBeVisible();
  await capture(page, 'endless-score');
});

test('declutter e: Inbox and Journal', async ({ page }) => {
  await boot(page, '&save=after_a3m1_spared');
  const pane = await baseTab(page, /^Inbox/);
  await expect(pane.getByRole('article')).toBeVisible();
  await capture(page, 'inbox');
  const journal = await baseTab(page, /^Journal/);
  await journal.getByRole('button', { name: /^Elder/ }).click();
  await expect(journal.getByRole('article').locator('.sd-codex-side')).toBeVisible();
  await capture(page, 'journal');
});

/** Plays scene `id` over `save` (on the base when `base`), with dialogue on. */
async function playScene(page: Page, save: string, id: string, base: boolean): Promise<void> {
  await boot(page, `&dialogue=1&fasttext=1&save=${save}`);
  if (base) await page.evaluate(() => globalThis.__sd!.goto('base'));
  await page.evaluate((s) => globalThis.__sd!.dialogue.play(s), id);
  await expect(page.getByTestId('scene')).toBeVisible();
}

test('declutter e: scenes, the feed and the yield log', async ({ page }) => {
  await playScene(page, 'after_a2m4_returned', 'a2_m04_base_handover', true);
  await capture(page, 'scene-base');
  await playScene(page, 'after_a1m4', 'a1_m05_scene_party', false);
  await capture(page, 'scene-full');
  await playScene(page, 'after_a1m4', 'a1_m05_scene_stinger', false);
  await expect(page.getByTestId('stage-feed')).toBeVisible();
  await capture(page, 'stage-feed');
  await playScene(page, 'after_a3m1_spared', 'a3_m02_scene_confession', true);
  await expect(page.getByTestId('stage-yield-log')).toBeVisible();
  await capture(page, 'stage-yield-log');
});

test("declutter e: Gerald's mail, C4's card, Night Shift", async ({ page }) => {
  test.setTimeout(60_000);
  await boot(page, '&dialogue=1&fasttext=1&save=after_a3m3_convoy');
  await page.evaluate(() => globalThis.__sd!.goto('base'));
  // Not awaited: the fixture resolves once the card shows, after the mail.
  void page.evaluate(() =>
    globalThis.__sd!.results({ map: 'a3_m04', outcome: 'won', commitChoice: true }),
  );
  const mail = page.getByTestId('stage-mail');
  await expect(mail).toHaveAttribute('data-out', '1', { timeout: 5000 });
  await capture(page, 'stage-mail');
  await readUntil(page, async () => (await mail.count()) === 0);
  const choice = page.getByRole('group', { name: "QUILL's directives" });
  await expect(choice.getByTestId('choice-heading')).toBeFocused();
  await capture(page, 'results-choice');
  const keep = choice.getByRole('button', { name: 'Keep them. Stay yourself.' });
  await expect(keep).not.toHaveAttribute('aria-disabled', 'true');
  await keep.click();
  await page.getByRole('dialog').getByRole('button', { name: 'Continue' }).click();
  await page.evaluate(() => globalThis.__sd!.goto('base'));
  const room = page.getByTestId('stage-night-shift');
  await expect(room).toBeVisible();
  await readUntil(page, async () => (await room.getAttribute('data-light')) === 'laugh');
  await capture(page, 'stage-night-shift');
});

test("declutter e: the Waykeeper's naming", async ({ page }) => {
  await boot(page, '&dialogue=1&fasttext=1&save=after_a3m5_keep');
  await page.evaluate(() => globalThis.__sd!.goto('base'));
  void page
    .evaluate(() => globalThis.__sd!.results({ map: 'a3_m06', outcome: 'won' }))
    .catch(() => undefined); // still waiting on the flow as the test ends
  const stage = page.getByTestId('stage-waykeeper');
  await expect(stage).toBeVisible();
  await readUntil(page, async () => (await stage.getAttribute('data-turned')) === 'true');
  await capture(page, 'stage-waykeeper');
});

test('declutter e: Dawn and C5', async ({ page }) => {
  await playScene(page, 'after_a3m6_keep', 'fin_m01_scene_dawn', false);
  await expect(page.getByTestId('stage-dawn')).toBeVisible();
  await capture(page, 'stage-dawn');
  await playScene(page, 'after_a3m6_keep', 'fin_m01_scene_c5', false);
  await expect(page.getByTestId('stage-c5')).toBeVisible();
  const stay = page.getByRole('button', { name: /^We stay\./ });
  await nextUntil(page, async () => (await stay.count()) > 0);
  await capture(page, 'c5');
});

test('declutter e: the epilogue (card, counter, credits, final image)', async ({ page }) => {
  test.setTimeout(60_000);
  await boot(page, '&save=after_fin_stay');
  await page.getByRole('button', { name: 'Watch the epilogue' }).click();
  const epi = page.getByTestId('epilogue');
  await expect(epi).toHaveAttribute('data-beat', 'card');
  await capture(page, 'epilogue-card');
  for (let i = 0; i < 20; i++) {
    // oxlint-disable-next-line no-await-in-loop -- one card after another
    if ((await epi.getAttribute('data-beat')) !== 'card') break;
    // oxlint-disable-next-line no-await-in-loop -- one card after another
    await epi.click();
  }
  await expect(epi).toHaveAttribute('data-beat', 'counter');
  await expect(page.getByTestId('epilogue-counter')).toHaveAttribute('data-flipped', 'true', {
    timeout: 8000,
  });
  await capture(page, 'epilogue-counter');
  await epi.click();
  await expect(epi).toHaveAttribute('data-beat', 'credits');
  await capture(page, 'epilogue-credits');
  await epi.click();
  await expect(epi).toHaveAttribute('data-beat', 'final');
  await capture(page, 'epilogue-final');
});
