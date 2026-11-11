// dev_silence (T702): the jamming core on its own, before dev_jam's rings and healer (T703, T707)
// can run. dev_jam's road and pads (devM7.ts): a road east along row 1, down column 10, and east
// into the core (13,6); pads along row 2 (in a Silencer's 2.5-tile reach of the road) and row 4
// (out of it, but (12,4) beside the column). W1 is one Silencer, the teach: its tendril picks the
// Hum Choir at (7,2) over the tier-3 Rivet behind it at (5,2). W2 is a pair; par's eight towers
// keep two jams at once at 25% (harness #10), and par casts System Reboot in it. Slot 1 is System Reboot. Its own file, so
// devBattle.ts (which registers it in DEV_CONTENT) imports it without a cycle: only the DevIds
// type comes back from there. smoke/jam.spec.ts and src/sim/jam.test.ts run it.
import { mapDefinersFor } from '../../content/define.ts';
import type { DevIds } from './devBattle.ts';
import { jamMap } from './devM7.ts';

const dev = mapDefinersFor<DevIds>();

export const silenceMap = dev.defineMap({
  ...jamMap,
  id: 'dev_silence',
  threatIntel: ['armored', 'jammer'],
  startCredits: 1500,
  waves: dev.defineWaves([
    // One Silencer, alone (the teach): its tendril picks the Choir at (7,2).
    { groups: [{ enemy: 'silencer', count: 1, route: 'a' }] },
    // A pair, 2 s apart.
    { countdownSec: 10, groups: [{ enemy: 'silencer', count: 2, route: 'a' }] },
  ]),
  parBuild: {
    loadout: ['rivet', 'choir'],
    steps: [
      { wave: 1, build: 'choir', tile: [7, 2] },
      { wave: 1, build: 'rivet', tile: [3, 2] },
      { wave: 1, build: 'rivet', tile: [5, 2] },
      { wave: 1, build: 'rivet', tile: [1, 2] },
      { wave: 1, build: 'rivet', tile: [12, 2] },
      { wave: 1, build: 'rivet', tile: [3, 4] },
      { wave: 1, build: 'rivet', tile: [5, 4] },
      { wave: 1, build: 'rivet', tile: [7, 4] },
      { wave: 1, upgrade: [5, 2] },
      { wave: 1, upgrade: [5, 2] },
      { wave: 1, upgrade: [12, 2] },
      { wave: 1, upgrade: [12, 2] },
      { wave: 2, ability: 1, when: { afterSec: 15 } },
    ],
  },
});
