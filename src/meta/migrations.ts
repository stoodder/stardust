// Save schema migrations (meta-runtime.md § Versioning and migrations). `migrations[n]` upgrades
// SaveData from version n to n + 1. Inputs are untrusted: a migration reshapes what it recognizes
// and passes anything else through for validateSave() to reject. Never edit or delete a migration
// once a build that writes its output version has shipped; add a new one and a new fixture.
import { SAVE_VERSION } from './saveData.ts';

type Migration = (old: unknown) => unknown;

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

export const migrations: Readonly<Record<number, Migration>> = {
  /**
   * v0 is the pre-release draft of the format (no shipped build wrote it): v1 without `stats`,
   * `settings`, `loadouts`, and `unlocks.protocols`. It exists so the framework and its fixture
   * test run from day one.
   */
  0: (old) => {
    if (!isRecord(old) || 'stats' in old || 'settings' in old) return old;
    const unlocks = isRecord(old['unlocks'])
      ? { protocols: [], ...old['unlocks'] }
      : old['unlocks'];
    return {
      ...old,
      unlocks,
      stats: { pestsProcessed: 0, runs: 0 },
      settings: { difficulty: 'standard' },
      loadouts: { last: null, byMap: {} },
    };
  },
};

export type Migrated =
  | { ok: true; data: unknown; from: number }
  | { ok: false; reason: 'too_new' | 'bad_version' | 'migration_failed'; message: string };

/** Runs every migration from `version` up to SAVE_VERSION. Doesn't validate the result. */
export function migrate(version: unknown, data: unknown): Migrated {
  if (typeof version !== 'number' || !Number.isSafeInteger(version) || version < 0) {
    return { ok: false, reason: 'bad_version', message: `not a save version: ${String(version)}` };
  }
  if (version > SAVE_VERSION) {
    return {
      ok: false,
      reason: 'too_new',
      message: `this save is version ${version}, made by a newer build (this build reads up to ${SAVE_VERSION})`,
    };
  }
  let out = data;
  for (let v = version; v < SAVE_VERSION; v++) {
    const step = migrations[v];
    if (step === undefined) {
      return { ok: false, reason: 'migration_failed', message: `no migration from version ${v}` };
    }
    try {
      out = step(out);
    } catch (err) {
      const why = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        reason: 'migration_failed',
        message: `migration ${v}→${v + 1} failed: ${why}`,
      };
    }
  }
  return { ok: true, data: out, from: version };
}
