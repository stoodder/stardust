// The codex registry (docs/story/style-guide.md § 6.2): every entry by id. The entry texts are
// written in the act files (their one home, like the item copy in content/upgrades/copy.ts); a
// later act's versions of an earlier entry (Act II's annotations, Act III's corrections) are
// merged in here. Act I's entries are always registered; a later act's register with its chunk
// (content/acts; architecture.md § 5, *Bundle*), and the lists below are updated in place.
import type { CampaignMapId } from '../campaign.ts';
import { ACT1_CODEX } from './act1.ts';
import {
  CODEX_VERSIONS,
  type CodexEntryDef,
  type CodexId,
  type CodexLaterVersions,
  type CodexVersionDef,
  type CodexVersion,
} from './types.ts';

export * from './types.ts';

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

/** Each act's entries and versions of earlier entries, by act rank (Act I 0 … the finale 3). */
const byAct: ({ entries: readonly CodexEntryDef[]; versions: CodexLaterVersions } | undefined)[] = [
  { entries: ACT1_CODEX, versions: {} },
];
const laterVersions: CodexLaterVersions[] = [];
const entryList: CodexEntryDef[] = [];
const byId: Record<CodexId, CodexEntryDef> = {};
const ids: CodexId[] = [];

/**
 * The registered later acts' versions of other entries, in act order (codex.test.ts checks each
 * lands). Updated in place as acts register.
 */
export const CODEX_LATER_VERSIONS: readonly CodexLaterVersions[] = laterVersions;

/** Every registered codex entry, in codex order, with every registered act's versions. */
export const CODEX_ENTRIES: readonly CodexEntryDef[] = entryList;

/** Every registered codex entry, by id. */
export const CODEX: Readonly<Record<CodexId, CodexEntryDef>> = byId;

/** Every registered codex id, in codex order. */
export const CODEX_IDS: readonly CodexId[] = ids;

/** Rebuilds the lists from the registered acts, in act order. */
function rebuild(): void {
  const parts = byAct.filter((p) => p !== undefined);
  laterVersions.length = 0;
  laterVersions.push(
    ...parts.slice(1).flatMap((p) => (Object.keys(p.versions).length > 0 ? [p.versions] : [])),
  );
  entryList.length = 0;
  entryList.push(
    ...withLaterVersions(
      parts.flatMap((p) => p.entries),
      laterVersions,
    ),
  );
  for (const id of Object.keys(byId)) delete byId[id];
  for (const e of entryList) byId[e.id] = e;
  ids.length = 0;
  ids.push(...entryList.map((e) => e.id));
}
rebuild();

/**
 * Registers an act's entries and its versions of earlier entries (content/acts
 * `registerActStory`; `rank` is the act's, Act II 1 … the finale 3). Registering an act again
 * replaces its part.
 */
export function registerCodex(
  rank: number,
  entries: readonly CodexEntryDef[],
  versions: CodexLaterVersions,
): void {
  byAct[rank] = { entries, versions };
  rebuild();
}

/**
 * Field Journal entries an act file names whose text hasn't landed: reserved ids (T800b), each with
 * the task (`task`) that writes it into a codex list. `'original'` is a new entry; `'corrected'` is
 * a correction of an entry already registered. planned.test.ts checks each id's form, that a
 * correction names a registered entry, and that a landed row has its version. Empty: the finale's
 * five (the Unsung, the Deep Halls, the Deep Bore, the Long Walk, the last page) landed with T811
 * (codex/finale.ts), and each row went as its entry did.
 */
export const PLANNED_CODEX: readonly {
  readonly id: CodexId;
  readonly map: CampaignMapId;
  readonly version: 'original' | 'corrected';
  readonly task: string;
}[] = [];
