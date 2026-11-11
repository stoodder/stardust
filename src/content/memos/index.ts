// The Everglow Inbox registry (docs/story/style-guide.md § 6.1): every memo by id. The memo
// bodies are written in the act files (their one home).
import type { CampaignMapId } from '../campaign.ts';
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

/**
 * Memos the act files name whose content hasn't landed: reserved ids (T700b), so dev saves, tests,
 * and other tasks can name them before their task (`task`) writes them into their act's list
 * (`ACT3_MEMOS`; planned.test.ts checks each is a well-formed id, delivered after its map). Each is
 * delivered on entering the base after `afterMap` is first won, once registered.
 */
export const PLANNED_MEMOS: readonly {
  readonly id: MemoId;
  readonly afterMap: CampaignMapId;
  readonly task: string;
}[] = [
  { id: 'memo_a3_04', afterMap: 'a3_m04', task: 'T711' },
  { id: 'memo_a3_05', afterMap: 'a3_m05', task: 'T711' },
  { id: 'memo_a3_06', afterMap: 'a3_m06', task: 'T711' },
];
