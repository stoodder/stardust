import { describe, expect, it } from 'vitest';
import type { Song } from '../types.ts';
import {
  compileSong,
  createSequencer,
  parsePattern,
  secPerStep,
  type SeqEvent,
} from './pattern.ts';

describe('parsePattern', () => {
  it('reads notes, holds, and rests in 8ths', () => {
    const p = parsePattern('C4 - - . E4 . G4 -', 2);
    expect(p.problems).toEqual([]);
    expect(p.steps).toBe(16);
    expect(p.notes).toEqual([
      { step: 0, len: 6, token: 'C4' },
      { step: 8, len: 2, token: 'E4' },
      { step: 12, len: 4, token: 'G4' },
    ]);
  });

  it('spans bars and holds across the bar line', () => {
    const p = parsePattern('C4 - - - | - - E4 .', 4);
    expect(p.problems).toEqual([]);
    expect(p.notes).toEqual([
      { step: 0, len: 24, token: 'C4' },
      { step: 24, len: 4, token: 'E4' },
    ]);
  });

  it('flags short bars and a hold with nothing to hold', () => {
    expect(parsePattern('C4 - -', 4).problems).toEqual(['bar 1 has 3 tokens, expected 4']);
    expect(parsePattern('- C4 . .', 4).problems).toEqual(["bar 1: '-' holds nothing"]);
    expect(parsePattern('C4 . - .', 4).problems).toEqual(["bar 1: '-' holds nothing"]);
  });
});

const SONG: Song = {
  id: 'test',
  bpm: 120,
  bars: 1,
  loop: true,
  tracks: [
    { layer: 'base', instrument: 'bass', stepsPerToken: 4, gain: 0.5, pattern: 'C3 - G2 .' },
    {
      layer: 'drums',
      instrument: 'kick',
      kit: { k: 'kick', h: 'hat' },
      stepsPerToken: 4,
      gain: 1,
      pattern: 'k h k h',
    },
  ],
};

describe('compileSong', () => {
  it('places events per step with their pitch, length, and layer', () => {
    const c = compileSong(SONG);
    expect(c.steps).toBe(16);
    expect(c.secPerStep).toBe(secPerStep(120));
    expect(secPerStep(120)).toBe(0.125);
    expect(c.byStep[0]!.map((e) => [e.layer, e.instrument, e.durSec])).toEqual([
      ['base', 'bass', 1],
      ['drums', 'kick', 0.5],
    ]);
    expect(c.byStep[0]![0]!.hz).toBeCloseTo(130.81, 2);
    expect(c.byStep[0]![1]!.hz).toBeNull();
    expect(c.byStep[4]!.map((e) => e.instrument)).toEqual(['hat']);
    expect(c.byStep[1]).toEqual([]);
  });
});

function collect(until: number, seq: ReturnType<typeof createSequencer>) {
  const out: [string, number][] = [];
  seq.pump(until, (e: SeqEvent, t: number) => out.push([e.instrument, t]));
  return out;
}

describe('the sequencer', () => {
  it('hands out events as their time comes, once each', () => {
    const seq = createSequencer(compileSong(SONG), 10);
    expect(collect(10.4, seq)).toEqual([
      ['bass', 10],
      ['kick', 10],
    ]);
    expect(collect(10.4, seq)).toEqual([]);
    expect(collect(10.6, seq)).toEqual([['hat', 10.5]]);
  });

  it('loops seamlessly on the bar', () => {
    const seq = createSequencer(compileSong(SONG), 0);
    const out = collect(2.1, seq);
    // One bar is 2 s at 120 BPM: the second loop's downbeat lands exactly at 2.
    expect(out.filter(([, t]) => t === 2)).toEqual([
      ['bass', 2],
      ['kick', 2],
    ]);
    expect(seq.done).toBe(false);
  });

  it('stops a one-shot at its end', () => {
    const seq = createSequencer(compileSong({ ...SONG, loop: false }), 0);
    const out = collect(100, seq);
    expect(out).toHaveLength(6);
    expect(seq.done).toBe(true);
  });

  it('finds the next bar line', () => {
    const seq = createSequencer(compileSong(SONG), 1);
    expect(seq.nextBar(0)).toBe(1);
    expect(seq.nextBar(1)).toBe(1);
    expect(seq.nextBar(1.5)).toBe(3);
  });
});
