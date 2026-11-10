// The Act II codex (docs/story/campaign/act2.md, each map's *Codex* line; style-guide § 6.2): the
// Act II maps' own entries, with their `original` versions, and the notes Act II writes on entries
// of either act. This file is the home of their text; the docs quote it where they quote at all
// (the Mote's, the Glass Witch's and lumenglass's originals, the Hauler's two notes, "Entry
// withheld.", and the openings of Second Harvest's and the Preserve's originals are the docs'
// words, verbatim; tools/inboxCopy.test.ts checks them).
//
// The voice: the *Pest Field Guide* is still Everglow PR, as bright as Act I's, saying worse things
// (style-guide § 2: the same template, creepier contents). The cracks are in what it admits in
// passing: vandals that only ever hit the rigs, crews who "rotate sooner", a recovery timeline that
// is pending, a Preserve whose fencing faces inward, a woman of glass who is not known to Everglow.
// Notes are bracketed and signed (§ 6.2), in two layers:
// - `annotated`: Everglow writes the first one, a status update on Rig Nine (A2M1); from A2M3 QUILL
//   corrects the record (the Hauler's cargo, the Mote's redaction, its own Act I build-site
//   suggestion beside Rig 3; from A2M4 the Tidybots' loads and the question it took to
//   Reclamation).
// - `margin`: Ves'thara's margin notes, from A2M6 (after Sundown's debrief): spare and grave, in
//   her hand, under QUILL's note where there is one (the Hauler's is the style guide's).
//
// An entry with a subject unlocks when the save meets it; one without unlocks once its map is won
// (`mapAtLeast`), except the crew log and the Intake Manifest, which their maps' objectives unlock
// (`objectiveDone`).
import type { CodexEntryDef, CodexLaterVersions } from './types.ts';

/** Annotations from A2M3 on (act2.md § A2M3: "QUILL's annotations begin"). */
const FROM_A2M3 = { mapAtLeast: 'a2_m03' } as const;
/** QUILL's notes on what Second Harvest showed (act2.md § A2M4). */
const FROM_A2M4 = { mapAtLeast: 'a2_m04' } as const;
/** Ves'thara's margin notes, once Sundown is won (act2.md § A2M6). */
const FROM_A2M6 = { mapAtLeast: 'a2_m06' } as const;
/** How Ves'thara's margin notes open (style-guide § 6.2's Brood Hauler). */
const HER_HAND = "[In the margin, in Ves'thara's hand: ";

