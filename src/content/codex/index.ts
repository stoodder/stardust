// The codex registry (docs/story/style-guide.md § 6.2): every entry by id. The entry texts are
// written in the act files (their one home, like the item copy in content/upgrades/copy.ts).
import { ACT1_CODEX } from './act1.ts';
import type { CodexEntryDef, CodexId } from './types.ts';

export * from './types.ts';

/** Every codex entry, in codex order. */
export const CODEX_ENTRIES: readonly CodexEntryDef[] = [...ACT1_CODEX];

/** Every codex entry, by id. */
export const CODEX: Readonly<Record<CodexId, CodexEntryDef>> = Object.fromEntries(
  CODEX_ENTRIES.map((e) => [e.id, e] as const),
);

/** Every registered codex id, in codex order. */
export const CODEX_IDS: readonly CodexId[] = CODEX_ENTRIES.map((e) => e.id);
