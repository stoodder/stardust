import { describe, expect, it } from 'vitest';
import { TOWERS } from '../content/towers/index.ts';
import { CAMPAIGN } from '../content/campaign.ts';
import {
  DEV_SAVES,
  INTENDED,
  afterA2M4Results,
  afterA2M5Results,
} from './__fixtures__/devSaves.ts';
import { briefingGifts } from './storyTransactions.ts';
import { exportCode, importCode } from './codec.ts';
import { buy } from './purchase.ts';
import { LIVE_KNOWN_IDS, createNewSave } from './saveData.ts';
import { validateSave } from './validate.ts';

/** Whether campaign map `id` is registered yet. */
const isRegistered = (id: string): boolean => (CAMPAIGN as readonly string[]).includes(id);
/** A fresh copy of dev save `id`. */
const build = (id: keyof typeof DEV_SAVES) => DEV_SAVES[id].build();

/** The reference into A2M4 with a bank as A2M4's first clear might leave it (500 Stardust). */
function intoA2M4Results(): ReturnType<typeof createNewSave> {
  const save = DEV_SAVES.after_a2m3_ref.build();
  save.currencies.stardust = 500;
  return save;
}

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
    // Bought at Zibzab's: his arrival has played by then (not yet after A1M3: the shop just opened).
    expect(m4.story.seen).toContain('a1_m03_base_arrival');
    expect(DEV_SAVES.after_a1m3.build().story.seen).not.toContain('a1_m03_base_arrival');
    for (const id of ['after_a1m5', 'after_a2m3', 'all_unlocked'] as const) {
      expect(DEV_SAVES[id].build().story.seen).toContain('a1_m03_base_arrival');
    }
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

  it('after_a2m3_ref is the reference profile into A2M4: Zapcoil specs, Zapcoil and Rivet tune 2', () => {
    const m3 = DEV_SAVES.after_a2m3.build();
    const ref = DEV_SAVES.after_a2m3_ref.build();
    expect(ref.campaign.maps).toEqual(m3.campaign.maps);
    expect(ref.unlocks.specs).toEqual([...m3.unlocks.specs, 'zapcoil']);
    expect(ref.upgrades).toEqual({ ...m3.upgrades, tune_zapcoil: 2, tune_rivet: 2 });
    // Bought through the shop: 3 Intel for the Vrell specs, 80 + 80 Stardust for the ranks.
    expect(ref.currencies).toEqual({
      stardust: m3.currencies.stardust - 160,
      intel: m3.currencies.intel - 3,
    });
  });

  it('the A2M4–A2M6 saves follow the reference, and skip each map until it is registered', () => {
    const campaign: readonly string[] = CAMPAIGN;
    const m3 = DEV_SAVES.after_a2m3.build();
    const chain = [
      ['after_a2m4_returned', 'a2_m04'],
      ['after_a2m4_sold', 'a2_m04'],
      ['after_a2m5', 'a2_m05'],
      ['after_a2m6', 'a2_m06'],
    ] as const;
    for (const [id, map] of chain) {
      const save = DEV_SAVES[id].build();
      const maps: Partial<Record<string, unknown>> = save.campaign.maps;
      expect(maps[map] !== undefined, `${id}: ${map}`).toBe(campaign.includes(map));
      for (const m of Object.keys(save.campaign.maps)) expect(CAMPAIGN).toContain(m);
      // A skipped map takes its purchases with it, so with none of them built each is after_a2m3.
      if (!campaign.includes('a2_m04')) expect(save, id).toEqual(m3);
    }
    if (!campaign.includes('a2_m04')) return;
    // A2M4's Results: the Q3 Bonus paid, then C2 for the whole bank.
    const returned = DEV_SAVES.after_a2m4_returned.build();
    const sold = DEV_SAVES.after_a2m4_sold.build();
    for (const save of [returned, sold]) {
      expect(save.story.granted).toContain('q3_bonus');
      expect(save.currencies.stardust).toBe(0);
      expect(save.story.memosDelivered).toEqual(
        expect.arrayContaining(['memo_a2_04', 'memo_a2_05']),
      );
    }
    expect(returned.story.flags.stardust_choice).toBe('returned');
    expect(sold.story.flags.stardust_choice).toBe('sold');
    expect(sold.currencies.intel).toBeGreaterThanOrEqual(returned.currencies.intel + 3);
    expect(sold.currencies.intel).toBeLessThanOrEqual(returned.currencies.intel + 8);
  });

  it("applies A2M4's Results as the story transactions document them, before A2M4 is built", () => {
    const returned = afterA2M4Results(intoA2M4Results(), 'returned');
    expect(returned.currencies.stardust).toBe(0);
    expect(returned.currencies.intel).toBe(intoA2M4Results().currencies.intel);
    expect(returned.story.flags.stardust_choice).toBe('returned');
    expect(returned.story.granted).toContain('q3_bonus');
    expect(validateSave(returned).ok).toBe(true);
    // Sell: 900 banked (500 + the 400 bonus) is a windfall of 6 Intel.
    const sold = afterA2M4Results(intoA2M4Results(), 'sold');
    expect(sold.currencies).toEqual({ stardust: 0, intel: intoA2M4Results().currencies.intel + 6 });
    expect(sold.story.flags.stardust_choice).toBe('sold');
    expect(validateSave(sold).ok).toBe(true);
    // A2M5's gift waits for the Prism Spire to be registered.
    const gifted = afterA2M5Results(DEV_SAVES.after_a2m3_ref.build());
    const towers: readonly string[] = LIVE_KNOWN_IDS.towers;
    expect(gifted.story.granted.includes('gift_prism')).toBe(towers.includes('prism'));
    expect(validateSave(gifted).ok).toBe(true);
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

  describe('Act III part one: a save for every branch (T600b)', () => {
    it('takes C1 as named; the rest follows the reference until the maps land', () => {
      expect(build('after_a3m1_spared').story.flags.spared_quiet_wave).toBe(true);
      expect(build('after_a3m1_cleared').story.flags.spared_quiet_wave).toBe(false);
      // Act II is complete in every one of them.
      for (const id of ['after_a3m1_cleared', 'after_a3m2_rivet', 'after_a3m3_warren'] as const) {
        expect(build(id).campaign.maps.a2_m06?.completed, id).toBe(true);
      }
    });

    it.runIf(isRegistered('a3_m01'))(
      'A3M1: the Scuttle Den given in its briefing, the Hum Choir only if spared',
      () => {
        const spared = build('after_a3m1_spared');
        const cleared = build('after_a3m1_cleared');
        for (const save of [spared, cleared]) {
          expect(save.unlocks.towers).toContain('burrow');
          expect(save.story.seen).toContain('a3_m01_base_survey');
        }
        expect(spared.unlocks.towers).toContain('choir');
        expect(cleared.unlocks.towers).not.toContain('choir');
      },
    );

    it.runIf(isRegistered('a3_m02'))('A3M2: the class the Clean Exit took, and the uplink', () => {
      const rivet = build('after_a3m2_rivet');
      const thumper = build('after_a3m2_thumper');
      expect(rivet.unlocks.revokedTowers).toEqual(['rivet']);
      expect(thumper.unlocks.revokedTowers).toEqual(['thumper']);
      for (const save of [rivet, thumper]) {
        expect(save.unlocks.revokedAbilities).toEqual(['orbital_strike']);
        expect(save.unlocks.towers).toEqual(expect.arrayContaining(['harpoon', 'mindspike']));
      }
    });

    it.runIf(isRegistered('a3_m03'))('A3M3: the door Bricks held, and his {name} turret', () => {
      expect(build('after_a3m3_convoy').story.flags.door_choice).toBe('convoy');
      expect(build('after_a3m3_warren').story.flags.door_choice).toBe('warren');
      expect(build('after_a3m3_warren').story.memorialTower).toBe('burrow');
    });

    it("lets every save past A2M6 into the base: Act III's visit scenes count as seen once won", () => {
      expect(build('all_unlocked').story.seen.includes('a3_m04_base_night_shift')).toBe(true);
      const all = build('all_unlocked');
      expect(all.story.seen.includes('a3_m01_base_survey')).toBe(true);
    });
  });
});