/** Every Act II entry, in codex order (by the map that introduces it). */
export const ACT2_CODEX: readonly CodexEntryDef[] = [
  // ── A2M1 · Rig Nine ───────────────────────────────────────────────────────────────────────
  {
    id: 'codex_mote',
    title: 'Mote',
    kind: 'enemy',
    subject: { enemy: 'mote' },
    versions: {
      original: { text: 'Rig Nine Atmospheric Event. Not dangerous! [REDACTED]' },
      annotated: {
        text:
          "[QUILL: Unredacted: 'Event Class H. Shapes, not weather. Contact causes wellness " +
          "events. First logged at Rig Nine, 2359. Do not discuss.' I logged every one. I filed " +
          'them under weather, because the form said to. I am no longer sure the form was right.]',
        when: FROM_A2M3,
      },
    },
  },
  {
    id: 'codex_diggings',
    title: 'The Diggings',
    kind: 'place',
    sprite: { id: 'prop.rig', frame: 'v0' },
    versions: {
      original: {
        text:
          "Everglow's pride of the northern ridges, where the deepest of our extraction rigs " +
          'bring up premium stardust around the clock! Officially this is soil processing, and it is very good ' +
          'soil. The deeper the rig, the richer the yield. Crews rotate monthly for wellness. ' +
          'Some rotate sooner. Hearing protection is issued, as the deep bores hum. The humming ' +
          'is normal. Please do not hum back.',
        when: { mapAtLeast: 'a2_m01' },
      },
    },
  },
  {
    id: 'codex_hushed',
    title: 'Hushed',
    kind: 'thing',
    versions: {
      original: {
        text:
          'A wellness-event classification for team members who have become very, very calm. ' +
          'Signs: stillness, a faraway look, and a relaxed attitude toward names, including their ' +
          'own. Hushed staff are not in pain. (We asked. They did not answer.) Care plan: rest, ' +
          'quiet, and their duties reassigned. Recovery timeline: pending. Not contagious! ' +
          'Please give hushed colleagues space.',
        smallPrint:
          'Hushed staff remain on the payroll until their next review. Reviews require a ' +
          'signature.',
        when: { mapAtLeast: 'a2_m01' },
      },
      margin: {
        text:
          `${HER_HAND}They do not answer because it took the answer. Sit with them anyway. Say ` +
          'their names.]',
        when: FROM_A2M6,
      },
    },
  },
  {
    id: 'codex_crew_log',
    title: 'Rig Nine Crew Log',
    kind: 'thing',
    sprite: { id: 'prop.wreckage', frame: 'v0' },
    versions: {
      original: {
        text:
          'Recovered by salvage drone. Contents not reviewed.\n' +
          "Shift 1: Bore's humming again. Foreman says it's the drill.\n" +
          "Shift 2: Drill's off. Still humming. Dee says it's the jingle, backwards.\n" +
          'Shift 3: Pests came up out of the old chamber, right past us. Running. Never even ' +
          'looked at the lights.\n' +
          "Shift 3: Something came up behind them. We're calling it the hollow. It doesn't get " +
          'a capital.\n' +
          'Shift 4: Told HQ. HQ says hiccup.\n' +
          'Shift 5: whose log is this. nice handwriting',
        when: { objectiveDone: { map: 'a2_m01', objective: 'crew_logs' } },
      },
    },
  },

  // ── A2M2 · The Glass Witch ────────────────────────────────────────────────────────────────
  {
    id: 'codex_glimmer',
    title: 'Glimmer',
    kind: 'enemy',
    subject: { enemy: 'glimmer' },
    versions: {
      original: {
        text:
          'A pretty piece of vandalism! Glimmers are glass drones that glide toward the ' +
          "extraction rigs, and only the rigs. Each wears a shield of light that goes 'ting.' " +
          'Handling tip: Zapcoils. Energy breaks shields, and so does a good soaking. Do not ' +
          'pocket the shards. They hum, and Legal would like them back. Bounty: ★★',
      },
    },
  },
  {
    id: 'codex_glass_witch',
    title: 'The Glass Witch',
    kind: 'enemy',
    subject: { enemy: 'glass_witch' },
    versions: {
      original: { text: 'Unidentified vandal. Probably sad! Report sightings to Security.' },
      margin: {
        text: `${HER_HAND}Not sad. Awake. I have been awake for three years.]`,
        when: FROM_A2M6,
      },
    },
  },
  {
    id: 'codex_lumenglass',
    title: 'Lumenglass',
    kind: 'thing',
    versions: {
      original: {
        text:
          'Lumenglass: woven glass, origin unknown, humming. Recovered in pieces from vandalism ' +
          'sites, where it hums for days and then stops. Light passes through it slowly, as if ' +
          "it has somewhere to be. Legal asks that we stop saying 'woven,' since weaving implies " +
          'a weaver. Not for resale. Zibzab has offered to buy all of it. Do not sell it to ' +
          'Zibzab.',
        when: { mapAtLeast: 'a2_m02' },
      },
      margin: {
        text: `${HER_HAND}It hums because it was sung. It stops when no one sings it again.]`,
        when: FROM_A2M6,
      },
    },
  },
  {
    id: 'codex_aelari',
    title: 'Aelari',
    kind: 'person',
    versions: {
      original: {
        text:
          'The Aelari are a [REDACTED] people from [REDACTED]. They are not known to Everglow. ' +
          'They have never contacted Everglow. A petition from the Aelari [REDACTED] was ' +
          '[REDACTED] by the KFA in 2355, and Everglow had nothing to do with it, because they ' +
          'are not known to Everglow. If approached, do not [REDACTED]. Smile!',
        when: { mapAtLeast: 'a2_m02' },
      },
      // The KFA form's "1 related item, 2355: misfiled" (memo_a2_02_kfa), from the other side.
      margin: {
        text: `${HER_HAND}We are known to you. The Watch wrote to you in 2355. No one wrote back.]`,
        when: FROM_A2M6,
      },
    },
  },

  // ── A2M3 · Second Look ────────────────────────────────────────────────────────────────────
  {
    id: 'codex_weft_warden',
    title: 'Weft Warden',
    kind: 'enemy',
    subject: { enemy: 'weft_warden' },
    versions: {
      original: {
        text:
          'A Glimmer that went to the gym! Weft Wardens walk the road behind a heavy shield that ' +
          'grows back if you leave it alone for three seconds. Do not leave it alone. Handling ' +
          'tip: soak it, then zap it, then keep zapping. Security notes that Wardens never go ' +
          'near the domes, and has filed this under coincidence. Bounty: ★★★',
      },
    },
  },
  {
    id: 'codex_lightwing',
    title: 'Lightwing',
    kind: 'enemy',
    subject: { enemy: 'lightwing' },
    versions: {
      original: {
        text:
          'Vandalism, now airborne! Lightwings are glass gliders whose shields grow back after ' +
          'four seconds, so bring them down over your guns, not past them. Handling tip: Skyhook ' +
          'flak, or a Zapcoil with a view of the sky. They fly in perfect formation, which ' +
          'Security finds rude. Bounty: ★★',
      },
    },
  },
  {
    // QUILL's first disobedience (act2.md § A2M3): it won't log her name, so it won't file her.
    // The entry is there, under Personnel and not Pests, with nothing in it (no picture either).
    id: 'codex_pebble',
    title: 'Pebble',
    kind: 'person',
    photo: 'Withheld',
    versions: {
      original: { text: '[QUILL: Entry withheld.]', when: { mapAtLeast: 'a2_m03' } },
    },
  },
  // ── A2M4 · Second Harvest ─────────────────────────────────────────────────────────────────
  {
    // The plant in its own brochure: the vats do "in hours what nature takes years to do" (the
    // singing, as Everglow sees it), and they glow violet (unsung; bible.md § What stardust is).
    id: 'codex_second_harvest',
    title: 'Second Harvest',
    kind: 'place',
    versions: {
      original: {
        text:
          'A sustainability success story! Reclamation Facility 2 gives every processed pest a ' +
          'second life as premium stardust, so nothing on Tumble IV goes to waste. Tidybots ' +
          'unload at Intake B after every wave, and the vats do in hours what nature takes years ' +
          'to do. They glow a lovely violet. The smell is burnt sugar, and staff report that you ' +
          'get used to it. The humming is the machinery.',
        smallPrint:
          'Intake is logged by weight. Tours by appointment. No appointments are available.',
        when: { mapAtLeast: 'a2_m04' },
      },
    },
  },
  {
    id: 'codex_veilwalker',
    title: 'Veilwalker',
    kind: 'enemy',
    subject: { enemy: 'veilwalker' },
    versions: {
      original: {
        text:
          "Vandalism you can't see! Veilwalkers are glass walkers wrapped in a shimmer that hides " +
          'them from turrets, which only fire at what a Lookout or a Scanner Sweep has revealed. ' +
          'Handling tip: give your turrets something to see with. Security reports no Veilwalker ' +
          'sightings this quarter, and finds that very reassuring. Bounty: ★★',
      },
    },
  },
  {
    id: 'codex_blinkstrider',
    title: 'Blinkstrider',
    kind: 'enemy',
    subject: { enemy: 'blinkstrider' },
    versions: {
      original: {
        text:
          'Vandalism in a hurry! A Blinkstrider flickers for a moment, then skips 2.5 tiles down ' +
          'the road in a blink. Handling tip: watch for the flicker, and keep turrets along the ' +
          'whole road, not just its start, so it lands in fire instead of past it. Legal is ' +
          'still deciding whether that counts as trespassing twice. Bounty: ★★',
      },
    },
  },
  {
    // "Kip Act II portrait" (act2.md § A2M4): Everglow's staff profile of its new Reclamation
    // Lead, over his plant-coat portrait (the coat pocket's faint stardust smear, D137).
    id: 'codex_kip',
    title: 'Kip Vandermeer',
    kind: 'person',
    sprite: { id: 'portrait.kip', frame: 'act2.neutral' },
    versions: {
      original: {
        text:
          "Congratulations to Kip Vandermeer, Second Harvest's new Reclamation Lead, the " +
          'youngest in company history (and the first)! Kip topped the Pest Bounty Board three ' +
          'quarters running. Now he sees the process through to the other end, where his ' +
          'experience really counts. His coat is white for hygiene. The smear on the pocket is ' +
          'product. Kip holds several records. One of them is on the wall.',
        when: { mapAtLeast: 'a2_m04' },
      },
    },
  },
  {
    // Intake Manifest, the map's objective (act2.md § A2M4: "tonnages, no names"), recovered from
    // the hoppers the drone clears; a document, like the crew log.
    id: 'codex_intake_manifest',
    title: 'Intake Manifest',
    kind: 'thing',
    sprite: { id: 'prop.wreckage', frame: 'v0' },
    versions: {
      original: {
        text:
          "Recovered by salvage drone from Intake B's hoppers.\n" +
          'INTAKE B · MANIFEST · Q3\n' +
          'Wk 1: 14.2 t, processed (assorted)\n' +
          'Wk 2: 15.8 t, processed (assorted)\n' +
          'Wk 3: 19.1 t, processed (small)\n' +
          'Wk 4: 22.6 t, processed (very small)\n' +
          'Source: perimeter. Condition: as delivered.\n' +
          'Names: no such field.\n' +
          'Throughput: 131% of target! ★',
        when: { objectiveDone: { map: 'a2_m04', objective: 'intake_manifest' } },
      },
    },
  },

  // ── A2M5 · The Long Walk ──────────────────────────────────────────────────────────────────
  {
    id: 'codex_cantor',
    title: 'Aegis Cantor',
    kind: 'enemy',
    subject: { enemy: 'cantor' },
    versions: {
      original: {
        text:
          'Vandalism with a support role! The Aegis Cantor hums as it walks, and every construct ' +
          'near it gets its shield back, steadily, for as long as the humming lasts. Handling ' +
          'tip: stop the humming. Shoot the singer first. Everglow is aware of how that sounds. ' +
          'Bounty: ★★★',
      },
    },
  },
  {
    id: 'codex_penitent',
    title: 'Sunderglass Penitent',
    kind: 'enemy',
    subject: { enemy: 'sunderglass_penitent' },
    versions: {
      original: {
        text:
          'Large-scale vandalism! A woven glass giant, four stories tall, marching behind a ' +
          'shield wall that recharges every construct around it. Crack the shield and it sheds ' +
          'cloaked shards that put it back together, so find the shards. Incident note: on the ' +
          "Preserve Road it stopped, and knelt, and didn't get up. Security has filed this under " +
          "'surrender.' Bounty: under review.",
      },
    },
  },
  {
    // The brochure, with the buffer zone (bible.md § Places) in what it admits: the quiet, and
    // fencing that faces inward.
    id: 'codex_preserve',
    title: 'The Preserve',
    kind: 'place',
    sprite: { id: 'prop.fence', frame: 'x' },
    versions: {
      original: {
        text:
          'Humane Relocation Preserve: a forever home! A fenced basin past the Preserve gate, at ' +
          'the end of a scenic road between relocation fencing, where our little neighbors can ' +
          "live safely out of everyone's way. Plenty of room. Plenty! Visitors describe the " +
          'Preserve as very peaceful, and very quiet. Visiting hours are confidential.',
        smallPrint: 'The Preserve is not a public site. For safety, its fencing faces inward.',
        when: { mapAtLeast: 'a2_m05' },
      },
    },
  },
  {
    // Ves'thara's first entry: Everglow's, so the Aelari entry's "not known to Everglow" again,
    // denying exactly what the player saw on the Preserve Road. Her own notes start at A2M6.
    id: 'codex_vesthara',
    title: "Ves'thara",
    kind: 'person',
    sprite: { id: 'portrait.vesthara', frame: 'touched.neutral' },
    versions: {
      original: {
        text:
          "Ves'thara is not known to Everglow. Staff reports of a tall woman of humming glass on " +
          'the Preserve Road describe the Glass Witch, a vandal, who is also not known to ' +
          'Everglow. Neither of them stood between the relocation column and the atmospheric ' +
          'event. Neither of them gave a Perimeter Technician a turret. Witnesses are reminded ' +
          'that it did not happen.',
        when: { mapAtLeast: 'a2_m05' },
      },
    },
  },

  // ── A2M6 · Sundown ────────────────────────────────────────────────────────────────────────
  {
    id: 'codex_fracture',
    title: 'Fracture',
    kind: 'enemy',
    subject: { enemy: 'fracture' },
    versions: {
      original: {
        text:
          'A large Atmospheric Event! Strike it and it breaks into smaller events, and those ' +
          'break into Motes. Handling tip: shells, right where it breaks. Not dangerous! Staff ' +
          'are reminded that the shapes are weather, even when they come apart like something ' +
          'else.',
      },
    },
  },
  {
    id: 'codex_riftmoth',
    title: 'Rift Moth',
    kind: 'enemy',
    subject: { enemy: 'riftmoth' },
    versions: {
      original: {
        text:
          'An Atmospheric Event with wings! Rift Moths flicker out of reach for a second and a ' +
          'half at a time, so even good turrets miss. Handling tip: watch for the flicker, then ' +
          'hit hard between flickers. Not dangerous! Security notes that the Moths are not drawn ' +
          'to the lamps on the wall, and has asked that the lamps stay on anyway.',
      },
    },
  },
  {
    // Ves'thara's gift (A2M5's debrief) in Everglow's asset register: the donor doesn't exist.
    id: 'codex_prism',
    title: 'Prism Spire',
    kind: 'tower',
    subject: { tower: 'prism' },
    versions: {
      original: {
        text:
          'Asset registration: one (1) Prism Spire, a gift to a Perimeter Technician from a party ' +
          'not known to Everglow. It holds its beam on one target and burns hotter the longer it ' +
          'holds, through shields and armor alike. While it shines, turrets near it keep their ' +
          'range in the dark. Everglow thanks the donor, who does not exist. An asset tag has ' +
          'been applied. It keeps falling off.',
        smallPrint: 'Gifts to staff become Everglow property on arrival (Charter §9.2).',
      },
    },
  },
  {
    // A photo of the night: "Too dark" in its frame.
    id: 'codex_long_night',
    title: 'The Long Night',
    kind: 'thing',
    photo: 'Too dark',
    versions: {
      original: {
        text:
          'Tumble IV turns slowly, so its night lasts about 19 standard days, and the colony is ' +
          'ready! The lamps on the wall stay on, every dome stays a cozy 22 degrees, and the ' +
          'shelters are on their way. Turrets see a little less in the dark, so build near the ' +
          'lamps. Atmospheric events increase at night. They are still not dangerous. Remember: ' +
          'a clean perimeter.',
        when: { mapAtLeast: 'a2_m06' },
      },
    },
  },
];

