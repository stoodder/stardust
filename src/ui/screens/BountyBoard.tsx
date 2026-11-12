// The Pest Bounty Board pane (T301b; design/core-loop.md § 6.6): the base's fake leaderboard
// through Acts I and II, Kip #1 and the player #2, in Everglow's cheerful PR. The rows are
// bountyBoard.ts's; this draws them as a ranked list in the base's well.
import { silkText } from '../silk.ts';
import type { BasePaneProps } from './BasePanes.tsx';
import { BOUNTY_COPY, bountyRows } from './bountyBoard.ts';
import { formatCount } from './format.ts';
import './bountyBoard.css';

export function BountyBoardPane({ view }: BasePaneProps) {
  const you = view.profile === null ? 'JPT-1 #ED-447' : `JPT-1 ${view.profile.name}`;
  const rows = bountyRows(view.pestsProcessed, you, view.bountyBoard.kipAway);
  return (
    <div class="sd-bounty">
      <header class="sd-bounty-head" data-voice="bounty-head">
        <p class="sd-bounty-title">{BOUNTY_COPY.title}</p>
        <p class="sd-bounty-period">{BOUNTY_COPY.period}</p>
      </header>
      <ol class="sd-bounty-rows" aria-label={BOUNTY_COPY.title}>
        {rows.map((r) => (
          <li key={r.rank} class={r.you ? 'sd-bounty-row sd-bounty-you' : 'sd-bounty-row'}>
            <span class="sd-bounty-rank">#{r.rank}</span>
            <span class="sd-bounty-who">
              <span class="sd-bounty-name">{silkText(r.name)}</span>
              <span class="sd-bounty-note" data-voice="bounty-note">
                {silkText(r.note)}
              </span>
            </span>
            <span class="sd-bounty-score">
              {formatCount(r.score)}
              <span class="sd-visually-hidden"> pests</span>
            </span>
          </li>
        ))}
      </ol>
      <p class="sd-bounty-foot" data-voice="bounty-foot">
        {BOUNTY_COPY.footer}
      </p>
    </div>
  );
}
