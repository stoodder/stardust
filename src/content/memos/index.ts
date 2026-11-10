// The Everglow Inbox registry (docs/story/style-guide.md § 6.1): every memo by id. The memo
// bodies are written in the act files (their one home).
import { ACT1_MEMOS } from './act1.ts';
import { ACT2_MEMOS } from './act2.ts';
import { ACT3_MEMOS } from './act3.ts';
import type { MemoDef, MemoId } from './types.ts';

export * from './types.ts';

/** Every memo, in delivery order. */
export const MEMO_LIST: readonly MemoDef[] = [...ACT1_MEMOS, ...ACT2_MEMOS, ...ACT3_MEMOS];

/** Every memo, by id. */
export const MEMOS: Readonly<Record<MemoId, MemoDef>> = Object.fromEntries(
  MEMO_LIST.map((m) => [m.id, m] as const),
);

/** Every registered memo id, in delivery order. */
export const MEMO_IDS: readonly MemoId[] = MEMO_LIST.map((m) => m.id);