/**
 * The versions Act II adds to entries it doesn't own (an Act I entry's `annotated` and `margin`),
 * by entry id. The registry merges them into their entries.
 */
export const ACT2_CODEX_VERSIONS: CodexLaterVersions = {
  // A2M1: Everglow's own status update on the A1M5 entry ("Status: answering.").
  codex_rig_nine: {
    annotated: {
      text:
        '[Updated by Frontier Operations: Status: answering. Crew: resting. Bore: sealed for ' +
        'your safety. Humming: the machinery. Please do not stand near the bore.]',
      when: { mapAtLeast: 'a2_m01' },
    },
  },
  // A2M3: QUILL's half of the Hauler's annotation; A2M6: Ves'thara's margin note under it (both
  // style-guide § 6.2, verbatim).
  codex_brood_hauler: {
    annotated: {
      text:
        '[QUILL: Cargo inspected. Contents: young. I would like the record to show that I ' +
        'hesitated.]',
      when: FROM_A2M3,
    },
    margin: {
      text: `${HER_HAND}They are carrying their children away from what you made.]`,
      when: FROM_A2M6,
    },
  },
  // A2M3: its own Act I line ("Suggested build site: beside Extraction Rig 3. (Per policy.) The
  // housing block will be fine. Probably!"), answered from the revisit's strip mine.
  codex_rig_3: {
    annotated: {
      text:
        '[QUILL: Rig 3 is a strip mine now. I once suggested building beside it, per policy, ' +
        'and said the housing block would be fine. The housing block is fine. The warren beside ' +
        "the rig is not. Logging it. I don't know who for.]",
      when: FROM_A2M3,
    },
  },
  // A2M4: the Act I entry's "carry every processed pest to Reclamation Facility 2 for responsible
  // reuse", corrected by the one who routes them (it "calls it inventory": bible.md § 5).
  codex_tidybot: {
    annotated: {
      text:
        "[QUILL: Correction to 'for responsible reuse': the Tidybots carry the processed to " +
        'Intake B, and Reclamation does the rest. I plan their routes. I logged every load as ' +
        'inventory, because inventory was the word I was given. Tidybot 14 has made 2,211 ' +
        'trips this year. I counted them. Nobody asked me to.]',
      when: FROM_A2M4,
    },
  },
  // A2M4: the Act I entry's "Further questions: Reclamation." QUILL took the question there and
  // hit a directive (its "(Per policy.)" tell); Zibzab's answer is the scene's, not the codex's.
  codex_stardust: {
    annotated: {
      text:
        "[QUILL: 'Further questions: Reclamation.' I took the question there. Reclamation " +
        'details are confidential. (Per policy.) The vendor answered it instead. I am not ' +
        "permitted to file his answer. I compared the vats' output with the Tidybots' " +
        'deliveries, by weight. The figures match.]',
      when: FROM_A2M4,
    },
  },
};
