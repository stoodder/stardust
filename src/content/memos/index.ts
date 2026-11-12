// The Everglow Inbox registry (docs/story/style-guide.md § 6.1): every memo by id. The memo
// bodies are written in the act files (their one home).
import type { CampaignMapId } from '../campaign.ts';
import { ACT1_MEMOS } from './act1.ts';
import { ACT2_MEMOS } from './act2.ts';
import { ACT3_MEMOS } from './act3.ts';
import { FINALE_MEMOS } from './finale.ts';
import type { MemoDef, MemoId } from './types.ts';

export * from './types.ts';

/** Every memo, in delivery order. */
export const MEMO_LIST: readonly MemoDef[] = [
  ...ACT1_MEMOS,
  ...ACT2_MEMOS,
  ...ACT3_MEMOS,
  ...FINALE_MEMOS,
];

/** Every memo, by id. */
export const MEMOS: Readonly<Record<MemoId, MemoDef>> = Object.fromEntries(
  MEMO_LIST.map((m) => [m.id, m] as const),
);

/** Every registered memo id, in delivery order. */
export const MEMO_IDS: readonly MemoId[] = MEMO_LIST.map((m) => m.id);

/**
 * Memos the act files name whose content hasn't landed: reserved ids (T800b), so dev saves, tests,
 * and the results flow can name them before their task (`task`) writes them into a memo list. Each
 * arrives after `afterMap` is first won, once registered; planned.test.ts checks each id's form and,
 * once it lands, its map. Empty: Sterling's farewell, `memo_fin_01`, landed with T811
 * (memos/finale.ts).
 */
export const PLANNED_MEMOS: readonly {
  readonly id: MemoId;
  readonly afterMap: CampaignMapId;
  readonly task: string;
}[] = [];
