// T630a: a tower's voice, an idle head's shot, and the powered-down fold (towerLook.ts).
import { describe, expect, it } from 'vitest';
import { STEPPED_ALPHA } from '../vfx/fxTiming.ts';
import {
  FOLD_MS,
  foldSinkPx,
  idleFire,
  POWER_DOWN_MS,
  powerDownLook,
  towerVoice,
  voicedIdle,
} from './towerLook.ts';

describe("Thrum's voice (T630a; T640b's `hum_thrum`)", () => {
  it('sings her ring in every tier and spec when the voice is on, the plain hum when off', () => {
    expect(voicedIdle('tower.choir_head', 'hum', null, 'thrum')).toBe('hum_thrum');
    expect(voicedIdle('tower.choir_head', 'hum', 'a', 'thrum')).toBe('hum_thrum_spec_a');
    expect(voicedIdle('tower.choir_head', 'hum', 'b', 'thrum')).toBe('hum_thrum_spec_b');
    expect(voicedIdle('tower.choir_head', 'hum', null, null)).toBe('hum');
    expect(voicedIdle('tower.choir_head', 'hum', 'a', null)).toBe('hum_spec_a');
  });

  it("takes Thrum's voice from the run's story flags", () => {
    expect(towerVoice({ spared_quiet_wave: true })).toBe('thrum');
    expect(towerVoice({ spared_quiet_wave: false })).toBeNull();
    expect(towerVoice({})).toBeNull();
  });

  it('leaves a head with no such voice its own idle', () => {
    expect(voicedIdle('tower.bloom_head', 'pulse', 'b', 'thrum')).toBe('pulse_spec_b');
  });
});

describe("an idle head's shot (the Bloom's pulse burst)", () => {
  it("plays the Bloom's fire for its spec; none for a head that authors none", () => {
    expect(idleFire('tower.bloom_head', null)).toBe('fire');
    expect(idleFire('tower.bloom_head', 'a')).toBe('fire_spec_a');
    expect(idleFire('tower.bloom_head', 'b')).toBe('fire_spec_b');
    expect(idleFire('tower.choir_head', null)).toBe('');
    expect(idleFire('tower.burrow_head', null)).toBe('');
  });
});

describe('powered down (License Revoked)', () => {
  it('holds still under the stamp, then folds over its last FOLD_MS', () => {
    expect(powerDownLook(0, false)).toEqual({ fold: 0, alpha: 1 });
    expect(powerDownLook(POWER_DOWN_MS - FOLD_MS, false).fold).toBe(0);
    expect(powerDownLook(POWER_DOWN_MS - FOLD_MS / 2, false).fold).toBeCloseTo(0.5, 9);
    expect(powerDownLook(POWER_DOWN_MS, false)).toEqual({ fold: 1, alpha: 1 });
  });

  it('fades down the stepped ladder instead under reduced motion', () => {
    expect(powerDownLook(0, true)).toEqual({ fold: 0, alpha: 1 });
    for (let ms = POWER_DOWN_MS - FOLD_MS + 1; ms < POWER_DOWN_MS; ms += 20) {
      const look = powerDownLook(ms, true);
      expect(look.fold).toBe(0);
      expect(STEPPED_ALPHA).toContain(look.alpha);
    }
  });

  it('sinks the head into the base, then the base into the ground, in whole pixels', () => {
    expect(foldSinkPx(0, 12, 20)).toEqual({ head: 0, base: 0 });
    expect(foldSinkPx(0.5, 12, 20)).toEqual({ head: 12, base: 0 });
    expect(foldSinkPx(0.75, 12, 20)).toEqual({ head: 12, base: 10 });
    expect(foldSinkPx(1, 12, 20)).toEqual({ head: 12, base: 20 });
    for (let f = 0; f <= 1; f += 0.07) {
      const s = foldSinkPx(f, 13, 21);
      expect(Number.isInteger(s.head) && Number.isInteger(s.base)).toBe(true);
    }
  });
});
