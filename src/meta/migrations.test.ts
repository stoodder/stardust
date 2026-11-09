import { describe, expect, it } from 'vitest';
import saveV0 from './__fixtures__/save.v0.json' with { type: 'json' };
import saveV1 from './__fixtures__/save.v1.json' with { type: 'json' };
import saveV2 from './__fixtures__/save.v2.json' with { type: 'json' };
import { migrate, migrations } from './migrations.ts';
import { decodeEnvelope } from './save.ts';
import { SAVE_VERSION, createNewSave } from './saveData.ts';

/** A deep copy of JSON data. */
function clone<T>(x: T): T {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- JSON round trip of a T
  return JSON.parse(JSON.stringify(x)) as T;
}

/** One fixture per schema version ever written (meta-runtime.md § Versioning and migrations). */
const FIXTURES: Readonly<Record<number, unknown>> = { 0: saveV0, 1: saveV1, 2: saveV2 };

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
