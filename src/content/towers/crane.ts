// Salvage Crane (design/towers.md § 7): Zibzab's greed choice, Vrell, no attack until Magnet
// Crane. T1 (150): +10 credits as each wave resolves; kills by any tower within 2.5 tiles pay +1;
// wreckage within 2.5 tiles clears at double speed for +25% salvage. T2 (120): +18 per wave. T3
// (225): +28 per wave, +2 per kill. Haggler's Stall (450): also 2% interest on banked credits as
// each wave resolves (at most +40). Magnet Crane (450): every 6 s it grabs a Mechanical or armored
// ground enemy within 2.5 tiles, lifts it (Pinned 1.5 s), and slams it for 150 Kinetic; the
// economy stays. Design target: a T1 Crane built on wave 1 pays for itself by about wave 8.
// Licensed after A2M1 (upgrades/access.ts). A T400a stub: T408 runs it and confirms these numbers,
// and createSim refuses it until then (`tower.crane`, `tower.economy`; Magnet Crane also
// `attack.targetFilter` and `status.pinned`). Sprites are placeholders (T440b).
import { defineTower } from '../define.ts';

export const crane = defineTower({
  id: 'crane',
  name: 'Salvage Crane',
  faction: 'vrell',
  role: 'Economy',
  sprites: { base: 'tower.crane', head: 'tower.crane_head', icon: 'icon.tower.crane' },
  tiers: [
    {
      cost: 150,
      targets: { ground: false, air: false },
      defaultPriority: null,
      economy: { perWave: 10, perKill: 1, radiusTiles: 2.5, salvageSpeedMul: 2, salvagePct: 0.25 },
    },
    { cost: 120, economy: { perWave: 18 } },
    { cost: 225, economy: { perWave: 28, perKill: 2 } },
  ],
  specs: {
    a: { name: "Haggler's Stall", cost: 450, economy: { interestPct: 0.02, interestCap: 40 } },
    b: {
      name: 'Magnet Crane',
      cost: 450,
      targets: { ground: true, air: false },
      defaultPriority: 'strong',
      attack: {
        kind: 'hitscan',
        type: 'kinetic',
        damage: 150,
        ratePerSec: 1 / 6,
        rangeTiles: 2.5,
        targetFilter: { bodies: ['mechanical'], armored: true },
      },
      effects: [{ status: 'pinned', durationSec: 1.5 }],
    },
  },
});
