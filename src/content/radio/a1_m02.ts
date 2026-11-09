// A1M2's radio (story/campaign/act1.md § A1M2, *Radio*, *Barks*, and *Debrief*), verbatim. The
// briefing is the map's own static string (content/maps/a1_m02), not the ticker's. Left out, for
// systems M2 doesn't have (D031): Bricks's `tower_sold` bark for a tagged turret ("You sold
// Denise.") and Kip's `arrival_reason = bonus` debrief variant (no name tags, onboarding form, or
// flags until M3). Bricks names Denise as the first wave clears; the tag itself waits for M3, so
// for now he names the turret only on the radio. The debrief (`mapWon`) shows on the win's results
// card, not the ticker (D028).
import type { RadioLine } from './types.ts';

export const A1_M02_RADIO: readonly RadioLine[] = [
  {
    on: 'waveCleared',
    wave: 1,
    speaker: 'bricks',
    text: "That one's Denise. After my first wife. Keeps her distance, fires on schedule, never calls.",
  },
  {
    on: 'countdown',
    wave: 2,
    speaker: 'kip',
    text: "Kip Vandermeer. 'The Exterminator.' Number one on the Bounty Board, three quarters running. Don't get comfy at two.",
  },
  {
    on: 'countdown',
    wave: 3,
    speaker: 'quill',
    text: 'Suggested build site: beside Extraction Rig 3. (Per policy.) The housing block will be fine. Probably!',
  },
  // Joke of the Shift: the setup, the punchline, and Bricks's fact-check as the reply.
  {
    on: 'countdown',
    wave: 4,
    speaker: 'quill',
    text: 'Joke of the Shift! Why did the scarecrow get Employee of the Month? He was outstanding in his field.',
  },
  {
    on: 'countdown',
    wave: 4,
    speaker: 'quill',
    text: "That's the joke. He's real, by the way. Terrace 2. He's been out there since 2349. I worry about him.",
  },
  { on: 'countdown', wave: 4, speaker: 'bricks', text: 'Fewer complaints than Kip.' },
  {
    on: 'countdown',
    wave: 5,
    speaker: 'kip',
    text: "Pro tip: Brood Haulers. Big bounty, slow, never shoot back. I hold the record. 'Most Haulers, Before Lunch.'",
  },
  // The first Hauler down (W5's lone one, if it doesn't get through): QUILL's glee, Bricks's tip.
  {
    on: 'enemyKilled',
    enemy: 'hauler',
    speaker: 'quill',
    text: 'Sack ruptured! Glitter everywhere! Tidybots are on it!',
  },
  {
    on: 'enemyKilled',
    enemy: 'hauler',
    speaker: 'bricks',
    text: 'Strong targeting on the big ones.',
  },
  {
    on: 'countdown',
    wave: 7,
    speaker: 'bricks',
    text: "Four hundred and twelve days to pension. Then it's me, a hammock, and a planet with zero bugs on it.",
  },
  // The debrief, on the results card (D028).
  { on: 'mapWon', speaker: 'kip', text: 'Nice wave, Sprout! For a two.' },
  {
    on: 'mapWon',
    speaker: 'kip',
    text: "New record, by the way. 'Most Records Set, Terraces Division.' I made the division.",
  },
];
