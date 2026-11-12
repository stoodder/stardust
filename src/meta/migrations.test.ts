import { describe, expect, it } from 'vitest';
import saveV0 from './__fixtures__/save.v0.json' with { type: 'json' };
import saveV1 from './__fixtures__/save.v1.json' with { type: 'json' };
import saveV2 from './__fixtures__/save.v2.json' with { type: 'json' };
import saveV3 from './__fixtures__/save.v3.json' with { type: 'json' };
import { migrate, migrations } from './migrations.ts';
import { FIRST_PAYDAY_SEEN_ID, runEnd, type RunEndInput } from './runEnd.ts';
import { decodeEnvelope, serializeSave } from './save.ts';
import { SAVE_VERSION, createNewSave } from './saveData.ts';

/** A deep copy of JSON data. */
function clone<T>(x: T): T {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- JSON round trip of a T
  return JSON.parse(JSON.stringify(x)) as T;
}

/** A won A1M2 run (130 Stardust, first clear). */
const PAYING_WIN: RunEndInput = {
  mapId: 'a1_m02',
  outcome: 'won',
  mapStardust: 130,
  waveCount: 8,
  wavesResolved: 8,
  earnedMedals: [],
  skitterkinKilled: 0,
  meter: 20,
};

/** One fixture per schema version ever written (meta-runtime.md § Versioning and migrations). */
const FIXTURES: Readonly<Record<number, unknown>> = { 0: saveV0, 1: saveV1, 2: saveV2, 3: saveV3 };

