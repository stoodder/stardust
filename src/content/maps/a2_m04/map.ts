// A2M4 · Second Harvest: layout and rules (docs/story/campaign/act2.md § A2M4). Reclamation
// Facility 2, Kip's new plant, at dusk. The road comes in at the north-east, under the gold seams
// on the north cliff, runs west along the cliff's foot, drops into the intake yard and loops round
// Intake B (where the Tidybots unload after every wave, in full view), then runs east under the
// vats and turns down round the conduit to the control core (the core) on the south edge. The big
// vats glow violet in the middle of the plant; their drain hatch, just south of them, is where the
// Hollow surges up from W10 (the `vats` route, a short run down the road's last leg). The
// Lightwings fly in from the north-east, straight over the vats, to the core. Two catwalks either
// side of the hatch are the high ground, the conduit inside the road's last bend is the power node,
// and two wrecked intake hoppers beside Intake B are the intake wreckage (Intake Manifest).
//
// A3M5 revisits this map at night (design/maps.md § 7): the vats, Intake B, and the control core
// are its landmarks. Every route and marker here keeps its id and tile so the revisit can compose
// this layout by reference and add its own band.
import { defineMapLayout } from '../../define.ts';

export const map = defineMapLayout({
  id: 'a2_m04',
  act: 2,
  env: 'act2.dusk',
  objective: 'defend',
  size: { cols: 18, rows: 12 },
  // prettier-ignore
  tiles: [
    '..............S...',
    '........o....o#o..',
    '...############...',
    '...#o.............',
    '.###o.............',
    '.#................',
    'o#.x..............',
    '.#.x..^.S.^.o.....',
    '.############.....',
    '....o..o..o+#o....',
    '........o####.....',
    '.........C........',
  ],
  // prettier-ignore
  paths: [
    {
      // The road: in at the north-east, west along the foot of the cliff under the gold seams,
      // down into the intake yard, round Intake B, east under the vats, and down round the conduit
      // to the control core (39 tiles). Everything but the vats' surge walks it.
      id: 'road',
      tiles: [
        [14, 0], [14, 1], [14, 2],                                  // in at the north-east
        [13, 2], [12, 2], [11, 2], [10, 2], [9, 2], [8, 2],
        [7, 2], [6, 2], [5, 2], [4, 2], [3, 2],                     // west under the cliff
        [3, 3], [3, 4],                                             // into the intake yard
        [2, 4], [1, 4],                                             // west round Intake B
        [1, 5], [1, 6], [1, 7], [1, 8],                             // down past it
        [2, 8], [3, 8], [4, 8], [5, 8], [6, 8], [7, 8],
        [8, 8], [9, 8], [10, 8], [11, 8], [12, 8],                  // east under the vats
        [12, 9], [12, 10],                                          // down round the conduit
        [11, 10], [10, 10], [9, 10],                                // west
        [9, 11],                                                    // into the control core
      ],
    },
    {
      // The vats' surge (from W10): up out of the drain hatch under the vats and onto the road's
      // last leg (12 tiles). Only the Hollow walks it.
      id: 'vats',
      tiles: [
        [8, 7],
        [8, 8], [9, 8], [10, 8], [11, 8], [12, 8],
        [12, 9], [12, 10],
        [11, 10], [10, 10], [9, 10],
        [9, 11],
      ],
    },
  ],
  // The Lightwings come in from the north-east, over the vats, and down to the core.
  // prettier-ignore
  airLanes: [{ id: 'sky', points: [[17, 1], [8, 4], [9, 11]] }],
  // The intake wreckage: two wrecked intake hoppers beside Intake B, over pads.
  underWreckage: { '3,6': 'o', '3,7': 'o' },
  salvage: { '3,6': 40, '3,7': 40 },
  // Markers (render draws the ones it knows as props; the plant's props are T540c's): Intake B
  // (the Tidybots' unloading bay; Nothing Unseen's line), the two intake hoppers (the wreckage
  // Intake Manifest names), the three vats (violet, unsung), the drain hatch the Hollow comes up
  // from (the `vats` route's spawn), and the gold seams on the north cliff.
  markers: {
    intake_b: [2, 6],
    intake_hopper_n: [3, 6],
    intake_hopper_s: [3, 7],
    vat_west: [6, 4],
    vat_middle: [8, 5],
    vat_east: [10, 4],
    seam_west: [6, 0],
    seam_east: [10, 0],
  },
  startCredits: 480,
  stardust: 225,
  // Every Skitterkin group flees (act2.md: Skittish), so their traits are intel only; the
  // Veilwalkers' cloak (detection), the Aelari shields (shield), and the Mote clusters (splash)
  // are the map's three answers (campaign.md § 4.8). Detection is new here (the teach map).
  threatIntel: [
    'skittish',
    'fast',
    'shielded',
    'cloaked',
    'blink',
    'flying',
    'armored',
    'clustered',
  ],
  requiredCounters: ['detection', 'shield', 'splash'],
  // Nothing Unseen (act2.md § A2M4, Medals): every Veilwalker is Revealed before it passes
  // Intake B (D137: a Veilwalker never Revealed since it spawned, past the marker, fails it).
  medals: {
    challenge: {
      id: 'nothing_unseen',
      name: 'Nothing Unseen',
      description: 'Reveal every Veilwalker before it passes Intake B.',
      condition: {
        not: { passedMarker: { marker: 'intake_b', enemy: 'veilwalker', unrevealed: true } },
      },
    },
  },
  // Intake Manifest (act2.md § A2M4, Medals): clear both intake hoppers. It unlocks the manifest
  // codex entry (tonnages, no names; story condition `objectiveDone`).
  objectives: [
    {
      id: 'intake_manifest',
      name: 'Intake Manifest',
      description: 'Clear the intake wreckage.',
      condition: {
        all: [{ wreckageCleared: 'intake_hopper_n' }, { wreckageCleared: 'intake_hopper_s' }],
      },
      intel: 1,
    },
  ],
  // Zibzab walks this shift with you: slot 2 is his Clearance Sale.
  companion: { id: 'zibzab', state: 'present' },
  events: [
    // The truth scene (act2.md § A2M4): the player asks Zibzab, after W4, in W5's build phase. A
    // countdown opens as the wave before it finishes spawning, so it binds to W4's clear: W5's
    // long build phase (LONG_COUNTDOWN) keeps it before W5 starts, with nothing on the field, in
    // every reference run (balance/a2m4.test.ts). It's full-screen (`scene_*`): the battle holds
    // until it ends. The wave-clear jingle turns minor from here (keyed on the scene seen; T513).
    {
      id: 'truth',
      on: { wave: 4, phase: 'cleared' },
      actions: [{ cue: 'a2_m04_scene_truth' }],
    },
  ],
});
