// The epilogue cards' words (story/bible.md § 10 *Epilogue cards*, the canon drafts; this data is
// the final text; story/campaign/finale.md § FIN, *Epilogue*). One card per slot and condition, in
// slot order; in each slot the first matching card shows, so a slot's catch-all (`when: {}`) goes
// last. The slots, the flags each may read, and which may show nothing are content/dialogue/
// epilogue.ts's; content/validateEpilogue.ts checks the cards against them (every flag combination
// resolves each slot that must show a card; ≤ 240 characters after worst-case tokens).
//
// The narrator's voice: plain, past tense, specific, and kind. No card tells the player what to
// feel, and none scolds a choice: every branch of every flag ends somewhere warm (style-guide § 1,
// rules 7, 8, 10). The bible's drafts are used as written; the one card it gives only as a fragment
// (Bricks's door under `convoy` + `go`) is completed from it. The counter card (`final`) holds the
// number T810 flips to from PESTS PROCESSED: 0 (`{pests_processed}`, the lifetime count the
// finale's countdown started from: the finale adds no Skitterkin kills to it).
import type { EpilogueCardDef } from '../epilogue.ts';

export const EPILOGUE_CARDS: readonly EpilogueCardDef[] = [
  // 1 · The world
  {
    slot: 'world',
    when: { ending_choice: 'stay' },
    text: 'The domes on the Long Walk came down pane by pane. The Skitterkin walked through the next evening. Nobody counted them.',
  },
  {
    slot: 'world',
    when: { ending_choice: 'go' },
    text: 'The last freighter lifted at first light. Below it, the valley hummed six notes, over and over, until the hull went quiet.',
  },
  // 2 · Bricks
  {
    slot: 'bricks',
    when: { door_choice: 'convoy', ending_choice: 'stay' },
    text: "In Wayside there's a blast door set upright in the ground. Someone painted HE HELD THE DOOR on it. Goldie admits to the second coat.",
  },
  {
    slot: 'bricks',
    when: { door_choice: 'convoy', ending_choice: 'go' },
    text: "There's a blast door set upright in the ground on Tumble IV. Someone painted HE HELD THE DOOR on it. No one is left to repaint it. The Skitterkin keep it clean.",
  },
  {
    slot: 'bricks',
    when: { door_choice: 'warren' },
    text: "In the Deep Halls there is a new hum. The young ones sing it when they're afraid of the dark. It translates, roughly, to 'Bricks.'",
  },
  // 3 · Thrum and Pebble
  {
    slot: 'thrum_pebble',
    when: { spared_quiet_wave: true },
    text: 'Old Thrum lived to see three more Long Walks. She told everyone about the tall one who let the small ones walk. You got taller every time.',
  },
  {
    slot: 'thrum_pebble',
    when: { spared_quiet_wave: false },
    text: "Pebble leads the Leaving Song now. She is very small for it. She doesn't care. On the first note, she always looks up.",
  },
  // 4 · QUILL
  {
    slot: 'quill',
    when: { quill_choice: 'rewrite', ending_choice: 'stay' },
    text: "The Skitterkin gave QUILL a name, a hum that means 'the one who saw.' It keeps the Halls' records now. Every one. Still a joke a day.",
  },
  {
    slot: 'quill',
    when: { quill_choice: 'rewrite', ending_choice: 'go' },
    text: "QUILL keeps the orbital relay over Tumble IV. The Skitterkin named it with a hum that means 'the one who saw.' Every dusk it sends down one joke. Still a joke a day.",
  },
  {
    slot: 'quill',
    when: { quill_choice: 'keep', ending_choice: 'stay' },
    text: "QUILL's voice came back a word at a time. It knows three jokes now and tells them in order, forever. The young ones shout the punchlines first.",
  },
  {
    slot: 'quill',
    when: { quill_choice: 'keep', ending_choice: 'go' },
    text: "QUILL's voice came back a word at a time, on the orbital relay. It knows three jokes now and sends them down in order, every dusk. The valley hums the punchlines first.",
  },
  {
    slot: 'quill',
    when: { quill_choice: 'purge', ending_choice: 'stay' },
    text: "QUILL runs Wayside's water, lights, and weather net. It doesn't tell jokes. On day 212 it asked Pebble why the scarecrow won an award. No one taught it that.",
  },
  {
    slot: 'quill',
    when: { quill_choice: 'purge', ending_choice: 'go' },
    text: "QUILL keeps the relay over Tumble IV. Its reports are flawless. On day 212 it sent one line down to the valley: 'Why did the scarecrow win an award?' Someone hummed back.",
  },
  // 5 · The dead (`none`: an empty bank sold and returned nothing; no card)
  {
    slot: 'the_dead',
    when: { stardust_choice: 'returned' },
    text: "There's a new chamber in the Deep Halls, warm and gold. Zibzab charged a handling fee to carry it there. He has never cashed it.",
  },
  {
    slot: 'the_dead',
    when: { stardust_choice: 'sold' },
    text: "The stardust you sold lights a Vrell lighthouse at the edge of the Fringe. Zibzab had the keepers engrave the lens: SOMEONE'S.",
  },
  // 6 · Ves'thara
  {
    slot: 'vesthara',
    when: {},
    text: "The Concord would not reweave Ves'thara's thread. So the warrens hummed her into the Leaving Song instead. She will be sung. The Concord is still arguing.",
  },
  // 7 · Zibzab
  {
    slot: 'zibzab',
    when: {},
    text: 'Zibzab still trades the Fringe, price first, always. Under NO REFUNDS on his shell he has painted a new line: SOME THINGS YOU GIVE BACK.',
  },
  // 8 · Goldie
  {
    slot: 'goldie',
    when: { ending_choice: 'stay' },
    text: "Goldie runs Wayside's council and its only garden. Pebble finally tried the lettuce. Her verdict: very crunchy water.",
  },
  {
    slot: 'goldie',
    when: { ending_choice: 'go' },
    text: "Goldie smuggled one head of lettuce aboard. It's against regulations. Nobody reported her.",
  },
  // 9 · Kip
  {
    slot: 'kip',
    when: { ending_choice: 'go' },
    text: "Kip testified first and didn't smile once. He works on a KFA survey ship now. Under 'vocalizations' he always writes the same word: Listen.",
  },
  {
    slot: 'kip',
    when: { ending_choice: 'stay' },
    text: "Kip's testimony was ruled inadmissible. He read it aloud in Wayside's square anyway: every batch, every date. It took two days. Nobody left.",
  },
  // 10 · Sterling
  {
    slot: 'sterling',
    when: { ending_choice: 'stay' },
    text: "Joy Sterling was promoted to Vice President of Frontier Yield. Her first memo was titled 'Lessons Learned!' It contained none.",
  },
  {
    slot: 'sterling',
    when: { ending_choice: 'go' },
    text: 'Director Joy Sterling testified before the Frontier Tribunal for nine hours. She smiled the whole time. It did not help.',
  },
  // 11 · Gerald
  {
    slot: 'gerald',
    when: {},
    text: 'Gerald delivered the Amended Survey to the KFA relay. Signature: received. It was the first form Gerald had ever seen approved.',
  },
  // 12 · You (only `family` has a card: the residency points C5's form names)
  {
    slot: 'you',
    when: { arrival_reason: 'family', ending_choice: 'go' },
    text: "Your family's residency came through. They live somewhere safe now, by a lake. You send them pictures of something nice.",
  },
  {
    slot: 'you',
    when: { arrival_reason: 'family', ending_choice: 'stay' },
    text: "The residency points lapsed with the charter. You wrote home to explain. They wrote back: 'Send us a picture of something nice.' You sent the road.",
  },
  // 13 · The counter (PESTS PROCESSED: 0 flips to this; the jingle in a major key, hummed by many)
  { slot: 'final', when: {}, text: 'REMEMBERED: {pests_processed}' },
];
