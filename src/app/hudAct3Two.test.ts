// T731: the Act III part-two HUD's view models: the tower panel's Jammed and Immune rows and the
// Sproing Pad's fixed targeting, the bar's dark slot for an ability the map locks (A3M5's System
// Reboot under Rewrite) and its words, the bearers' row on the asset meter, the corners those add,
// jailbroken icons on the build slots and the loadout, the inherited ability's owner, and the boss
// bar's cells for a split boss's parts.
import { describe, expect, it } from 'vitest';
import { TICK_HZ } from '../shared/time.ts';
import { DEV_SAVES } from '../meta/__fixtures__/devSaves.ts';
import { mapOrigin } from '../render/iso.ts';
import { VIEW_H, VIEW_W } from '../render/scale.ts';
import { segmentEdgesPx, BOSS_BAR_W } from '../render/vfx/bossBar.ts';
import { JAILBROKEN_PALETTE } from '../render/views/towerLook.ts';
import { createSim, type Sim, type SimState } from '../sim/index.ts';
import type { AbilityId, IdSpace } from '../content/types.ts';
import { ABILITIES } from '../content/abilities/index.ts';
import {
  BEARER_ROW_H,
  HUD_CORNERS,
  hudCorners,
  LINE_H,
  LOCKED_SLOT_W,
  PANEL_GAP,
  towerPanelHeight,
} from '../ui/hud/layout.ts';
import { JAILBROKEN_ICON } from '../ui/hud/Icon.tsx';
import { battleConfig } from './battleSetup.ts';
import { assetMeterView } from './hudAsset.ts';
import { fixedTargetText, selectedView, wholeSec } from './hudPanel.ts';
import { lockedAbilityReason } from './hudText.ts';
import { buildSlots, lockedAbilityViews } from './hudViews.ts';
import { inheritedFrom } from './loadout.ts';

/** A1M1 with every tower unlocked (the all_unlocked dev save), paused at tick 0. */
function sim(loadout: string[]): Sim<IdSpace> {
  const cfg = battleConfig('a1_m01', 1, DEV_SAVES.all_unlocked.build());
  return createSim({ ...cfg, loadout, modifiers: [], specsUnlocked: [] });
}

function mut(s: Sim<IdSpace>): SimState {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the test sets up state directly
  return s.state as unknown as SimState;
}

function built(s: Sim<IdSpace>, tower: string, col: number, row: number) {
  mut(s).lockedTowers.length = 0;
  mut(s).credits = 5000;
  s.enqueue({ type: 'build', tile: [col, row], tower });
  s.step();
  const t = mut(s).towers.items.find((x) => x.alive && x.col === col && x.row === row);
  if (t === undefined) throw new Error(`no ${tower} at ${col},${row}`);
  return t;
}

const origin = mapOrigin(14, 10, VIEW_W, VIEW_H);

describe('the tower panel: Jammed (T731)', () => {
  it('counts whole seconds up, never below 0', () => {
    expect(wholeSec(0)).toBe(0);
    expect(wholeSec(-5)).toBe(0);
    expect(wholeSec(1)).toBe(1);
    expect(wholeSec(TICK_HZ)).toBe(1);
    expect(wholeSec(TICK_HZ + 1)).toBe(2);
  });

  it('shows the jam countdown while Jammed, then the immunity after it', () => {
    const s = sim(['rivet']);
    const t = built(s, 'rivet', 7, 2);
    expect(selectedView(s, t.uid, origin, null)).toMatchObject({ jamSec: 0, jamImmuneSec: 0 });
    t.jamTicks = 2.5 * TICK_HZ;
    t.jamImmuneTicks = 0;
    const jammed = selectedView(s, t.uid, origin, null)!; // a live tower
    expect(jammed).toMatchObject({ jamSec: 3, jamImmuneSec: 0 });
    // Jammed and immune at once (System Reboot's immunity set as it lands): only the jam shows.
    t.jamImmuneTicks = 6 * TICK_HZ;
    expect(selectedView(s, t.uid, origin, null)).toMatchObject({ jamSec: 3, jamImmuneSec: 0 });
    t.jamTicks = 0;
    const immune = selectedView(s, t.uid, origin, jammed)!;
    expect(immune).not.toBe(jammed); // the key moved: the panel rebuilt
    expect(immune).toMatchObject({ jamSec: 0, jamImmuneSec: 6 });
  });

  it('grows the panel by one line for the Jammed or Immune row', () => {
    const base = { statsLines: ['8 dmg'], bonuses: [], deltaLines: [], specs: null };
    const h = towerPanelHeight(base);
    expect(towerPanelHeight({ ...base, jamSec: 3 })).toBe(h + LINE_H + PANEL_GAP);
    expect(towerPanelHeight({ ...base, jamImmuneSec: 2 })).toBe(h + LINE_H + PANEL_GAP);
    expect(towerPanelHeight({ ...base, jamSec: 0, jamImmuneSec: 0 })).toBe(h);
  });
});

