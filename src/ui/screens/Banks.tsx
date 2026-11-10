// The campaign menus' shared parts: the banks (Stardust and Intel) and a map's medal pips, on the
// Shift board, the star map, and the Base.
import { formatCount } from './format.ts';
import type { CampaignView } from './state.ts';

/** A map has three medals (progression.md § 3); filled pips for the ones earned. */
export function MedalPips({ earned }: { earned: number }) {
  return (
    <span class="sd-medals" role="img" aria-label={`${earned} of 3 medals`}>
      {[0, 1, 2].map((i) => (
        <span key={i} class={i < earned ? 'sd-medal sd-medal-on' : 'sd-medal'} />
      ))}
    </span>
  );
}

/** The banks: Stardust and Intel. */
export function Banks({ view }: { view: CampaignView }) {
  return (
    <dl class="sd-banks">
      <div>
        <dt class="sd-stardust">Stardust</dt>
        <dd>{formatCount(view.stardust)}</dd>
      </div>
      <div>
        <dt class="sd-intel">Intel</dt>
        <dd>{formatCount(view.intel)}</dd>
      </div>
    </dl>
  );
}
