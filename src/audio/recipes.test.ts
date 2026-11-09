import { describe, expect, it } from 'vitest';
import { DRUMS, INSTRUMENTS } from './music/instruments.ts';
import { CUES, THEMES } from './music/index.ts';
import { compileSong, songProblems } from './music/pattern.ts';
import { midiToHz, noteHz, noteToMidi, semitones } from './notes.ts';
import {
  instrumentProblems,
  layerProblems,
  MAX_SFX_SEC,
  recipeDuration,
  overlapPeak,
  recipePeak,
  recipeProblems,
} from './recipes.ts';
import { SFX, SFX_IDS, sfxRecipe } from './sfx/index.ts';
import type { ToneLayer } from './types.ts';

const instrumentIds = new Set([...Object.keys(INSTRUMENTS), ...Object.keys(DRUMS)]);
const drumIds = new Set(Object.keys(DRUMS));

const peakOf = (id: keyof typeof SFX): number => recipePeak(sfxRecipe(id));

/** A short crack at `at` s (the overlap-peak test). */
const crack = (at: number): ToneLayer => ({
  wave: 'square',
  at,
  freq: 440,
  env: { a: 0.001, d: 0.05, s: 0, r: 0.01 },
  gain: 0.6,
});

describe('notes', () => {
  it('names and pitches notes', () => {
    expect(noteToMidi('C4')).toBe(60);
    expect(noteToMidi('A4')).toBe(69);
    expect(noteToMidi('F#3')).toBe(54);
    expect(noteToMidi('Bb2')).toBe(46);
    expect(noteToMidi('H2')).toBeNull();
    expect(midiToHz(69)).toBe(440);
    expect(noteHz('C5')).toBeCloseTo(523.25, 2);
    expect(semitones(12)).toBe(2);
    expect(() => noteHz('nope')).toThrow(RangeError);
  });
});

describe('sound effect recipes', () => {
  it('are all valid', () => {
    const problems = SFX_IDS.flatMap((id) => recipeProblems(id, sfxRecipe(id)));
    expect(problems).toEqual([]);
  });

  it('cover every sound the game plays', () => {
    expect(SFX_IDS.toSorted()).toEqual(
      [
        'bomblet_pop',
        'bricks_ready',
        'bricks_shot',
        'build',
        'countdown_tick',
        'enemy_pop',
        'hold_fire_off',
        'hold_fire_on',
        'leak',
        'link_chime',
        'low_integrity',
        'medal_forfeit',
        'radio_bricks',
        'radio_goldie',
        'radio_quill',
        'reject',
        'rivet_shot',
        'sack_pop',
        'sell',
        'specialize',
        'sprinkler_pulse',
        'strike_beam',
        'strike_boom',
        'strike_charge',
        'suppress_burst',
        'thumper_impact',
        'thumper_launch',
        'ui_click',
        'ui_hover',
        'unlock',
        'upgrade',
        'wave_call',
        'wave_start',
      ].toSorted(),
    );
  });

  it('keep the frequent sounds short and quiet, and rate-limited', () => {
    const frequent = [
      'rivet_shot',
      'bricks_shot',
      'bomblet_pop',
      'enemy_pop',
      'ui_hover',
      'ui_click',
    ] as const;
    for (const id of frequent) {
      const r = sfxRecipe(id);
      expect(recipeDuration(r), id).toBeLessThan(0.15);
      expect(recipePeak(r), id).toBeLessThan(0.3);
      expect(r.minGapMs, id).toBeGreaterThan(0);
    }
    expect(SFX.rivet_shot.maxVoices).toBeLessThanOrEqual(3);
  });

  it('make the alarms the loudest and highest priority', () => {
    for (const id of ['leak', 'low_integrity', 'strike_boom'] as const) {
      expect(SFX[id].priority).toBe(3);
      expect(peakOf(id)).toBeGreaterThan(peakOf('rivet_shot') * 2);
    }
  });

  it("don't sum layers that never sound together (a rattle's separate cracks)", () => {
    const rattle = { gain: 1, layers: [crack(0), crack(0.065), crack(0.13)] };
    expect(overlapPeak(rattle)).toBeCloseTo(0.6);
    expect(recipePeak(rattle)).toBeCloseTo(1.8);
    const chord = { gain: 1, layers: [crack(0), crack(0.03)] };
    expect(overlapPeak(chord)).toBeCloseTo(1.2);
  });

  it('time the strike charge to its 1 s reticle (D022)', () => {
    expect(recipeDuration(SFX.strike_charge)).toBeGreaterThan(0.95);
    expect(recipeDuration(SFX.strike_charge)).toBeLessThan(1.1);
  });

  it('catch bad numbers', () => {
    const ok: ToneLayer = {
      wave: 'square',
      freq: 440,
      env: { a: 0.01, d: 0.1, s: 0.5, r: 0.1 },
      gain: 0.5,
    };
    expect(layerProblems(ok, 'ok', true)).toEqual([]);
    const bad = (l: Partial<ToneLayer>): string[] => layerProblems({ ...ok, ...l }, 'x', true);
    expect(bad({ freq: 5 })).not.toEqual([]);
    expect(bad({ freq: 20_000 })).not.toEqual([]);
    expect(bad({ gain: 1.5 })).not.toEqual([]);
    expect(bad({ env: { a: 0, d: 0.1, s: 0.5, r: 0.1 } })).not.toEqual([]);
    expect(bad({ env: { a: 0.01, d: 0.1, s: 2, r: 0.1 } })).not.toEqual([]);
    expect(bad({ glide: 100, glideSec: 0.1 })).not.toEqual([]);
    expect(bad({ glide: 2 })).not.toEqual([]);
    expect(bad({ wave: 'noise' })).not.toEqual([]);
    expect(
      bad({
        steps: [
          [0.2, 1],
          [0.1, 2],
        ],
      }),
    ).not.toEqual([]);
    const { freq: _drop, ...noPitch } = ok;
    expect(layerProblems(noPitch, 'x', true)).not.toEqual([]);
    expect(layerProblems(noPitch, 'x', false)).toEqual([]);
    expect(
      recipeProblems('loud', { gain: 1, priority: 0, layers: [ok, { ...ok, gain: 0.9 }] }),
    ).toContain('loud: summed peak 1.40 is over 1');
    const long = { ...ok, env: { ...ok.env, hold: MAX_SFX_SEC } };
    expect(recipeProblems('long', { gain: 0.5, priority: 0, layers: [long] })).not.toEqual([]);
  });
});

