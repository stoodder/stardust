// A1M1's radio (story/campaign/act1.md § A1M1, *Radio*, *Barks*, and *Debrief*), verbatim. Lines
// that need a system M1 doesn't have are left out: Bricks's W5 Suppressing Fire line (no companion
// ability until T207) and Goldie's `arrival_reason = lettuce` variant (no onboarding form or
// flags). Bricks's W2 line is in the briefing (D026), so the W2 slot has none; the first wave's
// clear plays the `wave_cleared` jingle barks there instead. The debrief (`mapWon`) shows on the
// win's results card, not the ticker (D028).
import type { RadioLine } from './types.ts';

export const A1_M01_RADIO: readonly RadioLine[] = [
  {
    on: 'firstLeak',
    speaker: 'quill',
    text: 'Pest escaped containment! (Toward... the wilderness? Odd. Logging it.)',
  },
  { on: 'waveCleared', wave: 1, speaker: 'quill', text: '(singing along) Ev-er-glow, Ev-er-glow!' },
  { on: 'waveCleared', wave: 1, speaker: 'bricks', text: 'That jingle. Every time.' },
  // The w03 line, on the Thumper's unlock (the same moment: W3's countdown starts). It teaches
  // Crossfire, which is live since T202a.
  {
    on: 'unlock',
    tower: 'thumper',
    speaker: 'quill',
    text: "New hardware! Put the mortar beside your Rivet. They like each other. It's called Crossfire!",
  },
  {
    on: 'countdown',
    wave: 4,
    speaker: 'goldie',
    text: "Oh! You're the new tech! Want to meet Duchess? She's a butterhead. She's shy. Don't look directly at her.",
  },
  {
    on: 'perfectWave',
    wave: 2,
    speaker: 'quill',
    text: "Perfect wave! I'd give you a sticker, but stickers are Tier 2.",
  },
  {
    on: 'countdown',
    wave: 6,
    speaker: 'quill',
    text: "Time for Joke of the Shift! I'm contractually obligated to tell one. Fifty are pre-approved!",
  },
  {
    on: 'countdown',
    wave: 6,
    speaker: 'quill',
    text: "Why did the lettuce cross the road? It was scheduled to. Logistics Route 4, Tuesdays. ...That's the joke.",
  },
  { on: 'countdown', wave: 6, speaker: 'bricks', text: "It's Wednesday." },
  {
    on: 'countdown',
    wave: 7,
    speaker: 'bricks',
    text: "If that jingle plays one more time I'm filing a grievance. With God. Cc'ing HR.",
  },
  // The debrief, on the results card (D028).
  { on: 'mapWon', speaker: 'bricks', text: 'Not bad, Sprout.' },
  { on: 'mapWon', speaker: 'bricks', text: "Don't name things on day one. You get attached." },
];
