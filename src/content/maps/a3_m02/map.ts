// A3M2 · License Revoked: layout and rules (docs/story/campaign/act3.md § A3M2). The Admin Plaza
// again, at night: a revisit of A1M4 by reference (`revisitOf`, content/compileRevisit.ts), its
// 14×10 layout centred at (4, 2) in 22×14 with its U-road, its 12 pads, the fountain, the three
// billboards and the podium unchanged, so an edit to A1M4 flows here. A1M4's wreckage carts are
// gone (`revisitWreckage: 'gone'`): their tiles are bare paving. The dark band around the plaza is
// this map's own: five pads, the two rift lanes, Sterling's shuttle pad (north-east), and two of
// your old Everglow turrets standing dead on decor.
//
// Everglow Security walks A1M4's road (`road`, from its old spawn at (6,2) down the plaza's west
// side, east along the south, up the east side, past the billboards, and down the east edge to
// the gate at (17,11); 31 tiles): a leak is a repossession. The Hollow come by the road and by two
// rifts that break the band. The west rift (W2) crosses the band along row 4 onto the west side;
// the east rift (W10) cracks in from the east edge, runs west along the band's south row under
// the gate, and turns up into the plaza onto the south side's east end. Both cross only decor and the road,
// never a pad (maps.md § 4), and each cracks as the wave before it starts.
import { defineMapLayout } from '../../define.ts';
import type { GridPos } from '../../types.ts';

/** A1M4's road from tile (x, y) (inclusive) to the gate, on this map's grid. */
// prettier-ignore
const ROAD = [
  [6, 2], [6, 3], [6, 4], [6, 5], [6, 6], [6, 7], [6, 8], [6, 9],          // the west side
  [7, 9], [8, 9], [9, 9], [10, 9], [11, 9], [12, 9], [13, 9], [14, 9],     // the south side
  [14, 8], [14, 7], [14, 6], [14, 5], [14, 4],                             // the east side
  [15, 4], [16, 4], [17, 4],                                               // past the billboards
  [17, 5], [17, 6], [17, 7], [17, 8], [17, 9], [17, 10],                   // down the east edge
  [17, 11],                                                                // the gate
] as const satisfies readonly (readonly [number, number])[];

const roadFrom = (x: number, y: number): GridPos[] => {
  const i = ROAD.findIndex(([a, b]) => a === x && b === y);
  return ROAD.slice(i).map(([a, b]) => [a, b]);
};

export const map = defineMapLayout({
  id: 'a3_m02',
  act: 3,
  env: 'act3',
  objective: 'defend',
  revisitOf: 'a1_m04',
  revisitAt: [4, 2],
  revisitWreckage: 'gone',
  size: { cols: 22, rows: 14 },
  // The band only: '*' is A1M4's footprint, composed in unchanged. The band's five pads: north of
  // the west rift (2,3); beside the east rift where it turns up into the plaza (11,12) and below
  // the gate (16,12); and beside the gate court's east edge (19,6) and (19,9).
  // prettier-ignore
  tiles: [
    '......................',
    '......................',
    '....**************....',
    '..o.**************....',
    '....**************....',
    '....**************....',
    '....**************.o..',
    '....**************....',
    '....**************....',
    '....**************.o..',
    '....**************....',
    '....**************....',
    '...........o....o.....',
    '......................',
  ],
  // A1M4's road (`road`) comes with its layout; the band adds no road of its own.
  paths: [],
  riftLanes: [
    // The west rift (W2): in from the west edge along row 4, onto the west side at (6,4) (35).
    {
      id: 'rift_w',
      opensAtWave: 2,
      tiles: [[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], ...roadFrom(6, 4)],
    },
    // The east rift (W10): in from the east edge along the band's south row, up under the south
    // side's east end onto the road at (12,9), and with it up the east side to the gate (32).
    {
      id: 'rift_e',
      opensAtWave: 10,
      // prettier-ignore
      tiles: [
        [21, 13], [20, 13], [19, 13], [18, 13], [17, 13], [16, 13], [15, 13], [14, 13], [13, 13],
        [12, 13], [12, 12], [12, 11], [12, 10],
        ...roadFrom(12, 9),
      ],
    },
  ],
  // A1M4's markers come with its layout (the billboards (9,2), (12,2), (15,2), now dark with the
  // hum-glyph over Evie's smile; the fountain (10,6); the podium (7,7), empty tonight; the
  // Peeker's planter (12,5)). The band's own: Sterling's shuttle pad (it lifts during W12), and
  // two of your old Everglow turrets standing dead.
  markers: {
    shuttle_pad: [20, 3],
    dead_turret_1: [1, 11],
    dead_turret_2: [20, 12],
  },
  startCredits: 650,
  stardust: 300,
  // Armor (the Compliance Drones and the Expediters) and splash (the Mote clusters and the
  // Fractures) are the map's answers (campaign.md § 4.8). The haste aura and the rifts are intel.
  threatIntel: ['armored', 'haste_aura', 'splitting', 'clustered'],
  requiredCounters: ['armor', 'splash'],
  // Back on Your Feet (act3.md § A3M2, Medals): no leak during W8–W9, the two waves after the
  // revocation.
  medals: {
    challenge: {
      id: 'back_on_your_feet',
      name: 'Back on Your Feet',
      description: 'Nothing gets through in waves 8 and 9.',
      condition: { leaks: { waves: [8, 9] }, lte: 0 },
    },
  },
  // Bricks rides along (slot 2: Suppressing Fire); slot 1 is Orbital Strike until the cue.
  companion: { id: 'bricks', state: 'present' },
  events: [
    // The Clean Exit (act3.md § A3M2): 12 s into W7, mid-column (waves.ts W7_GAP), so an
    // early W8 call can't skip it. Sterling revokes the Everglow class with the most credits
    // invested (100% refund) and the Orbital Strike uplink, and QUILL's lockout begins.
    {
      id: 'clean_exit',
      on: { wave: 7, phase: { afterSec: 12 } },
      actions: [
        { cue: 'a3_m02_cue_revoke' },
        { revokeTowerClass: { select: 'mostInvested', faction: 'everglow' }, refundPct: 100 },
        { revokeAbility: 'orbital_strike' },
        { setModifier: 'quillLockout', on: true },
      ],
    },
    // QUILL's lockout leaks: one per countdown from W8 (core-loop.md § 2.2), the wave's key trait.
    ...[8, 9, 10, 11, 12, 13, 14, 15].map((w) => ({
      id: `leak_w${String(w).padStart(2, '0')}`,
      on: { wave: w, phase: 'countdown' as const },
      actions: [{ cue: `a3_m02_cue_leak_w${String(w).padStart(2, '0')}` }],
    })),
    // Sterling's shuttle lifts from the north-east pad during W12 and its lights cross the sky
    // (render's; no line).
    {
      id: 'shuttle',
      on: { wave: 12, phase: { afterSec: 10 } },
      actions: [{ cue: 'a3_m02_cue_shuttle' }],
    },
  ],
});
