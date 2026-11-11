// Stillmind (design/towers.md § 6.2): Mindspike Obelisk + Stasis Bloom. The Mindspike deals +25%
// damage to Chilled or Stasis enemies (a conditional bonus, checked per victim as the hit lands);
// the Bloom pulses 1 s sooner (`Tower.linkPulseSoonerTicks` off its pulse's period,
// sim/systems/fields.ts; 1.5 s under Linked Up). Aelari + Aelari, Act III early (T608).
import { defineLink } from '../define.ts';

export const stillmind = defineLink({
  id: 'stillmind',
  name: 'Stillmind',
  partners: [
    {
      tower: 'mindspike',
      bonuses: [{ stat: 'damage', pct: 0.25, vsStatus: ['chilled', 'stasis'] }],
    },
    { tower: 'bloom', bonuses: [], pulseSoonerSec: 1 },
  ],
});
