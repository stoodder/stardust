import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { A1_M01_RADIO } from '../content/radio/a1_m01.ts';
import { radioLines, type RadioLine } from '../content/radio/index.ts';
import type { IdSpace } from '../content/types.ts';
import { createBus } from '../shared/bus.ts';
import type { SimEvent } from '../sim/index.ts';
import { hud } from '../ui/state.ts';
import {
  bindRadio,
  createRadioScript,
  RADIO_STALE_MS,
  radioHoldMs,
  radioLineMs,
  REPLY_BEAT_MS,
} from './radio.ts';

type Ev = SimEvent<IdSpace>;
const spawn = (uid: number, wave: number): Ev => ({
  type: 'EnemySpawned',
  uid,
  enemy: 'nibbler',
  route: 'road',
  wave,
});
const leak = (uid: number): Ev => ({ type: 'EnemyLeaked', uid, enemy: 'nibbler', leak: 1 });
const died = (uid: number, enemy: string): Ev => ({
  type: 'EnemyDied',
  uid,
  enemy,
  bounty: 5,
  killer: { kind: 'ally', uid: 9 },
  x: 0,
  y: 0,
});
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
      "New hardware! Put the mortar beside your Rivet. They like each other. It's called Crossfire!",
    ]);
  });

  it('shows each line about 4 s, longer for long lines', () => {
    expect(radioLineMs('short')).toBe(4000);
    expect(radioLineMs('x'.repeat(120))).toBeGreaterThan(4000);
  });

  it('a line followed by its reply holds only the reply beat (D028)', () => {
    expect(radioHoldMs('x'.repeat(120), true)).toBe(REPLY_BEAT_MS);
    expect(radioHoldMs('x'.repeat(120), false)).toBe(radioLineMs('x'.repeat(120)));
    expect(REPLY_BEAT_MS).toBeLessThanOrEqual(2500);
  });

  it('leaves the debrief to the results card: the map ending plays nothing on the ticker', () => {
    const r = createRadioScript(A1_M01_RADIO);
    expect(r.lines({ type: 'MapWon' })).toEqual([]);
    expect(r.lines({ type: 'MapLost' })).toEqual([]);
  });

  it('plays an enemyKilled pair on the first kill of that enemy only (D048: the Hauler barks)', () => {
    const lines: RadioLine[] = [
      { on: 'enemyKilled', enemy: 'hauler', speaker: 'quill', text: 'Sack down.' },
      { on: 'enemyKilled', enemy: 'hauler', speaker: 'bricks', text: 'Strong targeting.' },
    ];
    const r = createRadioScript(lines);
    expect(r.lines(died(1, 'nibbler'))).toEqual([]);
    expect(texts(r.lines(died(2, 'hauler')))).toEqual(['Sack down.', 'Strong targeting.']);
    expect(r.lines(died(3, 'hauler'))).toEqual([]);
  });

  it('A1M2 carries its two Hauler barks on enemyKilled', () => {
    const barks = radioLines('a1_m02').filter((l) => l.on === 'enemyKilled');
    expect(barks.map((l) => [l.enemy, l.speaker])).toEqual([
      ['hauler', 'quill'],
      ['hauler', 'bricks'],
    ]);
  });

  it('has no radio for a map without a table', () => {
    expect(radioLines('dev_range')).toEqual([]);
    expect(radioLines('a1_m01')).toBe(A1_M01_RADIO);
  });
});

const shown = () => hud.radio.value?.text ?? null;
const cue = () => hud.radio.value?.cue?.text ?? null;
const at = (line: RadioLine) => radioLineMs(line.text);

describe('the D059 triggers: enemyLeaked and bankNudge', () => {
  const table: RadioLine[] = [
    { on: 'firstLeak', speaker: 'quill', text: 'first leak' },
    { on: 'enemyLeaked', enemy: 'brood_hauler', speaker: 'quill', text: 'hauler leaked' },
    { on: 'countdown', wave: 3, speaker: 'kip', text: 'w3 countdown' },
    { on: 'bankNudge', speaker: 'quill', text: 'spend it' },
  ];
  const leakOf = (uid: number, enemy: string): Ev => ({ type: 'EnemyLeaked', uid, enemy, leak: 3 });

  it('plays an enemyLeaked line on the first leak of that enemy type only', () => {
    const r = createRadioScript(table);
    expect(texts(r.lines(leakOf(1, 'nibbler')))).toEqual(['first leak']);
    expect(texts(r.lines(leakOf(2, 'brood_hauler')))).toEqual(['hauler leaked']);
    expect(r.lines(leakOf(3, 'brood_hauler'))).toEqual([]);
  });

  it('plays firstLeak then enemyLeaked when one leak is both', () => {
    const r = createRadioScript(table);
    expect(texts(r.lines(leakOf(1, 'brood_hauler')))).toEqual(['first leak', 'hauler leaked']);
  });

  it('nudges once per battle, behind the countdown lines, at 250+ credits from wave 2', () => {
    let credits = 400;
    const r = createRadioScript(table, () => credits);
    expect(r.lines(countdown(1))).toEqual([]); // the setup's starting credits never nudge
    credits = 249;
    expect(r.lines(countdown(2))).toEqual([]);
    credits = 250;
    expect(texts(r.lines(countdown(3)))).toEqual(['w3 countdown', 'spend it']);
    expect(r.lines(countdown(4))).toEqual([]);
  });

  it('never nudges without a credits reader', () => {
    const r = createRadioScript(table);
    expect(r.lines(countdown(3)).map((l) => l.on)).toEqual(['countdown']);
  });
});