describe('Act III part two: a save for every door and C4 answer (T700b)', () => {
  const A3M4 = [
    ['after_a3m4_keep', 'convoy', 'keep'],
    ['after_a3m4_purge', 'convoy', 'purge'],
    ['after_a3m4_rewrite', 'convoy', 'rewrite'],
    ['after_a3m4_keep_warren', 'warren', 'keep'],
    ['after_a3m4_purge_warren', 'warren', 'purge'],
    ['after_a3m4_rewrite_warren', 'warren', 'rewrite'],
  ] as const;

  it.runIf(!isRegistered('a3_m04'))('equal the save before A3M4 until it is registered', () => {
    for (const [id, door] of A3M4) expect(build(id), id).toEqual(build(`after_a3m3_${door}`));
    expect(build('after_a3m5_purge')).toEqual(build('after_a3m3_convoy'));
    expect(build('after_a3m6')).toEqual(build('after_a3m3_convoy'));
  });

  it.runIf(isRegistered('a3_m04'))(
    'A3M4: the jailbreak, the gifts, the mail, C4, Night Shift',
    () => {
      for (const [id, door, c4] of A3M4) {
        const save = build(id);
        expect(save.unlocks.revokedTowers, id).toEqual([]);
        expect(save.unlocks.jailbroken, id).toEqual(['rivet']);
        expect(save.unlocks.abilities, id).toEqual(
          expect.arrayContaining(['system_reboot', 'suppressing_fire']),
        );
        expect(save.unlocks.towers.includes('gloop'), id).toBe(door === 'warren');
        expect(save.unlocks.towers, id).toContain('choir');
        expect(save.story.flags.quill_choice, id).toBe(c4);
        expect(save.unlocks.abilities.includes('time_dilation'), id).toBe(c4 === 'keep');
        expect(save.story.seen, id).toContain('a3_m04_base_night_shift');
      }
      // The warren paid 300 for the jailbreak; the convoy's was free.
      expect(build('after_a3m4_keep').currencies.stardust).toBe(
        build('after_a3m4_keep_warren').currencies.stardust + 300,
      );
    },
  );

  it.runIf(isRegistered('a3_m05'))('A3M5: the Sproing Pad, the Bloom, Mindspike tune 1', () => {
    for (const id of ['after_a3m5_keep', 'after_a3m5_purge', 'after_a3m5_rewrite'] as const) {
      const save = build(id);
      expect(save.unlocks.towers, id).toEqual(expect.arrayContaining(['sproing', 'bloom']));
      expect(save.upgrades.tune_mindspike, id).toBe(1);
    }
  });

  it.runIf(isRegistered('a3_m06'))("A3M6: the convoy's Gloop, the crate, Waykeeper", () => {
    const save = build('after_a3m6');
    expect(save.unlocks.towers).toContain('gloop');
    expect(save.story.granted).toContain('crate');
    expect(save.upgrades).toMatchObject({ tune_harpoon: 3, tune_zapcoil: 3, tune_lookout: 3 });
    expect(save.profile?.callsign).toBe('waykeeper');
  });

  describe("the stand-ins for T710's transactions (applied by hand until it lands)", () => {
    it.runIf(isRegistered('a3_m03'))(
      'the jailbreak brings the revoked class back, free under the convoy',
      () => {
        for (const door of ['convoy', 'warren'] as const) {
          const before = build(`after_a3m3_${door}`);
          const after = INTENDED.jailbreak(before);
          expect(after.unlocks.revokedTowers).toEqual([]);
          expect(after.unlocks.jailbroken).toEqual(['rivet']);
          expect(after.unlocks.towers).toEqual(before.unlocks.towers);
          expect(before.currencies.stardust - after.currencies.stardust).toBe(
            door === 'convoy' ? 0 : 300,
          );
          expect(validateSave(after).ok).toBe(true);
        }
      },
    );

    it('the mail, C4 and the crate make what their tables say, and validate', () => {
      const base = build('after_a3m3_convoy');
      const mailed = INTENDED.inherit('suppressing_fire')(base);
      expect(mailed.unlocks.inheritedAbilities).toEqual(['suppressing_fire']);
      expect(mailed.unlocks.abilities).toContain('suppressing_fire');
      for (const c4 of ['keep', 'purge', 'rewrite'] as const) {
        const answered = INTENDED.c4(c4)(mailed);
        expect(answered.story.flags.quill_choice).toBe(c4);
        expect(answered.unlocks.inheritedAbilities).toEqual(
          c4 === 'keep' ? ['suppressing_fire', 'time_dilation'] : ['suppressing_fire'],
        );
        expect(validateSave(answered).ok).toBe(true);
      }
      // The crate over the reference into A3M6 (its Vrell towers' tune-ups to the top).
      const briefed = briefingGifts(mailed, 'a3_m06').save;
      const crated = INTENDED.crate(briefed);
      expect(crated.story.granted).toContain('crate');
      for (const t of ['zapcoil', 'lookout', 'harpoon'] as const) {
        if (briefed.unlocks.towers.includes(t)) expect(crated.upgrades[`tune_${t}`]).toBe(3);
      }
      expect(validateSave(crated).ok).toBe(true);
    });
  });
});
