// Act III's Everglow Inbox (story/campaign/act3.md, each map's *Memo after*; style-guide.md
// § 6.1), one memo after each map, in delivery order. They are the memo texts' home.
//
// The descent in three memos: `memo_a3_01` is Sterling's last sincere-sounding one ("I fought for
// that Preserve") with the Clean Exit in its small print; from A3M2 the Inbox is automated
// ("Everglow Automated Systems", core-loop.md § 6.4), terse, and the first memo without an
// exclamation point (`memo_a3_02`); `memo_a3_03` files Bricks's death as a personnel record.
//
// M6's seam (T600b) registers all three with the act file's subjects, quotes, and small print, and
// first drafts where the act file gives none (`memo_a3_02`'s body and small print); T611 writes
// their final text.
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
    smallPrint: 'Engineers: Clean Exit Asset Recovery, Phase 1 (Colony Core).',
    afterMap: 'a3_m01',
  },
  {
    id: 'memo_a3_02',
    from: AUTOMATED,
    to: TO_447,
    subject: 'Your Access Has Been Updated',
    body:
      'Your Corporate Tower License has been revoked. Your Orbital Strike uplink has been ' +
      'revoked. Remaining access: none listed.\n\n' +
      'No action is required. No reply is monitored.',
    smallPrint: 'Revocation is final. Refunds issued per Policy CE-1. This message was not reviewed.',
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
