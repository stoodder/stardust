// A3M3 · The Gap: map-scoped barks (story/campaign/act3.md § A3M3, *Barks*), verbatim. They fire
// only on this map; ids end `_a3_03` (this map). Bricks is the companion (and on his post), so his
// lines play on their triggers: a refugee hushed on the road, and the Holdout's low mark (a quarter
// of the refugees lost; story/meters.ts `holdoutLow`).
import { defineBarks } from '../../define.ts';

export const barks = defineBarks([
  {
    id: 'bricks_ally_hushed_a3_03',
    speaker: 'bricks',
    text: "Lost one. Keep 'em coming.",
    trigger: { on: 'ally_hushed', ally: 'refugee' },
  },
  {
    id: 'bricks_low_integrity_a3_03',
    speaker: 'bricks',
    text: 'Steady. Steady now.',
    trigger: { on: 'low_integrity' },
  },
]);
