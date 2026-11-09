// Zapcoil (design/towers.md § 7): Zibzab's anti-shield chain, Vrell, ground and air. "Chains to 3
// targets" is the first hit plus `jumps: 2`, each jump 20% weaker than the one before (compounding:
// 10 / 8 / 6.4); tier 3 chains to 4. Energy, so Soaked enemies take +25% (the Conductive link with
// the Sprinkler adds 2 jumps and the Soak). The chain rules are sim/attacks/chain.ts's. Licensed
// as Zibzab's free sample after A1M3 (upgrades/access.ts). Sprites are placeholders under their
// final ids (T311a). Its specs (T407b; design/towers.md § 7):
// - Overload Coil: chains to 8 (7 jumps), −10% per jump; tier 3's damage, rate, and reach.
// - Capacitor Bank: a `charge` attack (sim/attacks/charge.ts): it charges 4 s on its target, then
//   discharges 250 Energy into it plus 50% to enemies within 1 tile. Default Strong. Its
//   `ratePerSec` (0.25) restates the 4 s cycle: the charge is the period, and rate bonuses shorten
//   it. Range stays tier 3's 2.5 (the docs give none).
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
  specs: {
    a: {
      name: 'Overload Coil',
      cost: 360,
      attack: { jumps: 7, falloffPct: 0.1 },
    },
    b: {
      name: 'Capacitor Bank',
      cost: 360,
      defaultPriority: 'strong',
      // A different kind replaces the attack whole (types.ts TierPatch).
      attack: {
        kind: 'charge',
        type: 'energy',
        damage: 250,
        ratePerSec: 0.25,
        rangeTiles: 2.5,
        chargeSec: 4,
        splashTiles: 1.0,
        splashPct: 0.5,
      },
    },
  },
});
