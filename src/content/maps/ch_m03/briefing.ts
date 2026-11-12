// CH_M03's briefing (Glass Core; T862): the console's two facts, then Zibzab in person (comms are
// down), pricing it first. It loads with the finale's chunk (content/acts/fin.ts) and plays as
// `<map>_brief` (app/dialogue.ts `briefingScene`).
import { defineScene, defineScenes } from '../../dialogue/index.ts';

export const scenes = defineScenes([
  defineScene('ch_m03_brief', [
    { kind: 'line', speaker: 'system', text: 'COMMS: OFFLINE. CORE INTEGRITY: 5.' },
    {
      kind: 'line',
      speaker: 'zibzab',
      text: 'Price first: no radio, nothing from the sky, and a core that cracks if you frown at it.',
    },
    {
      kind: 'line',
      speaker: 'zibzab',
      text: 'Zibzab believes in you, Technician. Zibzab also sells glue.',
    },
  ]),
]);
