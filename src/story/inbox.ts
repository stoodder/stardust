// The Everglow Inbox (docs/tech/story-runtime.md § Other story systems; design/core-loop.md
// § 6.4): which memos are delivered when the player enters the base, and the gifts attached to
// them. Pure over content (content/memos/) and the story context; meta applies the result.
import type { MemoDef, MemoGift, MemoId } from '../content/memos/types.ts';
import type { StoryContext } from './conditions.ts';
import { notImplemented } from './notImplemented.ts';

/** A delivery: the memos to add to `story.memosDelivered`, and their gifts. */
export interface Delivery {
  readonly memos: readonly MemoId[];
  readonly gifts: readonly { readonly memo: MemoId; readonly gift: MemoGift }[];
}

/**
 * The memos due now and not yet delivered: every memo whose `afterMap` is won (or null, after the
 * intake) and whose `when` holds. Idempotent, so a save that missed a delivery catches up.
 */
export function memosDue(
  delivered: readonly MemoId[],
  won: readonly string[],
  ctx: StoryContext,
): Delivery {
  void delivered;
  void won;
  void ctx;
  return notImplemented('memosDue', 'T303');
}

/** The paragraphs `memo` shows in `ctx`: its body, then each extra whose condition holds. */
export function memoBody(memo: MemoDef, ctx: StoryContext): string[] {
  void memo;
  void ctx;
  return notImplemented('memoBody', 'T303');
}
