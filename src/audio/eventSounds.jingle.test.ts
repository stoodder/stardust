// The wave-clear jingle follows its dial live (T513): the event sounds read the dial at each wave
// clear, so A2M4's truth scene, saved as seen mid-battle, turns the next clear's sting minor
// (story/presentation.ts `afterScene`; app/audio.ts passes the live getter).
import { describe, expect, it } from 'vitest';
import type { JingleVariant } from '../content/presentation.ts';
import type { IdSpace } from '../content/types.ts';
import type { SimEvent } from '../sim/index.ts';
import { presentationFor } from '../story/presentation.ts';
import { createEventSounds, type SoundCall } from './eventSounds.ts';

const cleared = (wave: number): SimEvent<IdSpace> => ({ type: 'WaveCleared', wave, bonus: 24 });

const cues = (calls: SoundCall[]): string[] =>
  calls.filter((c) => c.kind === 'cue').map((c) => c.id);

describe('the wave-clear jingle', () => {
  it('reads the dial at each wave clear, not once at the start', () => {
    let jingle: JingleVariant = 'minor_bridges';
    const s = createEventSounds({
      get jingle() {
        return jingle;
      },
      skitterkinDeath: 'sad_squeak',
    });
    const frame = (wave: number): string[] => {
      const out: SoundCall[] = [];
      s.sounds(cleared(wave), out);
      s.endFrame(out);
      return cues(out);
    };
    expect(frame(3)).toEqual(['bright_minor']);
    jingle = 'minor';
    expect(frame(4)).toEqual(['minor_sting']);
    jingle = 'none';
    expect(frame(5)).toEqual([]);
  });

  it("turns minor on A2M4 once the truth scene is in the save's seen list", () => {
    const seen: string[] = [];
    const s = createEventSounds({
      get jingle() {
        return presentationFor('a2_m04', seen).jingle;
      },
      skitterkinDeath: 'sad_squeak',
    });
    const out: SoundCall[] = [];
    s.sounds(cleared(4), out);
    s.endFrame(out);
    seen.push('a2_m04_scene_truth');
    s.sounds(cleared(5), out);
    s.endFrame(out);
    expect(cues(out)).toEqual(['bright_minor', 'minor_sting']);
  });
});
