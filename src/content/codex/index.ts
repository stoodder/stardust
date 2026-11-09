// The codex registry (docs/story/style-guide.md § 6.2): every entry by id. The entry texts are
// written in the act files (their one home, like the item copy in content/upgrades/copy.ts); a
// later act's versions of an earlier entry (Act II's annotations) are merged in here.
import { ACT1_CODEX } from './act1.ts';
import { ACT2_CODEX, ACT2_CODEX_VERSIONS } from './act2.ts';
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
export const CODEX_LATER_VERSIONS: readonly CodexLaterVersions[] = [ACT2_CODEX_VERSIONS];

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
  [...ACT1_CODEX, ...ACT2_CODEX],
  CODEX_LATER_VERSIONS,
);

/** Every codex entry, by id. */
export const CODEX: Readonly<Record<CodexId, CodexEntryDef>> = Object.fromEntries(
  CODEX_ENTRIES.map((e) => [e.id, e] as const),
);

/** Every registered codex id, in codex order. */
export const CODEX_IDS: readonly CodexId[] = CODEX_ENTRIES.map((e) => e.id);
