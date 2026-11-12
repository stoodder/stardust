// Thrum's echo (T830; echoLook.ts): grey while she drifts in, the warm flip once she reaches the
// song, then the gold rise, lifting and fading by the sim's own clock.
import { describe, expect, it } from 'vitest';
import { hasAnim } from './spriteInfo.ts';
import {
  ECHO_RISE_PX,
  ECHO_RISE_TICKS,
  ECHO_SPRITE,
  ECHO_WARM_TICKS,
  echoLook,
  echoRiseAt,
} from './echoLook.ts';

describe("Thrum's echo", () => {
  it('walks grey, warms on arriving, then rises', () => {
    expect(echoLook(0)).toBe('walk');
    expect(echoLook(1)).toBe('warm');
    expect(echoLook(ECHO_WARM_TICKS + 1)).toBe('rise');
    for (const f of ['se', 'sw', 'ne', 'nw']) {
      for (const l of ['walk', 'warm', 'rise'])
        expect(hasAnim(ECHO_SPRITE, `${l}_${f}`)).toBe(true);
    }
  });

  it('lifts after the warm and fades out by the end of the sim’s rise', () => {
    const r = { lift: 0, alpha: 0 };
    expect(echoRiseAt(ECHO_WARM_TICKS, false, r)).toEqual({ lift: 0, alpha: 1 });
    echoRiseAt((ECHO_WARM_TICKS + ECHO_RISE_TICKS) / 2, false, r);
    expect(r.lift).toBeGreaterThan(0);
    echoRiseAt(ECHO_RISE_TICKS - 5, false, r);
    expect(r.alpha).toBeLessThan(1);
    expect(r.lift).toBeLessThanOrEqual(ECHO_RISE_PX);
    expect(echoRiseAt(ECHO_RISE_TICKS, false, r).alpha).toBe(0);
    expect(echoRiseAt(ECHO_RISE_TICKS - 5, true, r).lift).toBe(0);
  });
});
