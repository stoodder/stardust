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
import type { MemoDef } from './types.ts';

const STERLING = 'Director Joy Sterling, Frontier Operations';
const AUTOMATED = 'Everglow Automated Systems';
const TO_447 = 'Employee #ED-447 (Junior Perimeter Technician)';
const SIGN_OFF = 'Stay Everglow! {glyph:sun} — Joy';

/** Every Act III memo of M6 (A3M1–A3M3), in delivery order. */
export const ACT3_MEMOS: readonly MemoDef[] = [
  {
    id: 'memo_a3_01',
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
    from: AUTOMATED,
    to: TO_447,
    subject: 'Your Access Has Been Updated',
    body:
      'This is an automated message.\n\n' +
      'Your Corporate Tower License has been revoked. Your Orbital Strike uplink has been ' +
      'revoked. Refunds have been applied to your account.\n\n' +
      'Your remaining access is under review. No action is required. Replies to this address ' +
      'are not monitored.',
    smallPrint:
      'Revocation is final. Refunds issued per Policy CE-1. This message was not reviewed.',
    afterMap: 'a3_m02',
  },
  {
    id: 'memo_a3_03',
    from: AUTOMATED,
    to: TO_447,
    subject: 'Personnel Update',
    body: 'Employee #ED-112 (Okonkwo, I.): Unscheduled Departure. Pension: Restructured.',
    smallPrint: 'Beneficiary changes are not accepted after departure.',
    afterMap: 'a3_m03',
  },
];
