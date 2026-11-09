// The Everglow Inbox registry (docs/story/style-guide.md § 6.1): every memo by id. The memo
// bodies are written here (their one home). Empty until T303.
import type { MemoDef, MemoId } from './types.ts';

export * from './types.ts';

/** Every memo, in delivery order. */
export const MEMO_LIST: readonly MemoDef[] = [];

/** Every memo, by id. */
export const MEMOS: Readonly<Record<MemoId, MemoDef>> = Object.fromEntries(
  MEMO_LIST.map((m) => [m.id, m] as const),
);

/** Every registered memo id, in delivery order. */
export const MEMO_IDS: readonly MemoId[] = MEMO_LIST.map((m) => m.id);