describe('save migrations', () => {
  it('has a fixture for every version up to the current one', () => {
    expect(Object.keys(FIXTURES).map(Number)).toEqual(
      Array.from({ length: SAVE_VERSION + 1 }, (_, v) => v),
    );
  });

  it('has a migration from every older version', () => {
    for (let v = 0; v < SAVE_VERSION; v++) expect(migrations[v]).toBeTypeOf('function');
    expect(migrations[SAVE_VERSION]).toBeUndefined();
  });

  it.each(Object.entries(FIXTURES))(
    'migrates fixture v%s to current and validates it',
    (v, fixture) => {
      const decoded = decodeEnvelope(fixture);
      expect(decoded.ok ? null : decoded.problem).toBeNull();
      if (!decoded.ok) return;
      expect(decoded.envelope.v).toBe(SAVE_VERSION);
      expect(decoded.migratedFrom).toBe(Number(v) === SAVE_VERSION ? null : Number(v));
    },
  );

  it('v0 → v1 (→ v2) adds empty stats and Standard difficulty and keeps everything else', () => {
    const decoded = decodeEnvelope(saveV0);
    if (!decoded.ok) throw new Error(decoded.problem.message);
    expect(decoded.envelope.data.stats).toEqual({ pestsProcessed: 0, runs: 0 });
    expect(decoded.envelope.data.settings).toEqual({ difficulty: 'standard' });
    expect(decoded.envelope.data.unlocks.protocols).toEqual([]);
    expect(decoded.envelope.data.loadouts).toEqual({
      last: null,
      byMap: {},
      protocols: [],
      protocolPicks: {},
    });
    expect(decoded.envelope.data.campaign.maps.a1_m01?.medals).toEqual(['victory']);
    expect(decoded.envelope.savedAt).toBe(saveV0.savedAt);
  });

  it('v1 → v2 keeps the M2 save, leaves the profile for the intake, and seeds seen enemies', () => {
    const decoded = decodeEnvelope(saveV1);
    if (!decoded.ok) throw new Error(decoded.problem.message);
    const data = decoded.envelope.data;
    expect(decoded.migratedFrom).toBe(1);
    expect(data.profile).toBeNull();
    // saveV1 has played A1M1 only.
    expect(data.campaign.seenEnemies).toEqual(['nibbler', 'zoomer']);
    expect(data.loadouts.protocols).toEqual([]);
    expect(data.loadouts.protocolPicks).toEqual({});
    expect(data.loadouts.last).toEqual(saveV1.data.loadouts.last);
    expect(data.seenHints).toEqual([]);
    expect(data.unlocks).toEqual(saveV1.data.unlocks);
    expect(data.story).toEqual(saveV1.data.story);
    expect(data.currencies).toEqual(saveV1.data.currencies);
    expect(data.settings).toEqual({ difficulty: 'story' });
  });

  it('v1 → v2 seeds both M2 maps once each, and keeps hints already seen', () => {
    const v1 = clone(saveV1);
    const maps: Record<string, unknown> = v1.data.campaign.maps;
    maps['a1_m02'] = { completed: true, medals: ['victory'], bestMeter: 20 };
    const data: Record<string, unknown> = v1.data;
    data['seenHints'] = ['upgrade'];
    const decoded = decodeEnvelope(v1);
    if (!decoded.ok) throw new Error(decoded.problem.message);
    expect(decoded.envelope.data.campaign.seenEnemies).toEqual([
      'nibbler',
      'zoomer',
      'chonk',
      'hauler',
    ]);
    expect(decoded.envelope.data.seenHints).toEqual(['upgrade']);
  });

  it('v1 → v2 on a fresh M2 save gives a valid v2 new save', () => {
    const v1: Record<string, unknown> = { ...clone(createNewSave()) };
    v1['campaign'] = { maps: {} };
    v1['loadouts'] = { last: null, byMap: {} };
    delete v1['seenHints'];
    const decoded = decodeEnvelope({ v: 1, savedAt: 0, data: v1 });
    if (!decoded.ok) throw new Error(decoded.problem.message);
    expect(decoded.envelope.data).toEqual(createNewSave());
  });

  it('v2 → v3 files the form of address each pronoun set stood for (D163)', () => {
    const v2 = decodeEnvelope(saveV2);
    if (!v2.ok) throw new Error(v2.problem.message);
    expect(v2.migratedFrom).toBe(2);
    expect(v2.envelope.data.profile).toEqual({
      name: "Jo O'Neil-Park",
      address: 'tech',
      pronouns: 'they',
      callsign: 'sprout',
    });
    for (const [pronouns, address] of [
      ['he', 'mr'],
      ['she', 'ms'],
      ['they', 'tech'],
    ] as const) {
      const old = clone(saveV2);
      old.data.profile.pronouns = pronouns;
      const decoded = decodeEnvelope(old);
      if (!decoded.ok) throw new Error(decoded.problem.message);
      expect(decoded.envelope.data.profile).toMatchObject({ address, pronouns });
    }
    // A null profile stays null: the intake still runs on Continue.
    const blank: { data: Record<string, unknown> } = clone(saveV2);
    blank.data['profile'] = null;
    const decoded = decodeEnvelope(blank);
    if (!decoded.ok) throw new Error(decoded.problem.message);
    expect(decoded.envelope.data.profile).toBeNull();
    // Everything else carries over as it was.
    expect(migrations[2]?.({ profile: 'x' })).toEqual({ profile: 'x' });
    expect(migrations[2]?.({ profile: { pronouns: 'xe' } })).toEqual({
      profile: { pronouns: 'xe' },
    });
  });

  it('v3 keeps the honorific picked (Mrs. and Dr. share their sets with Ms. and Tech.)', () => {
    const decoded = decodeEnvelope(saveV3);
    if (!decoded.ok) throw new Error(decoded.problem.message);
    expect(decoded.migratedFrom).toBeNull();
    expect(decoded.envelope.data.profile).toEqual(saveV3.data.profile);
    expect(decoded.envelope.data.profile?.address).toBe('dr');
  });

  it('marks the first payday on a save from before its id that has won a paying map (D098)', () => {
    // saveV2 predates FIRST_PAYDAY_SEEN_ID and has won A1M2 (130 Stardust): its payday was shown.
    expect(saveV2.data.story.seen).not.toContain(FIRST_PAYDAY_SEEN_ID);
    const v2 = decodeEnvelope(saveV2);
    if (!v2.ok) throw new Error(v2.problem.message);
    expect(v2.envelope.data.story.seen).toEqual([...saveV2.data.story.seen, FIRST_PAYDAY_SEEN_ID]);
    expect(runEnd(v2.envelope.data, PAYING_WIN).summary.firstPayday).toBe(false);
    // Idempotent: a save that has the id keeps exactly one.
    const again = decodeEnvelope(JSON.parse(serializeSave(v2.envelope.data, 0)));
    if (!again.ok) throw new Error(again.problem.message);
    expect(again.envelope.data.story.seen.filter((id) => id === FIRST_PAYDAY_SEEN_ID)).toHaveLength(
      1,
    );
    // A1M1 pays no Stardust, so saveV1 (A1M1 only) still has its payday ahead.
    const v1 = decodeEnvelope(saveV1);
    if (!v1.ok) throw new Error(v1.problem.message);
    expect(v1.envelope.data.story.seen).not.toContain(FIRST_PAYDAY_SEEN_ID);
    expect(runEnd(v1.envelope.data, PAYING_WIN).summary.firstPayday).toBe(true);
  });

  it('never reads the bank: a defeat stipend alone leaves the first payday ahead (D097)', () => {
    const stipend = clone(saveV2);
    const maps: Record<string, unknown> = stipend.data.campaign.maps;
    delete maps['a1_m02']; // A1M1 (0 Stardust) won, A1M2 lost: the bank holds stipends only
    stipend.data.currencies.stardust = 40;
    const decoded = decodeEnvelope(stipend);
    if (!decoded.ok) throw new Error(decoded.problem.message);
    expect(decoded.envelope.data.story.seen).toEqual(saveV2.data.story.seen);
  });

  it('passes unrecognized shapes through for validation to reject', () => {
    expect(migrate(0, 'not a save')).toEqual({ ok: true, data: 'not a save', from: 0 });
    expect(migrations[1]?.({ campaign: 'x' })).toEqual({ campaign: 'x' });
    const decoded = decodeEnvelope({ v: 0, savedAt: 1, data: [] });
    expect(decoded.ok ? null : decoded.problem.code).toBe('invalid');
  });

  it('rejects versions it cannot read', () => {
    expect(migrate(SAVE_VERSION + 1, {})).toMatchObject({ ok: false, reason: 'too_new' });
    for (const v of [-1, 0.5, '1', null, undefined]) {
      expect(migrate(v, {})).toMatchObject({ ok: false, reason: 'bad_version' });
    }
  });
});
