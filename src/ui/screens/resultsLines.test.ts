// The Results card's Stardust line and way on (T803e): no wave count the stat row already says,
// the veteran bonus noted (T860), the act's Stardust icon, and Retry's one question (T329).
import { describe, expect, it } from 'vitest';
import { retryText, stardustLine, stardustPhase, stonesLine, veteranNote } from './Results.tsx';
import type { RunRewards } from './state.ts';

type Pay = RunRewards['stardust'];
const PAY: Pay = {
  source: 'defeat',
  amount: 24,
  base: 195,
  wavesResolved: 5,
  waveCount: 11,
  fromWave: null,
};

describe('the Stardust line', () => {
  it("never repeats the stat row's waves on a loss; a checkpoint retry says where it counts from", () => {
    expect(stardustLine(PAY)).toEqual({ label: 'Effort stipend' });
    expect(stardustLine({ ...PAY, fromWave: 6 })).toEqual({
      label: 'Effort stipend',
      note: 'Since wave 6',
    });
    expect(stonesLine(PAY)).toEqual({ label: 'Gift stones' });
    expect(stonesLine({ ...PAY, fromWave: 6 })).toEqual({
      label: 'Gift stones',
      note: 'Since wave 6',
    });
  });

  it("notes a replay win's veteran bonus, and why a training shift still pays nothing", () => {
    const replay: Pay = { ...PAY, source: 'replay', amount: 117, veteranPct: 40 };
    expect(veteranNote(replay)).toBe('Veteran +40%');
    expect(stardustLine(replay)).toEqual({ label: 'Overtime bonus', note: 'Veteran +40%' });
    expect(stonesLine(replay)).toEqual({ label: 'Gift stones', note: 'Veteran +40%' });
    // A1M1 pays nothing, bonus or not: the line says both.
    expect(stardustLine({ ...replay, base: 0, amount: 0 })).toEqual({
      label: 'Overtime bonus',
      note: 'Veteran +40% · Training shifts are unpaid!',
    });
    // No modifiers, or a first clear (they ride replays only): no note.
    expect(veteranNote({ ...replay, veteranPct: 0 })).toBeNull();
    expect(veteranNote({ ...replay, source: 'first_clear' })).toBeNull();
    expect(stardustLine({ ...replay, veteranPct: undefined })).toEqual({ label: 'Overtime bonus' });
  });

  it("wears the act's Stardust icon: the gem in Acts I–II, the gift stone from Act III", () => {
    expect([1, 2, 3, 'finale'].map((t) => stardustPhase(t as 1 | 2 | 3 | 'finale'))).toEqual([
      'act1',
      'act2',
      'act3',
      'finale',
    ]);
  });
});

describe('Retry beside a checkpoint', () => {
  it('asks once before it throws the checkpoint away', () => {
    expect(retryText(false)).toBe('Retry');
    expect(retryText(true)).toBe('From wave 1?');
  });
});
