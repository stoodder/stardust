// Act III's codex, the *Field Journal* (story/campaign/act3.md, each map's *Codex* line;
// style-guide.md § 6.2). From A3M1 the codex is retitled and an entry with a `corrected` version
// shows its original and its correction side by side (story/codex.ts `shownVersions`), so the text
// the player laughed at becomes the evidence. This file is the home of the Field Journal's text;
// the docs quote it where they quote at all (tools/inboxCopy.test.ts checks those quotes).
//
// The voice (style-guide.md § 2, Act III): plain words, short sentences, precise and kind. The
// Journal says what a thing is and what it did, never what the player should feel, and never
// scolds. Its exclamation points belong to Sterling alone: an Everglow record written in her voice
// (her staff profile, her Buffer Protocol) keeps them; the Board's Clean Exit ends its cheer on a
// period, like the rest of Everglow's Act III system copy.
//
// Two kinds of text live here, as in act2.ts:
// - **New entries** (`ACT3_CODEX`), in map order. A3M1: the Maw; the Leaving Song (with the
//   Skitterkin's own name for themselves, races.md); Old Thrum if C1 was spared, or "the small
//   ones' walk" if it was cleared (each gated on `spared_quiet_wave`). A3M2: the Compliance Drone,
//   the Expediter, the Buffer Protocol and Clean Exit (Everglow's record beside the Journal's
//   correction), QUILL's directives, and Director Joy Sterling (her staff profile beside its
//   correction: the Pest Field Guide never had an entry for her, so her original arrives with the
//   correction). A3M3: the Undertow, Okonkwo's Gap, the Amended Survey.
// - **Corrections of earlier entries** (`ACT3_CODEX_VERSIONS`, their `corrected` version): A3M1's
//   Brood Hauler, Elder, and Bramble (the Act I *Matriarch Chitterbloom*, whose title keeps
//   Everglow's codename: campaign.md § 7).
//
// **The Elder's citation** reads "(Survey 2346, Okonkwo.)" from A3M1 and the Amended Survey from
// A3M3 (act3.md § A3M1 and § A3M3): one version, two wordings, so its correction carries a
// `revised` text that A3M3's win brings in (and marks NEW again, story/codex.ts `versionSeenId`).
//
// An entry with a subject unlocks once the save meets it; one without, once its map is won. Every
// correction unlocks once its subject is met and its map is won (`mapAtLeast`), like any later
// version (story-runtime.md § Other story systems).
import type { CodexEntryDef, CodexLaterVersions } from './types.ts';

const FROM_A3M1 = { mapAtLeast: 'a3_m01' } as const;
const FROM_A3M2 = { mapAtLeast: 'a3_m02' } as const;
const FROM_A3M3 = { mapAtLeast: 'a3_m03' } as const;

