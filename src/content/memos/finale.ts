// The finale's Everglow Inbox (story/campaign/finale.md § FIN, *Then, after the card*; style-guide.md
// § 6.1): Sterling's farewell, the only word she says in the finale. It is the memo text's home; the
// finale file quotes its subject and small print (tools/inboxCopy.test.ts).
//
// `memo_fin_01` *Clean Exit Complete!* arrives after Dawn, shown as a card between the finale's
// Results and C5 (`RESULTS_FLOW.fin_m01.ending`). She wrote it from the Ascendant as it aborted with
// a partial load, and nothing in it has changed: the exclamation points, the employee number, the
// reference she never checked (A1M5's "I didn't check. I don't have to.", in the small print). That
// she is exactly the same is the point (characters.md § Sterling). The letterhead is Everglow's
// full one again, white and teal with the sun: the Ascendant's, not the colony's worn stock.
import type { MemoDef } from './types.ts';

/** Every finale memo, in delivery order. */
export const FINALE_MEMOS: readonly MemoDef[] = [
  {
    id: 'memo_fin_01',
    from: 'Director Joy Sterling, Frontier Operations',
    to: 'Employee #ED-447 (Junior Perimeter Technician)',
    subject: 'Clean Exit Complete!',
    body:
      "Clean Exit complete! You were a top-five-percent technician. I'll put that in your " +
      'reference!\n\n' +
      "Writing from the Ascendant. Window seat! We left a little early, with a partial load, so I'm " +
      'calling this quarter a learning opportunity. Love that for us.\n\n' +
      'Reference attached, so you never have to ask:\n\n' +
      'To whom it may concern: Four-Forty-Seven was a top-five-percent technician. {Their} numbers ' +
      'were the best I ever saw. Hire {them} for anything.',
    signOff: 'Stay Everglow! {glyph:sun} — Joy',
    smallPrint: 'Reference issued unverified (Policy CE-1). Verification was not required.',
    afterMap: 'fin_m01',
  },
];
