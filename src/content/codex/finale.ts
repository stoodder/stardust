// The finale's Field Journal entries (story/campaign/finale.md § FIN, *Codex*; style-guide.md
// § 6.2), the last pages of the Journal. This file is their text's home; finale.md describes them.
//
// The voice is Act III's (codex/act3.ts's header): plain words, precise and kind; the Journal says
// what a thing is and what it did, never what to feel, and never scolds. Four of the five open on
// Everglow's record beside the Journal's correction, as A3M2's Buffer Protocol and Clean Exit do;
// Everglow's records are the automated voice now (no exclamation point, the euphemism dictionary:
// "Atmospheric Event", "soil processing"; races.md):
// - **The Unsung** (`unsung`): Everglow's "Atmospheric Event" file unlocks on meeting it (Phase 2);
//   the Journal's correction once the map is won, so a player who loses Phase 2 isn't told the end.
// - **The Deep Halls**, **the Deep Bore**, and **the Long Walk** (Everglow's "Surge Corridor"):
//   both versions once the map is won.
// - **The last page**: one line, REMEMBERED: {pests_processed} (the lifetime count the countdown
//   started from; the finale adds no Skitterkin kills to it), in pencil where the bounty stars used
//   to go. No entry differs by C4 or C5.
import type { CodexEntryDef } from './types.ts';

const FROM_FIN = { mapAtLeast: 'fin_m01' } as const;

/** The finale's entries, in the order finale.md lists them. */
export const FINALE_CODEX: readonly CodexEntryDef[] = [
  {
    id: 'codex_unsung',
    title: 'The Unsung',
    kind: 'enemy',
    subject: { enemy: 'unsung' },
    versions: {
      original: {
        text:
          'Atmospheric Event, Deep Halls. Magnitude: unrated. Event activity is concentrated at ' +
          'the mouth of the Halls and is expected to dissipate once extraction is complete. ' +
          'Extraction assets should keep clear. No action is required.',
      },
      corrected: {
        text:
          'Everything dug out of the Deep Halls and never sung, in one place. It rose at the mouth ' +
          'of the Halls when the choir began to sing there. It gathered what was near it, came ' +
          'apart, went under the ground toward the singers, and at the end it sang back: the ' +
          'jingle, out of tune, the last thing many of it had heard. Every piece broken inside the ' +
          'song was laid to rest. The last of it stopped fighting the song and joined it. The ' +
          "Skitterkin call the Hollow 'the ones who weren't sung.' These were.",
        when: FROM_FIN,
      },
    },
  },
  {
    id: 'codex_deep_halls',
    title: 'The Deep Halls',
    kind: 'place',
    photo: 'Singing',
    versions: {
      original: {
        text:
          "Soil Processing Site DH-1, beneath the Spires: Tumble IV's oldest and richest " +
          'deposits. Processing since 2349; deep bores since 2357. Crews reporting "the quiet" ' +
          'are reminded that ambient sound in the caverns is geological (Survey 2346).',
        when: FROM_FIN,
      },
      corrected: {
        text:
          'Caverns under the Spires where the Skitterkin have sung their dead for forty thousand ' +
          'years, until each one rests as stardust. The deposits are the oldest dead of a whole ' +
          'people. The Aelari learned song-weaving here, forgot what it was for, and came back to ' +
          'learn mourning again. In 2359 Rig Nine broke into one of the oldest chambers, and the ' +
          'Hollow rose from it. On the last night of the Long Night a choir sang at the mouth of ' +
          'the Halls until morning. The sound in the caverns is singing.',
        when: FROM_FIN,
      },
    },
  },
  {
    // memo_a3_06 opened its window; the finale's secondary timer.
    id: 'codex_deep_bore',
    title: 'The Deep Bore',
    kind: 'thing',
    photo: 'DB-1',
    versions: {
      original: {
        text:
          'Deep Bore DB-1 (Clean Exit, final phase): the last extraction rig on Tumble IV, ' +
          'drilling to the last deposit under the Halls. Output is allocated to the Everglow ' +
          'Ascendant. The window closes when the Ascendant departs. No action is required.',
        when: FROM_FIN,
      },
      corrected: {
        text:
          "Everglow's last drill, aimed at the oldest dead under the Halls, to fill the Ascendant " +
          "before it left. It ran all through the last night, beside the choir's road. The Hollow " +
          'converged on it. The Ascendant left early, with a partial load. The rig is still ' +
          'there. Nothing comes up out of it now.',
        when: FROM_FIN,
      },
    },
  },
  {
    // The star map's struck "Surge corridor" (from A2M5 won it reads "The Long Walk").
    id: 'codex_long_walk',
    title: 'The Long Walk',
    kind: 'place',
    photo: 'North',
    versions: {
      original: {
        text:
          'Surge Corridor (Everglow survey designation): the seasonal route pest surges take ' +
          'through the valley, north to south. Everglow Gardens sits across it. Perimeter ' +
          'defenses are sited accordingly.',
        when: FROM_FIN,
      },
      corrected: {
        text:
          'The Skitterkin road between the Brightwater basin and the Deep Halls, walked for forty ' +
          'thousand years: north to the Halls at dusk, carrying their dead, and south again at ' +
          'dawn. The colony was built across it. For two years they walked it south, out of ' +
          'season, away from the Hollow, past every perimeter on it. On the last night of the ' +
          'Long Night a choir walked it north again, in the right season, and someone walked with ' +
          'them.',
        when: FROM_FIN,
      },
    },
  },
  {
    id: 'codex_last_page',
    title: 'The Last Page',
    kind: 'thing',
    photo: 'Last page',
    versions: {
      original: {
        text:
          'The last page of the Field Journal. One line, in pencil, where the bounty stars used ' +
          'to go:\nREMEMBERED: {pests_processed}',
        when: FROM_FIN,
      },
    },
  },
];