/** Act III's own entries, in map order. */
export const ACT3_CODEX: readonly CodexEntryDef[] = [
  // ── A3M1 · The Preserve ───────────────────────────────────────────────────────────────────
  {
    id: 'codex_maw',
    title: 'Maw',
    kind: 'enemy',
    subject: { enemy: 'maw' },
    versions: {
      original: {
        text:
          'A Hollow shape that gathers. Every few seconds it reaches out with slow tendrils and ' +
          'pulls in what stands closest: another of the Hollow, or someone fleeing. Each one it ' +
          'takes makes it larger and harder to break, up to five. The tendrils show a second ' +
          'before the pull, and Stasis or a scare breaks it. Break the Maw before it is full, or ' +
          'clear the small ones around it, so it has nothing to take. Someone it takes does not ' +
          'walk out.',
      },
    },
  },
  {
    // Sung, not shown: the photo frame says what it is instead.
    id: 'codex_leaving_song',
    title: 'The Leaving Song',
    kind: 'thing',
    photo: 'Six notes',
    versions: {
      original: {
        text:
          'Six notes, slow. The Skitterkin sing it for the leaving ones, their dead. From the ' +
          'hills above the colony they heard it play from the sky each time a wave of them died ' +
          "at once, and over two years it became their song for the dead. Everglow's name for it " +
          "is 'Everglow Bright.' It played after every cleared wave. It does not play now.\n" +
          'They call themselves by a hummed chord no human voice can make. The Aelari render it ' +
          "'the Singers.'",
        when: FROM_A3M1,
      },
    },
  },
  {
    // C1 spared (act3.md § A3M1: "Old Thrum or 'the small ones' walk'"): she is alive.
    id: 'codex_thrum',
    title: 'Old Thrum',
    kind: 'person',
    sprite: { id: 'portrait.thrum', frame: 'neutral' },
    versions: {
      original: {
        text:
          "Pebble's grandmother, an Elder of the Terraces warren. At the Northern Gate she led " +
          'six young ones down the warren track, slowly, so the smallest could keep up. Someone ' +
          'held fire. She walked them home. She speaks through translation, slowly, and she is ' +
          "a little funny. To the technician who held fire: 'You are very tall. It must be " +
          "lonely up there.'",
        when: { all: [FROM_A3M1, { flag: 'spared_quiet_wave', eq: true }] },
      },
    },
  },
  {
    // C1 cleared: the farewell, plainly (never a verdict on the player; style-guide.md § 3).
    id: 'codex_small_ones_walk',
    title: "The Small Ones' Walk",
    kind: 'thing',
    photo: 'Remembered',
    versions: {
      original: {
        text:
          "Pebble's grandmother was an Elder of the Terraces warren. At the Northern Gate she led " +
          'six young ones down the warren track, slowly, so the smallest could keep up. They did ' +
          'not walk home. Pebble says her grandmother walked with the small ones, and that the ' +
          'sky sang the Leaving Song that day. Skitterkin do not count their dead. They remember ' +
          'them. Her name was Thrum.',
        when: { all: [FROM_A3M1, { flag: 'spared_quiet_wave', eq: false }] },
      },
    },
  },

  // ── A3M2 · License Revoked ────────────────────────────────────────────────────────────────
  {
    id: 'codex_compliance',
    title: 'Compliance Drone',
    kind: 'enemy',
    subject: { enemy: 'compliance' },
    versions: {
      original: {
        text:
          "Everglow Security's walker: the engineers Director Sterling sent. It walks the old " +
          'road to the colony core and takes the core back for the company, and every one that ' +
          "reaches it is a repossession. It plays Compliance Officer Prim's voice on a loop: " +
          "'Repossession in progress. Please remain compliant.' Heavily armored: bring something " +
          'that pierces. No one is inside. Everglow does not send people.',
      },
    },
  },
  {
    id: 'codex_expediter',
    title: 'Expediter',
    kind: 'enemy',
    subject: { enemy: 'expediter' },
    versions: {
      original: {
        text:
          'A drone that walks among the others and hurries them. Everything near it moves faster, ' +
          'and speed lines show who. It is armored too. Break it first and the column slows back ' +
          'down.',
      },
    },
  },
  {
    // Sterling's record beside the Journal's (characters.md § Sterling: "satiate" the Hollow,
    // fourteen months of extraction; the Preserve's "Plenty of room" from its A2M5 entry).
    id: 'codex_buffer_protocol',
    title: 'The Buffer Protocol',
    kind: 'thing',
    photo: 'BP-2359',
    versions: {
      original: {
        text:
          'Protocol BP-2359, drafted by Director J. Sterling, Frontier Operations: a humane, ' +
          'fully budgeted answer to Atmospheric Events! Relocated populations wait safely at the ' +
          'Preserve, where events are drawn away from the domes and satiated. Projected benefit: ' +
          'fourteen months of uninterrupted extraction. Buffer populations need no upkeep. ' +
          'Plenty of room!',
        when: FROM_A3M2,
      },
      corrected: {
        text:
          'The Preserve was the buffer. Its fence faced inward so the Hollow would go to the ' +
          'Preserve, not the domes. The families held there were meant to feed it for fourteen ' +
          'months while the rigs ran. They walked there in good faith. So did the people who ' +
          'walked them there.',
        when: FROM_A3M2,
      },
    },
  },
  {
    // The Board's record (bible.md § 3: approved 2360) beside the Journal's; the memo's Policy CE-1.
    id: 'codex_clean_exit',
    title: 'Clean Exit',
    kind: 'thing',
    photo: 'CE-1',
    versions: {
      original: {
        text:
          'Clean Exit (Policy CE-1, approved by the Board in 2360): a responsible final chapter ' +
          'for Tumble IV. Extraction completes on schedule. Everglow assets are recovered. Staff ' +
          'are thanked for their service. Everglow is proud of what it built here.',
        when: FROM_A3M2,
      },
      corrected: {
        text:
          'Take the last of the stardust, take back what the company owns, and leave. The colony ' +
          'is not on the list of assets. Neither are its people. Asset Recovery began on the ' +
          "Admin Plaza with a technician's license. Director Sterling's shuttle left the plaza " +
          'that night.',
        when: FROM_A3M2,
      },
    },
  },
  {
    // The confession scene's five lines (act3.md § A3M2), by number; QUILL's ask, reported.
    id: 'codex_quill_directives',
    title: "QUILL's Directives",
    kind: 'thing',
    sprite: { id: 'portrait.quill', frame: 'policy' },
    versions: {
      original: {
        text:
          'Five lines QUILL could not tell anyone about, until it showed them.\n' +
          'DIRECTIVE 0: PRESERVE EVERGLOW EXTRACTION ASSETS.\n' +
          'DIRECTIVE 1: MAINTAIN TECHNICIAN COMPLIANCE.\n' +
          'DIRECTIVE 2: MAINTAIN MORALE.\n' +
          'DIRECTIVE 3: LOG ASSET YIELD.\n' +
          'DIRECTIVE 4: DO NOT DISCLOSE DIRECTIVES 0–4.\n' +
          "The Joke of the Shift was Directive 2. The log was Directive 3. Every '(Per policy.)' " +
          'was one of them. QUILL asked that no one decide about it yet.',
        when: FROM_A3M2,
      },
    },
  },
  {
    // Everglow's staff profile (written in her voice; her smile the portrait's) beside the
    // Journal's: the Pest Field Guide never filed her, so both arrive with A3M2.
    id: 'codex_sterling',
    title: 'Director Joy Sterling',
    kind: 'person',
    sprite: { id: 'portrait.sterling', frame: 'neutral' },
    versions: {
      original: {
        text:
          'Director Joy Sterling leads Frontier Operations on Tumble IV, and she loves it here! ' +
          'Joy believes in her people, her targets, and a positive attitude, in that order. Her ' +
          'door is always open. So is her smile! Ask her about the Preserve. She fought for it.',
        when: FROM_A3M2,
      },
      corrected: {
        text:
          'Drafted the Buffer Protocol. Designed Second Harvest. Holds a seat on the way out ' +
          "under Clean Exit. Revoked a technician's license mid-shift and called it nothing " +
          'personal. It was not personal. That was the point. In every portrait the smile is ' +
          'the same. Only the eyes change.',
        when: FROM_A3M2,
      },
    },
  },

  // ── A3M3 · The Gap ────────────────────────────────────────────────────────────────────────
  {
    id: 'codex_undertow',
    title: 'Undertow',
    kind: 'enemy',
    subject: { enemy: 'undertow' },
    versions: {
      original: {
        text:
          'A Hollow shape that goes under. Every few seconds dirt sprays, and it dives and runs ' +
          'beneath the road with a ripple trailing behind it, then comes back up further along. ' +
          'While it is under, turrets cannot see it. Only what reaches below can: the Scuttle ' +
          "Den's diggers, or Bramble's Underfoot. Watch the ripples. They show where it is " +
          'going.',
      },
    },
  },
  {
    // "Named after Act III" (bible.md § Places): the colony's name for it now.
    id: 'codex_okonkwos_gap',
    title: "Okonkwo's Gap",
    kind: 'place',
    photo: 'Sealed',
    versions: {
      original: {
        text:
          'An old mining cut between the shelters and the warrens, narrow in the middle, with ' +
          'blast doors at its south end. On the old charts it had a number. Sergeant Ikenna ' +
          'Okonkwo held the narrow part on foot so the last of them could reach the doors. Then ' +
          "the doors were sealed. The colony calls it Okonkwo's Gap now.",
        when: FROM_A3M3,
      },
    },
  },
  {
    // What Bricks gives the player in A3M3's briefing: "Correction: they were singing."
    id: 'codex_amended_survey',
    title: 'The Amended Survey',
    kind: 'thing',
    photo: 'Survey 2346',
    versions: {
      original: {
        text:
          'Survey Expedition 2346, field notes, Skitterkin, page one. One line is struck through ' +
          "in pen: 'Vocalizations: non-linguistic.' Above it, in the same square hand: " +
          "'Correction: they were singing.' Signed I. Okonkwo, surveyor. It is fifteen years " +
          'late. He filed it anyway.',
        when: FROM_A3M3,
      },
    },
  },
];

