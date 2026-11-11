// The codex registry (docs/story/style-guide.md § 6.2): every entry by id. The entry texts are
// written in the act files (their one home, like the item copy in content/upgrades/copy.ts); a
// later act's versions of an earlier entry (Act II's annotations, Act III's corrections) are
// merged in here.
import type { CampaignMapId } from '../campaign.ts';
import { ACT1_CODEX } from './act1.ts';
import { ACT2_CODEX, ACT2_CODEX_VERSIONS } from './act2.ts';
import { ACT3_CODEX, ACT3_CODEX_VERSIONS } from './act3.ts';
import {
  CODEX_VERSIONS,
  type CodexEntryDef,
  type CodexId,
  type CodexLaterVersions,
  type CodexVersionDef,
  type CodexVersion,
} from './types.ts';

export * from './types.ts';

/** The later acts' versions of other entries, in act order (codex.test.ts checks each lands). */
export const CODEX_LATER_VERSIONS: readonly CodexLaterVersions[] = [
  ACT2_CODEX_VERSIONS,
  ACT3_CODEX_VERSIONS,
];

/**
 * `entries` with `later`'s versions merged in, in act order. A version an entry already has
 * stays (a later one never replaces it), and a version for an unknown id is dropped: both are
 * authoring errors codex.test.ts reports.
 */
export function withLaterVersions(
  entries: readonly CodexEntryDef[],
  later: readonly CodexLaterVersions[],
): CodexEntryDef[] {
  return entries.map((e) => {
    const patches = later.flatMap((p) => (Object.hasOwn(p, e.id) && p[e.id] ? [p[e.id]!] : []));
    if (patches.length === 0) return e;
    // In CODEX_VERSIONS order, the entry's own version first, then the earliest act's.
    const versions: { [V in CodexVersion]?: CodexVersionDef } = {};
    for (const v of CODEX_VERSIONS) {
      const def = [e.versions, ...patches].find((p) => p[v] !== undefined)?.[v];
      if (def !== undefined) versions[v] = def;
    }
    return { ...e, versions };
  });
}

/** Every codex entry, in codex order, with every act's versions. */
export const CODEX_ENTRIES: readonly CodexEntryDef[] = withLaterVersions(
  [...ACT1_CODEX, ...ACT2_CODEX, ...ACT3_CODEX],
  CODEX_LATER_VERSIONS,
);

/** Every codex entry, by id. */
export const CODEX: Readonly<Record<CodexId, CodexEntryDef>> = Object.fromEntries(
  CODEX_ENTRIES.map((e) => [e.id, e] as const),
);

/** Every registered codex id, in codex order. */
export const CODEX_IDS: readonly CodexId[] = CODEX_ENTRIES.map((e) => e.id);

/**
 * The finale's Field Journal entries, as finale.md's *Codex* row names them: reserved ids (T800b)
 * before their task (`task`) writes them into a codex list. `'original'` is a new entry (with both
 * versions where it opens on Everglow's record beside the Journal's correction, as A3M2's Buffer
 * Protocol does); `'corrected'` is a correction of an entry already registered. planned.test.ts
 * checks each id's form, that a correction names a registered entry, and that a landed row has
 * its version.
 */
export const PLANNED_CODEX: readonly {
  readonly id: CodexId;
  readonly map: CampaignMapId;
  readonly version: 'original' | 'corrected';
  readonly task: string;
}[] = [
  { id: 'codex_unsung', map: 'fin_m01', version: 'original', task: 'T811' },
  { id: 'codex_deep_halls', map: 'fin_m01', version: 'original', task: 'T811' },
  { id: 'codex_deep_bore', map: 'fin_m01', version: 'original', task: 'T811' },
  // "The Long Walk corrected": no entry holds the Long Walk yet, so it is new, opening on
  // Everglow's record (a seasonal migration) beside the Journal's correction.
  { id: 'codex_long_walk', map: 'fin_m01', version: 'original', task: 'T811' },
  // The Journal's last page: REMEMBERED: {n} (the lifetime Pests Processed the countdown ran from).
  { id: 'codex_last_page', map: 'fin_m01', version: 'original', task: 'T811' },
];
