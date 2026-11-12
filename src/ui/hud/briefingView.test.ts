import { describe, expect, it } from 'vitest';
import type { SpeakerId } from '../../content/dialogue/types.ts';
import type { LineView } from '../dialogue/state.ts';
import { answersLabel, briefingRuns, medalsLabel } from './briefingView.ts';

let next = 0;
/** A line by `speaker` (a caption with no face for the narrator). */
function line(speaker: SpeakerId, name: string = speaker.toUpperCase()): LineView {
  const caption = speaker === 'narrator';
  return {
    id: next++,
    speaker,
    name: caption ? '' : name,
    color: 'teal.4',
    frame: caption ? 'caption' : 'portrait',
    portrait: caption
      ? null
      : {
          sprite: `portrait.${speaker}`,
          variant: null,
          expression: 'neutral',
          dark: false,
          icon: false,
          policy: false,
          blink: false,
        },
    text: 'words',
    silence: false,
    point: false,
  };
}

describe('briefingRuns', () => {
  it("puts every line beside its own speaker's face (A1M1: QUILL's beside QUILL's)", () => {
    const q1 = line('quill');
    const b1 = line('bricks');
    const q2 = line('quill');
    const b2 = line('bricks');
    const b3 = line('bricks');
    const runs = briefingRuns([q1, b1, q2, b2], b3);
    expect(runs.map((r) => r.lines.map((l) => l.speaker))).toEqual([
      ['quill'],
      ['bricks'],
      ['quill'],
      ['bricks', 'bricks'],
    ]);
    for (const r of runs) for (const l of r.lines) expect(l.speaker).toBe(r.face?.speaker);
    // Only the last run is read now: its face is the line on screen (its expression, its mouth).
    expect(runs.map((r) => r.focus)).toEqual([false, false, false, true]);
    expect(runs[3]!.face).toBe(b3);
    // An earlier run shows its first line's face.
    expect(runs[1]!.face).toBe(b1);
  });

  it('gives a caption its own run with no face, and splits a run at a new plate', () => {
    const kip = line('kip');
    const ledger = line('narrator');
    const pin = line('narrator');
    const kip2 = line('kip');
    const matriarch = line('chitterbloom', 'The Matriarch');
    const bramble = line('chitterbloom', 'Bramble');
    const runs = briefingRuns([kip, ledger, pin, kip2, matriarch, bramble], null);
    expect(runs.map((r) => r.lines.length)).toEqual([1, 1, 1, 1, 1, 1]);
    expect(runs[1]!.face).toBeNull();
    // With no line on screen (played out, or at a choice), the last line's run is the one read.
    expect(runs.at(-1)!.focus).toBe(true);
    expect(runs.at(-1)!.face).toBe(bramble);
  });

  it('is empty with nothing said yet', () => {
    expect(briefingRuns([], null)).toEqual([]);
  });
});

/** A medal or objective, on file or not. */
const m = (held: boolean) => ({ held });

describe('the toggles', () => {
  it('counts the towers that answer a counter', () => {
    expect(answersLabel(8)).toBe('8 of yours answer it');
    expect(answersLabel(1)).toBe('1 of yours answers it');
  });

  it("names what it folds (what earns the medals) and how many are on file (D156)", () => {
    expect(medalsLabel([m(false), m(false), m(false)])).toBe('What earns them');
    expect(medalsLabel([m(true), m(false), m(true)])).toBe('What earns them · 2 on file');
    expect(medalsLabel([m(false)])).toBe('What earns it');
  });
});
