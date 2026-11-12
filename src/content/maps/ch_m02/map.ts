// CH_M02 · Lights Out (design/maps.md § 8, challenge maps; T862): the colony's north wall at
// sundown again, and every unit that comes over it is cloaked. A2M6's layout by reference (read
// from its map.ts, never copied): the two roads down from the Spires through the two gates, the
// merge under the old watchtower, the yard road to the domes, the Rift Moths' lane across the wall,
// its markers, and its four wall lamps. The dark comes down as it did at Sundown (dusk through W3,
// full dark from W11, as A2M6's own schedule runs), so the lamps and a beaming Prism still keep a tower's range; but nothing can
// be shot until something sees it.
//
// The rule (sim/rules.ts `challengeConfig`): `allCloaked`, so every hostile unit spawns cloaked
// (content/challenge.ts gives the content side the same view: every unit carries the `cloaked`
// trait, so detection is a required counter). The reference owns one detector, the Lookout Shack
// (the Seer's Lantern and Scanner Sweep aren't the reference's), so where the Lookouts stand is the
// map. Ves'thara walks with you (slot 2: Stillness, which still reaches what it can't see).
import { defineMapLayout } from '../../define.ts';
import { map as a2m06 } from '../a2_m06/map.ts';

export const map = defineMapLayout({
  id: 'ch_m02',
  act: 'challenge',
  env: a2m06.env,
  objective: 'defend',
  size: a2m06.size,
  tiles: a2m06.tiles,
  paths: a2m06.paths,
  airLanes: a2m06.airLanes ?? [],
  markers: a2m06.markers ?? {},
  lights: a2m06.lights ?? [],
  lighting: a2m06.lighting ?? [],
  challenge: {
    tagline: 'Every unit comes in cloaked.',
    rules: [{ kind: 'allCloaked' }],
  },
  startCredits: 2200,
  coreIntegrity: 20,
  // A challenge pays Intel for its medals, never Stardust.
  stardust: 0,
  threatIntel: ['cloaked', 'clustered', 'splitting', 'flying', 'phasing'],
  // Detection first (nothing is shot unseen), then Sundown's own two: splash and air.
  requiredCounters: ['detection', 'splash', 'air'],
  // Seen at the Gate: every unit is Revealed before it passes the watchtower.
  medals: {
    challenge: {
      id: 'seen_at_the_wall',
      name: 'Seen at the Wall',
      description: 'Reveal every unit before it passes the watchtower.',
      condition: { not: { passedMarker: { marker: 'watchtower', unrevealed: true } } },
    },
  },
  companion: { id: 'vesthara', state: 'present' },
});