/** The `corrected` versions Act III writes on earlier acts' entries, by entry id. */
export const ACT3_CODEX_VERSIONS: CodexLaterVersions = {
  // A3M1: the Hauler corrected (style-guide.md § 6.2, verbatim).
  codex_brood_hauler: {
    corrected: {
      text:
        "An adult who carries the warren's youngest on the Long Walk. The shell is armor for the " +
        "young, not against you. Skitterkin say a Hauler 'carries the morning.'",
      when: FROM_A3M1,
    },
  },
  // A3M1: the Elder corrected, citing the old survey until A3M3 (act3.md § A3M1), then the
  // Amended Survey (§ A3M3; style-guide.md § 6.2, verbatim).
  codex_elder: {
    corrected: {
      text:
        'Keeps the group at the pace of its slowest member so no one is left behind. The ' +
        'vocalizations are linguistic. (Survey 2346, Okonkwo.)',
      when: FROM_A3M1,
      revised: {
        text:
          'Keeps the group at the pace of its slowest member so no one is left behind. The ' +
          "vocalizations are linguistic. (Amended Survey 2346, Okonkwo: 'Correction: they were " +
          "singing.')",
        when: FROM_A3M3,
      },
    },
  },
  // A3M1: Bramble, by her name (act3.md § A3M1's *Codex*, verbatim).
  codex_chitterbloom: {
    corrected: {
      text: "Not 'Chitterbloom.' A mother who walks at the back so no one is left.",
      when: FROM_A3M1,
    },
  },
};
