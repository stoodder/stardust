// The Everglow Inbox (docs/tech/story-runtime.md § Other story systems; design/core-loop.md
// § 6.4): which memos are due, the gifts attached to them, and what a memo shows. Pure over content
// (content/memos/) and the story context; meta applies a delivery to the save (meta/story.ts).
import { MEMO_LIST, type MemoDef, type MemoGift, type MemoId } from '../content/memos/index.ts';
import { evaluateCondition, type StoryContext } from './conditions.ts';

/** A delivery: the memos to add to `story.memosDelivered`, and their gifts. */
export interface Delivery {
  readonly memos: readonly MemoId[];
  readonly gifts: readonly { readonly memo: MemoId; readonly gift: MemoGift }[];
}

/**
 * The memos due now and not yet delivered, in delivery order: every memo whose `afterMap` is won
 * (or null: due from the start, after the intake) and whose `when` holds. Idempotent, so a save
 * that missed a delivery catches up.
 */
export function memosDue(
  delivered: readonly MemoId[],
  won: readonly string[],
  ctx: StoryContext,
  memos: readonly MemoDef[] = MEMO_LIST,
): Delivery {
  const due = memos.filter(
    (m) =>
      !delivered.includes(m.id) &&
      (m.afterMap === null || won.includes(m.afterMap)) &&
      (m.when === undefined || evaluateCondition(m.when, ctx)),
  );
  return {
    memos: due.map((m) => m.id),
    gifts: due.flatMap((m) => (m.gift === undefined ? [] : [{ memo: m.id, gift: m.gift }])),
  };
}

/**
 * The paragraphs `memo` shows in `ctx`: its body (split at blank lines), then each extra whose
 * condition holds. Tokens are still unresolved (the caller runs `resolveText`).
 */
export function memoBody(memo: MemoDef, ctx: StoryContext): string[] {
  const body = memo.body.split(/\n\s*\n/).filter((p) => p.trim() !== '');
  const extra = (memo.extra ?? []).filter((x) => evaluateCondition(x.when, ctx)).map((x) => x.text);
  return [...body, ...extra];
}

/** The delivered memos not read yet, in delivery order. */
export function unreadMemos(
  delivered: readonly MemoId[],
  read: readonly MemoId[],
): MemoId[] {
  return delivered.filter((m) => !read.includes(m));
}