describe('the tower panel: the Sproing Pad (T731, T704)', () => {
  it('has fixed picks: no priority to cycle, its order on the button', () => {
    expect(fixedTargetText('leaper')).toBe('Flyers first');
    expect(fixedTargetText('bullet')).toBeNull();
    expect(fixedTargetText(null)).toBeNull();
    const s = sim(['sproing', 'rivet']);
    const pad = built(s, 'sproing', 7, 2);
    expect(selectedView(s, pad.uid, origin, null)).toMatchObject({
      priority: null,
      fixedTarget: 'Flyers first',
    });
    const rivet = built(s, 'rivet', 6, 2);
    expect(selectedView(s, rivet.uid, origin, null)).toMatchObject({
      priority: 'first',
      fixedTarget: null,
    });
  });
});

describe('a locked ability (T731; A3M5 System Reboot under Rewrite)', () => {
  it('reads why, in Act III copy', () => {
    expect(lockedAbilityReason('system_reboot')).toBe('QUILL is offline. It runs the reboot.');
    for (const id of ['system_reboot', 'orbital_strike']) {
      expect(lockedAbilityReason(id)).not.toContain('!');
    }
  });

  it('views the registered ones, skipping unknown ids', () => {
    expect(lockedAbilityViews(ABILITIES, ['system_reboot', 'nope'])).toEqual([
      {
        ability: 'system_reboot',
        label: 'System Reboot',
        icon: 'icon.ability.system_reboot',
        reason: 'QUILL is offline. It runs the reboot.',
      },
    ]);
  });

  it('widens the bottom-left corner by a slot', () => {
    const [, , abilities] = hudCorners(false, false, false, 1);
    expect(abilities?.w).toBe(HUD_CORNERS[2]!.w + LOCKED_SLOT_W);
    expect(hudCorners()).toBe(HUD_CORNERS);
  });
});

describe("the bearers' meter (T731; A3M5)", () => {
  it('carries those home of the total; other assets have no row', () => {
    expect(assetMeterView('Bearers', 12, 12, { home: 4, total: 26 })).toEqual({
      name: 'Bearers',
      value: 12,
      max: 12,
      damage: 'intact',
      bearers: { home: 4, total: 26 },
    });
    expect(assetMeterView('Rigs', 10, 20)).not.toHaveProperty('bearers');
  });

  it("adds the row's height to the status corner", () => {
    const [plain] = hudCorners(true);
    const [bearers] = hudCorners('bearers');
    expect(bearers!.h - plain!.h).toBe(BEARER_ROW_H);
  });
});

describe('jailbroken icons (T731; towers.md § 9)', () => {
  it("puts a jailbroken class's build slot in the jailbroken palette", () => {
    const cfg = battleConfig('a1_m01', 1, DEV_SAVES.all_unlocked.build());
    const slots = buildSlots(cfg.content.towers, ['rivet', 'skyhook'], {}, [], [], undefined, [
      'rivet',
    ]);
    expect(slots[0]?.iconVariant).toBe(JAILBROKEN_PALETTE);
    expect(slots[1]).not.toHaveProperty('iconVariant');
    // The ui's name for it (ui may not import render/views) is the same palette.
    expect(JAILBROKEN_ICON).toBe(JAILBROKEN_PALETTE);
  });
});

/** The all_unlocked save's unlocks with `inherited` handed over by the story. */
const unlocks = (inherited: AbilityId[]) => ({
  unlocks: { ...DEV_SAVES.all_unlocked.build().unlocks, inheritedAbilities: inherited },
});

describe("an inherited ability's owner (T731)", () => {
  it('names whose it was, only when the story handed it over', () => {
    expect(inheritedFrom(unlocks(['time_dilation']), 'time_dilation', 'quill')).toBe("QUILL's");
    expect(inheritedFrom(unlocks(['suppressing_fire']), 'suppressing_fire', 'bricks')).toBe(
      "Bricks's",
    );
    expect(inheritedFrom(unlocks([]), 'time_dilation', 'quill')).toBeNull();
    expect(inheritedFrom(unlocks(['system_reboot']), 'system_reboot', null)).toBeNull();
  });
});

describe("the boss bar's cells (T731; a split boss's parts)", () => {
  it('cuts the bar into equal cells that cover it', () => {
    expect(segmentEdgesPx(3)).toEqual([0, 53, 107, BOSS_BAR_W]);
    expect(segmentEdgesPx(2, 10)).toEqual([0, 5, 10]);
    expect(segmentEdgesPx(0)).toEqual([0, BOSS_BAR_W]);
  });
});
