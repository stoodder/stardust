import { describe, expect, it } from 'vitest';
import { hud } from '../ui/state.ts';
import { mapOrigin } from '../render/iso.ts';
import { VIEW_H, VIEW_W } from '../render/scale.ts';
import { createSim } from '../sim/index.ts';
import { battleConfig } from './battleSetup.ts';
import { nextPriority, PRIORITY_CYCLE } from './commands.ts';
import {
  announce,
  callPulses,
  CHECKPOINT_CUE_MS,
  cueStale,
  staysArmed,
  UPGRADE_TEACH_WAVE,
  upgradeHintShows,
  WAVE_BANNER_MS,
} from './hud.ts';
import { selectedView } from './hudPanel.ts';
import {
  abilityDescription,
  cursorText,
  deltaText,
  displayName,
  holdFireText,
  lockedText,
  meterLabelText,
  rejectText,
  statLineText,
} from './hudText.ts';
import {
  abilityCooldownTotals,
  abilitySlots,
  companionView,
  buildSlots,
  cooldownView,
  countdownSeconds,
  towerPoints,
  towerUnlockWaves,
  wavePreview,
} from './hudViews.ts';

/** A sim on the dev battle (render/__fixtures__/devBattle.ts), paused at tick 0. */
function devSim() {
  return createSim(battleConfig('dev_range', 1));
}

