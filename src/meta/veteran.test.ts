// Veteran replays (T860; design/progression.md § 6): the offer rules, the save record, the payout
// and the Veteran medal at run end, and the record through an export code. Each modifier in a real
// run (a test per modifier) is app/veteranRun.test.ts (it builds the battle's config).
import { describe, expect, it } from 'vitest';
import { MAPS } from '../content/maps/index.ts';
import { DEV_SAVES } from './__fixtures__/devSaves.ts';
import { exportCode, importCode } from './codec.ts';
import { REWARD_RULES } from './rewards.ts';
import { runEnd, type RunEndInput } from './runEnd.ts';
import type { SaveData } from './saveData.ts';
import { validateSave } from './validate.ts';
import {
  activeVeteranMods,
  campaignMedalCount,
  earnsVeteranMedal,
  GLASS_CORE_INTEGRITY,
  hasVeteranMedal,
  SHORT_HANDED_MAX,
  VETERAN_COPY,
  VETERAN_MEDAL_ID,
  VETERAN_MODIFIER_IDS,
  veteranBonusPct,
  veteranConfig,
  veteranModsOf,
  veteranOffers,
  veteranRecord,
  withVeteranPick,
  type VeteranModifierId,
} from './veteran.ts';

/** A save with Act II won: protocols owned and equipped, more than three tower types. */
const actTwo = (): SaveData => DEV_SAVES.after_a2m6.build();
/** Rig Nine (a defend map with a core), won in `actTwo`. */
const RIG = 'a2_m01';

describe('veteran offers (unlock on Victory; only what bites)', () => {
  it('offers nothing before the map is won, and all eight in table order after', () => {
    const save = actTwo();
    expect(veteranOffers(save, MAPS.a3_m01)).toEqual([]);
    const offers = veteranOffers(save, MAPS[RIG]);
    expect(offers.map((o) => o.id)).toEqual([...VETERAN_MODIFIER_IDS]);
    expect(offers.every((o) => o.available && o.why === null)).toBe(true);
  });

  it('dims Glass Core with no core, Short-Handed with 3 towers or fewer, No Protocols with none', () => {
    const escort = DEV_SAVES.after_a3m1_spared.build();
    const glass = veteranOffers(escort, MAPS.a3_m01).find((o) => o.id === 'glass_core')!;
    expect(glass).toEqual({ id: 'glass_core', available: false, why: 'No core on this shift' });
    const early = DEV_SAVES.after_a1m1.build();
    const a1 = veteranOffers(early, MAPS.a1_m01);
    expect(early.unlocks.towers.length).toBeLessThanOrEqual(SHORT_HANDED_MAX);
    expect(a1.find((o) => o.id === 'short_handed')?.available).toBe(false);
    expect(a1.find((o) => o.id === 'no_protocols')?.why).toBe('No Field Protocols owned');
    // Radio Silence bites with an ability in slot 1 (Orbital Strike from the start).
    expect(a1.find((o) => o.id === 'radio_silence')?.available).toBe(true);
  });

  it('applies only the picks that bite (a dimmed pick stays on file, unapplied)', () => {
    const early = withVeteranPick(DEV_SAVES.after_a1m1.build(), 'a1_m01', [
      'short_handed',
      'rush_hour',
    ]);
    expect(veteranRecord(early, 'a1_m01')?.mods).toEqual(['short_handed', 'rush_hour']);
    expect(activeVeteranMods(early, MAPS.a1_m01)).toEqual(['rush_hour']);
  });

  it('has copy for every modifier: a short line, the effect, and a quip', () => {
    for (const id of VETERAN_MODIFIER_IDS) {
      const c = VETERAN_COPY[id];
      expect(c.short.length, id).toBeLessThanOrEqual(16);
      expect(c.effect.length, id).toBeGreaterThan(0);
      expect(c.quip, id).toMatch(/\.$/);
      expect(c.quip, id).not.toMatch(/!/);
    }
  });
});

describe('the veteran record', () => {
  it('keeps the picks in table order, each once, and the best bonus', () => {
    const save = withVeteranPick(actTwo(), RIG, ['rush_hour', 'glass_core', 'rush_hour']);
    expect(save.veteran?.[RIG]).toEqual({ mods: ['glass_core', 'rush_hour'], best: 0 });
    expect(validateSave(save).ok).toBe(true);
    // No change: the same object.
    expect(withVeteranPick(save, RIG, ['glass_core', 'rush_hour'])).toBe(save);
    // Nothing picked on a map with no record: no record.
    const none = actTwo();
    expect(withVeteranPick(none, RIG, [])).toBe(none);
  });

  it('refuses a map not won (the picker shows only on a replay)', () => {
    expect(() => withVeteranPick(actTwo(), 'a3_m01', ['rush_hour'])).toThrow(/not won/);
  });
});

