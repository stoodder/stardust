// A3M6 · Let Them In: map-scoped barks (story/campaign/act3.md § A3M6, *Barks*), verbatim. They fire
// only on this map; ids end `_a3_06`. QUILL's greenhouse-roof line waits for a tower built on high
// ground (`highGround`: A1M1's one `^` tile, the roof, where the first Rivet went), and never under
// C4 Purge (flat QUILL keeps no memories like that). Zibzab, the shift's companion, on any build.
import { defineBarks } from '../../define.ts';

export const barks = defineBarks([
  {
    id: 'quill_tower_built_a3_06',
    speaker: 'quill',
    expression: 'happy',
    text: 'Greenhouse roof. Your first Rivet went right there. ...Look at you now.',
    trigger: { on: 'tower_built', highGround: true },
    when: { not: { flag: 'quill_choice', eq: 'purge' } },
    once: 'map',
  },
  {
    id: 'zibzab_tower_built_a3_06',
    speaker: 'zibzab',
    text: 'Good build. I would have charged you more for it.',
    trigger: { on: 'tower_built' },
    once: 'map',
  },
]);
