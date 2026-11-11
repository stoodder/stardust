// Acid Rain (design/towers.md § 6.2): Thumper + Gloop Spitter. Each Thumper shell (and each of a
// Cluster Thumper's bomblets) applies 1 Corroded stack to every victim, after the shell's own
// effects, up to LINK_CORRODED_MAX_STACKS (5; content/rules.ts), refreshing the 5 s timer; the
// Gloop gets +0.5 range. Everglow + Skitterkin, Act III mid (T705; sim/puddles.ts lands it).
import { defineLink } from '../define.ts';

export const acid_rain = defineLink({
  id: 'acid_rain',
  name: 'Acid Rain',
  partners: [
    { tower: 'thumper', bonuses: [], corrodedStacks: 1 },
    { tower: 'gloop', bonuses: [{ stat: 'range', flat: 0.5 }] },
  ],
});