describe('run end: the replay bonus, the Veteran medal, the best', () => {
  const won = (mods: readonly VeteranModifierId[], extra: Partial<RunEndInput> = {}) => {
    const save = withVeteranPick(actTwo(), RIG, mods);
    const input: RunEndInput = {
      mapId: RIG,
      outcome: 'won',
      mapStardust: 200,
      waveCount: 10,
      wavesResolved: 10,
      earnedMedals: ['victory'],
      skitterkinKilled: 0,
      meter: 10,
      veteranMods: mods,
      ...extra,
    };
    return { before: save, ...runEnd(save, input) };
  };

  it('pays 0.4 × stardust × (1 + Σ bonus) on a replay (progression.md § 6 example: +120%)', () => {
    const mods = ['hardened_hides', 'glass_core', 'short_handed'] as const;
    expect(veteranBonusPct(mods)).toBe(120);
    const r = won(mods);
    expect(r.summary.stardust.source).toBe('replay');
    expect(r.summary.stardust.amount).toBe(Math.round(REWARD_RULES.replayShare * 200 * 2.2));
  });

  it('earns the Veteran medal at +100% or more (+1 Intel, once) and records the best', () => {
    const mods = ['hardened_hides', 'lean_budget', 'glass_core'] as const; // 110%, table order
    expect(earnsVeteranMedal(mods)).toBe(true);
    const r = won(mods);
    const medal = r.summary.medals.find((m) => m.id === VETERAN_MEDAL_ID);
    expect(medal).toEqual({ id: VETERAN_MEDAL_ID, isNew: true, intel: 1 });
    expect(r.save.currencies.intel - r.before.currencies.intel).toBe(r.summary.intel);
    expect(hasVeteranMedal(r.save.campaign.maps[RIG]!.medals)).toBe(true);
    expect(campaignMedalCount(r.save.campaign.maps[RIG]!.medals)).toBeLessThanOrEqual(3);
    expect(r.save.veteran?.[RIG]).toEqual({ mods: [...mods], best: 110 });
    expect(validateSave(r.save).ok).toBe(true);
    // Again: on file, no more Intel; a smaller bonus never lowers the best.
    const again = runEnd(withVeteranPick(r.save, RIG, ['rush_hour']), {
      mapId: RIG,
      outcome: 'won',
      mapStardust: 200,
      waveCount: 10,
      wavesResolved: 10,
      earnedMedals: ['victory'],
      skitterkinKilled: 0,
      meter: 10,
      veteranMods: ['rush_hour'],
    });
    expect(again.summary.medals.find((m) => m.id === VETERAN_MEDAL_ID)).toBeUndefined();
    expect(again.save.veteran?.[RIG]).toEqual({ mods: ['rush_hour'], best: 110 });
  });

  it('no medal under +100%, nor after a checkpoint retry (it pays the bonus still)', () => {
    const under = won(['hardened_hides', 'rush_hour']);
    expect(under.summary.medals.some((m) => m.id === VETERAN_MEDAL_ID)).toBe(false);
    const all = ['hardened_hides', 'glass_core', 'short_handed'] as const;
    const retried = won(all, { usedCheckpoint: true, resumedFromWave: 5 });
    expect(retried.summary.medals.some((m) => m.id === VETERAN_MEDAL_ID)).toBe(false);
    expect(retried.summary.stardust.amount).toBe(Math.round(0.4 * 200 * 2.2));
  });

  it('ignores mods on a first clear or a loss', () => {
    const first = runEnd(DEV_SAVES.after_a2m6.build(), {
      mapId: 'a3_m01',
      outcome: 'won',
      mapStardust: 300,
      waveCount: 10,
      wavesResolved: 10,
      earnedMedals: ['victory'],
      skitterkinKilled: 0,
      meter: 10,
      veteranMods: ['glass_core', 'short_handed', 'hardened_hides'],
    });
    expect(first.summary.stardust).toMatchObject({ source: 'first_clear', amount: 300 });
    expect(first.summary.medals.some((m) => m.id === VETERAN_MEDAL_ID)).toBe(false);
    expect(first.save.veteran?.a3_m01).toBeUndefined();
    const lost = won(['glass_core', 'short_handed', 'hardened_hides'], { outcome: 'lost' });
    expect(lost.summary.stardust.amount).toBe(0);
    expect(lost.save.veteran?.[RIG]?.best).toBe(0);
  });

  it('the record and the medal survive an export code round trip', async () => {
    const r = won(['hardened_hides', 'glass_core', 'short_handed']);
    const back = await importCode(await exportCode(r.save, 0));
    expect(back).toMatchObject({ ok: true, save: { veteran: r.save.veteran } });
    if (back.ok) expect(back.save.campaign.maps[RIG]!.medals).toContain(VETERAN_MEDAL_ID);
  });
});
