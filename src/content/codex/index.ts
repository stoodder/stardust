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
 * Act III part two's Field Journal (the codex, retitled from A3M1), as act3.md's *Codex* rows name
 * it: reserved ids (T700b) before their task (`task`) writes them into `codex/act3.ts`. A row with
 * `version: 'original'` is a new entry (with its `subject`, if a unit or ability); `'corrected'` is
 * a correction of an entry already registered (`ACT3_CODEX_VERSIONS`). planned.test.ts checks each
 * id's form, that a correction names a registered entry, and that a landed row has its version.
 */
export const PLANNED_CODEX: readonly {
  readonly id: CodexId;
  readonly map: CampaignMapId;
  readonly version: 'original' | 'corrected';
  readonly task: string;
}[] = [
  // A3M4 · Empty Slot
  { id: 'codex_silencer', map: 'a3_m04', version: 'original', task: 'T711' },
  { id: 'codex_liability', map: 'a3_m04', version: 'original', task: 'T711' },
  { id: 'codex_system_reboot', map: 'a3_m04', version: 'original', task: 'T711' },
  { id: 'codex_gerald', map: 'a3_m04', version: 'corrected', task: 'T711' },
  { id: 'codex_pension_form', map: 'a3_m04', version: 'original', task: 'T711' },
  // A3M5 · Unsung
  { id: 'codex_auditor', map: 'a3_m05', version: 'original', task: 'T711' },
  { id: 'codex_associate', map: 'a3_m05', version: 'original', task: 'T711' },
  { id: 'codex_shareholder_value', map: 'a3_m05', version: 'original', task: 'T711' },
  { id: 'codex_kips_ledger', map: 'a3_m05', version: 'original', task: 'T711' },
  // A3M6 · Let Them In (Dome Row's entry is Everglow Gardens, A1M1's)
  { id: 'codex_gunship', map: 'a3_m06', version: 'original', task: 'T711' },
  { id: 'codex_blackbudget', map: 'a3_m06', version: 'original', task: 'T711' },
  { id: 'codex_gathering_maw', map: 'a3_m06', version: 'original', task: 'T711' },
  { id: 'codex_everglow_gardens', map: 'a3_m06', version: 'corrected', task: 'T711' },
  { id: 'codex_zibzab', map: 'a3_m06', version: 'corrected', task: 'T711' },
];
