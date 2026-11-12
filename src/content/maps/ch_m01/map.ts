// CH_M01 · Skitterkin Only (design/maps.md § 8, challenge maps; T862): the Preserve again, after
// the dawn, and only the warrens' towers deploy. A3M1's layout by reference (read from its map.ts,
// never copied): the whole 22×14 bowl, its terraces, the spiral, the north road, both rifts (north
// from W2, east from W6, as A3M1 opens them), the Rift Moths' lane, and its markers but the gate.
// Here it is a Defend map: the back gate (2,13) is the core (a marker can't sit on it), and the
// Hollow come out of the basin and down the north road toward it. An edit to A3M1's layout flows
// here. (Not a `revisitOf`: a revisit adds a band around its original and keeps every marker.)
//
// The rule (sim/rules.ts `challengeConfig`): `towerFaction: 'skitterkin'`, so the loadout is the
// four homes the warrens gave (the Scuttle Den, the Hum Choir, the Gloop Spitter, the Sproing Pad)
// and nothing else. Bramble walks with you (slot 2: Underfoot), on her own road this time.
import { defineMapLayout } from '../../define.ts';
import { map as a3m01 } from '../a3_m01/map.ts';

/** A3M1's markers but the gate, the core tile here. */
const { gate: _gate, ...MARKERS } = a3m01.markers ?? {};

export const map = defineMapLayout({
  id: 'ch_m01',
  act: 'challenge',
  // After the dawn: the finale's palette (post-game maps read the finale's dials).
  env: 'finale',
  objective: 'defend',
  size: a3m01.size,
  tiles: a3m01.tiles,
  ...(a3m01.terraces === undefined ? {} : { terraces: a3m01.terraces }),
  paths: a3m01.paths,
  riftLanes: a3m01.riftLanes ?? [],
  airLanes: a3m01.airLanes ?? [],
  markers: MARKERS,
  challenge: {
    name: 'Skitterkin Only',
    tagline: "Only the warrens' towers deploy.",
    rules: [{ kind: 'towerFaction', faction: 'skitterkin' }],
  },
  startCredits: 2000,
  coreIntegrity: 20,
  // A challenge pays Intel for its medals, never Stardust.
  stardust: 0,
  threatIntel: ['clustered', 'splitting', 'gathering', 'armored', 'flying', 'phasing'],
  // The Gloop answers the crowds (splash) and the Sproing Pad the sky (air): the two jobs only the
  // warrens' homes can share out here. (No Undertows: against diggers the Pad out-bonks the Den,
  // so a burrowed counter would only ask for more Pads.)
  requiredCounters: ['splash', 'air'],
  // Grounded: no Rift Moth reaches the gate (the Pads' job, in reach of the Gloops once pinned).
  medals: {
    challenge: {
      id: 'grounded',
      name: 'Grounded',
      description: 'Let no Rift Moth reach the gate.',
      condition: { leaks: { enemy: 'riftmoth' }, lte: 0 },
    },
  },
  companion: { id: 'bramble', state: 'present' },
});
