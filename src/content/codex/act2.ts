// The Act II codex (docs/story/campaign/act2.md, each map's *Codex* line; style-guide § 6.2): the
// Act II maps' own entries, with their `original` versions, and the `annotated` versions Act II
// adds to entries of either act. This file is the home of their text; the docs quote it where they
// quote at all (the Mote's, the Glass Witch's and lumenglass's originals, the Hauler's annotation and
// "Entry withheld." are the docs' words, verbatim; tools/inboxCopy.test.ts checks them).
//
// The voice: the *Pest Field Guide* is still Everglow PR, as bright as Act I's, saying worse things
// (style-guide § 2: the same template, creepier contents). The cracks are in what it admits in
// passing: vandals that only ever hit the rigs, crews who "rotate sooner", a recovery timeline that
// is pending. Annotations are bracketed and signed (§ 6.2). Everglow writes the first one, a status
// update on Rig Nine (A2M1); from A2M3 QUILL starts to correct the record: the Hauler's cargo, the
// Mote's redaction, its own Act I build-site suggestion beside Rig 3. Ves'thara's margin notes
// join from A2M6 (M5).
//
// An entry with a subject unlocks when the save meets it; one without unlocks once its map is won
// (`mapAtLeast`), except the crew log, which the Crew Logs objective unlocks (`objectiveDone`).
import type { CodexEntryDef, CodexLaterVersions } from './types.ts';

/** Annotations from A2M3 on (act2.md § A2M3: "QUILL's annotations begin"). */
const FROM_A2M3 = { mapAtLeast: 'a2_m03' } as const;

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
          "Everglow's pride of the northern ridges: nine extraction rigs bringing up premium " +
          'stardust around the clock! Officially this is soil processing, and it is very good ' +
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
];

/**
 * The versions Act II adds to entries it doesn't own (an Act I entry's `annotated`), by entry id.
 * The registry merges them into their entries.
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
  // A2M3: QUILL's half of the Hauler's annotation (style-guide § 6.2, verbatim); Ves'thara's
  // margin note joins it from A2M6.
  codex_brood_hauler: {
    annotated: {
      text:
        '[QUILL: Cargo inspected. Contents: young. I would like the record to show that I ' +
        'hesitated.]',
      when: FROM_A2M3,
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
};
