// Everglow Inbox memo shapes (docs/story/style-guide.md § 6.1; design/core-loop.md § 6.4): From,
// To, Subject, body, sign-off, and small print, delivered between maps, with an optional gift.
// Delivery is story/inbox.ts (T303); what a save has delivered and read is `story.memosDelivered`
// and `story.memosRead` (meta/saveData.ts).
import type { CampaignMapId } from '../campaign.ts';
import type { Condition } from '../dialogue/types.ts';
import type { AbilityId, TowerId } from '../types.ts';

/**
 * A memo id: `memo_a<act>_<nn>` (style-guide § 5.3); a form that arrives with a memo is
 * `memo_a<act>_<nn>_<form>` (A2M2's KFA form, `memo_a2_02_kfa`).
 */
export type MemoId = string;
/** The memo-id pattern. */
export const MEMO_ID = /^memo_a[1-3]_\d\d(_[a-z]+)?$/;

/**
 * How an Inbox item looks: a `memo` on Everglow letterhead (the default), or a `form` on the KFA's
 * off-white form panel, its numbered clauses under a stamp box (art-direction § 9).
 */
export type MemoFormat = 'memo' | 'form';

/**
 * A memo's gift, granted when it is delivered (not read), once (`story.granted`), so skipping the
 * Inbox never costs anything. `memo_a1_00` grants Orbital Strike (D031).
 */
export type MemoGift =
  { readonly ability: AbilityId } | { readonly tower: TowerId } | { readonly stardust: number };

/** A paragraph shown only when its condition holds (A1M5's *Performance Note*, if spared). */
export interface MemoParagraph {
  readonly when: Condition;
  readonly text: string;
}

export interface MemoDef {
  readonly id: MemoId;
  /** Default `memo`. A form's subject needn't exclaim: it isn't Everglow's (style-guide § 6.1). */
  readonly format?: MemoFormat;
  /** A form's stamp, in its stamp box: ASCII capitals, ≤ 20 characters ("PENDING"). */
  readonly stamp?: string;
  readonly from: string;
  readonly to: string;
  /** Cheerful in every act (no exclamation point first in A3M2's automated memo). */
  readonly subject: string;
  /** ≤ 600 characters after substitution, with the extra paragraphs that hold. */
  readonly body: string;
  readonly extra?: readonly MemoParagraph[];
  readonly signOff?: string;
  /** ≤ 140 characters; collapsed until clicked. Where the fair-play clues live. */
  readonly smallPrint?: string;
  /**
   * Delivered on entering the base after this map is first won; null: at the intake, before
   * A1M1 (`memo_a1_00`). One memo arrives early on a results screen (A2M4's Q3 Bonus).
   */
  readonly afterMap: CampaignMapId | null;
  /** Delivered only when this holds too (judged at delivery). */
  readonly when?: Condition;
  readonly gift?: MemoGift;
}
