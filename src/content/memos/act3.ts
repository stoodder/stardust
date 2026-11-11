// Act III's Everglow Inbox (story/campaign/act3.md, each map's *Memo after*; style-guide.md
// § 6.1), one memo after each map, in delivery order. They are the memo texts' home; the act file
// quotes their subjects, `memo_a3_01`'s body, and every small print (tools/inboxCopy.test.ts).
//
// The descent in three memos: `memo_a3_01` is Sterling's last sincere-sounding one ("I fought for
// that Preserve"), the Clean Exit and the buffer's state in its small print (the fair-play clue
// A3M2 pays); from A3M2 the Inbox is automated ("Everglow Automated Systems", core-loop.md § 6.4):
// terse, no exclamation point, no sun, no sign-off. `memo_a3_02` is the first such memo, filing
// the Clean Exit cue as an access update; `memo_a3_03` files Bricks's death as a personnel record,
// the act file's one line and nothing else.
//
// Each is delivered at the run end that first wins its map (`afterMap`), so `memo_a3_03` waits in
// the Inbox when the base opens after A3M3's Held card.
//
// Part two (M7) keeps the machine's voice, now about things: `memo_a3_04` reports the plant at
// 140% (its small print, that Everglow keeps no copy of the batch records, is what makes Kip's
// ledger matter in A3M5), `memo_a3_05` schedules Dome Row's repossession (its small print reports
// the plant offline and Kip's post vacant), and `memo_a3_06` opens the Deep Bore's final window
// (the finale's timer; its small print ties the window to the Ascendant's departure). The
// Ascendant is named here first: the automated memos say what Everglow is loading.
//
// The letterhead (`letterhead`): Sterling's `memo_a3_01` is Act III's worn one, its colour gone
// but its sun kept, since she still signs; every automated memo after it is `automated`.
import type { MemoDef } from './types.ts';

const STERLING = 'Director Joy Sterling, Frontier Operations';
const AUTOMATED = 'Everglow Automated Systems';
const TO_447 = 'Employee #ED-447 (Junior Perimeter Technician)';
const SIGN_OFF = 'Stay Everglow! {glyph:sun} — Joy';

/** The automated memos' closing line (A3M2 on). */
const NOT_MONITORED = 'Replies to this address are not monitored.';

/** Every Act III memo (A3M1–A3M6), in delivery order. */
export const ACT3_MEMOS: readonly MemoDef[] = [
  {
    id: 'memo_a3_01',
    letterhead: 'worn',
    from: STERLING,
    to: TO_447,
    subject: "We'll Get Through This Together!",
    body:
      'I fought for that Preserve, Four-Forty-Seven. I really did. Engineers inbound to secure ' +
      'the colony. Hang in there!',
    signOff: SIGN_OFF,
    smallPrint:
      'Engineers: Clean Exit Asset Recovery, Phase 1 (Colony Core). Preserve buffer: depleted.',
    afterMap: 'a3_m01',
  },
  {
    id: 'memo_a3_02',
    letterhead: 'automated',
    from: AUTOMATED,
    to: TO_447,
    subject: 'Your Access Has Been Updated',
    body:
      'This is an automated message.\n\n' +
      'Your Corporate Tower License has been revoked. Your Orbital Strike uplink has been ' +
      'revoked. Refunds have been applied to your account.\n\n' +
      `Your remaining access is under review. No action is required. ${NOT_MONITORED}`,
    smallPrint:
      'Revocation is final. Refunds issued per Policy CE-1. This message was not reviewed.',
    afterMap: 'a3_m02',
  },
  {
    id: 'memo_a3_03',
    letterhead: 'automated',
    from: AUTOMATED,
    to: TO_447,
    subject: 'Personnel Update',
    body: 'Employee #ED-112 (Okonkwo, I.): Unscheduled Departure. Pension: Restructured.',
    smallPrint: 'Beneficiary changes are not accepted after departure.',
    afterMap: 'a3_m03',
  },
  {
    id: 'memo_a3_04',
    letterhead: 'automated',
    from: AUTOMATED,
    to: TO_447,
    subject: 'Facility Status: Reclamation Facility 2 at 140% Throughput',
    body:
      'This is an automated message.\n\n' +
      'Reclamation Facility 2 is operating at 140% of rated throughput. All intake lines are ' +
      'open. Output is allocated to the Everglow Ascendant.\n\n' +
      `No action is required. ${NOT_MONITORED}`,
    smallPrint: 'Batch records are held at the facility only. No copies are made.',
    afterMap: 'a3_m04',
  },
  {
    id: 'memo_a3_05',
    letterhead: 'automated',
    from: AUTOMATED,
    to: TO_447,
    subject: 'Asset Recovery Scheduled: Dome Row',
    body:
      'This is an automated message.\n\n' +
      'Asset Recovery for Dome Row (Everglow Gardens) is scheduled for the next cycle. Domes, ' +
      'hydroponics, and stock will be recovered. Occupants must vacate before recovery ' +
      'begins.\n\n' +
      `No action is required. ${NOT_MONITORED}`,
    smallPrint: 'Reclamation Facility 2: offline. Reclamation Lead: position vacant.',
    afterMap: 'a3_m05',
  },
  {
    id: 'memo_a3_06',
    letterhead: 'automated',
    from: AUTOMATED,
    to: TO_447,
    subject: 'Deep Bore: Final Extraction Window Open',
    body:
      'This is an automated message.\n\n' +
      'The Deep Bore has reached the final deposit. The extraction window is open. Drilling ' +
      'continues until the deposit is exhausted or the window closes. Output is allocated to ' +
      'the Everglow Ascendant.\n\n' +
      `No action is required. ${NOT_MONITORED}`,
    smallPrint: 'The window closes when the Ascendant departs. Departure is not subject to delay.',
    afterMap: 'a3_m06',
  },
];
