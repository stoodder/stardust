import { describe, expect, it } from 'vitest';
import { CAMPAIGN } from '../content/campaign.ts';
import { DEV_SAVES } from './__fixtures__/devSaves.ts';
import { exportCode, importCode } from './codec.ts';
import { LIVE_KNOWN_IDS, createNewSave } from './saveData.ts';
import { validateSave } from './validate.ts';

describe('dev saves (the ?save= fixtures)', () => {
  it.each(Object.entries(DEV_SAVES))(
    '%s is valid and survives a code round trip',
    async (_, dev) => {
      const save = dev.build();
      expect(validateSave(save)).toEqual({ ok: true, value: save });
      expect(await importCode(await exportCode(save, 0))).toMatchObject({ ok: true, save });
      expect(dev.build()).not.toBe(save);
    },
  );

  it('fresh is a new save', () => {
    expect(DEV_SAVES.fresh.build()).toEqual(createNewSave());
  });

  it('after_a1m1 has A1M1 won with 3 Intel', () => {
    const save = DEV_SAVES.after_a1m1.build();
    expect(save.campaign.maps.a1_m01).toMatchObject({ completed: true });
    expect(save.campaign.maps.a1_m01?.medals).toHaveLength(3);
    expect(save.currencies).toEqual({ stardust: 0, intel: 3 });
  });

  it('mid_m2 owns Mk II and has the first two campaign maps won', () => {
    const save = DEV_SAVES.mid_m2.build();
    expect(save.upgrades).toEqual({ orbital_strike_mk2: 1 });
    for (const map of CAMPAIGN.slice(0, 2)) expect(save.campaign.maps[map]?.completed).toBe(true);
  });

  it.each(['after_a1m3', 'after_a1m4', 'after_a1m5'] as const)(
    '%s has been through the intake and wins only registered Act I maps',
    (id) => {
      const save = DEV_SAVES[id].build();
      expect(save.profile).toEqual({ name: 'Dev Tech', pronouns: 'they', callsign: 'sprout' });
      expect(save.story.flags.arrival_reason).toBe('lettuce');
      for (const map of Object.keys(save.campaign.maps)) expect(CAMPAIGN).toContain(map);
      expect(save.campaign.seenEnemies).toEqual(expect.arrayContaining(['nibbler', 'zoomer']));
      expect(save.story.memosRead.every((m) => save.story.memosDelivered.includes(m))).toBe(true);
    },
  );

  it('the Act I saves follow the reference profile (campaign.md § 4.9)', () => {
    expect(DEV_SAVES.after_a1m3.build().loadouts.protocols).toEqual([]);
    const m4 = DEV_SAVES.after_a1m4.build();
    expect(m4.loadouts.protocols).toEqual(['head_start']);
    expect(m4.upgrades).toMatchObject({ tune_rivet: 1, tune_thumper: 1 });
    expect(m4.story.bricksTagIndex).toBe(1);
    const m5 = DEV_SAVES.after_a1m5.build();
    expect(m5.unlocks.specs).toEqual(['thumper']);
    expect(m5.story.flags.spared_quiet_wave).toBe(true);
    expect(m5.story.bricksTagIndex).toBe(2);
  });

  it('all_unlocked owns every registered tower, spec, and ability, and wins every map', () => {
    const save = DEV_SAVES.all_unlocked.build();
    expect(save.unlocks.towers).toEqual(LIVE_KNOWN_IDS.towers);
    expect(save.unlocks.specs).toEqual(LIVE_KNOWN_IDS.towers);
    expect(save.unlocks.abilities).toEqual(LIVE_KNOWN_IDS.abilities);
    expect(save.unlocks.protocols).toEqual(LIVE_KNOWN_IDS.protocols);
    expect(Object.keys(save.upgrades).toSorted()).toEqual(
      Object.keys(LIVE_KNOWN_IDS.upgradeRanks).toSorted(),
    );
    for (const map of CAMPAIGN) expect(save.campaign.maps[map]?.medals).toHaveLength(3);
  });
});
