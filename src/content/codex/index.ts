// The codex registry (docs/story/style-guide.md § 6.2): every entry by id. The entry texts are
// written here (their one home, like the item copy in content/upgrades/copy.ts). Empty until T303.
import type { CodexEntryDef, CodexId } from './types.ts';

export * from './types.ts';

/** Every codex entry, in codex order. */
export const CODEX_ENTRIES: readonly CodexEntryDef[] = [];

/** Every codex entry, by id. */
export const CODEX: Readonly<Record<CodexId, CodexEntryDef>> = Object.fromEntries(
  CODEX_ENTRIES.map((e) => [e.id, e] as const),
);

/** Every registered codex id, in codex order. */
export const CODEX_IDS: readonly CodexId[] = CODEX_ENTRIES.map((e) => e.id);
