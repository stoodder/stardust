import { describe, expect, it } from 'vitest';
import { TOWERS } from '../content/towers/index.ts';
import { CAMPAIGN } from '../content/campaign.ts';
import { DEV_SAVES } from './__fixtures__/devSaves.ts';
import { exportCode, importCode } from './codec.ts';
import { buy } from './purchase.ts';
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

  it('after_a1m5_ref is the reference profile into A2M1: C1 cleared, the Lookout once stocked', () => {
    const ref = DEV_SAVES.after_a1m5_ref.build();
    const m5 = DEV_SAVES.after_a1m5.build();
    expect(ref.story.flags.spared_quiet_wave).toBe(false);
    expect(ref.campaign.maps).toEqual(m5.campaign.maps);
    expect(ref.upgrades).toEqual(m5.upgrades);
    expect(ref.unlocks.specs).toEqual(['thumper']);
    // The license is on the shelf since T406 lifted the Lookout's stub gate (meta/purchase.ts).
    expect(buy(m5, { kind: 'license', tower: 'lookout' }).ok).toBe(true);
    expect(ref.unlocks.towers).toEqual([...m5.unlocks.towers, 'lookout']);
    expect(ref.currencies.stardust).toBe(m5.currencies.stardust - 150);
    expect(ref.profile?.callsign).toBe('sprout');
    expect(ref.story.bricksTagIndex).toBe(2);
  });

  it('the Act II saves win only registered Act II maps, each with its reference purchases', () => {
    // Widened: the Act II maps join CAMPAIGN (and MapId) as they're registered.
    const campaign: readonly string[] = CAMPAIGN;
    const ref = DEV_SAVES.after_a1m5_ref.build();
    const chain = [
      ['after_a2m1', 'a2_m01'],
      ['after_a2m2', 'a2_m02'],
      ['after_a2m3', 'a2_m03'],
    ] as const;
    let prev = ref;
    for (const [id, map] of chain) {
      const save = DEV_SAVES[id].build();
      for (const m of Object.keys(save.campaign.maps)) expect(CAMPAIGN).toContain(m);
      const registered = campaign.includes(map);
      const maps: Partial<Record<string, unknown>> = save.campaign.maps;
      expect(maps[map] !== undefined, `${id}: ${map}`).toBe(registered);
      if (!registered) expect(save, id).toEqual(prev);
      expect(save.story.flags.spared_quiet_wave).toBe(false);
      expect(save.story.memosRead.every((m) => save.story.memosDelivered.includes(m))).toBe(true);
      prev = save;
    }
    const m2 = DEV_SAVES.after_a2m2.build();
    if (campaign.includes('a2_m02')) {
      expect(m2.profile?.callsign).toBe('thorn');
      expect(m2.upgrades).toMatchObject({ seed_money: 1, tune_zapcoil: 1 });
    }
    const m3 = DEV_SAVES.after_a2m3.build();
    if (campaign.includes('a2_m03')) {
      expect(m3.upgrades.tune_sprinkler).toBe(2);
      expect(m3.story.flags.held_fire_second_look).toBe(false);
      expect(m3.story.bricksTagIndex).toBe(4);
    }
  });

  it('all_unlocked owns every registered tower, built spec, and ability, and wins every map', () => {
    const save = DEV_SAVES.all_unlocked.build();
    expect(save.unlocks.towers).toEqual(LIVE_KNOWN_IDS.towers);
    // Every spec unlock Engineering sells: none for specs that ship later (T319).
    expect(save.unlocks.specs).toEqual(
      LIVE_KNOWN_IDS.towers.filter((t) => TOWERS[t as keyof typeof TOWERS].specs !== undefined),
    );
    expect(save.unlocks.specs).toContain('sprinkler');
    // The Skyhook's and Zapcoil's specs are built (T407b), so their unlocks are owned too.
    expect(save.unlocks.specs).toContain('skyhook');
    expect(save.unlocks.specs).toContain('zapcoil');
    expect(save.unlocks.abilities).toEqual(LIVE_KNOWN_IDS.abilities);
    expect(save.unlocks.protocols).toEqual(LIVE_KNOWN_IDS.protocols);
    expect(Object.keys(save.upgrades).toSorted()).toEqual(
      Object.keys(LIVE_KNOWN_IDS.upgradeRanks).toSorted(),
    );
    for (const map of CAMPAIGN) expect(save.campaign.maps[map]?.medals).toHaveLength(3);
    // The story caught up to the wins: the intake done and every memo due delivered and read.
    expect(save.profile?.name).toBe('Dev Tech');
    expect(save.story.flags.arrival_reason).toBe('lettuce');
    expect(save.story.memosDelivered.length).toBeGreaterThan(1);
    expect(save.story.memosRead).toEqual(save.story.memosDelivered);
    expect(save.story.bricksTagIndex).toBeGreaterThanOrEqual(2);
  });
});
