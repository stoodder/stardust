// Zapcoil (design/towers.md § 7): Zibzab's anti-shield chain, Vrell, ground and air. "Chains to 3
// targets" is the first hit plus `jumps: 2` (each jump −20%); tier 3 chains to 4. createSim refuses
// it until T304b runs chain attacks (FEATURE_GATES `attack.chain`; sim/attacks/chain.ts). Licensed
// as Zibzab's free sample after A1M3 (upgrades/access.ts). Its specs (Overload Coil, Capacitor Bank)
// are M4's (D064). Sprites are placeholders under their final ids (T311a).
import { defineTower } from '../define.ts';

export const zapcoil = defineTower({
  id: 'zapcoil',
  name: 'Zapcoil',
  faction: 'vrell',
  role: 'Anti-shield chain',
  sprites: { base: 'tower.zapcoil', head: 'tower.zapcoil_head', icon: 'icon.tower.zapcoil' },
  tiers: [
    {
      cost: 120,
      targets: { ground: true, air: true },
      defaultPriority: 'first',
      attack: {
        kind: 'chain',
        type: 'energy',
        damage: 10,
        ratePerSec: 1.0,
        rangeTiles: 2.5,
        jumps: 2,
        jumpRangeTiles: 1.5,
        falloffPct: 0.2,
      },
    },
    { cost: 95, attack: { damage: 14 } },
    { cost: 180, attack: { jumps: 3, ratePerSec: 1.2 } },
  ],
});
