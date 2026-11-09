// A1M1's radio (story/campaign/act1.md § A1M1, *Radio* and *Barks*), verbatim. Lines that need a
// system M1 doesn't have are left out: Bricks's W5 Suppressing Fire line (no companion ability
// until T207), Goldie's `arrival_reason = lettuce` variant (no onboarding form or flags), and the
// debrief (the results screen covers the HUD). Bricks's W2 line is in the briefing (D026), so the
// W2 slot has none; the first wave's clear plays the `wave_cleared` jingle barks there instead.
import type { RadioLine } from './types.ts';

export const A1_M01_RADIO: readonly RadioLine[] = [
  {
    on: 'firstLeak',
    speaker: 'quill',
    text: 'Pest escaped containment! (Toward... the wilderness? Odd. Logging it.)',
  },
  { on: 'waveCleared', wave: 1, speaker: 'quill', text: '(singing along) Ev-er-glow, Ev-er-glow!' },
  { on: 'waveCleared', wave: 1, speaker: 'bricks', text: 'That jingle. Every time.' },
  // The W3 Crossfire line waits for links (T202); until then the unlock is announced plainly.
  {
    on: 'unlock',
    tower: 'thumper',
    speaker: 'quill',
    text: 'New hardware! Thumper Mortar, ready to deploy!',
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
];