describe('instruments and songs', () => {
  it('instruments are valid (drums carry their own pitch)', () => {
    const problems = [
      ...Object.entries(INSTRUMENTS).flatMap(([id, inst]) => instrumentProblems(id, inst, false)),
      ...Object.entries(DRUMS).flatMap(([id, inst]) => instrumentProblems(id, inst, true)),
    ];
    expect(problems).toEqual([]);
  });

  it('every theme and cue is valid', () => {
    for (const song of [...Object.values(THEMES), ...Object.values(CUES)]) {
      expect(songProblems(song, instrumentIds, drumIds), song.id).toEqual([]);
    }
  });

  it('themes loop on whole bars; cues are short one-shots', () => {
    for (const song of Object.values(THEMES)) {
      expect(song.loop).toBe(true);
      const c = compileSong(song);
      const loopSec = c.steps * c.secPerStep;
      expect(loopSec).toBeGreaterThan(10);
      expect(loopSec).toBeLessThan(30);
    }
    for (const song of Object.values(CUES)) {
      expect(song.loop).toBe(false);
      const c = compileSong(song);
      expect(c.steps * c.secPerStep).toBeLessThan(5);
    }
  });

  it('the Act I battle theme has every layer, and the sting is the six-note phrase', () => {
    const layers = new Set(THEMES.act1_battle.tracks.map((t) => t.layer));
    expect([...layers].toSorted()).toEqual(['base', 'drums', 'lead']);
    const sting = CUES.bright_sting.tracks.find((t) => t.layer === 'lead')!;
    const notes = sting.pattern.split(/\s+/).filter((t) => /^[A-G]/.test(t));
    expect(notes).toEqual(['G5', 'C6', 'E6', 'F6', 'D6', 'C6']);
  });

  it('reports pattern problems', () => {
    const bad = {
      id: 'bad',
      bpm: 120,
      bars: 1,
      loop: true,
      tracks: [
        {
          layer: 'lead' as const,
          instrument: 'lead',
          stepsPerToken: 2 as const,
          gain: 0.5,
          pattern: 'C4 - X9 .',
        },
      ],
    };
    const problems = songProblems(bad, instrumentIds, drumIds);
    expect(problems.join('\n')).toMatch(/4 tokens, expected 8/);
    expect(problems.join('\n')).toMatch(/'X9' is not a note/);
  });
});