describe('bindRadio: the ticker over real time (fake timers)', () => {
  type Bus = ReturnType<typeof createBus<Ev>>;
  let bus: Bus;
  let unbind: () => void;
  const JOKE_SETUP = A1_M01_RADIO.find((l) => l.text.startsWith('Time for Joke'))!; // in the table
  const PUNCHLINE = A1_M01_RADIO.find((l) => l.text.startsWith('Why did the lettuce'))!;
  const UNLOCK = A1_M01_RADIO.find((l) => l.on === 'unlock')!;
  const JINGLE = '(singing along) Ev-er-glow, Ev-er-glow!';
  const JINGLE_REPLY = 'That jingle. Every time.';

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
    bus = createBus<Ev>();
    unbind = bindRadio(bus, 'a1_m01');
  });
  afterEach(() => {
    unbind();
    vi.useRealTimers();
  });

  it('plays queued lines in order, one at a time', () => {
    bus.emit(countdown(4)); // Goldie
    bus.emit({ type: 'TowerClassUnlocked', tower: 'thumper' }); // QUILL, queued behind her
    expect(shown()).toMatch(/^Oh! You're the new tech!/);
    vi.advanceTimersByTime(radioLineMs(shown()!) - 1);
    expect(shown()).toMatch(/^Oh! You're the new tech!/);
    vi.advanceTimersByTime(1);
    expect(shown()).toBe(UNLOCK.text);
    vi.advanceTimersByTime(at(UNLOCK));
    expect(shown()).toBeNull();
  });

  it('lands the reply on the punchline: a short beat, with the punchline kept up above it', () => {
    bus.emit(countdown(6));
    expect(shown()).toBe(JOKE_SETUP.text);
    vi.advanceTimersByTime(at(JOKE_SETUP)); // QUILL to QUILL: the setup holds in full
    expect(shown()).toBe(PUNCHLINE.text);
    expect(cue()).toBeNull();
    vi.advanceTimersByTime(REPLY_BEAT_MS - 1);
    expect(shown()).toBe(PUNCHLINE.text);
    vi.advanceTimersByTime(1);
    expect(shown()).toBe("It's Wednesday.");
    expect(cue()).toBe(PUNCHLINE.text);
    expect(hud.radio.value?.name).toBe('Bricks');
    expect(hud.radio.value?.cue?.name).toBe('QUILL');
  });

  it('judges staleness per batch: a batch that started plays out, a stale one drops whole', () => {
    const heard: string[] = [];
    const off = hud.radio.subscribe((r) => {
      if (r !== null) heard.push(r.text);
    });
    bus.emit(countdown(4)); // Goldie: about 6 s
    bus.emit({ type: 'TowerClassUnlocked', tower: 'thumper' }); // QUILL: about 5 s
    bus.emit(countdown(6)); // the joke: starts about 11 s in, its tail runs past the limit
    bus.emit(cleared(1)); // the jingle pair: reached after the limit
    vi.advanceTimersByTime(60_000);
    off();
    const jokeStarts = radioLineMs(heard[0]!) + at(UNLOCK); // Goldie's line, then QUILL's
    expect(jokeStarts).toBeLessThan(RADIO_STALE_MS);
    expect(jokeStarts + at(JOKE_SETUP)).toBeGreaterThan(RADIO_STALE_MS);
    // The joke plays whole, reply and all; the stale jingle batch drops whole, so Bricks never
    // answers a jingle nobody heard.
    expect(heard.slice(2)).toEqual([JOKE_SETUP.text, PUNCHLINE.text, "It's Wednesday."]);
    expect(shown()).toBeNull();
  });

  it('plays a reply whose cue started in time, however long the queue', () => {
    bus.emit(cleared(1));
    expect(shown()).toBe(JINGLE);
    vi.advanceTimersByTime(RADIO_STALE_MS + 1_000); // past the limit, mid-batch
    expect(shown()).toBeNull(); // both lines played: the jingle, then its reply
    // Replay with a clock check: the reply came a beat after the jingle.
    unbind();
    unbind = bindRadio(bus, 'a1_m01');
    bus.emit(cleared(1));
    vi.advanceTimersByTime(REPLY_BEAT_MS);
    expect(shown()).toBe(JINGLE_REPLY);
    expect(cue()).toBe(JINGLE);
  });

  it('unbinding stops the ticker and clears the line', () => {
    bus.emit(countdown(4));
    expect(shown()).not.toBeNull();
    unbind();
    expect(shown()).toBeNull();
    bus.emit(countdown(7));
    vi.advanceTimersByTime(10_000);
    expect(shown()).toBeNull();
    unbind = () => {};
  });
});
