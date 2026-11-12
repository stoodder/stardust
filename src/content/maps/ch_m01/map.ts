// CH_M01 · Skitterkin Only (design/maps.md § 8, challenge maps; T862): the Preserve again, after
// the dawn, and only the warrens' towers deploy. A revisit of A3M1 by reference (`revisitOf`,
// content/compileRevisit.ts) with no band: the whole 22×14 bowl, its spiral, the north road, both
// rifts (north from W2, east from W6, as A3M1 opens them), and the Rift Moths' lane, composed in
// unchanged. Here it is a Defend map: the back gate (2,13) is the core, and the Hollow come out of
// the basin and down the north road toward it. An edit to A3M1's layout flows here.
//
// The rule (sim/rules.ts `challengeConfig`): `towerFaction: 'skitterkin'`, so the loadout is the
// four homes the warrens gave (the Scuttle Den, the Hum Choir, the Gloop Spitter, the Sproing Pad)
// and nothing else. Bramble walks with you (slot 2: Underfoot), on her own road this time.
import { defineMapLayout } from '../../define.ts';

export const map = defineMapLayout({
  id: 'ch_m01',
  act: 'challenge',
  // After the dawn: the finale's palette (post-game maps read the finale's dials).
  env: 'finale',
  objective: 'defend',
  revisitOf: 'a3_m01',
  // A3M1's tile (0, 0) sits at the grid's: the whole grid, no band.
  revisitAt: [0, 0],
  size: { cols: 22, rows: 14 },
  // prettier-ignore
  tiles: [
    '**********************',
    '**********************',
    '**********************',
    '**********************',
    '**********************',
    '**********************',
    '**********************',
    '**********************',
    '**********************',
    '**********************',
    '**********************',
    '**********************',
    '**********************',
    '**********************',
  ],
  // A3M1's routes, rifts, air lane, and markers come with its layout.
  paths: [],
  challenge: {
    tagline: "Only the warrens' towers deploy.",
    rules: [{ kind: 'towerFaction', faction: 'skitterkin' }],
  },
  startCredits: 650,
  coreIntegrity: 20,
  // A challenge pays Intel for its medals, never Stardust.
  stardust: 0,
  threatIntel: ['clustered', 'splitting', 'gathering', 'armored', 'flying', 'phasing', 'burrowing'],
  // The warrens answer all three: the Gloop (splash), the Sproing Pad (air), the Den and Underfoot
  // (burrowed).
  requiredCounters: ['splash', 'air', 'burrowed'],
  // No Digger Gets Home: no Undertow reaches the gate.
  medals: {
    challenge: {
      id: 'nothing_underfoot',
      name: 'Nothing Underfoot',
      description: 'Let no Undertow reach the gate.',
      condition: { leaks: { enemy: 'undertow' }, lte: 0 },
    },
  },
  companion: { id: 'bramble', state: 'present' },
});
