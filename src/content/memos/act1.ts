// The Act I Everglow Inbox: one memo per map (docs/story/campaign/act1.md, each map's *Memo after*
// line, and *Before* for the welcome memo), in delivery order. This file is the home of their text
// (style-guide § 6.1: cheerful satire, puns, wellness tips; the darkness lives in the small print and
// in what the memos mention in passing). `memo_a1_00` is the style guide's sample, verbatim; every
// subject line and small print the act file gives is verbatim too.
//
// Sterling never writes the player's name: she writes the employee number. A body may hold blank
// lines (paragraphs) and single line breaks (the FAQ's questions and answers).
import type { MemoDef } from './types.ts';

const STERLING = 'Director Joy Sterling, Frontier Operations';
const TO_447 = 'Employee #ED-447 (Junior Perimeter Technician)';
const SIGN_OFF = 'Stay Everglow! {glyph:sun} — Joy';

/** Every Act I memo, in delivery order. */
export const ACT1_MEMOS: readonly MemoDef[] = [
  {
    id: 'memo_a1_00',
    from: STERLING,
    to: TO_447,
    subject: 'WELCOME TO THE GARDENS! {glyph:sun}',
    body:
      "You're going to LOVE it here! That's not a prediction, it's a target! Your Orbital " +
      'Strike uplink is a little something from me to you. Use it in good health!',
    signOff: SIGN_OFF,
    smallPrint:
      'Uplink access contingent on Q2 extraction targets. Pests are not to be named ' +
      '(Handbook §12.4; see: Mr. Fluffington).',
    afterMap: null,
    gift: { ability: 'orbital_strike' },
  },
  {
    id: 'memo_a1_01',
    from: STERLING,
    to: TO_447,
    subject: 'Q2 Results: Pest Losses Down 38%!',
    body:
      'Big news, team! Thanks to our newest technician (that is you, #ED-447!), pest losses ' +
      'are down 38% this quarter! Tidybots report record throughput, and Reclamation could not ' +
      'be happier.\n\n' +
      'Lettuce losses are a separate number. Accounting is very excited to share it soon!\n\n' +
      'Wellness tip: hydrate! The domes are 22 degrees, always.',
    signOff: SIGN_OFF,
    smallPrint: 'Lettuce loss figures pending Accounting review.',
    afterMap: 'a1_m01',
  },
  {
    id: 'memo_a1_02',
    from: STERLING,
    to: TO_447,
    subject: 'Introducing the Pest Bounty Board!',
    body:
      'Who is the best pest processor on Tumble IV? Now we can all know! The Pest Bounty ' +
      'Board ranks every technician by pests processed, all quarter long.\n\n' +
      "Current leader: K. Vandermeer, three quarters running! You're #2, and #2 is a fantastic " +
      'place to grow from. The top score at quarter end wins a framed certificate and the ' +
      'respect of your peers!',
    signOff: SIGN_OFF,
    smallPrint: 'Bounties funded by Reclamation Facility 2, a sustainability success story!',
    afterMap: 'a1_m02',
  },
  {
    id: 'memo_a1_03',
    from: 'Everglow Culture Committee (Chair: Director Joy Sterling)',
    to: 'All Dome Row Staff',
    subject: 'Mandatory Fun Friday Is Back! (Attendance Optional) (Required)',
    body:
      'Fun Friday returns to Dome 4! Snacks, games, and a guided gratitude circle. This ' +
      "quarter's theme is Resilience, because it's been a tough one for our lettuce: pests ate " +
      '40% of the crop (per our KFA crop-insurance filing). Brave little leaves!\n\n' +
      'Lettuce costumes encouraged. Attendance is optional, and will be taken.\n\n' +
      'Invitations are out by drone. If yours arrived with a dent, that is just Gerald being ' +
      'Gerald!',
    signOff: SIGN_OFF,
    smallPrint: 'Mail-drone incidents must be reported on Form 88-B.',
    afterMap: 'a1_m03',
  },
  {
    id: 'memo_a1_04',
    from: STERLING,
    to: TO_447,
    subject: 'Buffer Populations and You: A Quick FAQ!',
    body:
      'Q: What is a buffer population?\n' +
      'A: Great question! It is part of our wildlife management strategy.\n\n' +
      'Q: What is our wildlife management strategy?\n' +
      'A: A strategy for managing wildlife, with buffers!\n\n' +
      'Q: Does this affect me?\n' +
      'A: Your tier approvals are signed, #ED-447. You are doing super!\n\n' +
      'Q: Where is the buffer?\n' +
      'A: Great question!',
    signOff: SIGN_OFF,
    smallPrint: 'Tier approvals contingent on Q3 extraction targets.',
    afterMap: 'a1_m04',
  },
  {
    id: 'memo_a1_05',
    from: STERLING,
    to: TO_447,
    subject: "Record Quarter! You're Top 5%!",
    body:
      'What a quarter! Throughput up, perimeter losses acceptable, and Clean Exit readiness on ' +
      'track! You are officially in the Top 5% of Technicians, #ED-447, and it is going in ' +
      'your file.\n\n' +
      'The party hats are yours to keep. (Please return the party hats.) Here is to an even ' +
      'brighter Q3!',
    extra: [
      {
        when: { flag: 'spared_quiet_wave', eq: true },
        text:
          'Performance Note: Containment Lapse. A few pests left the perimeter during the final ' +
          'wave of the Quarterly Results shift. No action needed! It is just a note. Notes are ' +
          'how we grow!',
      },
    ],
    signOff: SIGN_OFF,
    smallPrint: 'Rig Nine is in a scheduled quiet period. Status reports will resume shortly.',
    afterMap: 'a1_m05',
  },
];
