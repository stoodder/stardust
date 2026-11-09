import { describe, expect, it } from 'vitest';
import { A1_M01_RADIO } from '../content/radio/a1_m01.ts';
import { radioLines } from '../content/radio/index.ts';
import type { IdSpace } from '../content/types.ts';
import type { SimEvent } from '../sim/index.ts';
import { createRadioScript, radioLineMs } from './radio.ts';

type Ev = SimEvent<IdSpace>;
const spawn = (uid: number, wave: number): Ev => ({
  type: 'EnemySpawned',
  uid,
  enemy: 'nibbler',
  route: 'road',
  wave,
});
const leak = (uid: number): Ev => ({ type: 'EnemyLeaked', uid, enemy: 'nibbler', leak: 1 });
const cleared = (wave: number): Ev => ({ type: 'WaveCleared', wave, bonus: 0 });
const countdown = (wave: number): Ev => ({ type: 'CountdownStarted', wave, ticks: 1500 });
const texts = (lines: readonly { text: string }[]) => lines.map((l) => l.text);

describe('the A1M1 radio (D026)', () => {
  it('plays QUILL first-leak line on the first leak only', () => {
    const r = createRadioScript(A1_M01_RADIO);
    r.lines(spawn(1, 1));
    r.lines(spawn(2, 1));
    expect(texts(r.lines(leak(1)))).toEqual([
      'Pest escaped containment! (Toward... the wilderness? Odd. Logging it.)',
    ]);
    expect(r.lines(leak(2))).toEqual([]);
  });

  it('plays the jingle pair as W1 clears, and the perfect-wave line on the first clean wave from W2', () => {
    const r = createRadioScript(A1_M01_RADIO);
    r.lines(spawn(1, 1));
    r.lines(leak(1));
    expect(texts(r.lines(cleared(1)))).toEqual([
      '(singing along) Ev-er-glow, Ev-er-glow!',
      'That jingle. Every time.',
    ]);
    r.lines(spawn(2, 2));
    r.lines(leak(2));
    expect(r.lines(cleared(2))).toEqual([]); // W2 leaked: not perfect
    expect(texts(r.lines(cleared(3)))).toEqual([
      "Perfect wave! I'd give you a sticker, but stickers are Tier 2.",
    ]);
    expect(r.lines(cleared(4))).toEqual([]); // once per battle
  });

  it('keys the build-phase lines to their countdowns, once each', () => {
    const r = createRadioScript(A1_M01_RADIO);
    expect(r.lines(countdown(2))).toEqual([]); // Bricks's W2 line is in the briefing
    expect(r.lines(countdown(4)).map((l) => l.speaker)).toEqual(['goldie']);
    const joke = r.lines(countdown(6));
    expect(joke.map((l) => l.speaker)).toEqual(['quill', 'quill', 'bricks']);
    expect(joke[2]?.text).toBe("It's Wednesday.");
    expect(r.lines(countdown(6))).toEqual([]);
    expect(r.lines(countdown(7))[0]?.text).toMatch(/^If that jingle plays one more time/);
    expect(texts(r.lines({ type: 'TowerClassUnlocked', tower: 'thumper' }))).toEqual([
      'New hardware! Thumper Mortar, ready to deploy!',
    ]);
  });

  it('shows each line about 4 s, longer for long lines', () => {
    expect(radioLineMs('short')).toBe(4000);
    expect(radioLineMs('x'.repeat(120))).toBeGreaterThan(4000);
  });

  it('has no radio for a map without a table', () => {
    expect(radioLines('dev_range')).toEqual([]);
    expect(radioLines('a1_m01')).toBe(A1_M01_RADIO);
  });
});
