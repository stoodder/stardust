// Sticky Flak (design/towers.md § 6.2): Skyhook + Gloop Spitter. Each Skyhook burst (and each
// Seeker Swarm missile) applies 1 Corroded stack to every victim, up to LINK_CORRODED_MAX_STACKS
// (5; content/rules.ts), refreshing the 5 s timer, so armored flyers shed armor for the flak; the
// Gloop fires 10% faster. Everglow + Skitterkin, Act III mid (T705; sim/puddles.ts lands it).
import { defineLink } from '../define.ts';

export const sticky_flak = defineLink({
  id: 'sticky_flak',
  name: 'Sticky Flak',
  partners: [
    { tower: 'skyhook', bonuses: [], corrodedStacks: 1 },
    { tower: 'gloop', bonuses: [{ stat: 'rate', pct: 0.1 }] },
  ],
});
