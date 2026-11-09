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
  /**
   * v1 is the M2 save (shipped, frozen at M2's end; D032). v2 is M3's story and loadout state:
   * - `profile` stays null: character creation (T306) runs the intake on Continue.
   * - `campaign.seenEnemies` (new) is seeded with the enemies of every M2 map the save has a
   *   record for (`M2_MAP_ENEMIES`, frozen here), so A1M3 doesn't badge a Nibbler as NEW.
   * - `loadouts.protocols` and `loadouts.protocolPicks` (new) start empty: M2 equipped none.
   * - `seenHints` becomes required (a v1 save written before it had seen none).
   * Story lists (scenes, memos, codex, grants) carry over as they are; no M2 build wrote any.
   */
  1: (old) => {
    if (!isRecord(old) || !isRecord(old['campaign']) || !isRecord(old['loadouts'])) return old;
    const campaign = old['campaign'];
    if ('seenEnemies' in campaign) return old;
    const maps = isRecord(campaign['maps']) ? campaign['maps'] : {};
    const seenEnemies: string[] = [];
    for (const [map, enemies] of Object.entries(M2_MAP_ENEMIES)) {
      if (!Object.hasOwn(maps, map)) continue;
      for (const e of enemies) if (!seenEnemies.includes(e)) seenEnemies.push(e);
    }
    return {
      ...old,
      campaign: { ...campaign, seenEnemies },
      loadouts: { ...old['loadouts'], protocols: [], protocolPicks: {} },
      seenHints: 'seenHints' in old ? old['seenHints'] : [],
    };
  },
};

/**
 * The enemy types each M2 map spawns (act1.md § A1M1, § A1M2 wave data), frozen with the v1 → v2
 * migration so it never changes as content does. A map with a record has been played to its end.
 */
const M2_MAP_ENEMIES: Readonly<Record<string, readonly string[]>> = {
  a1_m01: ['nibbler', 'zoomer'],
  a1_m02: ['nibbler', 'zoomer', 'chonk', 'hauler'],
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
