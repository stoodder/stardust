import { describe, expect, it } from 'vitest';
import { mapOrigin } from '../render/iso.ts';
import { VIEW_H, VIEW_W } from '../render/scale.ts';
import { createSim } from '../sim/index.ts';
import { battleConfig } from './battleSetup.ts';
import { nextPriority, PRIORITY_CYCLE } from './commands.ts';
import {
  abilitySlots,
  buildSlots,
  cooldownView,
  displayName,
  meterLabelText,
  rejectText,
  selectedView,
  sellValue,
  staysArmed,
  wavePreview,
} from './hud.ts';

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
      { tower: 'dev_rivet', label: 'Rivet', icon: 'icon.tower.rivet', cost: 100 },
      { tower: 'dev_thumper', label: 'Thumper', icon: 'icon.tower.thumper', cost: 125 },
    ]);
    expect(() => buildSlots(sim.config.content.towers, ['nope'])).toThrow(/nope/);
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
        },
      ],
    });
    expect(wavePreview(sim.map, 1)?.groups[0]?.count).toBe(10);
    expect(wavePreview(sim.map, 2)).toBeNull();
  });

  it('values a sell at 70% (rounded down), or 100% inside the misclick grace', () => {
    const t = { invested: 255, builtTick: 0, firstFiredTick: -1 };
    expect(sellValue(t, 599)).toEqual({ value: 255, full: true });
    expect(sellValue(t, 600)).toEqual({ value: 178, full: false });
    expect(sellValue({ ...t, firstFiredTick: 30 }, 60)).toEqual({ value: 178, full: false });
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
    expect(rejectText('abilityOnCooldown')).toBe('Recharging');
    expect(rejectText('invalidTarget')).toBe("Can't target there");
    expect(rejectText('noAbility')).toBe('No ability equipped');
    expect(rejectText('waveInProgress')).toBe('Wave in progress');
    expect(rejectText('noWavesLeft')).toBe('No waves left');
  });

  it('shows the equipped Technician ability in slot 1, on Q', () => {
    const sim = devSim();
    expect(abilitySlots(sim.config.content.abilities, sim.config.abilities.slot1)).toEqual([
      {
        slot: 1,
        ability: 'dev_strike',
        label: 'Dev Strike',
        icon: 'icon.ability.orbital_strike',
        key: 'Q',
      },
    ]);
    expect(abilitySlots(sim.config.content.abilities, null)).toEqual([]);
    expect(() => abilitySlots(sim.config.content.abilities, 'nope')).toThrow(/nope/);
  });

  it('shows a cooldown as whole seconds and a 1/16-step wipe, reusing unchanged views', () => {
    const ready = cooldownView(0, 2700, null);
    expect(ready).toEqual({ secondsLeft: 0, remaining: 0 });
    const full = cooldownView(2700, 2700, ready);
    expect(full).toEqual({ secondsLeft: 45, remaining: 1 });
    expect(cooldownView(2699, 2700, full)).toBe(full); // still 45 s and a full wipe
    expect(cooldownView(1350, 2700, full)).toEqual({ secondsLeft: 23, remaining: 0.5 });
    expect(cooldownView(1, 2700, null)).toEqual({ secondsLeft: 1, remaining: 1 / 16 });
    expect(cooldownView(0, 2700, ready)).toBe(ready);
  });

  it('cycles targeting First → Last → Strong → Close → First', () => {
    expect(PRIORITY_CYCLE.map(nextPriority)).toEqual(['last', 'strong', 'close', 'first']);
  });
});
