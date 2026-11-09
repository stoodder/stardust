// A2M3 · Second Look: layout and rules (docs/story/campaign/act2.md § A2M3). The Terraces again,
// at dusk: a revisit of A1M2 by reference (`revisitOf`, content/compileRevisit.ts), its 14×10
// layout centred at (2, 1) in 18×12 with its road, pads, terraces and markers unchanged, so an
// edit to A1M2 flows here (a1_m02.test.ts pins the pads this map composes). The new band is the
// strip mine: Rig 3's dig, cut to bare grey earth down the east edge, with four benches stepping
// down its west wall. The warren mouth is where A1M2's spawn was, one tile in from the north edge
// (the band row above it is the warren's spoil, not road): everything the warren sends runs south
// down the switchbacks to the gate. Ves'thara's constructs come another way: the mine road runs
// down the strip mine's floor from the north-east corner and along the foot of the terraces to
// the gate's outer side, and the Lightwings fly the same line overhead. The Peeker's rock is still
// at the warren mouth halfway down the east side; from W5 it holds Pebble.
import { defineMapLayout } from '../../define.ts';

export const map = defineMapLayout({
  id: 'a2_m03',
  act: 2,
  env: 'act2.gold',
  objective: 'defend',
  revisitOf: 'a1_m02',
  revisitAt: [2, 1],
  size: { cols: 18, rows: 12 },
  // The band only: '*' is A1M2's footprint, composed in unchanged. The strip mine's benches are
  // two pairs of pads, (16,1)–(16,2) at the top and (16,8)–(16,9) at the foot; its floor is the mine road.
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
  // The band steps down beside each of A1M2's terraces; the strip mine's floor (column 17) is cut
  // down to the lowest level all the way, so its west wall shows as a cliff beside the benches.
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
      // The mine road: down the strip mine's floor from the north-east corner, west along the foot
      // of the terraces, and up into the gate from outside (24 tiles). Only the Aelari walk it,
      // and the Hollow in W10's push.
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
  // terraces, into the gate. Only the benches sit under the first leg; nothing of A1M2's reaches
  // it but from Terrace 3's lip.
  // prettier-ignore
  airLanes: [{ id: 'sky', points: [[16, 0], [16, 11], [6, 11], [6, 10]] }],
  // A1M2's markers come with its layout (the pump station (12,7), the Peeker's rock (15,5), Rig 3
  // (11,4), the housing block (6,4), the scarecrow (13,4)); the warren's spoil heap over the mouth
  // is this map's own decor.
  markers: { warren_spoil: [13, 0] },
  // The mining scars (design/maps.md § 7; render-only): grey streaks over A1M2's grass, and the
  // strip mine cut to bare earth down the east band, its benches and floor.
  dressing: [
    { kind: 'greySoil', area: 'all' },
    { kind: 'mineScar', area: { from: [16, 0], to: [17, 11] } },
  ],
  // The light goes from gold to dusk across the shift (cosmetic; D114): it has arrived by W11.
  lighting: [{ wave: 11, env: 'act2.dusk' }],
  // Pebble's rock: clickable from W5 (the map script below), named for the cursor and the screen
  // reader. The player hasn't met her yet, so it's still the Peeker's rock.
  clickables: { peeker: { name: "The Peeker's rock" } },
  startCredits: 550,
  stardust: 210,
  // Every Skitterkin group flees (act2.md: Skittish), so their traits are intel only; the Wardens'
  // heavy shields and the Glimmers' (shield), the Lightwings over the mine (air), and the Mote
  // clusters (splash) are the map's three answers (campaign.md § 4.8).
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
    // Pebble's rescue (design/core-loop.md § 6.9): as W5's runners go by, the rock holds her and
    // lights up; the player's click (or W6's clear, if they never click) plays the rescue cue.
    {
      id: 'pebble_on',
      on: { wave: 5, phase: 'start' },
      actions: [
        { setClickable: { marker: 'peeker', on: true, fallback: { wave: 6, phase: 'cleared' } } },
      ],
    },
    { id: 'pebble', on: { interacted: 'peeker' }, actions: [{ cue: 'a2_m03_cue_pebble' }] },
  ],
});
