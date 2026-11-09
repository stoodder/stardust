import { describe, expect, it } from 'vitest';
import saveV0 from './__fixtures__/save.v0.json' with { type: 'json' };
import saveV1 from './__fixtures__/save.v1.json' with { type: 'json' };
import { migrate, migrations } from './migrations.ts';
import { decodeEnvelope } from './save.ts';
import { SAVE_VERSION } from './saveData.ts';

/** One fixture per schema version ever written (meta-runtime.md § Versioning and migrations). */
const FIXTURES: Readonly<Record<number, unknown>> = { 0: saveV0, 1: saveV1 };

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

  it('v0 → v1 adds empty stats and Standard difficulty and keeps everything else', () => {
    const decoded = decodeEnvelope(saveV0);
    if (!decoded.ok) throw new Error(decoded.problem.message);
    expect(decoded.envelope.data.stats).toEqual({ pestsProcessed: 0, runs: 0 });
    expect(decoded.envelope.data.settings).toEqual({ difficulty: 'standard' });
    expect(decoded.envelope.data.unlocks.protocols).toEqual([]);
    expect(decoded.envelope.data.campaign.maps.a1_m01?.medals).toEqual(['victory']);
    expect(decoded.envelope.savedAt).toBe(saveV0.savedAt);
  });

  it('passes unrecognized shapes through for validation to reject', () => {
    expect(migrate(0, 'not a save')).toEqual({ ok: true, data: 'not a save', from: 0 });
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