describe('hud view models', () => {
  it('names content ids for display', () => {
    expect(displayName('rivet')).toBe('Rivet');
    expect(displayName('dev_thumper')).toBe('Thumper');
    expect(displayName('orbital_strike')).toBe('Orbital Strike');
    expect(meterLabelText(null)).toBe('Core');
    expect(meterLabelText('voices')).toBe('Voices');
  });

  it('builds the slots from the loadout, in order, with tier-1 costs and icons', () => {
    const sim = devSim();
    expect(buildSlots(sim.config.content.towers, sim.config.loadout)).toEqual([
      {
        tower: 'dev_rivet',
        label: 'Rivet',
        icon: 'icon.tower.rivet',
        cost: 100,
        listCost: 100,
        price: 'list',
        unlockWave: null,
        isNew: false,
      },
      {
        tower: 'dev_thumper',
        label: 'Thumper',
        icon: 'icon.tower.thumper',
        cost: 125,
        listCost: 125,
        price: 'list',
        unlockWave: null,
        isNew: false,
      },
    ]);
    expect(() => buildSlots(sim.config.content.towers, ['nope'])).toThrow(/nope/);
    // A newly issued tower's slot wears the NEW pip (D061).
    const pips = buildSlots(sim.config.content.towers, sim.config.loadout, {}, [], ['dev_thumper']);
    expect(pips.map((s) => s.isNew)).toEqual([false, true]);
  });

  it('previews the next wave, then nothing after the last', () => {
    const sim = devSim();
    expect(wavePreview(sim.map, 0)).toEqual({
      number: 1,
      groups: [
        {
          enemy: 'dev_nibbler',
          label: 'Nibbler',
          icon: 'icon.enemy.nibbler',
          count: 6,
          air: false,
          neutral: false,
          fast: false,
          // No save on the dev battle: the Nibbler is new to it.
          isNew: true,
          spawn: null,
          newSpawn: false,
        },
      ],
    });
    expect(wavePreview(sim.map, 1)?.groups[0]?.count).toBe(10);
    expect(wavePreview(sim.map, 2)).toBeNull();
  });

  it("shows the sim's sell value: 70% of 180 is 126 (D021), not a floored 125", () => {
    const sim = devSim();
    sim.enqueue({ type: 'build', tile: [3, 1], tower: 'dev_rivet' });
    sim.applyPending();
    const uid = sim.state.towers.items.find((t) => t.alive)!.uid; // just built
    sim.enqueue({ type: 'upgrade', towerUid: uid }); // 100 + 80 invested
    sim.applyPending();
    const origin = mapOrigin(sim.map.cols, sim.map.rows, VIEW_W, VIEW_H);
    expect(selectedView(sim, uid, origin, null)).toMatchObject({
      sellValue: 180,
      fullRefund: true,
    });
    for (let i = 0; i < 600; i++) sim.step(); // past the misclick grace
    expect(selectedView(sim, uid, origin, null)).toMatchObject({
      sellValue: 126,
      fullRefund: false,
    });
  });

  it('announces what the keyboard cursor is on, and what Enter does there (T126)', () => {
    const sim = devSim();
    const at = (c: number, r: number): number => r * sim.map.cols + c;
    expect(cursorText(sim, -1, null, null)).toBeNull();
    expect(cursorText(sim, at(3, 1), null, null)).toBe('Pad, column 4, row 2, empty.');
    expect(cursorText(sim, at(3, 1), 'dev_rivet', null)).toBe(
      'Pad, column 4, row 2, empty. Enter builds Rivet.',
    );
    expect(cursorText(sim, at(1, 0), 'dev_rivet', null)).toBe('Path, column 2, row 1.');
    expect(cursorText(sim, at(1, 0), null, 'Orbital Strike')).toBe(
      'Path, column 2, row 1. Enter fires Orbital Strike here.',
    );
    sim.enqueue({ type: 'build', tile: [3, 1], tower: 'dev_rivet' });
    sim.applyPending();
    expect(cursorText(sim, at(3, 1), 'dev_rivet', null)).toBe(
      'Rivet tier 1, column 4, row 2. Enter selects it.',
    );
    const origin = mapOrigin(sim.map.cols, sim.map.rows, VIEW_W, VIEW_H);
    expect(towerPoints(sim, origin)).toHaveLength(1);
  });

  it('says what Hold fire did, for one turret or all (D059 announcements)', () => {
    expect(holdFireText(true, 'Rivet')).toBe('Rivet holding fire.');
    expect(holdFireText(false, 'Rivet')).toBe('Rivet firing again.');
    expect(holdFireText(true, null)).toBe('All turrets holding fire.');
    expect(holdFireText(false, null)).toBe('All turrets firing again.');
  });

  it('announces, and reads a repeat out again', () => {
    announce('Targeting: Last.');
    expect(hud.announce.value).toBe('Targeting: Last.');
    announce('Targeting: Last.');
    expect(hud.announce.value).not.toBe('Targeting: Last.');
    expect(hud.announce.value.trim()).toBe('Targeting: Last.');
  });

  it('counts the countdown down in whole seconds, rounded up, only while one runs', () => {
    expect(countdownSeconds('countdown', 1500)).toBe(25);
    expect(countdownSeconds('countdown', 1441)).toBe(25);
    expect(countdownSeconds('countdown', 1)).toBe(1);
    expect(countdownSeconds('spawning', 1500)).toBeNull();
    expect(countdownSeconds('setup', 0)).toBeNull();
  });

  it('describes the selected tower and reuses the view when nothing changed', () => {
    const sim = devSim();
    sim.enqueue({ type: 'build', tile: [3, 1], tower: 'dev_rivet' });
    sim.applyPending();
    const uid = sim.state.towers.items.find((t) => t.alive)!.uid; // just built
    const origin = mapOrigin(sim.map.cols, sim.map.rows, VIEW_W, VIEW_H);
    const v = selectedView(sim, uid, origin, null);
    expect(v).toMatchObject({
      uid,
      label: 'Rivet',
      tier: 1,
      maxTier: 3,
      upgradeCost: 80,
      sellValue: 100,
      fullRefund: true,
      priority: 'first',
    });
    expect(selectedView(sim, uid, origin, v)).toBe(v);
    expect(selectedView(sim, 0, origin, v)).toBeNull();
    expect(selectedView(sim, 999, origin, v)).toBeNull();
    sim.enqueue({ type: 'upgrade', towerUid: uid });
    sim.enqueue({ type: 'upgrade', towerUid: uid });
    sim.applyPending();
    expect(selectedView(sim, uid, origin, v)).toMatchObject({ tier: 3, upgradeCost: null });
  });

  it('keeps a slot armed after a build only while another is affordable', () => {
    expect(staysArmed('rivet', 'rivet', 100, 100)).toBe(true);
    expect(staysArmed('rivet', 'rivet', 99, 100)).toBe(false);
    expect(staysArmed('thumper', 'rivet', 500, 100)).toBe(false);
  });

  it('explains rejections the player caused, and stays quiet about the rest', () => {
    expect(rejectText('cantAfford')).toBe('Not enough credits');
    expect(rejectText('notImplemented')).toBe('Not online yet');
    expect(rejectText('mapEnded')).toBeNull();
    expect(rejectText('abilityOnCooldown')).toBe('Uplink recharging');
    expect(rejectText('invalidTarget')).toBe("Can't target there");
    expect(rejectText('noAbility')).toBe('No ability equipped');
    expect(rejectText('waveInProgress')).toBe('Wave in progress');
    expect(rejectText('noWavesLeft')).toBe('No waves left');
  });

  it('shows slot 1 on Q, and the companion slot on E only when the map has a companion', () => {
    const sim = devSim();
    const abilities = sim.config.content.abilities;
    expect(abilitySlots(sim.config)).toEqual([
      {
        slot: 1,
        ability: 'dev_strike',
        label: 'Dev Strike',
        icon: 'icon.ability.orbital_strike',
        key: 'Q',
        description: abilityDescription(abilities['dev_strike']!),
        aim: 'area',
        aimHint: 'Pick a target',
        wavesCooldown: false,
        absent: false,
        companion: null,
      },
      {
        slot: 2,
        ability: 'suppressing_fire',
        label: 'Suppressing Fire',
        icon: 'icon.ability.suppressing_fire',
        key: 'E',
        description: abilityDescription(abilities['suppressing_fire']!),
        aim: 'path',
        aimHint: 'Pick a stretch of path',
        wavesCooldown: false,
        absent: false,
        companion: companionView(sim.config.companion),
      },
    ]);
    const none = { slot1: null, slot2: null, slot2State: 'none' } as const;
    expect(abilitySlots({ ...sim.config, abilities: none })).toEqual([]);
    // A map's companion fills slot 2; with none, slot 2 is hidden, not empty (A1M1 has Bricks).
    const a1 = createSim(battleConfig('a1_m01', 1));
    expect(abilitySlots(a1.config).map((a) => a.slot)).toEqual(
      a1.config.companion === null ? [1] : [1, 2],
    );
    // An absent companion's slot shows, dark.
    const absent = { ...sim.config.abilities, slot2State: 'absent' } as const;
    expect(abilitySlots({ ...sim.config, abilities: absent })[1]?.absent).toBe(true);
    expect(() => abilitySlots({ ...sim.config, abilities: { ...none, slot1: 'nope' } })).toThrow(
      /nope/,
    );
  });

  it('describes and times abilities with their modified numbers (Mk II, Rapport)', () => {
    const sim = devSim();
    const modifiers = [
      { kind: 'abilityStat', ability: 'dev_strike', stat: 'radius', flat: 0.5, source: 'mk2' },
      {
        kind: 'abilityStat',
        ability: 'suppressing_fire',
        stat: 'cooldown',
        pct: -0.15,
        source: 'rapport',
      },
    ] as const;
    const cfg = { ...sim.config, modifiers };
    const [strike, suppress] = abilitySlots(cfg);
    expect(strike?.description).toBe('200 damage in a 2-tile radius after 1 s. Recharges 45 s.');
    expect(suppress?.description).toBe(
      'Slows 3 tiles of path 50% and deals 20 damage/s for 5 s. Recharges 42.5 s.',
    );
    expect(abilityCooldownTotals(cfg)).toEqual([2700, 2550]);
    expect(abilityCooldownTotals(sim.config)).toEqual([2700, 3000]);
  });

  it('shows a cooldown as whole seconds and a 1/16-step wipe, reusing unchanged views', () => {
    const ready = cooldownView(0, 2700, null);
    const plain = { wavesLeft: 0, free: false, charges: 0 };
    expect(ready).toEqual({ secondsLeft: 0, remaining: 0, ...plain });
    const full = cooldownView(2700, 2700, ready);
    expect(full).toEqual({ secondsLeft: 45, remaining: 1, ...plain });
    expect(cooldownView(2699, 2700, full)).toBe(full); // still 45 s and a full wipe
    expect(cooldownView(1350, 2700, full)).toEqual({ secondsLeft: 23, remaining: 0.5, ...plain });
    expect(cooldownView(1, 2700, null)).toEqual({ secondsLeft: 1, remaining: 1 / 16, ...plain });
    expect(cooldownView(0, 2700, ready)).toBe(ready);
  });

  it("says when a held-back tower ships (A1M1's Thumper at wave 3)", () => {
    const sim = createSim(battleConfig('a1_m01', 1));
    expect(towerUnlockWaves(sim.map)).toEqual({ thumper: 3 });
    const slots = buildSlots(
      sim.config.content.towers,
      sim.config.loadout,
      towerUnlockWaves(sim.map),
    );
    expect(slots.map((s) => s.unlockWave)).toEqual([null, 3]);
    expect(lockedText(slots[1]!)).toBe('Thumper ships at wave 3');
    expect(lockedText({ ...slots[1]!, unlockWave: null })).toBe('Thumper locked');
    // A1M1's Zoomer carries the fast tell, so the preview marks it.
    const zoomers = sim.map.waves.findIndex((w) => w.groups.some((g) => g.enemy.id === 'zoomer'));
    const preview = wavePreview(sim.map, zoomers);
    expect(preview?.groups.find((g) => g.enemy === 'zoomer')?.fast).toBe(true);
  });

  it('describes the Orbital Strike in one line (D026)', () => {
    const sim = createSim(battleConfig('a1_m01', 1));
    expect(abilityDescription(sim.config.content.abilities['orbital_strike']!)).toBe(
      '200 damage in a 1.5-tile radius after 1 s. Recharges 45 s.',
    );
  });

  it("writes the tower panel's stat line and upgrade delta from the sim's towerStats", () => {
    const sim = devSim();
    sim.enqueue({ type: 'build', tile: [3, 1], tower: 'dev_rivet' });
    sim.applyPending();
    const uid = sim.state.towers.items.find((t) => t.alive)!.uid; // just built
    const origin = mapOrigin(sim.map.cols, sim.map.rows, VIEW_W, VIEW_H);
    const v = selectedView(sim, uid, origin, null)!; // just built
    expect(v.stats).toMatch(/^\d+(\.\d+)? dmg · \d+(\.\d+)?\/s · range \d+(\.\d+)?$/);
    expect(v.upgradeDelta).not.toBeNull();
    expect(
      deltaText({
        tier: 2,
        cost: 80,
        damage: 3,
        ratePerSec: 0,
        rangeTiles: 0.5,
        splashTiles: 0,
        armorPierce: 0,
      }),
    ).toBe('+3 dmg · +0.5 range');
    expect(deltaText(null)).toBeNull();
    expect(
      statLineText({
        tier: 1,
        kind: 'hitscan',
        damageType: 'kinetic',
        damage: 8,
        ratePerSec: 2,
        rangeTiles: 3,
        minRangeTiles: 0,
        splashTiles: 0,
        armorPierce: 0,
        vsStatuses: [],
        vsStatusDamage: 8,
        next: null,
      }),
    ).toBe('8 dmg · 2/s · range 3');
  });

  it('pulses the call button when calling now pays, and Start once a tower stands', () => {
    expect(callPulses(0, null, 0, false)).toBe(false);
    expect(callPulses(0, null, 0, true)).toBe(true);
    expect(callPulses(2, 20, 0, true)).toBe(true);
    expect(callPulses(2, 20, 3, true)).toBe(false); // enemies still alive
    expect(callPulses(2, 5, 0, true)).toBe(false); // too little time left to matter
    expect(callPulses(2, null, 0, true)).toBe(false); // a wave is spawning
  });

  it('cycles targeting First → Last → Strong → Close → First', () => {
    expect(PRIORITY_CYCLE.map(nextPriority)).toEqual(['last', 'strong', 'close', 'first']);
  });
});

