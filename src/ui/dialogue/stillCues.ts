// Stills turned by lines (T1001; story-runtime.md § Dialogue in play): a staged full-screen scene
// shows a code-generated still (or several), and its lines say which still and frame is up. The
// First Dawn turns its frames on narrator lines by a fragment of their text (`dawn.ts`); the
// prelude, whose PA lines move the shots too, turns stills and frames on lines by their `label`
// (`prelude.ts`). Pure: the still on show is a function of the lines said and the one on screen,
// so a stage only draws it.

/** A cue on a line by its label (the scene's data names it; labels are unique in a scene). */
export interface LabelCue<S extends string, F extends string> {
  readonly still: S;
  readonly frame: F;
  readonly label: string;
}

/** A cue on a line by its speaker and a fragment of its text (as written in the scene's data). */
export interface TextCue<S extends string, F extends string> {
  readonly still: S;
  readonly frame: F;
  readonly speaker: string;
  readonly says: string;
}

export type StillCue<S extends string, F extends string> = LabelCue<S, F> | TextCue<S, F>;

/** A line as the cues read it (a LineView, or a line from the scene's data). */
export interface CuedLine {
  readonly speaker: string;
  readonly text: string;
  readonly label?: string;
}

/** Whether `cue` fires on `line`. */
export function cueFires(cue: StillCue<string, string>, line: CuedLine): boolean {
  if ('label' in cue) return line.label === cue.label;
  return line.speaker === cue.speaker && line.text.includes(cue.says);
}

/**
 * The index in `cues` of the last cue said or on screen (the transcript, then the line on screen),
 * or -1 before the first.
 */
export function cueIndex(
  cues: readonly StillCue<string, string>[],
  said: readonly CuedLine[],
  current: CuedLine | null,
): number {
  let at = -1;
  const visit = (l: CuedLine): void => {
    const i = cues.findIndex((c) => cueFires(c, l));
    if (i >= 0) at = i;
  };
  for (const l of said) visit(l);
  if (current !== null) visit(current);
  return at;
}

/**
 * The still and frame on show: the last cue said or on screen, else `first` (what shows before any
 * cue: the Dawn's sunrise; the prelude's first cue is its first line).
 */
export function stillAt<S extends string, F extends string>(
  cues: readonly StillCue<S, F>[],
  first: { readonly still: S; readonly frame: F },
  said: readonly CuedLine[],
  current: CuedLine | null,
): { readonly still: S; readonly frame: F } {
  const i = cueIndex(cues, said, current);
  const cue = i < 0 ? undefined : cues[i];
  return cue === undefined ? first : { still: cue.still, frame: cue.frame };
}
