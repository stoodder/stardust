// The campaign menus' shared parts: the banks (Stardust and Intel) and a map's medal pips, on the
// Shift board, the star map, and the Base. The Stardust bank wears the currency's icon for the
// phase the story is in (art-direction.md § 2, *The Stardust currency icon*; T803c): Everglow's
// candy-cut gem through Act II, the warrens' gift stone from Act III, warm gold after the finale.
import type { CampaignMapId } from '../../content/campaign.ts';
import { STARDUST_ICON, type StardustPhase } from '../../content/sprites/icons/stardust.ts';
import { presentationBetweenMaps } from '../../story/presentation.ts';
import { Icon } from '../hud/Icon.tsx';
import { formatCount } from './format.ts';
import type { CampaignView } from './state.ts';

/** The Stardust icon's phase between maps: the menus' act theme (the frontier's; the finale after it). */
export function stardustPhase(frontier: CampaignMapId | null): StardustPhase {
  const theme = presentationBetweenMaps(frontier).theme;
  return theme === 'finale' ? 'finale' : theme === 3 ? 'act3' : theme === 2 ? 'act2' : 'act1';
}

/** A map has three medals (progression.md § 3); filled pips for the ones earned. */
export function MedalPips({ earned, veteran = false }: { earned: number; veteran?: boolean }) {
  return (
    <span
      class="sd-medals"
      role="img"
      aria-label={`${earned} of 3 medals${veteran ? ', Veteran medal' : ''}`}
    >
      {[0, 1, 2].map((i) => (
        <span key={i} class={i < earned ? 'sd-medal sd-medal-on' : 'sd-medal'} />
      ))}
      {/* T863: the Veteran medal's pip (T860), small and gold, just past the three. */}
      {veteran && <span class="sd-medal-veteran" data-testid="shift-veteran" />}
    </span>
  );
}

/** The banks: Stardust and Intel. */
export function Banks({ view }: { view: CampaignView }) {
  return (
    <dl class="sd-banks">
      <div>
        <dt class="sd-stardust">
          <Icon id={STARDUST_ICON[stardustPhase(view.frontier)]} class="sd-banks-icon" />
          Stardust
        </dt>
        <dd>{formatCount(view.stardust)}</dd>
      </div>
      <div>
        <dt class="sd-intel">Intel</dt>
        <dd>{formatCount(view.intel)}</dd>
      </div>
    </dl>
  );
}
