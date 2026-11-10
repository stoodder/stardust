// The Pest Bounty Board (T301b; design/core-loop.md § 6.6): Everglow's fake leaderboard in the base
// through Acts I and II. Kip is #1 ("three quarters running"), the player is always #2, and a few
// colonists fill out the rest. Every row is cosmetic: Kip's score is computed to stay just ahead
// of the player's lifetime Pests Processed, and the colonists' to stay behind it. From A2M4 Kip's
// row reads "(on assignment: Reclamation)"; from Act III the board is gone from the base, with no
// message. Pure: the pane (BountyBoard.tsx) reads the save in play through it.
import type { CampaignMapId } from '../../content/campaign.ts';

/** The board appears once this map is won (its memo, `memo_a1_02`, introduces it). */
export const BOUNTY_BOARD_FROM: CampaignMapId = 'a1_m02';
/** Kip's row reads "(on assignment: Reclamation)" once this map is won (he's promoted there). */
export const BOUNTY_KIP_AWAY_AFTER: CampaignMapId = 'a2_m04';
/** The board is gone from the base, with no message, once this map is won (Act III begins). */
export const BOUNTY_BOARD_UNTIL: CampaignMapId = 'a2_m06';

/** The pane's copy (story/style-guide.md § 2 *Pest Bounty Board*): Everglow PR, cheerful. */
export const BOUNTY_COPY = {
  title: 'Pest Bounty Board',
  period: 'Quarter to date',
  you: 'You!',
  kip: 'The Exterminator · three quarters running',
  kipAway: '(on assignment: Reclamation)',
  footer: 'Top score at quarter end wins a framed certificate. Ties are settled by Kip.',
} as const;

/** The colonists below the player: each one's name, note, and share of the player's score. */
const COLONISTS: readonly { readonly name: string; readonly note: string; readonly share: number }[] =
  [
    { name: 'M. Haddad', note: 'Dome 3 · nights', share: 0.62 },
    { name: 'P. Lindqvist', note: 'Terraces · on leave', share: 0.31 },
    { name: 'Tidybot 4', note: 'Honorary', share: 0.04 },
  ];

export interface BountyRow {
  readonly rank: number;
  readonly name: string;
  readonly note: string;
  readonly score: number;
  readonly you: boolean;
}

/** Kip's score: always a little ahead of the player's, however many the player processes. */
export function kipScore(pests: number): number {
  return pests + 13 + Math.floor(pests * 0.06);
}

/**
 * The board's rows for a player with `pests` lifetime Pests Processed, named `you` (their tag on
 * the board). Kip first, the player second, then the colonists, always in that order.
 */
export function bountyRows(pests: number, you: string, kipAway: boolean): BountyRow[] {
  const p = Math.max(0, Math.floor(pests));
  return [
    {
      rank: 1,
      name: 'K. Vandermeer',
      note: kipAway ? BOUNTY_COPY.kipAway : BOUNTY_COPY.kip,
      score: kipScore(p),
      you: false,
    },
    { rank: 2, name: you, note: BOUNTY_COPY.you, score: p, you: true },
    ...COLONISTS.map((c, i) => ({
      rank: i + 3,
      name: c.name,
      note: c.note,
      score: Math.min(p, Math.floor(p * c.share)),
      you: false,
    })),
  ];
}
