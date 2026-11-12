// The Everglow Inbox registry (docs/story/style-guide.md § 6.1): every memo by id. The memo
// bodies are written in the act files (their one home). Act I's memos are always registered; a
// later act's register with its chunk (content/acts; architecture.md § 5, *Bundle*), and the lists
// below are updated in place.
import type { CampaignMapId } from '../campaign.ts';
import { ACT1_MEMOS } from './act1.ts';
import type { MemoDef, MemoId } from './types.ts';

export * from './types.ts';

/** Each act's memos, by act rank (Act I 0 … the finale 3). */
const byAct: (readonly MemoDef[] | undefined)[] = [ACT1_MEMOS];
const list: MemoDef[] = [];
const byId: Record<MemoId, MemoDef> = {};
const ids: MemoId[] = [];

/** Every registered memo, in delivery order (updated in place as acts register). */
export const MEMO_LIST: readonly MemoDef[] = list;

/** Every registered memo, by id. */
export const MEMOS: Readonly<Record<MemoId, MemoDef>> = byId;

/** Every registered memo id, in delivery order. */
export const MEMO_IDS: readonly MemoId[] = ids;

/** Rebuilds the lists from the registered acts, in act order. */
function rebuild(): void {
  list.length = 0;
  for (const part of byAct) if (part !== undefined) list.push(...part);
  for (const id of Object.keys(byId)) delete byId[id];
  for (const m of list) byId[m.id] = m;
  ids.length = 0;
  ids.push(...list.map((m) => m.id));
}
rebuild();

/**
 * Registers an act's memos (content/acts `registerActStory`; `rank` is the act's, Act II 1 … the
 * finale 3). Registering an act again replaces its part.
 */
export function registerMemos(rank: number, memos: readonly MemoDef[]): void {
  byAct[rank] = memos;
  rebuild();
}

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
