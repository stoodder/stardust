// R&D Engineering (T204d; design/progression.md § 7.1): one Intel purchase per tower unlocks both
// of its tier-4 specializations (2 Intel for Everglow towers, 3 for the rest), after A1M4. Towers
// whose specs aren't built yet (the Sprinkler, D031) aren't listed. Buying one adds the tower to
// the save's `unlocks.specs`, which the battle config passes to the sim as `specsUnlocked`.
import type { BasePaneProps } from './BasePanes.tsx';
import { Shelf } from './Shelf.tsx';

export function EngineeringPane({ view }: BasePaneProps) {
  return <Shelf pane="engineering" view={view} />;
}
