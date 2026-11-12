// The briefing's view logic (T803e; DOM-free, so it's unit-tested): its lines grouped into runs of
// one speaker, each run beside its own speaker's face (the run on screen beside the whole portrait,
// earlier runs beside a face chip), and the words on its two "more" toggles.
import type { LineView } from '../dialogue/state.ts';

/** One speaker's lines in a row, beside one face. */
export interface BriefingRun {
  readonly lines: readonly LineView[];
  /**
   * Whose face the run shows: its latest line on the run being read (the speaker now, mid-line),
   * else its first. Null for a caption (the narrator has no face).
   */
  readonly face: LineView | null;
  /** The run being read (the last): its face is the whole portrait, the others a chip. */
  readonly focus: boolean;
}

/** Whether two lines belong in one run: the same speaker, plate, and neither a caption. */
function sameRun(a: LineView, b: LineView): boolean {
  return (
    a.frame !== 'caption' && b.frame !== 'caption' && a.speaker === b.speaker && a.name === b.name
  );
}

/**
 * The briefing's lines (those said, then the one on screen, if any) as runs of one speaker, in
 * order, so every line sits beside its own speaker's face (on A1M1, QUILL's beside QUILL's).
 */
export function briefingRuns(
  transcript: readonly LineView[],
  current: LineView | null,
): BriefingRun[] {
  const all = current === null ? transcript : [...transcript, current];
  const groups: LineView[][] = [];
  for (const line of all) {
    const last = groups.at(-1);
    const prev = last?.at(-1);
    if (last !== undefined && prev !== undefined && sameRun(prev, line)) last.push(line);
    else groups.push([line]);
  }
  return groups.map((lines, i) => {
    const focus = i === groups.length - 1;
    const pick = focus ? lines.at(-1) : lines[0];
    const face = pick === undefined || pick.portrait === null ? null : pick;
    return { lines, face, focus };
  });
}

/** The toggle over a required counter's answers: "8 of yours answer it", "1 of yours answers it". */
export function answersLabel(n: number): string {
  return `${n} of yours ${n === 1 ? 'answers' : 'answer'} it`;
}

/**
 * The toggle over the medals and optional objectives: "3 medals", "3 medals · 1 optional",
 * "3 medals · 2 on file" (what's on file counts both).
 */
export function medalsLabel(
  medals: readonly { readonly held: boolean }[],
  objectives: readonly { readonly held: boolean }[],
): string {
  const parts: string[] = [];
  if (medals.length > 0) parts.push(medals.length === 1 ? '1 medal' : `${medals.length} medals`);
  if (objectives.length > 0) parts.push(`${objectives.length} optional`);
  const held = [...medals, ...objectives].filter((m) => m.held).length;
  if (held > 0) parts.push(`${held} on file`);
  return parts.join(' · ');
}
