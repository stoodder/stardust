// The First Dawn on its stage (story/campaign/finale.md § FIN, *Dawn*; T810): `fin_m01_scene_dawn`,
// full-screen before the finale's card (staging `dawn`), over T843's `scene.dawn` still: the sun
// up over the Halls' mouth and the choir singing (`dawn`), then Ishael's mote at Ves'thara's
// shoulder (`mote`, from the narrator's line about the gold mote), then the visor up, once, a
// silhouette against the sunrise (`visor`, from the line that says so, held to the end). The lines
// play below, one at a time, with no history above them. Pure: the frame is a function of the
// lines said and on screen; the stage (dawnStage.tsx) draws. Silent. Unskippable the first time
// (content/dialogue/resultsFlow.ts `unskippableFirst`). Reduced motion cuts between frames.

/** The Dawn still and its frames, in the order they come (T843). */
export const DAWN_STILL = 'scene.dawn';
export type DawnFrame = 'dawn' | 'mote' | 'visor';

/**
 * The narrator lines that turn the still: a fragment of each, as written in the scene's data
 * (dawn.test.ts holds them to it).
 */
export const DAWN_CUES: readonly { readonly frame: DawnFrame; readonly says: string }[] = [
  { frame: 'mote', says: 'One gold mote rises' },
  { frame: 'visor', says: 'The visor goes up' },
];

/** The sunrise alone before the first line (ms; `stagingLeadInMs` for `dawn`). */
export const DAWN_LEAD_IN_MS = 1800;
export const DAWN_LEAD_IN_STILL_MS = 600;

export function dawnLeadInMs(still: boolean): number {
  return still ? DAWN_LEAD_IN_STILL_MS : DAWN_LEAD_IN_MS;
}

/** How long one frame crossfades into the next (ms; a cut under reduced motion). */
export const DAWN_FADE_MS = 900;

/** A line as the stage reads it. */
interface SaidLine {
  readonly speaker: string;
  readonly text: string;
}

/** The frame on show: the last cue said or on screen, else `dawn`. */
export function dawnFrame(said: readonly SaidLine[], current: SaidLine | null): DawnFrame {
  let frame: DawnFrame = 'dawn';
  for (const l of current === null ? said : [...said, current]) {
    if (l.speaker !== 'narrator') continue;
    const cue = DAWN_CUES.find((c) => l.text.includes(c.says));
    if (cue !== undefined) frame = cue.frame;
  }
  return frame;
}

/** The screen reader's account of the stage (aria-hidden; the lines speak). */
export function dawnLabel(frame: DawnFrame): string {
  if (frame === 'mote') return "Sunrise over the Deep Halls. A gold mote at Ves'thara's shoulder.";
  if (frame === 'visor') return 'Sunrise. A silhouette against it, the visor up.';
  return 'Sunrise over the Deep Halls. The choir sings.';
}
