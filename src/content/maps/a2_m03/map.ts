// A2M3 · Second Look: layout and rules (docs/story/campaign/act2.md § A2M3). The Terraces again,
// at dusk: a revisit of A1M2 by reference (`revisitOf`, content/compileRevisit.ts), its 14×10
// layout centred at (2, 1) in 18×12 with its road, pads, terraces and markers unchanged, so an
// edit to A1M2 flows here (a2_m03.test.ts pins the pads this map composes to). The new band is the
// strip mine: Rig 3's dig, cut to bare grey earth down the east edge, its floor the mine road and
// four benches on its far wall. The warren mouth is where A1M2's spawn was, one tile in from the
// north edge, and it stays there (the band row above it is the warren's spoil, not road): everything
// the warren sends runs south down the switchbacks to the gate. Ves'thara's constructs come another
// way: down the strip mine's floor from the north-east and along the foot of the terraces to the
// gate's outer side, and the Lightwings fly the same line overhead. The Peeker's rock is still at
// the warren mouth halfway down the east side, beside the strip mine; once W3 is cleared it holds
// Pebble.
import { defineMapLayout } from '../../define.ts';

export const map = defineMapLayout({
  id: 'a2_m03',
  act: 2,
  env: 'act2.gold',
  objective: 'defend',
  revisitOf: 'a1_m02',
  revisitAt: [2, 1],
  size: { cols: 18, rows: 12 },
  // The band only: '*' is A1M2's footprint, composed in unchanged. The strip mine's floor (column
  // 16) is the mine road; its benches are two pairs of pads on the far wall, (17,1)–(17,2) at the
  // top and (17,8)–(17,9) at the foot.
  // prettier-ignore
  tiles: [
    '................S.',
    '..**************#o',
    '..**************#o',
    '..**************#.',
    '..**************#.',
    '..**************#.',
    '..**************#.',
    '..**************#.',
    '..**************#o',
    '..**************#o',
    '..**************#.',
    '......###########.',
  ],
  // The band steps down beside each of A1M2's terraces; the strip mine's floor (column 16) is cut
  // down to the lowest level all the way, between A1M2's east edge and the benches.
  // prettier-ignore
  terraces: [
    '222222222222222202',
    '22**************02',
    '22**************02',
    '22**************02',
    '11**************01',
    '11**************01',
    '11**************01',
    '00**************00',
    '00**************00',
    '00**************00',
    '00**************00',
    '000000000000000000',
  ],
  // prettier-ignore
  paths: [
    {
      // The mine road: down the strip mine's floor from the north-east, west along the foot of the
      // terraces, and up into the gate from outside (23 tiles). The Aelari walk it, and the Hollow
      // from W5.
      id: 'mine',
      tiles: [
        [16, 0], [16, 1], [16, 2], [16, 3], [16, 4], [16, 5], [16, 6],
        [16, 7], [16, 8], [16, 9], [16, 10], [16, 11],              // down the strip mine
        [15, 11], [14, 11], [13, 11], [12, 11], [11, 11],
        [10, 11], [9, 11], [8, 11], [7, 11], [6, 11],               // the foot of the terraces
        [6, 10],                                                    // into the gate
      ],
    },
  ],
  // The Lightwings fly the mine road's line: down over the strip mine, along the foot of the
  // terraces, into the gate. The benches and A1M2's east pads (14,2) and (14,8) reach the first
  // leg; only Terrace 3's lip reaches the second.
  // prettier-ignore
  airLanes: [{ id: 'sky', points: [[16, 0], [16, 11], [6, 11], [6, 10]] }],
  // A1M2's markers come with its layout (the pump station (12,7), the Peeker's rock (15,5), Rig 3
  // (11,4), the housing block (6,4), the scarecrow (13,4)); the warren's spoil heap over the mouth
  // and the exposed warrens with their eggs, cut open beside the road, are this map's own decor.
  markers: {
    warren_spoil: [13, 0],
    warren_1: [12, 2],
    warren_2: [3, 5],
    warren_3: [11, 5],
    warren_4: [9, 10],
  },
  // The mining scars (design/maps.md § 7; render-only): grey streaks over A1M2's grass, two mining
  // cuts to bare earth slicing down across the terraces (the west one from the top terrace to the
  // middle, the east one from the middle to the foot, beside the strip mine; never a pad), and the
  // strip mine cut to bare earth down the east band, its benches and floor.
  dressing: [
    { kind: 'greySoil', area: 'all' },
    { kind: 'mineScar', area: { from: [2, 1], to: [3, 5] } },
    { kind: 'mineScar', area: { from: [14, 6], to: [15, 10] } },
    { kind: 'mineScar', area: { from: [16, 0], to: [17, 11] } },
  ],
  // The light goes from gold to dusk across the shift (cosmetic; D114), arriving as W11 starts.
  lighting: [{ wave: 11, env: 'act2.dusk' }],
  // Pebble's rock: clickable once W3 is cleared (the map script below), named for the cursor and the screen
  // reader. The player hasn't met her yet, so it's still the Peeker's rock.
  clickables: { peeker: { name: "The Peeker's rock" } },
  startCredits: 550,
  stardust: 210,
  // Every Skitterkin group flees (act2.md: Skittish), so their traits are intel only; the Wardens'
  // heavy shields and the Glimmers' (shield), the Lightwings over the mine (air), and the Mote
  // clusters (splash) are the map's three answers (campaign.md § 4.8). 550 credits (act2.md
  // planned 460): three fronts from W6, the road, the mine, and the air.
  threatIntel: ['skittish', 'fast', 'armored', 'huddle', 'shielded', 'flying', 'clustered'],
  requiredCounters: ['shield', 'air', 'splash'],
  // Clear Skies (act2.md § A2M3, Medals): no Lightwing gets through.
  medals: {
    challenge: {
      id: 'clear_skies',
      name: 'Clear Skies',
      description: 'No Lightwing gets through.',
      condition: { leaks: { enemy: 'lightwing' }, lte: 0 },
    },
  },
  // Bricks walks this shift with you: slot 2 is his Suppressing Fire.
  companion: { id: 'bricks', state: 'present' },
  events: [
    // Pebble's rescue (design/core-loop.md § 6.9): once W3's Haulers are gone (W3 cleared: W4's
    // long build phase, hands free, before its Warden; a countdown opens as the wave before it
    // finishes spawning, so W4 is still being fought when W5's opens and clears only once W5 has
    // begun), the rock holds her and lights up, and the app plays its lights-up sound; the
    // player's click (or W6's clear, if they never click) plays the rescue cue, a pausing panel,
    // so it always lands before W7's radio names her.
    {
      id: 'pebble_on',
      on: { wave: 3, phase: 'cleared' },
      actions: [
        { setClickable: { marker: 'peeker', on: true, fallback: { wave: 6, phase: 'cleared' } } },
      ],
    },
    { id: 'pebble', on: { interacted: 'peeker' }, actions: [{ cue: 'a2_m03_cue_pebble' }] },
  ],
});
