// Xenotech (T509; design/progression.md § 7.2): Ves'thara's Intel shelf, after A2M5, when she joins
// and gives the Prism Spire. It lists the Aelari towers: her gift once given ("Given"), then the
// attunements, 3 Intel each once the Prism is owned (the Mindspike Obelisk and the Seer's Lantern;
// the Stasis Bloom after A3M1 once it's registered). Attuning adds the tower to the save's
// `unlocks.towers`, so the loadout's pool. Her shelf takes no stardust: the Aelari tune-ups are
// Zibzab's, and their specializations are Engineering's.
import type { BasePaneProps } from './BasePanes.tsx';
import { Shelf } from './Shelf.tsx';

export function XenotechPane({ view }: BasePaneProps) {
  return <Shelf pane="xenotech" view={view} />;
}
