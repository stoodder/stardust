// Bounce Chorus (design/towers.md § 6.2): Sproing Pad + Hum Choir. The Sproing Pad's Pin lasts
// 0.5 s longer (`pinSec`, a duration scaled by Linked Up like Splash Zone's latch; sim/leapers.ts),
// and the Choir's damage auras +5% (`auraPct`, scaled like any link bonus; sim/systems/auras.ts).
// Skitterkin + Skitterkin, Act III mid–late (T704; the Choir half since T607).
import { defineLink } from '../define.ts';

export const bounce_chorus = defineLink({
  id: 'bounce_chorus',
  name: 'Bounce Chorus',
  partners: [
    { tower: 'sproing', bonuses: [], pinSec: 0.5 },
    { tower: 'choir', bonuses: [], auraPct: 0.05 },
  ],
});
