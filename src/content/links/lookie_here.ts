// Lookie Here (design/towers.md § 6.2): Seer's Lantern + Sproing Pad. The Sproing Pad gets +0.5
// range and its leapers pick a Marked unit first among the flyers (or among the ground units when
// none flies; `preferMarked`, sim/leapers.ts), so the Lantern points and the leaper boings; the
// Lantern gets +0.5 detection radius (`detectRadiusTiles`, like Overwatch's Lookout). Aelari +
// Skitterkin, Act III mid–late (T704).
import { defineLink } from '../define.ts';

export const lookie_here = defineLink({
  id: 'lookie_here',
  name: 'Lookie Here',
  partners: [
    { tower: 'lantern', bonuses: [], detectRadiusTiles: 0.5 },
    { tower: 'sproing', bonuses: [{ stat: 'range', flat: 0.5 }], preferMarked: true },
  ],
});