describe('the upgrade teach (D028)', () => {
  it("shows from W2's countdown until the first upgrade, while a tower stands and the map runs", () => {
    expect(UPGRADE_TEACH_WAVE).toBe(2);
    expect(upgradeHintShows(true, false, 1, true)).toBe(true);
    expect(upgradeHintShows(false, false, 1, true)).toBe(false); // W2's countdown not yet
    expect(upgradeHintShows(true, true, 1, true)).toBe(false); // upgraded once: done for good
    expect(upgradeHintShows(true, false, 0, true)).toBe(false); // nothing to upgrade
    expect(upgradeHintShows(true, false, 1, false)).toBe(false); // the map ended
  });
});

describe('cues on a timer also leave on sim time (T803b)', () => {
  it("keeps a cue through its beat at 3x, and drops it after a fast-forward's minute", () => {
    // At 3x, the 1.2 s banner's wall-clock span is 216 ticks: still up then.
    expect(cueStale(100, 100 + 216, WAVE_BANNER_MS)).toBe(false);
    expect(cueStale(100, 100 + 60 * 60, WAVE_BANNER_MS)).toBe(true);
    // The checkpoint chip (3 s) over the next wave, a fast-forward later.
    expect(cueStale(0, 540, CHECKPOINT_CUE_MS)).toBe(false);
    expect(cueStale(0, 60 * 20, CHECKPOINT_CUE_MS)).toBe(true);
  });
});
