import { describe, expect, it } from 'vitest';
import { A1_M01_RADIO } from '../content/radio/a1_m01.ts';
import {
  debriefLines,
  FIRST_LEAK_RECENT_MS,
  FIRST_LEAK_RECENT_TICKS,
  runResultOf,
  type RunEndInput,
} from './runResult.ts';

const INPUT: RunEndInput = {
  mapId: 'a1_m01',
  waveCount: 7,
  maxIntegrity: 20,
  integrity: 13,
  skitterkinKilled: 57,
  wavesCleared: 4,
  radio: [],
  firstLeakAgo: null,
};

describe('runResultOf', () => {
  it('reports a loss with the waves resolved so far', () => {
    expect(runResultOf({ ...INPUT, integrity: 0 }, 'lost')).toEqual({
      mapId: 'a1_m01',
      outcome: 'lost',
      wavesSurvived: 4,
      waveCount: 7,
      integrity: 0,
      maxIntegrity: 20,
      pestsProcessed: 57,
      debrief: [],
    });
  });

  it('counts every wave on a win', () => {
    const r = runResultOf({ ...INPUT, wavesCleared: 6 }, 'won');
    expect(r.wavesSurvived).toBe(7);
    expect(r.integrity).toBe(13);
    expect(r.pestsProcessed).toBe(57);
  });

  it('never reports more waves than the map has, or negative integrity', () => {
    const r = runResultOf({ ...INPUT, wavesCleared: 9, integrity: -3 }, 'lost');
    expect(r.wavesSurvived).toBe(7);
    expect(r.integrity).toBe(0);
  });
});

const texts = (lines: readonly { text: string }[]) => lines.map((l) => l.text);

describe('the results card debrief (D028)', () => {
  const LEAK = 'Pest escaped containment! (Toward... the wilderness? Odd. Logging it.)';

  it("shows Bricks's A1M1 debrief on a win, with his name plate", () => {
    const lines = debriefLines(A1_M01_RADIO, 'won', null);
    expect(lines).toEqual([
      { name: 'Bricks', color: 'orange.4', text: 'Not bad, Sprout.' },
      {
        name: 'Bricks',
        color: 'orange.4',
        text: "Don't name things on day one. You get attached.",
      },
    ]);
    expect(runResultOf({ ...INPUT, radio: A1_M01_RADIO }, 'won').debrief).toEqual(lines);
  });

  it('has no debrief on an A1M1 loss (the act file writes none)', () => {
    expect(debriefLines(A1_M01_RADIO, 'lost', null)).toEqual([]);
  });

  it('puts a first leak from the last 4 s on the card first, so its line is never lost', () => {
    const recent = { ms: FIRST_LEAK_RECENT_MS, ticks: FIRST_LEAK_RECENT_TICKS };
    expect(texts(debriefLines(A1_M01_RADIO, 'won', recent))).toEqual([
      LEAK,
      'Not bad, Sprout.',
      "Don't name things on day one. You get attached.",
    ]);
    expect(texts(debriefLines(A1_M01_RADIO, 'lost', { ms: 1200, ticks: 144 }))).toEqual([LEAK]);
    expect(debriefLines(A1_M01_RADIO, 'lost', { ...recent, ms: FIRST_LEAK_RECENT_MS + 1 })).toEqual(
      [],
    );
    // Fast-forwarded: moments ago in real time, but long ago in game time.
    expect(debriefLines(A1_M01_RADIO, 'lost', { ms: 5, ticks: 3000 })).toEqual([]);
    expect(FIRST_LEAK_RECENT_TICKS).toBe(480); // 4 s at 2×
  });
});
