// The presentation dials a map plays with (docs/design/core-loop.md § 6.7): its act's row of
// content/presentation.ts with the map's overrides on top. Pure. Nothing reads it yet: T410b
// wires the loading tips, the Evie billboards, the Skitterkin death, the Tidybots, the jingle,
// and the UI theme to it.
import type { CampaignMapId } from '../content/campaign.ts';
import {
  PRESENTATION,
  type PresentationDials,
  type PresentationTable,
} from '../content/presentation.ts';
import { actOf } from './conditions.ts';

/** `map`'s dials: its act's, then its own overrides. Before A1M1 (`null`) the story is Act I's. */
export function presentationFor(
  map: CampaignMapId | null,
  table: PresentationTable = PRESENTATION,
): PresentationDials {
  if (map === null) return table.byAct[1];
  const base = table.byAct[actOf(map)];
  const own = Object.hasOwn(table.byMap, map) ? table.byMap[map] : undefined;
  return own === undefined ? base : { ...base, ...own };
}
