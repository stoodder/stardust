// Act III's codex, the *Field Journal* (story/campaign/act3.md, each map's *Codex* line;
// style-guide.md § 6.2). From A3M1 the codex is retitled and an entry with a `corrected` version
// shows its original and its correction side by side (story/codex.ts `shownVersions`), so the text
// the player laughed at becomes the evidence. Corrections are plain, precise, and kind.
//
// Two kinds of text live here, as in act2.ts:
// - **New entries** (`ACT3_CODEX`), in map order: A3M1's Maw, the Leaving Song, Old Thrum or "the
//   small ones' walk"; A3M2's Compliance Drone, Expediter, Buffer Protocol, Clean Exit, QUILL's
//   directives; A3M3's Undertow, Okonkwo's Gap, the Amended Survey.
// - **Corrections of earlier entries** (`ACT3_CODEX_VERSIONS`, their `corrected` version): A3M1's
//   Brood Hauler, Elder, and Bramble (the Act I *Matriarch Chitterbloom*); A3M2's Director Joy
//   Sterling.
//
// M6's seam (T600b) registers the corrections the docs already quote: the Hauler's and the Elder's
// (style-guide.md § 6.2, verbatim) and Bramble's (act3.md § A3M1, verbatim). T611 writes the rest
// and the final text. **The Elder's citation** reads "Survey 2346, Okonkwo" from A3M1 until A3M3,
// when it cites the Amended Survey (act3.md § A3M1 and § A3M3): one version holds one text, so the
// A3M1 stub ends on the old citation and T611 decides how the A3M3 amendment lands.
//
// A correction unlocks once its subject is met and its map is won (`mapAtLeast`), like any later
// version (story-runtime.md § Other story systems).
import type { CodexEntryDef, CodexLaterVersions } from './types.ts';

const FROM_A3M1 = { mapAtLeast: 'a3_m01' } as const;

/** Act III's own entries, in map order (T611 fills them). */
export const ACT3_CODEX: readonly CodexEntryDef[] = [];

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
  // A3M1: the Elder corrected (style-guide.md § 6.2), its citation still the old survey's until
  // A3M3 (act3.md § A3M1). T611: the Amended Survey's citation after A3M3.
  codex_elder: {
    corrected: {
      text:
        'Keeps the group at the pace of its slowest member so no one is left behind. The ' +
        'vocalizations are linguistic. (Survey 2346, Okonkwo.)',
      when: FROM_A3M1,
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
