import { describe, expect, it } from 'vitest';
import { SPEAKERS } from '../content/dialogue/speakers.ts';
import { SPEAKER_IDS } from '../content/dialogue/types.ts';
import { recipeDuration } from './recipes.ts';
import { isSfxId, SFX } from './sfx/index.ts';
import { semitones } from './notes.ts';
import {
  blipFor,
  createTypeTicker,
  TYPE_TICK_AFTER_BLIP_MS,
  TYPE_TICK_GAP_MS,
  TYPE_TICK_PITCH,
} from './speech.ts';

describe('speaker blips', () => {
  it('give every speaker speakers.ts names a blip its own sound; the rest type silently', () => {
    for (const id of SPEAKER_IDS) {
      const named = SPEAKERS[id].blip;
      expect(blipFor(id), id).toBe(named);
      if (named !== null) {
        expect(isSfxId(named), id).toBe(true);
        expect(recipeDuration(SFX[named]), id).toBeLessThan(0.6);
        expect(SFX[named].maxVoices, id).toBe(1);
      }
    }
    expect(SPEAKER_IDS.filter((id) => blipFor(id) === null).toSorted()).toEqual(
      ['hollow', 'kfa', 'narrator', 'system'].toSorted(),
    );
  });

  it("gives Kip his own blip at last (he borrowed Goldie's)", () => {
    expect(blipFor('kip')).toBe('blip.kip');
    expect(SFX['blip.kip']).not.toEqual(SFX['blip.goldie']);
  });

  it('pitches every voiced speaker its own tick, in range', () => {
    const voiced = SPEAKER_IDS.filter((id) => blipFor(id) !== null);
    expect(Object.keys(TYPE_TICK_PITCH).toSorted()).toEqual(voiced.toSorted());
    const base = SFX.type_tick.layers[0].freq;
    for (const p of Object.values(TYPE_TICK_PITCH)) {
      const hz = base * semitones(p);
      expect(hz).toBeGreaterThan(200);
      expect(hz).toBeLessThan(6000);
    }
  });
});

describe('the typewriter tick', () => {
  it('ticks per speaker, at most once per gap', () => {
    const t = createTypeTicker();
    expect(t.tick('quill', 0)).toEqual({ id: 'type_tick', pitch: TYPE_TICK_PITCH.quill });
    expect(t.tick('quill', 25)).toBeNull();
    expect(t.tick('quill', TYPE_TICK_GAP_MS - 1)).toBeNull();
    expect(t.tick('bricks', TYPE_TICK_GAP_MS)).toEqual({
      id: 'type_tick',
      pitch: TYPE_TICK_PITCH.bricks,
    });
    // 40 characters a second for a second: about one tick in every two or three characters.
    const c = createTypeTicker();
    let n = 0;
    for (let ms = 0; ms < 1000; ms += 25) if (c.tick('goldie', ms) !== null) n++;
    expect(n).toBeGreaterThanOrEqual(12);
    expect(n).toBeLessThanOrEqual(1000 / TYPE_TICK_GAP_MS + 1);
  });

  it("holds off just after a line's blip, and stays silent for the voiceless", () => {
    const t = createTypeTicker();
    t.blipped(1000);
    expect(t.tick('quill', 1000 + TYPE_TICK_AFTER_BLIP_MS - 1)).toBeNull();
    expect(t.tick('quill', 1000 + TYPE_TICK_AFTER_BLIP_MS)).not.toBeNull();
    expect(t.tick('narrator', 5000)).toBeNull();
    expect(t.tick('hollow', 6000)).toBeNull();
  });

  it("holds off for a sung line's cue, and a blip never shortens the hold", () => {
    const t = createTypeTicker();
    t.quietUntil(4000);
    t.blipped(1000);
    expect(t.tick('pebble', 3999)).toBeNull();
    expect(t.tick('pebble', 4000)).not.toBeNull();
  });

  it('is soft, short, and rate-limited in the synth too', () => {
    const r = SFX.type_tick;
    expect(recipeDuration(r)).toBeLessThan(0.05);
    expect(r.minGapMs).toBeGreaterThanOrEqual(TYPE_TICK_GAP_MS - 10);
    expect(r.priority).toBeLessThan(SFX.leak.priority);
  });
});
