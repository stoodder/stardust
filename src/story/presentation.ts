// The presentation dials a map plays with (docs/design/core-loop.md § 6.7): its act's row of
// content/presentation.ts with the map's overrides on top. Pure. Every dial is read through here
// (T410b): the results counter and kicker (story/counter.ts, Results), the loading tips (Title),
// the UI act theme (the `data-act` on the UI root, the HUD and Results), the Skitterkin death
// (render's deathLook.ts), the Tidybots (render's TidybotView), the wave-clear jingle (audio's
// eventSounds.ts), and the Evie billboards (render's groundTiles DECOR_LOOKS agrees with it).
// Story moments can change dials too (`afterScene`: A2M4's truth scene turns Act II's jingle
// minor), so a reader that should follow them passes the save's `story.seen`.
import type { CampaignMapId } from '../content/campaign.ts';
import { isCampaignMapId } from '../content/dialogue/rules.ts';
import type { StoryAct } from '../content/dialogue/types.ts';
import {
  PRESENTATION,
  type PresentationDials,
  type PresentationTable,
} from '../content/presentation.ts';
import type { Act } from '../content/types.ts';
import { actOf } from './conditions.ts';

const NONE_SEEN: readonly string[] = [];

/**
 * An act's row with the scene overrides `seen` has reached (`afterScene`), in table order. The
 * row itself when none applies.
 */
function actDials(
  act: StoryAct,
  seen: readonly string[],
  table: PresentationTable,
): PresentationDials {
  const row = table.byAct[act];
  const reached = table.afterScene.filter((o) => o.acts.includes(act) && seen.includes(o.scene));
  return reached.length === 0 ? row : Object.assign({}, row, ...reached.map((o) => o.dials));
}

/**
 * `map`'s dials: its act's, then the scene overrides `seen` has reached, then its own overrides.
 * Before A1M1 (`null`) the story is Act I's.
 */
export function presentationFor(
  map: CampaignMapId | null,
  seen: readonly string[] = NONE_SEEN,
  table: PresentationTable = PRESENTATION,
): PresentationDials {
  if (map === null) return actDials(1, seen, table);
  const base = actDials(actOf(map), seen, table);
  const own = Object.hasOwn(table.byMap, map) ? table.byMap[map] : undefined;
  return own === undefined ? base : { ...base, ...own };
}

/**
 * The dials of any map a battle can open: a campaign map's own (`presentationFor`); a dev map's,
 * its act's row; a map outside the story (`challenge`, `endless`: post-game modes), the
 * post-game's, which is the finale's row (core-loop.md § 6.8). `seen` (the save's `story.seen`)
 * applies the scene overrides it has reached to the act's row.
 */
export function presentationOfMap(
  map: { readonly id: string; readonly act: Act },
  seen: readonly string[] = NONE_SEEN,
  table: PresentationTable = PRESENTATION,
): PresentationDials {
  if (isCampaignMapId(map.id)) return presentationFor(map.id, seen, table);
  return actDials(storyActOf(map.act), seen, table);
}

/**
 * The dials between maps (the menus, the Title's tip): the frontier's, the next map to play
 * (`meta/progress.ts` `frontierOf`), so the Act II tip shows from A1M5 won on; once the finale is
 * won (`null`), the post-game's (the finale's row; core-loop.md § 6.8).
 */
export function presentationBetweenMaps(
  frontier: CampaignMapId | null,
  table: PresentationTable = PRESENTATION,
): PresentationDials {
  return frontier === null ? table.byAct.finale : presentationFor(frontier, NONE_SEEN, table);
}

/** The story act a map's act reads as: challenge and endless maps are post-game. */
export function storyActOf(act: Act): StoryAct {
  return act === 'challenge' || act === 'endless' ? 'finale' : act;
}

/**
 * One tip from a dials' pool: the `n`th, wrapping (a screen passes something stable, such as the
 * maps won, so the tip doesn't change under the player while they read it).
 */
export function loadingTip(dials: PresentationDials, n: number): string {
  const pool = dials.loadingTips;
  const i = Number.isFinite(n) ? Math.abs(Math.trunc(n)) % pool.length : 0;
  return pool[i] ?? pool[0] ?? '';
}
