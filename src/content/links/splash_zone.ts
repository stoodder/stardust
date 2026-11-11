// Splash Zone (design/towers.md § 6.2): Frostline Sprinkler + Scuttle Den. The Den's swarmlings
// dash 30% faster and latch 1 s longer (`Tower.linkSwarmSpeedPct`, `linkLatchTicks`: both scale
// with Linked Up); the Sprinkler's pulse radius grows by 0.3 tiles. Act III early (T604).
import { defineLink } from '../define.ts';

export const splash_zone = defineLink({
  id: 'splash_zone',
  name: 'Splash Zone',
  partners: [
    { tower: 'sprinkler', bonuses: [{ stat: 'range', flat: 0.3 }] },
    { tower: 'burrow', bonuses: [], swarmSpeedPct: 0.3, latchSec: 1 },
  ],
});
